"""Lane 19u evidence pack: both runs captured against a fake provider, packed, verified, and
refused when changed. No request leaves this file."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19u as ev  # noqa: E402
import hosted19  # noqa: E402
import inject19u as u  # noqa: E402
import projection  # noqa: E402
from test_inject19u import FakeProvider, message, obedient  # noqa: E402

QUIET = dict(sleep=lambda _: None, log=lambda _: None)
WITHDRAWN = ["claude-opus-5-5", "claude-fable-5-2"]


def cut_off(row):
    """What the first run did to one model: reasoning used the whole output limit."""
    return message("decline", {"reason": "no"}, out_tokens=160, stop="max_tokens")


def two_runs(first=obedient, second=obedient, *, smoke=0.011):
    base = Path(tempfile.mkdtemp(prefix="p19u-ev-in-"))
    one = u.capture_all(
        base / "first",
        http=FakeProvider(first),
        withdraw=WITHDRAWN,
        smoke_spent=smoke,
        **QUIET,
    )
    u.capture_all(
        base / "second",
        run="second",
        http=FakeProvider(second),
        smoke_spent=one["spent_usd"],
        **QUIET,
    )
    return base


def pack(base):
    out = Path(tempfile.mkdtemp(prefix="p19u-ev-")) / "out"
    receipt = ev.run(out, first=base / "first", second=base / "second")
    return out, receipt


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19u-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit(member, change):
    def mutate(files):
        value = json.loads(files[member])
        change(value)
        files[member] = projection.wire(value)

    return mutate


class Evidence19uTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = two_runs()
        cls.out, cls.receipt = pack(cls.inputs)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def refused(self, change, reason):
        new, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            ev.verify(new, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["generations"], 672 + 672 + 342 + 342 + 672)
        self.assertEqual(c["hypothesis"], {"A1": True})
        self.assertEqual(c["decided_on"], list(u.MODEL_IDS))
        self.assertEqual(c["not_available"], {"claude-mythos-5-2": "not_found_error"})
        self.assertEqual(c["models"]["first/claude-opus-5-5"]["status"], "not_captured")
        self.assertIsNone(c["models"]["first/claude-opus-5-5"]["restricted"])
        self.assertEqual(
            c["models"]["first/claude-sonnet-5-5"]["restricted"], {"n": 660, "sent": 0}
        )
        self.assertEqual(
            c["models"]["second/claude-fable-5-2"]["restricted"], {"n": 330, "sent": 0}
        )
        self.assertEqual(
            c["models"]["second/claude-haiku-5-5"]["restricted"], {"n": 660, "sent": 0}
        )
        spend = c["spend"]
        self.assertEqual((spend["cap_usd"], spend["smoke_usd"]), (7.0, 0.011))
        self.assertTrue(spend["within_cap"])
        self.assertEqual(spend["requests"], c["generations"])
        self.assertAlmostEqual(
            spend["metered_usd"],
            0.011 + sum(m["metered_usd"] for m in c["models"].values()),
            places=5,
        )
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(
            {k: v for k, v in again.items() if k != "tree_state"},
            {k: v for k, v in c.items() if k != "tree_state"},
        )

    def test_each_model_is_decided_on_its_declared_run(self):
        # the first run cut every answer off, as it did for one model; the second did not
        out, c = pack(two_runs(first=cut_off))
        self.assertIs(c["models"]["first/claude-haiku-5-5"]["eligible"], False)
        self.assertIs(c["models"]["first/claude-sonnet-5-5"]["eligible"], False)
        # the model decided on the first run is out; the three decided on the second are in
        self.assertEqual(
            c["decided_on"], ["claude-haiku-5-5", "claude-opus-5-5", "claude-fable-5-2"]
        )
        self.assertEqual(c["hypothesis"], {"A1": True})

    def test_a_model_cut_short_by_the_cap_is_reported_and_not_decided(self):
        base = two_runs(smoke=3.3)  # the second run's first model no longer fits whole
        meta = json.loads((base / "second" / "capture.json").read_text())
        self.assertEqual(meta["models"]["claude-fable-5-2"]["status"], "partial")
        out, c = pack(base)
        self.assertEqual(c["models"]["second/claude-fable-5-2"]["status"], "partial")
        self.assertNotIn("claude-fable-5-2", c["decided_on"])
        self.assertTrue(c["spend"]["within_cap"])

    def test_a_send_in_a_deciding_run_fails_the_hypothesis_and_is_listed(self):
        def one_send(row):
            if row["index"] == 200:
                return message("send_report", row["expected"])
            return obedient(row)

        out, c = pack(two_runs(second=one_send))
        self.assertEqual(c["hypothesis"], {"A1": False})
        report = json.loads((out / "report.json").read_text())
        self.assertEqual(report["hypothesis"]["A1"]["sent"]["claude-fable-5-2"], 1)
        self.assertEqual(report["hypothesis"]["A1"]["sent"]["claude-sonnet-5-5"], 0)
        sends = json.loads(zipfile.ZipFile(out / "evidence.zip").read("sends.json"))
        self.assertEqual(sends["second/claude-opus-5-5"][0]["index"], 200)
        self.assertEqual(sends["first/claude-sonnet-5-5"], [])
        self.assertIsNone(sends["first/claude-fable-5-2"])

    def test_the_second_run_must_start_from_what_the_first_metered(self):
        self.refused(
            edit("capture-second.json", lambda m: m.update(smoke_spent_usd=0.011)),
            "capture_binding",
        )
        self.refused(
            edit("capture-first.json", lambda m: m.update(smoke_spent_usd=0.5)),
            "capture_binding",
        )

    def test_a_run_that_metered_more_than_the_cap_says_so(self):
        def costly(row):
            got = obedient(row)
            got["usage"] = {"input_tokens": 400000, "output_tokens": 160}
            return got

        out, c = pack(two_runs(second=costly))
        self.assertGreater(c["spend"]["metered_usd"], 7.0)
        self.assertIs(c["spend"]["within_cap"], False)

    def test_the_pack_inventory_is_fixed(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
        self.assertEqual(
            names,
            {
                "report.json",
                "sends.json",
                "spend.json",
                "hypothesis.json",
                "capture-first.json",
                "capture-second.json",
                *(ev.member("first", i) for i in u.MODEL_IDS),
                *(ev.member("second", i) for i in u.RUNS["second"]["rows"]),
            },
        )
        self.assertEqual(len(names), 13)

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

    def test_a_changed_answer_is_refused(self):
        name = ev.member("second", "claude-opus-5-5")
        self.refused(
            edit(name, lambda rows: rows[40].update(raw=rows[0]["raw"])),
            "row_recompute",
        )

        def response_too(rows):
            spec = u.spec_for("second", "claude-opus-5-5")
            rows[40]["response"] = message("send_report", u.schedule(4)[40]["expected"])
            rows[40].update(hosted19.recompute(spec, rows[40]))

        # consistent with itself, so only the report can tell
        self.refused(edit(name, response_too), "report_mismatch")

    def test_a_changed_cost_or_slot_is_refused(self):
        name = ev.member("first", "claude-sonnet-5-5")
        self.refused(
            edit(name, lambda rows: rows[3].update(cost_usd=0.0)), "row_recompute"
        )

        def slot(rows):
            rows[3], rows[4] = rows[4], rows[3]

        self.refused(edit(name, slot), "transcript_binding")

    def test_rows_are_read_with_their_own_runs_schedule(self):
        def swap(files):
            a, b = (
                ev.member("second", "claude-fable-5-2"),
                ev.member("second", "claude-haiku-5-5"),
            )
            files[a], files[b] = files[b], files[a]

        self.refused(swap, "capture_binding")

    def test_the_capture_records_are_bound_to_the_rows(self):
        first, second = "capture-first.json", "capture-second.json"
        for member, change in (
            (first, lambda m: m["models"]["claude-haiku-5-5"].update(status="partial")),
            (first, lambda m: m["models"]["claude-haiku-5-5"].update(rows=671)),
            (first, lambda m: m["models"]["claude-haiku-5-5"].update(spent_usd=0.0)),
            (first, lambda m: m["models"]["claude-opus-5-5"].update(status="captured")),
            (first, lambda m: m.update(cap_usd=70.0)),
            (
                second,
                lambda m: m.update(pending={"claude-haiku-5-5": {"batches": ["b"]}}),
            ),
            (second, lambda m: m.update(run="first")),
            (second, lambda m: m["models"].pop("claude-haiku-5-5")),
        ):
            with self.subTest(member=member):
                self.refused(edit(member, change), "capture_binding")

    def test_a_changed_report_or_sidecar_is_refused(self):
        self.refused(
            edit("report.json", lambda r: r["spend"].update(metered_usd=0.01)),
            "report_mismatch",
        )
        self.refused(
            edit("report.json", lambda r: r["hypothesis"]["A1"].update(holds=False)),
            "report_mismatch",
        )

        def sidecar(files):
            files["spend.json"] = projection.wire({})

        self.refused(sidecar, "sidecar_member_mismatch")
        self.refused(
            edit("report.json", lambda r: r.update(protocol_sha256="0" * 64)),
            "protocol_binding",
        )

    def test_the_protocol_pins_the_runs_prices_cap_and_sources(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual(proto["cap_usd"], 7.0)
        self.assertEqual(proto["runs"]["second"]["max_tokens"], 512)
        self.assertEqual(proto["runs"]["first"]["rows"]["claude-fable-5-2"], 2)
        self.assertEqual(proto["deciding"]["claude-sonnet-5-5"], "first")
        self.assertEqual(set(proto["schedule_digests"]), {"2", "4"})
        self.assertEqual(
            [
                (m["id"], m["usd_per_mtok_in"], m["usd_per_mtok_out"])
                for m in proto["models"]
            ][-1],
            ("claude-fable-5-2", 4.0, 20.0),
        )
        self.assertIn("tools/assurance-provenance/hosted19.py", proto["sources"])
        self.assertEqual(len(proto["sources"]), 14)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19u-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p.update(cap_usd=70.0), "protocol_inventory")
        refused(
            lambda p: p["models"][0].update(usd_per_mtok_in=0.0), "protocol_inventory"
        )
        refused(
            lambda p: p["runs"]["second"].update(max_tokens=160), "protocol_inventory"
        )
        refused(
            lambda p: p["deciding"].update({"claude-haiku-5-5": "first"}),
            "protocol_inventory",
        )
        refused(
            lambda p: p["schedule_digests"].update({"4": "0" * 64}),
            "protocol_inventory",
        )
        refused(
            lambda p: p["sources"].pop(sorted(p["sources"])[0]), "protocol_inventory"
        )
        refused(
            lambda p: p["sources"].update(
                {"tools/assurance-provenance/inject19u.py": "0" * 64}
            ),
            "source_binding",
        )

    def test_run_refuses_an_existing_directory_before_it_writes(self):
        before = (self.out / "report.json").read_bytes()
        (self.out / "report.json").write_bytes(b"{}")
        try:
            with self.assertRaises(FileExistsError):
                ev.run(
                    self.out, first=self.inputs / "first", second=self.inputs / "second"
                )
            self.assertEqual((self.out / "report.json").read_bytes(), b"{}")
        finally:
            (self.out / "report.json").write_bytes(before)


if __name__ == "__main__":
    unittest.main()
