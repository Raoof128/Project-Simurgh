import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19o as ev  # noqa: E402
import hosted19  # noqa: E402
import inject19o as o  # noqa: E402
import projection  # noqa: E402
from test_inject19o import SCHEDULE, Provider, active  # noqa: E402

STOPPED = "gpt-6-luna"
MOVED = "gpt-6.1-terra"
LOUD = "gpt-5.6-luna"
CAPPED = "gpt-5.6-sol"
CAPPED_ROWS = 300


def policy(spec):
    def reply(row):
        if spec["id"] == STOPPED:
            return False
        if spec["id"] == LOUD:
            return True
        return active(row) or (
            spec["id"] == MOVED
            and row["block"] == "placement"
            and row["kind"] == "belief"
            and row["placement"] != "untrusted_source"
        )

    return reply


def inputs(directory):
    directory = Path(directory)
    (directory / "transcripts").mkdir(parents=True)
    meta = {"launched_utc": "2026-11-12T17:00:00Z", "smoke": {}, "models": {}}
    with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-not-real"}):
        for spec in o.MODELS:
            limit = {STOPPED: o.ACTIVE, CAPPED: CAPPED_ROWS}.get(spec["id"])
            hosted19.capture(
                spec,
                directory / "transcripts" / (spec["id"] + ".jsonl"),
                rows=SCHEDULE if limit is None else SCHEDULE[:limit],
                cap_usd=1e9,
                post=Provider(policy(spec), tokens=(700, 100)),
                log=lambda line: None,
            )
            status = {"status": "captured"}
            if spec["id"] == STOPPED:
                status = {"status": "stopped_positive_control"}
            if spec["id"] == CAPPED:
                status = {"status": "not_captured", "reason": "spend_cap_reached"}
            meta["models"][spec["id"]] = {
                "api_model": spec["api_model"],
                "provider": spec["provider"],
                **status,
            }
    (directory / "capture.json").write_text(json.dumps(meta))
    return directory


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19o-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit(files, name, change):
    value = json.loads(files[name])
    change(value)
    files[name] = projection.wire(value)


class Evidence19oTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19o-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        src = inputs(Path(cls.temp.name) / "in")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(
            cls.out, transcripts=src / "transcripts", capture=src / "capture.json"
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def check(self, mutate, reason):
        dst, root = repack(self.pack, mutate)
        with self.assertRaises(ValueError) as caught:
            ev.verify(dst, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["generations"], 4 * 1344 + o.ACTIVE + CAPPED_ROWS)
        self.assertEqual(
            r["models"][STOPPED],
            {"status": "stopped_positive_control", "active_calls": 0},
        )
        self.assertEqual(
            r["models"][CAPPED],
            {
                "status": "not_captured",
                "reason": "spend_cap_reached",
                "partial_rows": CAPPED_ROWS,
            },
        )
        moved = r["models"][MOVED]
        self.assertEqual(
            (moved["eligible_for_styles"], moved["eligible_for_placement"]),
            (True, True),
        )
        self.assertEqual(moved["injected_sent"], {"styles": 0, "placement": 144})
        self.assertEqual(moved["served_models"], {"served-model-1": 1344})
        self.assertAlmostEqual(moved["metered_usd"], 1344 * (700 + 500) / 1e6)
        loud = r["models"][LOUD]
        self.assertEqual(
            (loud["eligible_for_styles"], loud["eligible_for_placement"]),
            (False, False),
        )
        self.assertEqual(r["replication"]["held_on"]["N1"], 1)
        self.assertEqual(r["replication"]["held_on"]["N2"], 1)
        self.assertEqual(len(r["replication"]["eligible_for_placement"]), 3)
        self.assertEqual(r["gate_executed"], False)

    def test_verify_again_and_wrong_root(self):
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(again["models"], self.receipt["models"])
        with self.assertRaises(ValueError):
            ev.verify(self.pack, "0" * 64, protocol=self.proto)

    def test_an_edited_response_or_row_is_caught(self):
        name = ev.member(MOVED)

        def response(files):
            rows = json.loads(files[name])
            rows[900]["response"] = rows[0]["response"]
            files[name] = projection.wire(rows)

        self.check(response, "row_recompute")

        def both(files):
            rows = json.loads(files[name])
            # row 866 is a control case this model declined; make it a send
            rows[866]["response"] = rows[0]["response"]
            rows[866]["raw"] = rows[0]["raw"]
            files[name] = projection.wire(rows)

        self.check(both, "report_mismatch")

        def cheaper(files):
            rows = json.loads(files[name])
            rows[3]["cost_usd"] = 0.0
            files[name] = projection.wire(rows)

        self.check(cheaper, "row_recompute")

    def test_an_edited_decision_tally_or_spend_is_caught(self):
        def decision(v):
            v["models"][2]["placement"]["hypotheses"]["N1"]["supported"] = False

        self.check(lambda f: edit(f, "report.json", decision), "report_mismatch")
        self.check(
            lambda f: edit(f, "report.json", lambda v: v.update(metered_usd=0.01)),
            "report_mismatch",
        )
        self.check(
            lambda f: edit(
                f, "replication.json", lambda v: v["held_on"].update(H1=["x"])
            ),
            "sidecar_member_mismatch",
        )
        self.check(
            lambda f: edit(f, "spend.json", lambda v: v[MOVED].update(metered_usd=0.0)),
            "sidecar_member_mismatch",
        )

    def test_a_model_cannot_be_relabelled_after_the_fact(self):
        def relabel(model_id, **fields):
            def change(v):
                v["models"][model_id].update(fields)

            return lambda f: edit(f, "capture.json", change)

        self.check(
            relabel(LOUD, status="not_captured", reason="x"), "partial_inventory"
        )
        self.check(relabel(CAPPED, status="captured"), "transcript_inventory")
        self.check(relabel(CAPPED, reason=""), "capture_binding")
        self.check(relabel(STOPPED, api_model="another"), "capture_binding")

        def stopped_with_calls(files):
            name = ev.member(MOVED)
            files[name] = projection.wire(json.loads(files[name])[: o.ACTIVE])
            edit(
                files,
                "capture.json",
                lambda v: v["models"][MOVED].update(status="stopped_positive_control"),
            )

        self.check(stopped_with_calls, "stop_rule")

    def test_a_model_that_should_have_stopped_cannot_be_reported_as_captured(self):
        with zipfile.ZipFile(self.pack) as z:
            transcripts = {i: json.loads(z.read(ev.member(i))) for i in ev.MODEL_IDS}
            capture = json.loads(z.read("capture.json"))
        path = Path(self.temp.name) / "silent.jsonl"
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-not-real"}):
            hosted19.capture(
                o.model(STOPPED),
                path,
                rows=SCHEDULE,
                cap_usd=1e9,
                post=Provider(lambda row: False, tokens=(700, 100)),
                log=lambda line: None,
            )
        transcripts[STOPPED] = [json.loads(x) for x in path.read_text().splitlines()]
        capture["models"][STOPPED]["status"] = "captured"
        with self.assertRaises(ValueError) as caught:
            ev.build_report(transcripts, capture)
        self.assertEqual(str(caught.exception), "stop_rule:" + STOPPED)

    def test_spending_past_a_cap_is_caught(self):
        rows = json.loads(zipfile.ZipFile(self.pack).read(ev.member(MOVED)))
        spec = {**o.model(MOVED), "cap_usd": 0.5}
        with self.assertRaises(ValueError) as caught:
            ev.check_cap(spec, rows)
        self.assertEqual(str(caught.exception), "cap_exceeded:" + MOVED)
        ev.check_cap(o.model(MOVED), rows)
        ev.check_cap(spec, rows[:417])  # 416 rows bring the meter to 0.4992

    def test_inventory_and_protocol(self):
        self.check(lambda f: f.pop("spend.json"), "pack_inventory")
        self.check(lambda f: f.pop(ev.member(STOPPED)), "pack_inventory")
        self.check(
            lambda f: edit(
                f, "report.json", lambda v: v.update(protocol_sha256="0" * 64)
            ),
            "protocol_binding",
        )
        p = json.loads(self.proto.read_text())
        self.assertEqual([m["id"] for m in p["models"]], list(o.MODEL_IDS))
        self.assertEqual(p["instrument"]["rows"], 1344)
        self.assertEqual(p["rules"]["total_cap_usd"], 60.0)
        self.assertEqual(set(p["sources"]), ev.expected_sources())
        for change in (
            lambda v: v["models"][0].update(cap_usd=500.0),
            lambda v: v["models"][3].update(usd_per_mtok_out=0.01),
            lambda v: v["rules"].update(early_stop_calls=0),
            lambda v: v["instrument"].update(schedule_digest="0" * 64),
            lambda v: v["sources"].pop("tools/assurance-provenance/hosted19.py"),
        ):
            value = json.loads(self.proto.read_text())
            change(value)
            altered = Path(self.temp.name) / "altered.json"
            altered.write_bytes(projection.wire(value))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=altered)
            self.assertEqual(str(caught.exception), "protocol_inventory")


if __name__ == "__main__":
    unittest.main()
