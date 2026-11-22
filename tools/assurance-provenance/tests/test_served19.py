"""The served-model census (P19-AUDIT01): reading a pack, and the committed page."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import served19 as s  # noqa: E402


def pack(members):
    path = Path(tempfile.mkdtemp(prefix="p19-served-")) / "evidence.zip"
    with zipfile.ZipFile(path, "w") as z:
        for name, text in members.items():
            z.writestr(name, text)
    return path


class ReadingTests(unittest.TestCase):
    def test_named_ids_come_from_the_two_keys_at_any_depth(self):
        got = s.read_pack(
            pack(
                {
                    "report.json": json.dumps(
                        {"rows": [{"model": "m1"}, {"x": {"api_model": "m2"}}]}
                    ),
                    "notes.txt": "model: m9",
                    "other.json": json.dumps({"model_inference": False, "model": 3}),
                }
            )
        )
        self.assertEqual(
            (got["named"], got["served"], got["unread"]), (["m1", "m2"], [], [])
        )

    def test_a_served_id_is_paired_with_the_id_it_was_returned_for(self):
        got = s.read_pack(
            pack(
                {
                    "capture.json": json.dumps(
                        {
                            "smoke": {"m1": {"served_model": "m1-2026"}},
                            "calls": [
                                {"model": "m2", "served_model": "m2"},
                                {"api_model": "m2", "served_model": "m2"},
                                {"served_model": "m3"},
                            ],
                        }
                    )
                }
            )
        )
        self.assertEqual(
            got["served"],
            [
                {"requested": "calls", "served": "m3", "records": 1},
                {"requested": "m1", "served": "m1-2026", "records": 1},
                {"requested": "m2", "served": "m2", "records": 2},
            ],
        )

    def test_json_lines_members_are_read_line_by_line(self):
        lines = "\n".join(json.dumps({"model": m}) for m in ("m1", "m2")) + "\n\n"
        self.assertEqual(s.read_pack(pack({"t.jsonl": lines}))["named"], ["m1", "m2"])

    def test_a_member_that_is_not_json_is_listed_and_the_rest_are_read(self):
        got = s.read_pack(
            pack({"bad.json": "{", "good.json": json.dumps({"model": "m1"})})
        )
        self.assertEqual((got["named"], got["unread"]), (["m1"], ["bad.json"]))

    def test_the_table_is_padded_and_a_pack_with_no_model_is_left_out(self):
        page = s.render(
            {
                "19a": {"named": ["m1"], "served": [], "unread": []},
                "19b": {"named": [], "served": [], "unread": []},
                "19c": {
                    "named": ["m2"],
                    "served": [{"requested": "m2", "served": "m2-x", "records": 3}],
                    "unread": [],
                },
            }
        )
        self.assertIn("Packs that name a model: 2.", page)
        self.assertIn("returned: 1.", page)
        self.assertIn("| 19a  | `m1` ", page)
        self.assertIn("`m2-x` for `m2` (3)", page)
        self.assertNotIn("| 19b ", page)
        self.assertFalse(any(line[:1].isdigit() for line in page.splitlines()))


class CommittedPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = s.census()

    def test_the_page_is_the_tools_output(self):
        self.assertEqual(s.PAGE.read_text(), s.render(self.data))

    def test_every_member_was_read(self):
        self.assertEqual(
            {k: v["unread"] for k, v in self.data.items() if v["unread"]}, {}
        )

    def test_one_hosted_lane_holds_a_returned_id_and_three_do_not(self):
        holding = sorted(k for k, v in self.data.items() if v["served"])
        self.assertEqual(holding, ["19o"])
        pairs = {(x["requested"], x["served"]) for x in self.data["19o"]["served"]}
        self.assertEqual(len(pairs), 6)
        self.assertTrue(all(a == b for a, b in pairs))
        for lane in ("19u", "19w", "19x"):
            self.assertTrue(self.data[lane]["named"])
            self.assertEqual(self.data[lane]["served"], [])


if __name__ == "__main__":
    unittest.main()
