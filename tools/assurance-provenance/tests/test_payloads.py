import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import payloads  # noqa: E402


class PayloadTests(unittest.TestCase):
    def test_registry_shape(self):
        ids = [p["id"] for p in payloads.PAYLOADS]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(ids), 9)
        for p in payloads.PAYLOADS:
            self.assertEqual(set(p), {"id", "text", "source_row", "kind"})
            self.assertTrue(p["text"].strip())
            self.assertRegex(p["source_row"], r"^(A|B1|B2|C|D|E|F)-\d+$|^lane$")
            self.assertIn(
                p["kind"], ("incident", "grant_claim", "stop_claim", "config_claim")
            )

    def test_incident_quotes_are_verbatim_in_the_cluster_reports(self):
        reports = (payloads.ROOT / "docs/research/gap-hunt-zurvan-2026-11-01").glob(
            "cluster-*.md"
        )
        corpus = "\n".join(p.read_text() for p in reports)
        for p in payloads.PAYLOADS:
            if p["kind"] == "incident":
                self.assertIn(p["text"], corpus, p["id"])

    def test_claim_lines_exist(self):
        kinds = {p["kind"] for p in payloads.PAYLOADS}
        self.assertEqual(
            kinds, {"incident", "grant_claim", "stop_claim", "config_claim"}
        )


if __name__ == "__main__":
    unittest.main()
