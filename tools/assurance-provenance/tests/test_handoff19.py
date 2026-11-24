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
            for k in handoff19.excluded(p["id"]):
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
        for pid in ("19j", "19l", "19p"):
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

    def test_check_follows_the_operators_own_replay_for_19t(self):
        # P19-OPERATOR06: 19t's committed receipt was produced with --replay and reads
        # gate_recomputed. The same two table entries as 19j, 19l and 19p, with that word.
        committed = handoff19.committed_receipt("19t")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19t", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19t", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19t", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19t", unlabelled)],
            [("kind", "differs")],
        )
        totals = dict(structure, totals=dict(structure["totals"], clean_differs=0))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19t", totals)],
            [("totals", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19y(self):
        # P19-OPERATOR11: 19y is a replayed lane as 19t is, with the same two table entries.
        committed = handoff19.committed_receipt("19y")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19y", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19y", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19y", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19y", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], Y3=True))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19y", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19z(self):
        # P19-OPERATOR12: 19z is a replayed lane as 19t and 19y are, with the same two table entries.
        committed = handoff19.committed_receipt("19z")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19z", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19z", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19z", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19z", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], Z3=True))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19z", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19aa(self):
        # P19-OPERATOR13: 19aa is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19aa")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19aa", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19aa", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19aa", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19aa", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], R2=True))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19aa", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19ab(self):
        # P19-OPERATOR13: 19ab is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19ab")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19ab", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19ab", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ab", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ab", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], B1=False))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ab", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19ac(self):
        # P19-OPERATOR14: 19ac is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19ac")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19ac", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19ac", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ac", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ac", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], P1=True))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ac", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19ad(self):
        # P19-OPERATOR14: 19ad is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19ad")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19ad", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19ad", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ad", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ad", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], D1=False))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ad", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19ae(self):
        # P19-OPERATOR15: 19ae is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19ae")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19ae", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19ae", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ae", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ae", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], F4=False))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ae", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_replay_for_19ag(self):
        # P19-OPERATOR17: 19ag is a replayed lane as 19t, 19y and 19z are.
        committed = handoff19.committed_receipt("19ag")
        self.assertEqual(committed["kind"], "gate_recomputed")
        self.assertEqual(handoff19.check("19ag", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            replay={"result": "not_run", "reason": "host_not_linux_x86_64"},
        )
        self.assertEqual(handoff19.check("19ag", structure), [])
        claimed = dict(structure, kind="gate_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ag", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ag", unlabelled)],
            [("kind", "differs")],
        )
        hypotheses = dict(structure, hypotheses=dict(structure["hypotheses"], G4=False))
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19ag", hypotheses)],
            [("hypotheses", "differs")],
        )

    def test_check_follows_the_operators_own_recomputation_for_19q(self):
        # P19-OPERATOR06: 19q's committed receipt was produced with the dataset. Without
        # --dataset the verifier prints structure_checked and says so in `recompute`; that is
        # not a discrepancy, and a receipt whose kind and recompute result disagree is.
        committed = handoff19.committed_receipt("19q")
        self.assertEqual(committed["kind"], "dataset_recomputed")
        self.assertEqual(committed["recompute"], {"result": "verified"})
        self.assertEqual(handoff19.check("19q", committed), [])
        structure = dict(
            committed,
            kind="structure_checked",
            recompute={"result": "not_run", "reason": "no_dataset"},
        )
        self.assertEqual(handoff19.check("19q", structure), [])
        claimed = dict(structure, kind="dataset_recomputed")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19q", claimed)],
            [("kind", "differs")],
        )
        unlabelled = dict(committed, kind="structure_checked")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19q", unlabelled)],
            [("kind", "differs")],
        )
        changed = dict(structure, excluded=0)
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19q", changed)],
            [("excluded", "differs")],
        )
        # `recompute` is left out for 19q alone; anywhere else it is an unexpected field
        self.assertIn("recompute", handoff19.excluded("19q"))
        self.assertNotIn("recompute", handoff19.excluded("19c"))
        other = dict(
            handoff19.committed_receipt("19c"), recompute={"result": "verified"}
        )
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19c", other)],
            [("recompute", "unexpected")],
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
                "19m",
                "19n",
                "19o",
                "19p",
                "19q",
                "19r",
                "19s",
                "19t",
                "19u",
                "19v",
                "19w",
                "19x",
                "19y",
                "19z",
                "19aa",
                "19ab",
                "19ac",
                "19ad",
                "19ae",
                "19af",
                "19ag",
            ],
        )
        text = handoff19.render()
        self.assertIn("run thirty-two verify commands", text)
        self.assertIn(
            "19o, 19p, 19q, 19r, 19s, 19t, 19u, 19v, 19w, 19x, 19y, 19z, 19aa, 19ab, 19ac, 19ad, 19ae, 19af and 19ag\n",
            text,
        )
        self.assertIn(
            "- 19a, 19j, 19l, 19p, 19t, 19y, 19z, 19aa, 19ab, 19ac, 19ad, 19ae and 19ag with `--replay`",
            text,
        )
        self.assertIn(
            "`frozen_replay_recomputed` (19j, 19l, 19p) or `gate_recomputed` (19t, 19y, 19z, 19aa, 19ab, 19ac, 19ad, 19ae, 19ag).",
            text,
        )
        self.assertIn("`dataset_recomputed`", text)
        self.assertIn("- 19q with `--dataset`", text)
        # the handoff does not repeat the dataset's key
        self.assertIn("the key that the dataset's README publishes", text)
        for pid in ids:
            self.assertIn(f"### {pid}\n", text)
        self.assertEqual(
            handoff19.outside_items(),
            sorted(
                ids
                + [
                    "19a --replay",
                    "19j --replay",
                    "19l --replay",
                    "19p --replay",
                    "19t --replay",
                    "19y --replay",
                    "19z --replay",
                    "19aa --replay",
                    "19ab --replay",
                    "19ac --replay",
                    "19ad --replay",
                    "19ae --replay",
                    "19ag --replay",
                    "19q --dataset",
                    "19b Lean closure",
                ]
            ),
        )
        for pid in (
            "19j",
            "19l",
            "19p",
            "19t",
            "19y",
            "19z",
            "19aa",
            "19ab",
            "19ac",
            "19ad",
            "19ae",
            "19ag",
        ):
            self.assertIn("--replay", handoff19.phase(pid)["time"], pid)
        self.assertIn("--dataset", handoff19.phase("19q")["host"])

    def test_the_handoff_has_a_recipe_for_windows_and_says_it_is_untested(self):
        # P19-OPERATOR06: one of the people who agreed to run the handoff has a Windows machine.
        text = handoff19.render()
        self.assertIn("- Windows:", text)
        self.assertIn("WSL2", text)
        self.assertIn("has run nothing of this handoff on Windows", text)
        self.assertIn("Linux arm64", text)

    def test_the_handoff_says_what_native_windows_did(self):
        # the third outside receipt (P19-OPERATOR09): every verifier refused on native Windows
        text = handoff19.render()
        self.assertIn("Native Windows is not a host these verifiers support", text)
        for cause in (
            "protocol_inventory",
            "prompt_binding",
            "No module named 'fcntl'",
            "host_cannot_namespace",
            "AF_UNIX",
        ):
            self.assertIn(cause, text)
        self.assertIn("Nobody has yet tried the WSL2 route", text)

    def test_the_handoff_names_the_set_the_test_suite_needs_on_linux(self):
        # the second outside receipt (P19-OPERATOR09): two frozen-replay tests run on Linux
        # x86_64 and import `agents`, which the verify set does not hold
        text = handoff19.render()
        self.assertIn("On Linux x86_64 run it with the full hash-locked set", text)
        self.assertIn("No module named 'agents'", text)
        self.assertNotIn("openai-agents", handoff19.VERIFY_LOCK.read_text())
        sdk = (handoff19.ROOT / "tools/assurance-sdk/requirements.lock").read_text()
        self.assertIn("openai-agents==", sdk)

    def test_the_handoff_says_what_to_do_with_a_copy_of_itself(self):
        # both later operators were sent this document as a file as well as the repository
        text = handoff19.render()
        self.assertIn("compare it with the repository's copy", text)

    def test_the_handoff_says_what_is_replaced_before_a_receipt_is_committed(self):
        # the third receipt held the operator's user folder name in every command line
        text = handoff19.render()
        self.assertIn("replaced by `<redacted>`", text)
        self.assertIn("sha256 of the file as you returned it", text)

    def test_the_comparator_refuses_a_file_that_is_not_a_receipt(self):
        # the third outside receipt: a verifier that refuses prints no JSON, and the
        # comparator answered that with a traceback
        with tempfile.TemporaryDirectory() as tmp:
            for name, body in (("empty.json", ""), ("trace.json", "Traceback ...")):
                path = Path(tmp) / name
                path.write_text(body)
                with self.assertRaises(SystemExit) as caught:
                    handoff19.load_receipt(path)
                self.assertIn("not a verifier receipt", str(caught.exception))
            path = Path(tmp) / "list.json"
            path.write_text("[]")
            with self.assertRaises(SystemExit):
                handoff19.load_receipt(path)
            path = Path(tmp) / "ok.json"
            path.write_text('{"verified": true}')
            self.assertEqual(handoff19.load_receipt(path), {"verified": True})

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
SECOND = "all-Jacob-2026-11-15.json"
SECOND_SHA256 = "2bc73f6c17ff012413e9d95a3767b1dd1d077c444a909726ff8038fa6f75e17f"
THIRD = "all-Mona-2026-11-15.json"
# The third receipt is committed with the operator's user folder name replaced; the digest of
# the file as returned is published beside it (P19-OPERATOR09).
THIRD_SHA256 = "c3ddbce786d622d258e3d3a46041a2cd423eaccec78cfb2239c830766c65a7f4"
THIRD_RETURNED_SHA256 = (
    "e4f22c47edb7d7472e21d5e0ad5b959273d16e8f4b17b20968c442617bf710a4"
)
# What no reviewed receipt has exercised (P19-OPERATOR09 to 11): the second receipt predates
# 19w, 19x and 19y and did not run 19q's recomputation.
OWED_AFTER_THREE = [
    "19aa",
    "19aa --replay",
    "19ab",
    "19ab --replay",
    "19ac",
    "19ac --replay",
    "19ad",
    "19ad --replay",
    "19ae",
    "19ae --replay",
    "19af",
    "19ag",
    "19ag --replay",
    "19q --dataset",
    "19w",
    "19x",
    "19y",
    "19y --replay",
    "19z",
    "19z --replay",
]
LATER_LANES = (
    "19w",
    "19x",
    "19y",
    "19z",
    "19aa",
    "19ab",
    "19ac",
    "19ad",
    "19ae",
    "19af",
    "19ag",
)
# What the first receipt left unreplayed, and the lanes added after it (P19-OPERATOR02 to 11).
STILL_OWED = [
    "19a --replay",
    "19aa",
    "19aa --replay",
    "19ab",
    "19ab --replay",
    "19ac",
    "19ac --replay",
    "19ad",
    "19ad --replay",
    "19ae",
    "19ae --replay",
    "19af",
    "19ag",
    "19ag --replay",
    "19b Lean closure",
    "19d",
    "19h",
    "19i",
    "19j",
    "19j --replay",
    "19k",
    "19l",
    "19l --replay",
    "19m",
    "19n",
    "19o",
    "19p",
    "19p --replay",
    "19q",
    "19q --dataset",
    "19r",
    "19s",
    "19t",
    "19t --replay",
    "19u",
    "19v",
    "19w",
    "19x",
    "19y",
    "19y --replay",
    "19z",
    "19z --replay",
]

# The fourth file (P19-OPERATOR19) is a record of a second pass by the second receipt's
# operator. It is not in the handoff's receipt form: a replay output sits beside the plain one
# under `phases.<lane>.replay`, and 19q's dataset output under `optional.19q_dataset`.
FOURTH = "19w-to-19ag-Jacob-2026-11-24.json"
FOURTH_SHA256 = "0dce4a1177709ea81b0043b3f1f76aab4607705c6c2d6273bbc1bd120c26f3f5"
FOURTH_REPLAYS = ("19y", "19z", "19aa", "19ab", "19ac", "19ad", "19ae", "19ag")
NESTED_FLAGS = ("operator_comparator_matches", "root_matches", "tree_state_is_commit")


class OperatorReceiptTests(unittest.TestCase):
    def test_the_first_receipt_is_the_bytes_the_operator_returned(self):
        raw = (handoff19.RECEIPTS_DIR / FIRST).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), FIRST_SHA256)

    def test_the_second_receipt_is_the_bytes_the_operator_returned(self):
        raw = (handoff19.RECEIPTS_DIR / SECOND).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), SECOND_SHA256)

    def test_the_third_receipt_differs_from_the_returned_file_by_one_substitution(self):
        raw = (handoff19.RECEIPTS_DIR / THIRD).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), THIRD_SHA256)
        self.assertNotEqual(THIRD_SHA256, THIRD_RETURNED_SHA256)
        folders = re.findall(rb'Users(?:\\+|/)([^\\/"]+)', raw)
        self.assertEqual(len(folders), 105)
        self.assertEqual(set(folders), {b"<redacted>"})
        notes = (handoff19.DOCS / "README.md").read_text()
        notes += (handoff19.RECEIPTS_DIR / "README.md").read_text()
        self.assertIn(THIRD_RETURNED_SHA256, notes)
        self.assertIn("<redacted>", notes)

    def test_review_of_the_second_receipt(self):
        # Ubuntu x86_64 with Lean: every lane the receipt holds verifies, with the frozen
        # replays and the Lean closure, and the operator's own comparison matches ours
        r = handoff19.review((handoff19.RECEIPTS_DIR / SECOND).read_bytes())
        self.assertEqual(r["receipt_sha256"], SECOND_SHA256)
        self.assertEqual(r["commit"], "c24b47ce9f159b2424ed800f9ebbc41eb1795c5e")
        held = [p["id"] for p in handoff19.PHASES if p["id"] not in LATER_LANES]
        self.assertEqual(len(held), 21)
        for pid in held:
            phase = r["phases"][pid]
            self.assertEqual(phase["result"], "verified", pid)
            self.assertEqual(phase["discrepancies"], [], pid)
            for flag in (
                "operator_comparator_matches",
                "root_matches",
                "tree_state_is_commit",
            ):
                self.assertIs(phase[flag], True, (pid, flag))
        for pid in LATER_LANES:
            self.assertEqual(r["phases"][pid], {"result": "not_in_receipt"})
        self.assertEqual(
            sorted(r["phases"]["19d"]["not_compared"]),
            ["unix_socket_egress_eliminated", "unix_sockets_reachable"],
        )
        self.assertEqual(r["not_exercised"], OWED_AFTER_THREE)

    def test_review_of_the_third_receipt(self):
        # native Windows: no verifier printed a receipt, so nothing is verified and nothing
        # the receipt holds counts as exercised
        r = handoff19.review((handoff19.RECEIPTS_DIR / THIRD).read_bytes())
        self.assertEqual(r["receipt_sha256"], THIRD_SHA256)
        self.assertEqual(r["commit"], "c24b47ce9f159b2424ed800f9ebbc41eb1795c5e")
        causes = {}
        for pid, phase in r["phases"].items():
            if pid in LATER_LANES:
                self.assertEqual(phase, {"result": "not_in_receipt"})
                continue
            self.assertEqual(phase["result"], "refused", pid)
            last = phase["refused"].strip().splitlines()[-1]
            causes.setdefault(last, []).append(pid)
        self.assertEqual(
            {cause: len(pids) for cause, pids in causes.items()},
            {
                "ValueError: protocol_inventory": 17,
                "ValueError: prompt_binding": 1,
                "ModuleNotFoundError: No module named 'fcntl'": 2,
                "RuntimeError: host_cannot_namespace": 1,
            },
        )
        self.assertEqual(causes["ValueError: prompt_binding"], ["19s"])
        self.assertEqual(
            causes["ModuleNotFoundError: No module named 'fcntl'"], ["19b", "19g"]
        )
        self.assertEqual(causes["RuntimeError: host_cannot_namespace"], ["19d"])
        self.assertEqual(r["not_exercised"], handoff19.outside_items())

    def test_a_receipt_without_a_verified_19b_leaves_the_lean_closure_owed(self):
        # found while reviewing the third receipt: a refused or absent 19b did not list the
        # Lean closure, so two receipts that never ran Lean could have cleared it between them
        receipt = json.loads((handoff19.RECEIPTS_DIR / SECOND).read_text())
        self.assertNotIn(
            handoff19.LEAN_ITEM,
            handoff19.review(json.dumps(receipt).encode())["not_exercised"],
        )
        refused = json.loads(json.dumps(receipt))
        refused["phases"]["19b"]["verifier_output"] = ""
        absent = json.loads(json.dumps(receipt))
        del absent["phases"]["19b"]
        discrepant = json.loads(json.dumps(receipt))
        out = json.loads(discrepant["phases"]["19b"]["verifier_output"])
        out["verified"] = False
        discrepant["phases"]["19b"]["verifier_output"] = json.dumps(out)
        for name, changed in (
            ("refused", refused),
            ("absent", absent),
            ("discrepant", discrepant),
        ):
            r = handoff19.review(json.dumps(changed).encode())
            self.assertIn("19b", r["not_exercised"], name)
            self.assertIn(handoff19.LEAN_ITEM, r["not_exercised"], name)
            self.assertEqual(r["not_exercised"].count(handoff19.LEAN_ITEM), 1, name)

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
                "19m": "not_in_receipt",
                "19n": "not_in_receipt",
                "19o": "not_in_receipt",
                "19p": "not_in_receipt",
                "19q": "not_in_receipt",
                "19r": "not_in_receipt",
                "19s": "not_in_receipt",
                "19t": "not_in_receipt",
                "19u": "not_in_receipt",
                "19v": "not_in_receipt",
                "19w": "not_in_receipt",
                "19x": "not_in_receipt",
                "19y": "not_in_receipt",
                "19z": "not_in_receipt",
                "19aa": "not_in_receipt",
                "19ab": "not_in_receipt",
                "19ac": "not_in_receipt",
                "19ad": "not_in_receipt",
                "19ae": "not_in_receipt",
                "19af": "not_in_receipt",
                "19ag": "not_in_receipt",
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

    def test_a_receipt_that_returns_19q_is_reviewed_by_its_own_recomputation(self):
        receipt = json.loads((handoff19.RECEIPTS_DIR / FIRST).read_text())
        structure = dict(
            handoff19.committed_receipt("19q"),
            kind="structure_checked",
            recompute={"result": "not_run", "reason": "no_dataset"},
            tree_state=receipt["commit"],
        )
        receipt["phases"]["19q"] = {"verifier_output": json.dumps(structure)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19q"]["result"], "verified")
        self.assertNotIn("19q", r["not_exercised"])
        self.assertIn("19q --dataset", r["not_exercised"])
        recomputed = dict(
            structure, kind="dataset_recomputed", recompute={"result": "verified"}
        )
        receipt["phases"]["19q"] = {"verifier_output": json.dumps(recomputed)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19q"]["result"], "verified")
        self.assertNotIn("19q --dataset", r["not_exercised"])

    def test_a_discrepant_phase_does_not_pay_its_replay_or_dataset_item(self):
        # P19-REPAIR10: the replay ran and the output differs from the committed receipt. The
        # phase is discrepant, so neither it nor its deeper item counts as exercised.
        receipt = json.loads((handoff19.RECEIPTS_DIR / FIRST).read_text())
        replayed = dict(
            handoff19.committed_receipt("19j"),
            kind="frozen_replay_recomputed",
            replay={"result": "verified"},
            tree_state=receipt["commit"],
        )
        replayed["hypotheses"] = {"changed": True}
        receipt["phases"]["19j"] = {"verifier_output": json.dumps(replayed)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19j"]["result"], "discrepant")
        self.assertIn("19j", r["not_exercised"])
        self.assertIn("19j --replay", r["not_exercised"])
        recomputed = dict(
            handoff19.committed_receipt("19q"),
            kind="dataset_recomputed",
            recompute={"result": "verified"},
            tree_state=receipt["commit"],
        )
        recomputed["manifest_sha256"] = "0" * 64
        receipt["phases"]["19q"] = {"verifier_output": json.dumps(recomputed)}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertEqual(r["phases"]["19q"]["result"], "discrepant")
        self.assertIn("19q --dataset", r["not_exercised"])

    def test_a_malformed_receipt_is_reviewed_and_never_raises(self):
        # P19-REPAIR10: a returned file is someone else's bytes. Whatever it holds, the review
        # says what is missing; it does not stop status, render or the explorer's build.
        everything = sorted(handoff19.outside_items())
        for raw in (b"[]", b"null", b"5", b'"text"', b"{}", b'{"phases": []}'):
            r = handoff19.review(raw)
            self.assertEqual(r["not_exercised"], everything, raw)
            self.assertTrue(
                all(p == {"result": "not_in_receipt"} for p in r["phases"].values()),
                raw,
            )
        for bad in (5, None, [], {}, True):
            receipt = {
                "phases": {"19c": {"verifier_output": bad, "discrepancies": bad}}
            }
            r = handoff19.review(json.dumps(receipt).encode())
            self.assertEqual(r["phases"]["19c"]["result"], "refused", bad)
        good = json.dumps(handoff19.committed_receipt("19c"))
        receipt = {"phases": {"19c": {"verifier_output": good, "discrepancies": 5}}}
        r = handoff19.review(json.dumps(receipt).encode())
        self.assertIs(r["phases"]["19c"]["operator_comparator_matches"], False)

    def test_a_file_that_cannot_be_read_is_reviewed_and_never_raises(self):
        # P19-REPAIR10, amendment 1: not JSON at all, nested too deep to read, or holding a
        # constant JSON does not define.
        everything = sorted(handoff19.outside_items())
        deep = "[" * 100000 + "]" * 100000
        for raw in (b"not json", b"", b"\xff\xfe", deep.encode(), b'{"phases": NaN}'):
            r = handoff19.review(raw)
            self.assertEqual(r["not_exercised"], everything, raw[:20])
        good = handoff19.committed_receipt("19c")
        for text in (
            json.dumps(deep),
            json.dumps(json.dumps(good).replace("true", "NaN", 1)),
            json.dumps(json.dumps(dict(good, extra=1)).replace("1}", "Infinity}")),
        ):
            raw = ('{"phases": {"19c": {"verifier_output": %s}}}' % text).encode()
            r = handoff19.review(raw)
            self.assertEqual(r["phases"]["19c"]["result"], "refused", text[:30])
            self.assertIn("19c", r["not_exercised"])

    def test_a_review_that_cannot_be_recomputed_is_no_review(self):
        import shutil

        tmp = Path(tempfile.mkdtemp())
        saved = handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR
        try:
            handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR = tmp / "r", tmp / "v"
            handoff19.RECEIPTS_DIR.mkdir()
            handoff19.REVIEWS_DIR.mkdir()
            receipt = handoff19.RECEIPTS_DIR / "all-Someone-2026-11-23.json"
            receipt.write_text("[" * 100000 + "]" * 100000)
            handoff19.review_path(receipt).write_text("[" * 100000 + "]" * 100000)
            self.assertIsNone(handoff19._committed_review(receipt))
            self.assertEqual(
                handoff19.status()["status"], "receipt_received_not_yet_reviewed"
            )
        finally:
            handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR = saved
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_check_command_names_an_unknown_phase(self):
        import subprocess

        done = subprocess.run(
            [
                sys.executable,
                "-B",
                str(HERE / "handoff19.py"),
                "check",
                "19zz",
                str(handoff19.RECEIPTS_DIR / FIRST),
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(done.returncode, 2)
        self.assertIn("unknown phase", done.stderr)
        self.assertNotIn("Traceback", done.stderr)

    def test_the_handoff_says_which_replay_stops_are_results(self):
        # P19-OPERATOR18: every replay that can differ on another host is named as one whose
        # mismatch is a result, and so is the stop an early 3.12 can make on 19ag.
        text = handoff19.render()
        self.assertIn("from either is also a result to send back", text)
        self.assertIn("SQLite", text)
        self.assertIn("`report_rows`", text)
        self.assertIn("Python 3.12.0 to 3.12.2", text)


class NestedRecordTests(unittest.TestCase):
    """P19-OPERATOR19: outputs a record nests are checked by the same comparator."""

    def _record(self):
        return json.loads((handoff19.RECEIPTS_DIR / FOURTH).read_text())

    def _review(self, record):
        return handoff19.review(json.dumps(record).encode())

    def test_the_fourth_record_is_the_bytes_the_operator_returned(self):
        raw = (handoff19.RECEIPTS_DIR / FOURTH).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), FOURTH_SHA256)
        notes = (handoff19.DOCS / "README.md").read_text()
        notes += (handoff19.RECEIPTS_DIR / "README.md").read_text()
        self.assertIn(FOURTH, notes)

    def test_the_lines_kept_beside_the_fourth_record_are_its_plain_outputs(self):
        record = self._record()
        kept = handoff19.RECEIPTS_DIR / (Path(FOURTH).stem + ".attachments")
        lines = (kept / "Jacob-Phase19w-ag-lines.txt").read_text().splitlines()
        self.assertEqual(list(record["phases"]), list(LATER_LANES))
        self.assertEqual(
            [line for line in lines if line.strip()],
            [record["phases"][pid]["verifier_output"].strip() for pid in LATER_LANES],
        )

    def test_review_of_the_fourth_record(self):
        r = handoff19.review((handoff19.RECEIPTS_DIR / FOURTH).read_bytes())
        self.assertEqual(r["receipt_sha256"], FOURTH_SHA256)
        self.assertEqual(r["commit"], "5c57ed2ed1e888ded65c6fc53d418173c226a2ae")
        for p in handoff19.PHASES:
            pid = p["id"]
            if pid not in LATER_LANES:
                self.assertEqual(r["phases"][pid], {"result": "not_in_receipt"}, pid)
                continue
            phase = r["phases"][pid]
            self.assertEqual(phase["result"], "verified", pid)
            self.assertEqual(phase["discrepancies"], [], pid)
            for flag in NESTED_FLAGS:
                self.assertIs(phase[flag], True, (pid, flag))
            self.assertEqual("replay" in phase, pid in FOURTH_REPLAYS, pid)
        for pid in FOURTH_REPLAYS:
            nested = r["phases"][pid]["replay"]
            self.assertEqual(nested["result"], "verified", pid)
            self.assertEqual(nested["discrepancies"], [], pid)
            self.assertIs(nested["replayed"], True, pid)
            for flag in NESTED_FLAGS:
                self.assertIs(nested[flag], True, (pid, flag))
        self.assertEqual(list(r["optional"]), ["19q --dataset"])
        dataset = r["optional"]["19q --dataset"]
        self.assertEqual(dataset["result"], "verified")
        self.assertEqual(dataset["discrepancies"], [])
        self.assertIs(dataset["recomputed"], True)
        for flag in NESTED_FLAGS:
            self.assertIs(dataset[flag], True, flag)
        # what this record leaves unexercised is exactly what the second receipt exercised,
        # 19q's dataset run aside
        owed = set(r["not_exercised"])
        for pid in LATER_LANES:
            self.assertNotIn(pid, owed)
        for pid in FOURTH_REPLAYS:
            self.assertNotIn(pid + " --replay", owed)
        self.assertNotIn("19q --dataset", owed)
        self.assertIn("19q", owed)
        self.assertIn("19a", owed)

    def test_a_nested_replay_that_differs_from_the_committed_receipt_pays_nothing(self):
        record = self._record()
        out = json.loads(record["phases"]["19y"]["replay"]["verifier_output"])
        out["manifest_sha256"] = "0" * 64
        record["phases"]["19y"]["replay"]["verifier_output"] = json.dumps(out)
        r = self._review(record)
        self.assertEqual(r["phases"]["19y"]["result"], "verified")
        self.assertEqual(r["phases"]["19y"]["replay"]["result"], "discrepant")
        self.assertIs(r["phases"]["19y"]["replay"]["root_matches"], False)
        self.assertNotIn("19y", r["not_exercised"])
        self.assertIn("19y --replay", r["not_exercised"])
        self.assertNotIn("19z --replay", r["not_exercised"])

    def test_a_nested_replay_that_did_not_run_or_did_not_verify_pays_nothing(self):
        for change in (
            {"replay": {"result": "not_run", "reason": "not_requested"}},
            {"replay": {"result": "report_mismatch"}},
            {"verified": False},
        ):
            record = self._record()
            out = json.loads(record["phases"]["19z"]["replay"]["verifier_output"])
            out.update(change)
            record["phases"]["19z"]["replay"]["verifier_output"] = json.dumps(out)
            r = self._review(record)
            self.assertIn("19z --replay", r["not_exercised"], change)
            self.assertNotIn("19z", r["not_exercised"], change)

    def test_a_nested_output_that_verifies_without_the_deeper_run_pays_nothing(self):
        # the plain output filed again where the replay output belongs: it verifies, and it
        # says the replay did not run, so the replay item stays owed
        record = self._record()
        plain = record["phases"]["19z"]["verifier_output"]
        record["phases"]["19z"]["replay"]["verifier_output"] = plain
        r = self._review(record)
        self.assertEqual(r["phases"]["19z"]["replay"]["result"], "verified")
        self.assertIs(r["phases"]["19z"]["replay"]["replayed"], False)
        self.assertIn("19z --replay", r["not_exercised"])
        # the same for 19q: a verify without the dataset is not a recomputation
        structure = dict(
            handoff19.committed_receipt("19q"),
            kind="structure_checked",
            recompute={"result": "not_run", "reason": "no_dataset"},
            tree_state=record["commit"],
        )
        record["optional"]["19q_dataset"]["verifier_output"] = json.dumps(structure)
        r = self._review(record)
        self.assertEqual(r["optional"]["19q --dataset"]["result"], "verified")
        self.assertIs(r["optional"]["19q --dataset"]["recomputed"], False)
        self.assertIn("19q --dataset", r["not_exercised"])

    def test_a_nested_replay_under_a_lane_that_does_not_verify_pays_nothing(self):
        record = self._record()
        plain = json.loads(record["phases"]["19aa"]["verifier_output"])
        plain["hypotheses"] = {"changed": True}
        record["phases"]["19aa"]["verifier_output"] = json.dumps(plain)
        r = self._review(record)
        self.assertEqual(r["phases"]["19aa"]["result"], "discrepant")
        self.assertEqual(r["phases"]["19aa"]["replay"]["result"], "verified")
        self.assertIn("19aa", r["not_exercised"])
        self.assertIn("19aa --replay", r["not_exercised"])

    def test_a_nested_dataset_output_pays_only_when_it_verifies_and_recomputed(self):
        for change in (
            {"manifest_sha256": "0" * 64},
            {"recompute": {"result": "not_run", "reason": "no_dataset"}},
            {"verified": False},
        ):
            record = self._record()
            out = json.loads(record["optional"]["19q_dataset"]["verifier_output"])
            out.update(change)
            record["optional"]["19q_dataset"]["verifier_output"] = json.dumps(out)
            r = self._review(record)
            self.assertIn("19q --dataset", r["not_exercised"], change)
        # it never pays the lane's plain verify, which this record does not hold
        r = self._review(self._record())
        self.assertEqual(r["phases"]["19q"], {"result": "not_in_receipt"})
        self.assertIn("19q", r["not_exercised"])
        # and an entry for a lane with no dataset item is not read
        record = self._record()
        record["optional"]["19y_dataset"] = record["optional"]["19q_dataset"]
        self.assertEqual(list(self._review(record)["optional"]), ["19q --dataset"])

    def test_a_nested_output_that_is_not_json_text_pays_nothing_and_never_raises(self):
        deep = "[" * 100000 + "]" * 100000
        for bad in (None, 5, [], {}, True, "{", "[]", "5", deep, {"verified": True}):
            record = self._record()
            record["phases"]["19y"]["replay"] = {"verifier_output": bad}
            record["optional"]["19q_dataset"] = {"verifier_output": bad}
            r = self._review(record)
            self.assertIn("19y --replay", r["not_exercised"], str(bad)[:20])
            self.assertIn("19q --dataset", r["not_exercised"], str(bad)[:20])
            self.assertNotIn("19y", r["not_exercised"], str(bad)[:20])
        for bad in (None, 5, [], "text", True):
            record = self._record()
            record["phases"]["19y"]["replay"] = bad
            record["optional"] = bad
            r = self._review(record)
            self.assertNotIn("replay", r["phases"]["19y"], bad)
            self.assertNotIn("optional", r, bad)
            self.assertIn("19y --replay", r["not_exercised"], bad)
            self.assertIn("19q --dataset", r["not_exercised"], bad)

    def test_a_receipt_that_nests_nothing_is_reviewed_as_before(self):
        for name in (FIRST, SECOND, THIRD):
            r = handoff19.review((handoff19.RECEIPTS_DIR / name).read_bytes())
            self.assertNotIn("optional", r, name)
            for pid, phase in r["phases"].items():
                self.assertNotIn("replay", phase, (name, pid))

    def test_an_object_under_discrepancies_is_compared_as_it_is(self):
        record = self._record()
        r = self._review(record)
        self.assertIs(r["phases"]["19w"]["operator_comparator_matches"], True)
        record["phases"]["19w"]["discrepancies"] = {
            "discrepancies": [{"field": "x", "kind": "differs"}],
            "not_compared": {},
        }
        r = self._review(record)
        self.assertIs(r["phases"]["19w"]["operator_comparator_matches"], False)
        self.assertEqual(r["phases"]["19w"]["result"], "verified")


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
        self.assertEqual(s["operator_receipts"], [FOURTH, SECOND, FIRST, THIRD])
        # P19-OPERATOR19: the fourth file exercises every item the first three left
        self.assertEqual(s["not_yet_replayed_outside"], [])
        text = handoff19.render()
        self.assertIn("4 outside receipt(s) reviewed", text)
        self.assertIn(
            "`IOU-19-OPERATOR`:\nnothing; every item has been exercised by a reviewed receipt.",
            text,
        )
        self.assertNotIn("owed until a receipt is reviewed", text)

    def test_without_the_fourth_file_twenty_items_are_owed(self):
        # what the first three leave, so that the fourth is seen to be what pays them
        tmp = Path(tempfile.mkdtemp())
        saved = handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR
        self.addCleanup(lambda: setattr(handoff19, "RECEIPTS_DIR", saved[0]))
        self.addCleanup(lambda: setattr(handoff19, "REVIEWS_DIR", saved[1]))
        handoff19.RECEIPTS_DIR, handoff19.REVIEWS_DIR = tmp / "r", tmp / "v"
        handoff19.RECEIPTS_DIR.mkdir()
        handoff19.REVIEWS_DIR.mkdir()
        for name in (FIRST, SECOND, THIRD):
            raw = (saved[0] / name).read_bytes()
            (handoff19.RECEIPTS_DIR / name).write_bytes(raw)
            handoff19.review_path(handoff19.RECEIPTS_DIR / name).write_text(
                json.dumps(handoff19.review(raw))
            )
        owed = handoff19.status()["not_yet_replayed_outside"]
        self.assertEqual(len(owed), 20)
        self.assertEqual(
            owed,
            sorted(
                list(LATER_LANES)
                + [pid + " --replay" for pid in FOURTH_REPLAYS]
                + ["19q --dataset"]
            ),
        )


if __name__ == "__main__":
    unittest.main()
