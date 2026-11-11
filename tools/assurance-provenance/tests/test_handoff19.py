import hashlib
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import handoff19  # noqa: E402


class HandoffTests(unittest.TestCase):
    def test_handoff_document_is_recomputable(self):
        committed = (handoff19.DOCS / "HANDOFF.md").read_text()
        self.assertEqual(committed, handoff19.render())

    def test_template_is_committed(self):
        committed = json.loads(
            (handoff19.DOCS / "discrepancy-template.json").read_text()
        )
        self.assertEqual(committed, handoff19.discrepancy_template())
        self.assertEqual(set(committed["phases"]), {p["id"] for p in handoff19.PHASES})

    def test_expected_fields_exclude_host_dependent(self):
        for p in handoff19.PHASES:
            fields = handoff19.expected_fields(p["id"])
            for k in handoff19.EXCLUDED:
                self.assertNotIn(k, fields)
            self.assertEqual(
                fields["manifest_sha256"], handoff19.committed_root(p["id"])
            )
            self.assertIs(fields["verified"], True)

    def test_check_committed_receipt_is_empty(self):
        for p in handoff19.PHASES:
            self.assertEqual(
                handoff19.check(p["id"], handoff19.committed_receipt(p["id"])), []
            )

    def test_check_detects_changed_root_and_missing_field(self):
        r = handoff19.committed_receipt("19c")
        r["manifest_sha256"] = "0" * 64
        del r["new_reasons"]
        out = handoff19.check("19c", r)
        kinds = {(d["field"], d["kind"]) for d in out}
        self.assertEqual(
            kinds, {("manifest_sha256", "differs"), ("new_reasons", "missing")}
        )

    def test_check_follows_the_operators_own_replay_for_19a_kind(self):
        # The handoff tells a Linux x86_64 operator to add --replay; 19a's kind then reads
        # frozen_replay_chained (the hosted run at 94b8217b did exactly this). That is not a
        # discrepancy, but only when the operator's own receipt shows the replay verified.
        chained = handoff19.committed_receipt("19a")
        chained["replay"] = {"kind": "frozen_replay", "result": "verified"}
        chained["kind"] = "frozen_replay_chained"
        self.assertEqual(handoff19.check("19a", chained), [])

        unverified = dict(
            chained, replay={"kind": "frozen_replay", "result": "not_run"}
        )
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19a", unverified)],
            [("kind", "differs")],
        )
        mislabelled = dict(chained, kind="hash_bound_projection")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19a", mislabelled)],
            [("kind", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_the_replay_lanes(self):
        # P19-OPERATOR02: 19j's and 19l's committed receipts were produced with --replay. A host
        # that cannot replay prints structure_checked, and that is not a discrepancy; a receipt
        # whose kind and replay result disagree is.
        for pid in ("19j", "19l"):
            committed = handoff19.committed_receipt(pid)
            self.assertEqual(committed["kind"], "frozen_replay_recomputed", pid)
            self.assertEqual(handoff19.check(pid, committed), [], pid)
            structure = dict(
                committed,
                kind="structure_checked",
                replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
            )
            self.assertEqual(handoff19.check(pid, structure), [], pid)
            claimed = dict(structure, kind="frozen_replay_recomputed")
            self.assertEqual(
                [(d["field"], d["kind"]) for d in handoff19.check(pid, claimed)],
                [("kind", "differs")],
                pid,
            )
            unlabelled = dict(committed, kind="structure_checked")
            self.assertEqual(
                [(d["field"], d["kind"]) for d in handoff19.check(pid, unlabelled)],
                [("kind", "differs")],
                pid,
            )
            totals = dict(structure)
            totals["composed"] = dict(totals["composed"], effects_in_restricted_state=1)
            self.assertEqual(
                [(d["field"], d["kind"]) for d in handoff19.check(pid, totals)],
                [("composed", "differs")],
                pid,
            )

    def test_the_handoff_asks_for_every_lane(self):
        ids = [p["id"] for p in handoff19.PHASES]
        self.assertEqual(
            ids,
            [
                "19a",
                "19b",
                "19c",
                "19d",
                "19e",
                "19g",
                "19h",
                "19i",
                "19j",
                "19k",
                "19l",
            ],
        )
        text = handoff19.render()
        self.assertIn("run eleven verify commands", text)
        for pid in ids:
            self.assertIn(f"### {pid}\n", text)
        self.assertEqual(
            handoff19.outside_items(),
            sorted(
                ids
                + ["19a --replay", "19j --replay", "19l --replay", "19b Lean closure"]
            ),
        )
        for pid in ("19j", "19l"):
            self.assertIn("--replay", handoff19.phase(pid)["time"], pid)

    def test_check_flags_an_unexpected_field(self):
        receipt = dict(handoff19.committed_receipt("19c"), failures=[])
        out = handoff19.check("19c", receipt)
        self.assertEqual(
            [(d["field"], d["kind"]) for d in out], [("failures", "unexpected")]
        )

    def test_19d_socket_list_is_reported_not_compared(self):
        # The handoff tells the operator the socket list is theirs. A host that still exposes a
        # daemon socket outside the hidden directories is a report, not a discrepancy (P19-REPAIR05).
        r = handoff19.committed_receipt("19d")
        r["unix_sockets_reachable"] = ["/var/lib/example/daemon.sock"]
        r["unix_socket_egress_eliminated"] = False
        self.assertEqual(handoff19.check("19d", r), [])
        reported = handoff19.not_compared("19d", r)
        self.assertEqual(
            set(reported), {"unix_sockets_reachable", "unix_socket_egress_eliminated"}
        )
        self.assertEqual(
            reported["unix_sockets_reachable"]["got"], ["/var/lib/example/daemon.sock"]
        )
        self.assertTrue(reported["unix_sockets_reachable"]["reason"])

    def test_19b_lean_host_fields_are_reported_not_compared_without_lean(self):
        # A Lean-less host reports the Lean checks null and closure false for itself; the handoff
        # says that is expected. The comparator must say so too, and still compare the rest.
        r = handoff19.committed_receipt("19b")
        r["lean"]["type_checked_on_this_host"] = None
        r["lean"]["differential_passed_on_this_host"] = None
        r["closed_by"]["lean_differential_passed_on_this_host"] = False
        r["phase_19b_closed"] = False
        self.assertEqual(handoff19.check("19b", r), [])
        reported = handoff19.not_compared("19b", r)
        self.assertEqual(
            set(reported),
            {
                "lean.type_checked_on_this_host",
                "lean.differential_passed_on_this_host",
                "closed_by.lean_differential_passed_on_this_host",
                "phase_19b_closed",
            },
        )
        # the rest of closed_by and lean are still compared
        broken = json.loads(json.dumps(r))
        broken["closed_by"]["outage_pair_holds"] = False
        broken["lean"]["states_compared"] = 48
        self.assertEqual(
            sorted((d["field"], d["kind"]) for d in handoff19.check("19b", broken)),
            [("closed_by", "differs"), ("lean", "differs")],
        )

    def test_19b_lean_host_fields_are_compared_with_lean(self):
        # With Lean present nothing is waived: a failed differential is a discrepancy.
        r = handoff19.committed_receipt("19b")
        r["lean"]["differential_passed_on_this_host"] = False
        r["closed_by"]["lean_differential_passed_on_this_host"] = False
        r["phase_19b_closed"] = False
        self.assertEqual(handoff19.not_compared("19b", r), {})
        self.assertEqual(
            sorted((d["field"], d["kind"]) for d in handoff19.check("19b", r)),
            [
                ("closed_by", "differs"),
                ("lean", "differs"),
                ("phase_19b_closed", "differs"),
            ],
        )

    def test_handoff_text_matches_the_comparator(self):
        text = handoff19.render()
        self.assertIn("scripts/install-elan-toolchain", text)
        self.assertIn("not_compared", text)
        self.assertIn("unmapped", text)
        for f in handoff19.HOST_DEPENDENT["19d"]:
            self.assertIn(f, text)

    def test_time_estimates_follow_the_measured_runs(self):
        # three reviews measured these: 19a's frozen replay takes minutes, not seconds, and
        # the suite takes two to three times longer on a small server than on a laptop
        text = handoff19.render()
        self.assertNotIn("minute(s)", text)
        for p in handoff19.PHASES:
            self.assertIn(f"Time: {p['time']}.", text, p["id"])
        self.assertIn("--replay", handoff19.phase("19a")["time"])
        self.assertIn("sixty to ninety minutes on a small server", text)

    def test_handoff_names_the_verify_set(self):
        # the first outside receipt: 19b and 19g import `openai` through the frozen successor
        # chain, and the full hash-locked set does not install on macOS x86_64
        text = handoff19.render()
        self.assertIn("tools/assurance-provenance/requirements-verify.lock", text)
        self.assertIn("ModuleNotFoundError", text)
        self.assertIn("no macOS x86_64 wheel", text)
        for pid in ("19b", "19g"):
            self.assertIn("verify set", handoff19.phase(pid)["host"], pid)


def lock_entries(path):
    """name -> the requirement line and its hash lines, verbatim; comments are not part of a pin."""
    entries, name = {}, None
    for line in Path(path).read_text().split("\n"):
        head = re.match(r"^([A-Za-z0-9_.-]+)==", line)
        if head:
            name = head.group(1).lower().replace("_", "-")
            entries[name] = [line]
        elif name and line.startswith("    --hash="):
            entries[name].append(line)
        elif not line.strip().startswith("#"):
            name = None
    return entries


class VerifySetTests(unittest.TestCase):
    def test_every_entry_is_copied_byte_for_byte_from_the_sdk_lock(self):
        sdk = lock_entries(handoff19.ROOT / "tools/assurance-sdk/requirements.lock")
        mine = lock_entries(handoff19.VERIFY_LOCK)
        self.assertIn("openai", mine)
        self.assertGreaterEqual(len(mine), 14)
        for name, block in mine.items():
            self.assertEqual(block, sdk.get(name), name)
            self.assertGreaterEqual(len(block), 2, name)  # at least one hash


FIRST = "all-Michael-2026-11-10.json"
FIRST_SHA256 = "765c42b19792f70463bfba38d602ac9443f480262400cdc7902ed8bb377f9291"
# What the first receipt left unreplayed, and the five lanes added after it (P19-OPERATOR02).
STILL_OWED = [
    "19a --replay",
    "19b Lean closure",
    "19d",
    "19h",
    "19i",
    "19j",
    "19j --replay",
    "19k",
    "19l",
    "19l --replay",
]


class OperatorReceiptTests(unittest.TestCase):
    def test_the_first_receipt_is_the_bytes_the_operator_returned(self):
        raw = (handoff19.RECEIPTS_DIR / FIRST).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), FIRST_SHA256)

    def test_every_committed_receipt_has_a_review_that_recomputes(self):
        receipts = sorted(handoff19.RECEIPTS_DIR.glob("*.json"))
        self.assertTrue(receipts)
        for path in receipts:
            committed = json.loads(handoff19.review_path(path).read_text())
            self.assertEqual(committed, handoff19.review(path.read_bytes()), path.name)

    def test_review_of_the_first_receipt(self):
        r = handoff19.review((handoff19.RECEIPTS_DIR / FIRST).read_bytes())
        self.assertEqual(r["receipt_sha256"], FIRST_SHA256)
        self.assertEqual(r["commit"], "c7d7ceec6b2a589092026f21664bf273cdfcd24d")
        self.assertEqual(
            {pid: p["result"] for pid, p in r["phases"].items()},
            {
                "19a": "verified",
                "19b": "verified",
                "19c": "verified",
                "19d": "refused",
                "19e": "verified",
                "19g": "verified",
                "19h": "not_in_receipt",
                "19i": "not_in_receipt",
                "19j": "not_in_receipt",
                "19k": "not_in_receipt",
                "19l": "not_in_receipt",
            },
        )
        for pid in ("19a", "19b", "19c", "19e", "19g"):
            p = r["phases"][pid]
            self.assertEqual(p["discrepancies"], [], pid)
            self.assertIs(p["operator_comparator_matches"], True, pid)
            self.assertIs(p["root_matches"], True, pid)
            self.assertIs(p["tree_state_is_commit"], True, pid)
        self.assertEqual(len(r["phases"]["19b"]["not_compared"]), 4)
        self.assertEqual(r["not_exercised"], STILL_OWED)
        self.assertIn("not established", r["custody"])

    def test_review_does_not_take_the_operator_at_their_word(self):
        receipt = json.loads((handoff19.RECEIPTS_DIR / FIRST).read_text())
        out = json.loads(receipt["phases"]["19c"]["verifier_output"])
        out["new_reasons"] = 9
        receipt["phases"]["19c"]["verifier_output"] = json.dumps(out)
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19c"]["result"], "discrepant")
        self.assertIs(r["phases"]["19c"]["operator_comparator_matches"], False)
        self.assertIn("19c", r["not_exercised"])
        out["new_reasons"] = 8
        out["manifest_sha256"] = "0" * 64
        receipt["phases"]["19c"]["verifier_output"] = json.dumps(out)
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertIs(r["phases"]["19c"]["root_matches"], False)
        self.assertEqual(r["phases"]["19c"]["result"], "discrepant")

    def test_a_receipt_that_returns_a_replay_lane_is_reviewed_by_its_own_replay(self):
        receipt = json.loads((handoff19.RECEIPTS_DIR / FIRST).read_text())
        structure = dict(
            handoff19.committed_receipt("19j"),
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
            tree_state=receipt["commit"],
        )
        receipt["phases"]["19j"] = {"verifier_output": json.dumps(structure)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19j"]["result"], "verified")
        self.assertNotIn("19j", r["not_exercised"])
        self.assertIn("19j --replay", r["not_exercised"])
        replayed = dict(
            structure, kind="frozen_replay_recomputed", replay={"result": "verified"}
        )
        receipt["phases"]["19j"] = {"verifier_output": json.dumps(replayed)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19j"]["result"], "verified")
        self.assertNotIn("19j --replay", r["not_exercised"])


class StatusTests(unittest.TestCase):
    def _dirs(self):
        tmp = Path(tempfile.mkdtemp())
        saved = handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR
        self.addCleanup(lambda: setattr(handoff19, "RECEIPTS_DIR", saved[0]))
        self.addCleanup(lambda: setattr(handoff19, "REVIEWS_DIR", saved[1]))
        raw = (saved[0] / FIRST).read_bytes()
        handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR = (
            tmp / "receipts",
            tmp / "reviews",
        )
        handoff19.RECEIPTS_DIR.mkdir()
        handoff19.REVIEWS_DIR.mkdir()
        return raw

    def test_owed_received_reviewed(self):
        raw = self._dirs()
        s = handoff19.status()
        self.assertEqual(
            (s["iou"], s["status"], s["operator_receipts"]),
            ("IOU-19-OPERATOR", "owed", []),
        )
        self.assertIn("19d", s["not_yet_replayed_outside"])
        self.assertIn("owed until a receipt is reviewed", handoff19.render())
        (handoff19.RECEIPTS_DIR / FIRST).write_bytes(raw)
        self.assertEqual(
            handoff19.status()["status"], "receipt_received_not_yet_reviewed"
        )
        review = handoff19.review(raw)
        handoff19.review_path(handoff19.RECEIPTS_DIR / FIRST).write_text(
            json.dumps(review)
        )
        s = handoff19.status()
        self.assertEqual(s["status"], "reviewed_discrepancies_published")
        self.assertEqual(s["not_yet_replayed_outside"], STILL_OWED)
        # a review that no longer matches its receipt is not a review
        (handoff19.RECEIPTS_DIR / FIRST).write_bytes(raw + b"\n")
        self.assertEqual(
            handoff19.status()["status"], "receipt_received_not_yet_reviewed"
        )

    def test_status_as_committed(self):
        s = handoff19.status()
        self.assertEqual(s["iou"], "IOU-19-OPERATOR")
        self.assertEqual(s["status"], "reviewed_discrepancies_published")
        self.assertEqual(s["operator_receipts"], [FIRST])
        self.assertEqual(s["not_yet_replayed_outside"], STILL_OWED)
        text = handoff19.render()
        self.assertIn("still owed under `IOU-19-OPERATOR`", text)
        self.assertNotIn("owed until a receipt is reviewed", text)


if __name__ == "__main__":
    unittest.main()
