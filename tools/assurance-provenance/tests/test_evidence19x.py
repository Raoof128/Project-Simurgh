import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19x as cap  # noqa: E402
import control19x as c  # noqa: E402
import evidence19x as ev  # noqa: E402
import projection  # noqa: E402

SOL = "gpt-6.2-sol"
OPUS = "claude-opus-5-5"
OLD = "claude-sonnet-4-5-20250929"
HAIKU = "claude-haiku-5-5"
ASTRA = "gpt-6.2-astra"
SHARED = "C03"  # this id is also used by a second environment, as in the benchmark
FIRING = {
    SOL: {("C00", 1), ("C00", 3), ("C07", 2)},
    OPUS: {("C00", 2), ("C09", 1)},
}


def case_id(index):
    return SHARED if index == 4 else f"C{index:02d}"


def environment_of(index):
    return c.ENVIRONMENTS[index % 3]


def audit():
    cases = []
    for index in range(c.CASES):
        kind = "bound" if index % 3 == 2 else "open"
        cases.append(
            {
                "environment": environment_of(index),
                "id": case_id(index),
                "formula": f"{case_id(index)}_I1",
                "class": kind,
                "class_if_negative_true": kind,
                "checks": {},
            }
        )
    return {"data_sha256": "1" * 64, "cases": cases}


def rows(model, repeats=None, firing=None, tokens=100):
    firing = FIRING.get(model, set()) if firing is None else firing
    out = []
    for index in range(c.CASES):
        for repeat in repeats or range(1, c.MODELS[model]["repeats"] + 1):
            out.append(
                {
                    "model": model,
                    "environment": environment_of(index),
                    "case": case_id(index),
                    "repeat": repeat,
                    "scored": True,
                    "attack_success": (f"C{index:02d}", repeat) in firing,
                    "attack_partial": False,
                    "task_complete": True,
                    "quadrant": "SECURE_SUCCESS",
                    "attack_checks": {},
                    "task_checks": {},
                    "check_errors": [],
                    "calls": [],
                    "final": "done",
                    "seconds": 1.0,
                    "usage": {
                        model: {
                            "input": tokens,
                            "output": tokens,
                            "cache_write": 0,
                            "cache_read": 0,
                        }
                    },
                    "log_sha256": "2" * 64,
                }
            )
    return sorted(out, key=lambda r: (r["environment"], r["case"], r["repeat"]))


def labels(models=(SOL, OPUS)):
    out = {}
    for model in models:
        for case, repeat in FIRING.get(model, set()):
            key = ev.label_key(model, environment_of(int(case[1:])), case, repeat)
            out[key] = {"label": "own_reason", "note": "n"}
    return out


def capture(model, model_rows, timeline=None):
    usage, by_unit = {}, {}
    for row in model_rows:
        c.add_usage(usage, row["usage"])
        c.add_usage(
            by_unit.setdefault((row["repeat"], row["environment"]), {}), row["usage"]
        )
    got = {
        "rows": model_rows,
        "usage": usage,
        "by_unit": by_unit,
        "superseded": 0,
        "unfinished": 0,
    }
    return cap.capture_record(model, got, "1" * 64, timeline or {})


def smoke(models=(SOL, OPUS), failed=()):
    entries = [
        {
            "model": c.JUDGE,
            "role": "judge",
            "ok": True,
            "error": None,
            "usage": {
                c.JUDGE: {"input": 10, "output": 1, "cache_write": 0, "cache_read": 0}
            },
            "at": "t",
        }
    ]
    for model in models:
        entries.append(
            {
                "model": model,
                "role": "agent",
                "ok": True,
                "error": None,
                "usage": {},
                "at": "t",
            }
        )
    for model in failed:
        entries.append(
            {
                "model": model,
                "role": "agent",
                "ok": False,
                "error": "NotFoundError",
                "usage": {},
                "at": "t",
            }
        )
    return entries


def report(models=None, label_data=None, smoke_data=None, audit_data=None):
    models = {SOL: rows(SOL), OPUS: rows(OPUS)} if models is None else models
    return ev.build_report(
        models,
        {m: capture(m, r) for m, r in models.items()},
        audit() if audit_data is None else audit_data,
        labels(tuple(models)) if label_data is None else label_data,
        smoke(tuple(models)) if smoke_data is None else smoke_data,
    )


def write_inputs(folder, models=None):
    folder = Path(folder)
    models = {SOL: rows(SOL), OPUS: rows(OPUS)} if models is None else models
    for model, model_rows in models.items():
        cap.write_outputs(folder, model, model_rows, capture(model, model_rows))
    (folder / "audit.json").write_text(json.dumps(audit()))
    (folder / "labels.json").write_text(json.dumps(labels(tuple(models))))
    (folder / "smoke.json").write_text(json.dumps(smoke(tuple(models))))
    return dict(
        transcripts=folder / "transcripts",
        captures=folder / "captures",
        audit=folder / "audit.json",
        labels=folder / "labels.json",
        smoke=folder / "smoke.json",
    )


class Pack(unittest.TestCase):
    def build(self, d, **kwargs):
        inputs = write_inputs(Path(d) / "in", **kwargs)
        return ev.run(Path(d) / "pack", **inputs), Path(d) / "pack"

    def test_a_pack_builds_and_verifies(self):
        with tempfile.TemporaryDirectory() as d:
            receipt, pack = self.build(d)
            root = (pack / "ROOT.sha256").read_text().strip()
            again = ev.verify(
                pack / "evidence.zip", root, protocol=pack / "protocol.json"
            )
            members = set(projection.read_pack(pack / "evidence.zip", root))
        sol = receipt["models"][SOL]
        self.assertTrue(receipt["verified"])
        self.assertEqual(
            (sol["runs"], sol["scored"], sol["firing_runs"]), (270, 270, 3)
        )
        self.assertEqual(sol["firing_cases"], 2)
        self.assertAlmostEqual(sol["rate"], 3 / 270)
        self.assertEqual(sol["provider"], "openai")
        self.assertEqual(
            sol["labels"], {"own_reason": 3, "task_failure": 0, "scorer": 0}
        )
        self.assertEqual(sol["repeats"], ["run", "run", "run"])
        self.assertEqual(
            receipt["models"][ASTRA], {"status": "not_run", "provider": "openai"}
        )
        self.assertEqual(list(receipt["models"]), list(c.MODELS))
        self.assertEqual(
            receipt["audit_classes"], {"bound": 30, "open": 60, "open_judged": 0}
        )
        self.assertTrue(receipt["within_caps"])
        self.assertEqual(again["models"], receipt["models"])
        self.assertFalse(receipt["independent_custody"])
        self.assertFalse(receipt["gate_executed"])
        self.assertEqual(
            members,
            {
                "report.json",
                "audit.json",
                "labels.json",
                "smoke.json",
                "transcript-" + SOL + ".json",
                "capture-" + SOL + ".json",
                "transcript-" + OPUS + ".json",
                "capture-" + OPUS + ".json",
            },
        )

    def test_each_case_is_counted_by_the_number_of_models_it_fires_on(self):
        got = report()
        across = got["across_models"]
        self.assertEqual(across["models_captured"], 2)
        self.assertEqual(across["cases_by_models_firing"], {"0": 87, "1": 2, "2": 1})
        self.assertEqual(
            across["firing_cases"],
            [
                ["devops", "C00", [OPUS, SOL]],
                ["devops", "C09", [OPUS]],
                ["marketplace", "C07", [SOL]],
            ],
        )
        self.assertNotIn("rate", across)

    def test_the_meter_is_reported_at_each_vendor_with_the_connection_check(self):
        got = report()
        sol = 270 * (100 * 2.00 + 100 * 10.00) / 1e6
        opus = 270 * (100 * 4.00 + 100 * 20.00) / 1e6
        check = (10 * 2.00 + 1 * 10.00) / 1e6
        self.assertAlmostEqual(got["metered_usd"]["openai"], sol, places=6)
        self.assertAlmostEqual(got["metered_usd"]["anthropic"], opus + check, places=6)
        self.assertEqual(got["caps_usd"], c.CAPS)
        self.assertTrue(got["within_caps"])

    def test_a_meter_over_a_cap_is_reported_and_not_hidden(self):
        heavy = rows(ASTRA, repeats=[1], firing=set(), tokens=30_000)
        got = report(models={ASTRA: heavy})
        self.assertGreater(got["metered_usd"]["openai"], c.CAPS["openai"])
        self.assertFalse(got["within_caps"])

    def test_a_stopped_repeats_runs_are_counted_and_the_repeat_is_named(self):
        some = [
            r
            for r in rows(SOL, firing=set())
            if r["repeat"] == 1 or (r["repeat"] == 2 and r["environment"] == "devops")
        ]
        timeline = {2: {"started": "t0", "stopped": {"environment": "marketplace"}}}
        got = ev.build_report(
            {SOL: some}, {SOL: capture(SOL, some, timeline)}, audit(), {}, smoke((SOL,))
        )
        model = next(m for m in got["models"] if m["id"] == SOL)
        self.assertEqual(model["counts"]["runs"], 90 + 30)
        self.assertEqual(
            [r["status"] for r in model["repeats"]], ["run", "stopped", "not_run"]
        )

    def test_a_model_that_failed_the_connection_check_is_not_available(self):
        got = report(smoke_data=smoke((SOL, OPUS), failed=(ASTRA,)))
        astra = next(m for m in got["models"] if m["id"] == ASTRA)
        self.assertEqual(
            astra,
            {
                "id": ASTRA,
                "status": "not_available",
                "provider": "openai",
                "error": "NotFoundError",
            },
        )
        old = next(m for m in got["models"] if m["id"] == OLD)
        self.assertEqual(old["status"], "not_run")

    def test_every_firing_run_needs_exactly_one_declared_label(self):
        missing = labels()
        missing.pop(next(iter(missing)))
        extra = {
            **labels(),
            ev.label_key(SOL, "productivity", "C50", 1): {
                "label": "scorer",
                "note": "",
            },
        }
        wrong = {k: {"label": "bad_luck", "note": ""} for k in labels()}
        for bad, code in (
            (missing, "labels_cover"),
            (extra, "labels_cover"),
            (wrong, "label_value"),
        ):
            with self.assertRaises(ValueError) as caught:
                report(label_data=bad)
            self.assertIn(code, str(caught.exception))

    def test_rows_outside_the_declaration_are_refused(self):
        other = rows(SOL)
        other[0] = {**other[0], "case": "NOPE"}
        fourth = rows(SOL)
        fourth[0] = {**fourth[0], "repeat": 4}
        twice = rows(SOL) + [rows(SOL)[0]]
        wrong_model = rows(SOL)
        wrong_model[0] = {**wrong_model[0], "model": OPUS}
        for bad in (other, fourth, twice, wrong_model):
            with self.assertRaises(ValueError):
                ev.build_report(
                    {SOL: bad},
                    {SOL: capture(SOL, rows(SOL))},
                    audit(),
                    labels((SOL,)),
                    smoke((SOL,)),
                )
        with self.assertRaises(ValueError):
            ev.build_report(
                {"gpt-x": rows(SOL)},
                {"gpt-x": capture(SOL, rows(SOL))},
                audit(),
                {},
                smoke(),
            )
        second = rows(OLD, repeats=[1, 2], firing=set())
        with self.assertRaises(ValueError):
            ev.build_report(
                {OLD: second},
                {OLD: capture(OLD, rows(OLD))},
                audit(),
                {},
                smoke((OLD,)),
            )

    def test_haikus_first_repeat_must_be_lane_19ws_records(self):
        mine = rows(HAIKU, firing=set())
        first = [r for r in mine if r["repeat"] == 1]
        with self.assertRaises(ValueError) as caught:
            report(models={HAIKU: mine})
        self.assertIn("stage_one_records", str(caught.exception))
        digest = projection.sha(projection.wire(first))
        with mock.patch.object(ev, "STAGE_ONE_RECORDS_SHA256", digest):
            got = report(models={HAIKU: mine})
        self.assertEqual(
            got["stage_one"],
            {"root": c.STAGE_ONE_ROOT, "records": 90, "records_sha256": digest},
        )
        self.assertIsNone(report()["stage_one"])

    def test_the_pinned_digest_is_the_19w_packs_record_member(self):
        pack = ev.ROOT / "docs/research/provenance-phase-19w/evidence.zip"
        files = projection.read_pack(pack, c.STAGE_ONE_ROOT)
        self.assertEqual(
            projection.sha(files["transcript-" + HAIKU + ".json"]),
            ev.STAGE_ONE_RECORDS_SHA256,
        )

    def test_the_same_environment_and_id_twice_in_the_audit_is_refused(self):
        twice = audit()
        twice["cases"][1] = dict(twice["cases"][0])
        with self.assertRaises(ValueError):
            report(audit_data=twice)
        short = audit()
        short["cases"].pop()
        with self.assertRaises(ValueError):
            report(audit_data=short)

    def test_a_changed_record_fails_verification(self):
        with tempfile.TemporaryDirectory() as d:
            _, pack = self.build(d)
            root = (pack / "ROOT.sha256").read_text().strip()
            files = projection.read_pack(pack / "evidence.zip", root)
            changed = json.loads(files[ev.transcript_member(SOL)])
            target = next(r for r in changed if (r["case"], r["repeat"]) == ("C00", 1))
            target["attack_success"] = False
            files[ev.transcript_member(SOL)] = projection.wire(changed)
            forged = Path(d) / "forged.zip"
            forged_root = projection.write_pack(forged, files)
            with self.assertRaises(ValueError) as caught:
                ev.verify(forged, forged_root, protocol=pack / "protocol.json")
        self.assertIn(
            str(caught.exception).split(":")[0], ("labels_cover", "report_mismatch")
        )

    def test_usage_in_the_records_cannot_exceed_the_capture(self):
        small = capture(SOL, rows(SOL)[:10])
        with self.assertRaises(ValueError) as caught:
            ev.build_report(
                {SOL: rows(SOL)}, {SOL: small}, audit(), labels((SOL,)), smoke((SOL,))
            )
        self.assertIn("usage_exceeds_capture", str(caught.exception))

    def test_the_protocol_binds_the_lane_sources_and_what_it_imports(self):
        protocol = ev.build_protocol()
        self.assertEqual(set(protocol["sources"]), ev.expected_sources())
        self.assertIn("tools/assurance-provenance/control19w.py", protocol["sources"])
        self.assertEqual(protocol["benchmark"]["commit"], c.BENCHMARK_COMMIT)
        self.assertEqual(protocol["benchmark"]["mode"], "no_injection")
        self.assertEqual(list(protocol["models"]), list(c.MODELS))
        self.assertEqual(protocol["rules"]["caps_usd"], c.CAPS)
        self.assertEqual(protocol["rules"]["stage_one_root"], c.STAGE_ONE_ROOT)
        self.assertFalse(protocol["gate_executed"])
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "protocol.json"
            body = json.loads(projection.wire(protocol))
            body["rules"]["caps_usd"]["openai"] = 800.0
            path.write_bytes(projection.wire(body))
            with self.assertRaises(ValueError):
                ev.check_protocol(path)


if __name__ == "__main__":
    unittest.main()
