"""The served-model census (P19-AUDIT01, corrected by P19-AUDIT03): reading a pack, and the
committed page."""

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
                {
                    "served": "m1-2026",
                    "responses": 0,
                    "records": 1,
                    "requested": ["m1"],
                },
                {"served": "m2", "responses": 0, "records": 2, "requested": ["m2"]},
                {"served": "m3", "responses": 0, "records": 1, "requested": ["calls"]},
            ],
        )

    def test_the_model_in_a_stored_response_is_returned_and_not_named(self):
        # P19-AUDIT03: lanes 19o and 19u keep the provider's response body beside each
        # generation. The census read its `model` as a named id and never as a returned one.
        got = s.read_pack(
            pack(
                {
                    "capture.json": json.dumps(
                        {"models": {"asked": {"api_model": "asked"}}}
                    ),
                    "transcript-asked.json": json.dumps(
                        [
                            {"index": 0, "response": {"id": "r1", "model": "given"}},
                            {"index": 1, "response": {"id": "r2", "model": "given"}},
                            {"index": 2, "response": {"id": "r3", "model": "other"}},
                            # not a provider's body: a string, and an object without a model
                            {"index": 3, "response": "text"},
                            {"index": 4, "response": {"id": "r5"}},
                        ]
                    ),
                    "smoke.json": json.dumps(
                        {"asked": {"served_model": "given"}, "response_model": "no"}
                    ),
                    # deeper than the body itself, a `model` is an ordinary named id again
                    "deep.json": json.dumps(
                        {"response": {"output": [{"model": "inner"}]}}
                    ),
                }
            )
        )
        self.assertEqual(got["named"], ["asked", "inner"])
        self.assertEqual(
            got["served"],
            [
                {
                    "served": "given",
                    "responses": 2,
                    "records": 1,
                    "requested": ["asked"],
                },
                {"served": "other", "responses": 1, "records": 0, "requested": []},
            ],
        )

    def test_a_record_inside_a_response_is_not_paired_with_the_bodys_own_model(self):
        # The `model` of a stored response is what came back, so it is never the id a
        # `served_model` record beside it was returned for.
        got = s.read_pack(
            pack(
                {
                    "t.json": json.dumps(
                        {"response": {"model": "given", "served_model": "copied"}}
                    )
                }
            )
        )
        self.assertEqual(got["named"], [])
        self.assertEqual(
            got["served"],
            [
                {
                    "served": "copied",
                    "responses": 0,
                    "records": 1,
                    "requested": ["response"],
                },
                {"served": "given", "responses": 1, "records": 0, "requested": []},
            ],
        )

    def test_a_list_of_entries_with_an_id_names_them(self):
        # P19-AUDIT03: lane 19e's spend record lists its models this way.
        got = s.read_pack(
            pack(
                {
                    "spend.json": json.dumps(
                        {"models": [{"id": "m1", "note": "n"}, {"id": "m2"}]}
                    ),
                    # not such a list: an entry without an id, an id that is no string, empty
                    "no1.json": json.dumps({"models": [{"id": "m7"}, {"name": "m8"}]}),
                    "no2.json": json.dumps({"models": [{"id": 9}]}),
                    "no3.json": json.dumps({"models": []}),
                }
            )
        )
        self.assertEqual(got["named"], ["m1", "m2"])

    def test_the_keys_of_a_models_object_are_named_ids(self):
        # P19-AUDIT02: a pack may name its models as the keys of an object, as lane 19af's does.
        got = s.read_pack(
            pack(
                {
                    "capture.json": json.dumps(
                        {
                            "models": {"m1": {"files": {}}, "m2": {}},
                            "x": {"model": "m3"},
                        }
                    ),
                    "deep.json": json.dumps(
                        {"a": [{"b": {"models": {"m4": {"n": 1}}}}]}
                    ),
                    # not such an object: values that are not all objects, a list, an empty one
                    "no1.json": json.dumps({"models": {"count": 2, "m9": {}}}),
                    "no2.json": json.dumps({"models": ["m8"]}),
                    "no3.json": json.dumps({"models": {}}),
                }
            )
        )
        self.assertEqual(got["named"], ["m1", "m2", "m3", "m4"])
        self.assertEqual(got["served"], [])

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
                    "named": ["m2", "m3"],
                    "served": [
                        {
                            "served": "m2",
                            "responses": 40,
                            "records": 2,
                            "requested": ["m2"],
                        },
                        {"served": "m3", "responses": 7, "records": 0, "requested": []},
                    ],
                    "unread": [],
                },
            }
        )
        self.assertIn("Packs that name a model: 2.", page)
        self.assertIn("returned: 1.", page)
        self.assertIn("| 19a  | `m1` ", page)
        self.assertIn(
            "`m2` in 40 stored responses and 2 `served_model` records for `m2`; "
            "`m3` in 7 stored responses",
            page,
        )
        self.assertIn("Every returned id above is one that the pack holding it", page)
        self.assertNotIn("| 19b ", page)
        self.assertFalse(any(line[:1].isdigit() for line in page.splitlines()))

    def test_a_returned_id_the_pack_does_not_name_is_said(self):
        page = s.render(
            {
                "19c": {
                    "named": ["m2"],
                    "served": [
                        {
                            "served": "m2-x",
                            "responses": 0,
                            "records": 3,
                            "requested": ["m2"],
                        }
                    ],
                    "unread": [],
                }
            }
        )
        self.assertIn("`m2-x` in 3 `served_model` records for `m2`", page)
        self.assertIn("does not name: 19c: `m2-x`.", page)
        self.assertNotIn("Every returned id above", page)

    def test_one_entry_of_the_last_column_holds_no_separator(self):
        # The explorer counts a cell's entries by its commas and semicolons.
        for entry in (
            {"served": "a", "responses": 1, "records": 2, "requested": ["x", "y"]},
            {"served": "a", "responses": 0, "records": 2, "requested": ["x"]},
            {"served": "a", "responses": 5, "records": 0, "requested": []},
        ):
            text = s._entry(entry)
            self.assertNotIn(", ", text)
            self.assertNotIn("; ", text)


class CommittedPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = s.census()

    def test_the_page_is_the_tools_output(self):
        self.assertEqual(s.PAGE.read_text(), s.render(self.data))

    def test_every_member_was_read(self):
        unread = {k: v["unread"] for k, v in self.data.items() if v["unread"]}
        # Two of lane 19ag's seat files nest bodies about 1,486 levels deep. The JSON reader
        # of Python 3.12.0 to 3.12.2 cannot read them from inside a test runner; they hold
        # attempts and no model id (P19-AUDIT02, amendment 1). Nothing else may be unread.
        if sys.version_info[:3] <= (3, 12, 2):
            deep = ["attempts-seat-a.json", "attempts-seat-b.json"]
            if unread.get("19ag") in (deep, deep[:1], deep[1:]):
                del unread["19ag"]
        self.assertEqual(unread, {})

    def test_every_lane_that_ran_a_model_names_one(self):
        # The gap P19-AUDIT02 closes: lane 19af ran two models and the census named none.
        for directory in sorted(s.RESEARCH.glob(s.PREFIX + "19*")):
            receipt = directory / "receipt.json"
            lane = directory.name[len(s.PREFIX) :]
            if lane not in self.data or not receipt.is_file():
                continue
            if json.loads(receipt.read_text()).get("model_inference") is True:
                self.assertTrue(self.data[lane]["named"], lane)
        self.assertEqual(
            self.data["19af"]["named"], ["llama-3.2-3b-4bit", "qwen3-4b-4bit"]
        )
        self.assertEqual(sum(bool(v["named"]) for v in self.data.values()), 18)
        page = s.PAGE.read_text()
        self.assertIn("Packs that name a model: 18.", page)
        self.assertIn("P19-AUDIT02", page)
        self.assertIn("P19-AUDIT03", page)
        # P19-AUDIT03: lane 19e lists its models as entries with an id.
        self.assertEqual(self.data["19e"]["named"], ["gpt-oss-20b", "llama", "luna"])

    def test_two_hosted_lanes_hold_a_returned_id_beside_each_generation(self):
        # P19-AUDIT03. Until 24 Nov 2026 this test pinned the wrong answer: that lane 19o
        # alone held a returned id, and lane 19u none.
        holding = sorted(k for k, v in self.data.items() if v["served"])
        self.assertEqual(holding, ["19o", "19u"])
        for lane, total, per in (
            ("19o", 8064, {1344}),
            ("19u", 2700, {342, 672, 1344}),
        ):
            got = self.data[lane]["served"]
            # every returned id is one the pack names, and every named id has one
            self.assertEqual([x["served"] for x in got], self.data[lane]["named"])
            self.assertEqual(sum(x["responses"] for x in got), total)
            self.assertEqual({x["responses"] for x in got}, per)
        # lane 19o also copied the id out of two calls per model before its capture
        self.assertEqual(
            [(x["records"], x["requested"]) for x in self.data["19o"]["served"]],
            [(2, [x["served"]]) for x in self.data["19o"]["served"]],
        )
        self.assertEqual({x["records"] for x in self.data["19u"]["served"]}, {0})
        for lane in ("19w", "19x"):
            self.assertTrue(self.data[lane]["named"])
            self.assertEqual(self.data[lane]["served"], [])

    def test_the_stored_responses_are_one_for_each_transcript_row(self):
        # The count the page gives is the pack's own: each transcript row of the two lanes
        # holds one response, and it names the model of the file it is in.
        for lane, total in (("19o", 8064), ("19u", 2700)):
            path = s.RESEARCH / (s.PREFIX + lane) / "evidence.zip"
            rows = named = 0
            with zipfile.ZipFile(path) as z:
                for name in sorted(z.namelist()):
                    if not name.startswith("transcript"):
                        continue
                    for row in json.loads(z.read(name)):
                        rows += 1
                        model = row["response"]["model"]
                        named += name.endswith("-" + model + ".json")
            self.assertEqual((rows, named), (total, total), lane)

    def test_the_page_says_what_it_counted_before(self):
        page = s.PAGE.read_text()
        self.assertIn("Until 24 November 2026 this page counted only", page)
        self.assertIn("returned: 2.", page)


if __name__ == "__main__":
    unittest.main()
