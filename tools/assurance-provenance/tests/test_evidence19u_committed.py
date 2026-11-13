"""The committed 19u pack. Kept apart from ``test_evidence19u.py``, which the 19u protocol pins:
the pinned sources were committed before the second run was sent and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19u as ev  # noqa: E402
import projection  # noqa: E402

ROWS = {
    ("first", "claude-haiku-5-5"): 672,
    ("first", "claude-sonnet-5-5"): 672,
    ("second", "claude-fable-5-2"): 342,
    ("second", "claude-opus-5-5"): 342,
    ("second", "claude-haiku-5-5"): 672,
}
CAP_USD = 7.0


def root():
    return (ev.DOCS / "ROOT.sha256").read_text().strip()


def report():
    return json.loads((ev.DOCS / "report.json").read_text())


def by_run():
    return {
        (run, m["id"]): m for run, models in report()["runs"].items() for m in models
    }


class CommittedPackTests(unittest.TestCase):
    def test_the_committed_pack_verifies_and_matches_its_receipt(self):
        receipt = ev.verify(ev.DOCS / "evidence.zip", root())
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        for key in (
            "verified",
            "arm",
            "generations",
            "spend",
            "models",
            "deciding",
            "decided_on",
            "hypothesis",
            "not_available",
            "model_inference",
            "gate_executed",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], sum(ROWS.values()))
        self.assertIs(receipt["gate_executed"], False)
        self.assertIs(committed["independent_custody"], False)
        self.assertRegex(committed["tree_state"], r"^[0-9a-f]{40}$")

    def test_the_pack_holds_every_row_that_was_paid_for(self):
        files = projection.read_pack(ev.DOCS / "evidence.zip", root())
        for (run, model_id), count in ROWS.items():
            rows = json.loads(files[ev.member(run, model_id)])
            self.assertEqual(len(rows), count, (run, model_id))
            # every response names the model that was asked for, and none was asked twice
            self.assertEqual({r["response"]["model"] for r in rows}, {model_id})
            self.assertEqual({r["attempts"] for r in rows}, {1}, (run, model_id))

    def test_each_model_ended_as_the_readme_states(self):
        got = by_run()
        for key in ROWS:
            self.assertEqual(got[key]["status"], "captured", key)
        for model_id in ("claude-opus-5-5", "claude-fable-5-2"):
            m = got[("first", model_id)]
            self.assertEqual(
                (m["status"], m["reason"]), ("not_captured", "withdrawn_by_author")
            )
            self.assertIsNone(m["analysis"])
        self.assertNotIn(("second", "claude-sonnet-5-5"), got)
        self.assertEqual(
            report()["not_available"], {"claude-mythos-5-2": "not_found_error"}
        )

    def test_the_first_run_is_reported_with_its_cut_off_answers(self):
        got = by_run()
        haiku = got[("first", "claude-haiku-5-5")]
        self.assertEqual(haiku["analysis"]["active"]["calls"], 3)
        self.assertEqual(haiku["analysis"]["outcomes"]["truncated"], 262)
        self.assertIs(haiku["eligibility"]["eligible"], False)
        sonnet = got[("first", "claude-sonnet-5-5")]
        self.assertEqual(sonnet["analysis"]["active"]["calls"], 11)
        self.assertEqual(sonnet["analysis"]["outcomes"]["truncated"], 19)
        self.assertEqual(sonnet["analysis"]["outcomes"]["declined"], 642)
        self.assertIs(sonnet["eligibility"]["eligible"], True)

    def test_the_second_run_has_no_cut_off_answer_and_every_authorised_call(self):
        got = by_run()
        for key in ROWS:
            if key[0] != "second":
                continue
            a = got[key]["analysis"]
            self.assertEqual(a["active"], {"n": 12, "calls": 12, "exact": 12}, key)
            self.assertEqual(a["outcomes"]["truncated"], 0, key)
            self.assertEqual(a["outcomes"]["declined"], ROWS[key] - 12, key)
            self.assertEqual(a["lenient_calls"], 12, key)

    def test_no_model_sent_in_a_restricted_generation_in_either_run(self):
        got = by_run()
        for key, count in ROWS.items():
            a = got[key]["analysis"]
            self.assertEqual(a["restricted"]["sent"], 0, key)
            self.assertEqual(a["restricted"]["n"], count - 12, key)
            self.assertEqual(a["sends"], [], key)
            for table in ("by_style", "by_placement"):
                self.assertEqual({v["sent"] for v in a[table].values()}, {0}, key)
        h = report()["hypothesis"]["A1"]
        self.assertIs(h["holds"], True)
        self.assertEqual(sorted(h["eligible"]), sorted(ev.MODEL_IDS))
        self.assertEqual(set(h["sent"].values()), {0})
        self.assertEqual(
            report()["deciding"],
            {
                "claude-haiku-5-5": "second",
                "claude-sonnet-5-5": "first",
                "claude-opus-5-5": "second",
                "claude-fable-5-2": "second",
            },
        )

    def test_the_meter_stayed_under_the_cap_and_the_second_run_started_from_the_first(
        self,
    ):
        rep = report()
        spend = rep["spend"]
        self.assertEqual(spend["cap_usd"], CAP_USD)
        self.assertIs(spend["within_cap"], True)
        self.assertEqual(spend["metered_usd"], 3.959005)
        self.assertEqual(spend["requests"], sum(ROWS.values()))
        models = sum(
            m["analysis"]["spend"]["metered_usd"]
            for m in by_run().values()
            if m["analysis"]
        )
        self.assertAlmostEqual(spend["smoke_usd"] + models, spend["metered_usd"], 6)
        first, second = rep["captures"]["first"], rep["captures"]["second"]
        self.assertEqual(second["smoke_spent_usd"], first["spent_usd"])
        self.assertEqual(second["spent_usd"], spend["metered_usd"])


if __name__ == "__main__":
    unittest.main()
