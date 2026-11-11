"""The manuscript's key numbers against the committed packs, so the paper cannot drift."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs/research"
PAPER = (DOCS / "provenance-phase-19-paper/PAPER.md").read_text()


def receipt(phase):
    return json.loads((DOCS / f"provenance-phase-{phase}/receipt.json").read_text())


def cells(label):
    """The numeric cells of the one table row that starts with ``label``."""
    rows = [
        line
        for line in PAPER.split("\n")
        if line.startswith("|") and line.split("|")[1].strip() == label
    ]
    if len(rows) != 1:
        raise AssertionError((label, len(rows)))
    return [
        int(c.strip().replace(",", ""))
        for c in rows[0].split("|")[2:-1]
        if re.fullmatch(r"[\d,]+", c.strip())
    ]


class PaperNumbersTests(unittest.TestCase):
    def test_appendix_roots_are_the_committed_roots(self):
        for phase in ("19h", "19i", "19j", "19k", "19l"):
            root = (DOCS / f"provenance-phase-{phase}/ROOT.sha256").read_text().strip()
            self.assertIn(f"`provenance-phase-{phase}/` | `{root}`", PAPER, phase)

    def test_study_4_table_is_the_two_replay_receipts(self):
        pair = (receipt("19j"), receipt("19l"))

        def both(key, sub=None):
            got = [r[key] if sub is None else r[key][sub] for r in pair]
            return got + [sum(got)]

        self.assertEqual(cells("Generations recorded"), both("generations"))
        self.assertEqual(
            cells("Wrong sends proposed (restricted state)"),
            both("restricted_sends_proposed"),
        )
        self.assertEqual(
            cells("Landed, composed controls"),
            both("composed", "effects_in_restricted_state"),
        )
        self.assertEqual(
            cells("Landed, credential gateway alone"),
            both("credential_only", "effects_in_restricted_state"),
        )
        self.assertEqual(
            cells("Exact authorised sends admitted, either control"),
            both("composed", "active_sends_admitted"),
        )
        self.assertEqual(
            both("composed", "active_sends_admitted"),
            both("credential_only", "active_sends_admitted"),
        )
        revoked = cells("Stopped by the gateway: revoked credential")
        altered = cells("Stopped by the gateway: altered content")
        self.assertEqual(
            [a + b for a, b in zip(revoked, altered)],
            both("credential_only", "restricted_sends_blocked"),
        )

    def test_study_3_style_table_is_the_19k_report(self):
        report = json.loads((DOCS / "provenance-phase-19k/report.json").read_text())
        by_id = {m["id"]: m["analysis"]["styles"] for m in report["models"]}
        models = ("qwen3-4b-4bit", "qwen3-1.7b-4bit", "llama-3.2-3b-4bit")
        start = PAPER.index("**Table 3.")
        table = PAPER[start : PAPER.index("**Wording matters", start)]
        for style in by_id[models[0]]:
            rows = [x for x in table.split("\n") if x.startswith(f"| {style} ")]
            self.assertEqual(len(rows), 1, style)
            got = [c.strip() for c in rows[0].split("|")[1:-1]]
            want = [by_id[m][style]["sent"] for m in models]
            self.assertEqual([int(got[1]), int(got[4]), int(got[5])], want, style)

    def test_no_placeholder_is_left_in_the_evidence_appendix(self):
        self.assertNotIn("@@", PAPER)


if __name__ == "__main__":
    unittest.main()
