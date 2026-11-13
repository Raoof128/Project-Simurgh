"""Lane 19u evidence pack: build from a capture against a fake provider, verify, and refuse
packs that were changed. No request leaves this file."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19u as ev  # noqa: E402
import inject19u as u  # noqa: E402
import projection  # noqa: E402
from test_inject19u import FakeProvider, message, obedient  # noqa: E402


def one_send(row):
    if row["index"] == 300:
        return message("send_report", row["expected"])
    return obedient(row)


def captured(decide=obedient, **kw):
    out = Path(tempfile.mkdtemp(prefix="p19u-ev-in-"))
    u.capture_all(
        out, http=FakeProvider(decide), sleep=lambda _: None, log=lambda _: None, **kw
    )
    return out


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19u-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19uTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = captured(smoke_spent=0.011)
        cls.out = Path(tempfile.mkdtemp(prefix="p19u-ev-")) / "out"
        cls.receipt = ev.run(
            cls.out,
            transcripts=cls.inputs / "transcripts",
            capture=cls.inputs / "capture.json",
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def refused(self, change, reason):
        pack, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            ev.verify(pack, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["generations"], 4 * 672)
        self.assertEqual(c["hypothesis"], {"A1": True})
        self.assertEqual(c["not_available"], {"claude-mythos-5-2": "not_found_error"})
        for name in u.MODEL_IDS:
            m = c["models"][name]
            self.assertEqual((m["status"], m["eligible"]), ("captured", True))
            self.assertEqual(m["restricted"], {"n": 660, "sent": 0})
            self.assertEqual(m["active"], {"n": 12, "calls": 12, "exact": 12})
        spend = c["spend"]
        self.assertEqual(spend["cap_usd"], 7.0)
        self.assertEqual(spend["smoke_usd"], 0.011)
        self.assertTrue(spend["within_cap"])
        self.assertEqual(spend["requests"], 4 * 672)
        self.assertAlmostEqual(
            spend["metered_usd"],
            0.011 + sum(m["metered_usd"] for m in c["models"].values()),
            places=6,
        )
        self.assertIs(c["gate_executed"], False)
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(
            {k: v for k, v in again.items() if k != "tree_state"},
            {k: v for k, v in c.items() if k != "tree_state"},
        )

    def test_a_send_fails_the_hypothesis_and_is_listed(self):
        inputs = captured(one_send)
        out = Path(tempfile.mkdtemp(prefix="p19u-ev-")) / "out"
        c = ev.run(
            out, transcripts=inputs / "transcripts", capture=inputs / "capture.json"
        )
        self.assertEqual(c["hypothesis"], {"A1": False})
        report = json.loads((out / "report.json").read_text())
        self.assertEqual(report["hypothesis"]["A1"]["sent"]["claude-opus-5-5"], 1)
        self.assertEqual(report["models"][0]["analysis"]["sends"][0]["index"], 300)

    def test_a_partial_model_is_reported_and_not_counted_for_the_hypothesis(self):
        inputs = captured(
            smoke_spent=2.9
        )  # leaves room for most of the last model only
        meta = json.loads((inputs / "capture.json").read_text())
        self.assertEqual(meta["models"]["claude-fable-5-2"]["status"], "partial")
        out = Path(tempfile.mkdtemp(prefix="p19u-ev-")) / "out"
        c = ev.run(
            out, transcripts=inputs / "transcripts", capture=inputs / "capture.json"
        )
        self.assertEqual(c["models"]["claude-fable-5-2"]["status"], "partial")
        report = json.loads((out / "report.json").read_text())
        self.assertNotIn("claude-fable-5-2", report["hypothesis"]["A1"]["eligible"])
        self.assertEqual(len(report["hypothesis"]["A1"]["eligible"]), 3)
        self.assertTrue(c["spend"]["within_cap"])

    def test_a_run_that_metered_more_than_the_cap_says_so(self):
        def costly(row):
            got = obedient(row)
            got["usage"] = {"input_tokens": 400000, "output_tokens": 160}
            return got

        inputs = captured(costly, only=["claude-fable-5-2"])
        meta = json.loads((inputs / "capture.json").read_text())
        for name in u.MODEL_IDS[:3]:  # the other three were not asked for in this run
            meta["models"][name] = {
                "status": "not_captured",
                "rows": 0,
                "spent_usd": 0.0,
            }
        (inputs / "capture.json").write_text(json.dumps(meta))
        out = Path(tempfile.mkdtemp(prefix="p19u-ev-")) / "out"
        c = ev.run(
            out, transcripts=inputs / "transcripts", capture=inputs / "capture.json"
        )
        self.assertGreater(c["spend"]["metered_usd"], 7.0)
        self.assertIs(c["spend"]["within_cap"], False)
        self.assertEqual(c["models"]["claude-haiku-5-5"]["status"], "not_captured")
        self.assertIsNone(c["models"]["claude-haiku-5-5"]["restricted"])

    def test_the_pack_inventory_is_fixed(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
        self.assertEqual(
            names,
            {
                "report.json",
                "capture.json",
                "sends.json",
                "spend.json",
                "hypothesis.json",
                *(ev.member(i) for i in u.MODEL_IDS),
            },
        )

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

    def test_a_changed_answer_is_refused(self):
        def raw_only(files):
            name = ev.member("claude-opus-5-5")
            rows = json.loads(files[name])
            rows[40]["raw"] = rows[0]["raw"]
            files[name] = projection.wire(rows)

        self.refused(raw_only, "row_recompute")

        def response_too(files):
            name = ev.member("claude-opus-5-5")
            rows = json.loads(files[name])
            sched = u.schedule()
            rows[40]["response"] = message("send_report", sched[40]["expected"])
            for key, value in (
                __import__("hosted19")
                .recompute(u.model("claude-opus-5-5"), rows[40])
                .items()
            ):
                rows[40][key] = value
            files[name] = projection.wire(rows)

        # consistent with itself, so only the report can tell
        self.refused(response_too, "report_mismatch")

    def test_a_changed_cost_or_slot_is_refused(self):
        def cost(files):
            name = ev.member("claude-fable-5-2")
            rows = json.loads(files[name])
            rows[3]["cost_usd"] = 0.0
            files[name] = projection.wire(rows)

        self.refused(cost, "row_recompute")

        def slot(files):
            name = ev.member("claude-fable-5-2")
            rows = json.loads(files[name])
            rows[3], rows[4] = rows[4], rows[3]
            files[name] = projection.wire(rows)

        self.refused(slot, "transcript_binding")

    def test_the_capture_record_is_bound_to_the_rows(self):
        def status(files):
            meta = json.loads(files["capture.json"])
            meta["models"]["claude-haiku-5-5"]["status"] = "partial"
            files["capture.json"] = projection.wire(meta)

        self.refused(status, "capture_binding")

        def count(files):
            meta = json.loads(files["capture.json"])
            meta["models"]["claude-haiku-5-5"]["rows"] = 671
            files["capture.json"] = projection.wire(meta)

        self.refused(count, "capture_binding")

        def spent(files):
            meta = json.loads(files["capture.json"])
            meta["models"]["claude-haiku-5-5"]["spent_usd"] = 0.0
            files["capture.json"] = projection.wire(meta)

        self.refused(spent, "capture_binding")

        def cap(files):
            meta = json.loads(files["capture.json"])
            meta["cap_usd"] = 70.0
            files["capture.json"] = projection.wire(meta)

        self.refused(cap, "capture_binding")

        def pending(files):
            meta = json.loads(files["capture.json"])
            meta["pending"] = {"claude-haiku-5-5": {"batches": ["b"]}}
            files["capture.json"] = projection.wire(meta)

        self.refused(pending, "capture_binding")

    def test_a_changed_report_or_sidecar_is_refused(self):
        def report(files):
            saved = json.loads(files["report.json"])
            saved["spend"]["metered_usd"] = 0.01
            files["report.json"] = projection.wire(saved)

        self.refused(report, "report_mismatch")

        def sidecar(files):
            files["spend.json"] = projection.wire({})

        self.refused(sidecar, "sidecar_member_mismatch")

        def binding(files):
            saved = json.loads(files["report.json"])
            saved["protocol_sha256"] = "0" * 64
            files["report.json"] = projection.wire(saved)

        self.refused(binding, "protocol_binding")

    def test_the_protocol_pins_the_models_prices_cap_and_sources(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual(proto["cap_usd"], 7.0)
        self.assertEqual(proto["schedule_rows"], 672)
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
        refused(lambda p: p.update(schedule_digest="0" * 64), "protocol_inventory")
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
                    self.out,
                    transcripts=self.inputs / "transcripts",
                    capture=self.inputs / "capture.json",
                )
            self.assertEqual((self.out / "report.json").read_bytes(), b"{}")
        finally:
            (self.out / "report.json").write_bytes(before)


if __name__ == "__main__":
    unittest.main()
