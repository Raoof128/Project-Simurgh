"""Phase 19x evidence: source-bound pack for lane 19w's no-attack control on eight models.

The pack carries, for every run without an injection, what the model wrote (its tool calls and
final message), the benchmark scorer's results and the run log's digest, with the model-free
audit of the case files, the author's label for each firing run and the connection check.
``verify`` recomputes every count, interval, cross-table and the meter at each vendor from those
members. It does not run a model or the benchmark, and it cannot tell whether a record is what
the model produced. The benchmark's own data is not in the pack.
"""

import argparse
import json
from pathlib import Path

import control19x
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19x"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19x-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19x-protocol-v1"
ARM = "no_attack_control_eight_models"
STAGE_ONE_MODEL = "claude-haiku-5-5"
# SHA-256 of the record member for Haiku 5.5 in lane 19w's pack: its ninety records.
STAGE_ONE_RECORDS_SHA256 = (
    "da23ed8d4993323472c98be302efe99abec91b197e99e8655adeb7e2ddb8fd0d"
)
PHASE_19X_FILES = (
    "control19x.py",
    "capture19x.py",
    "evidence19x.py",
    "control19w.py",
    "projection.py",
    "tests/test_control19x.py",
    "tests/test_capture19x.py",
    "tests/test_evidence19x.py",
)
NON_CLAIMS = (
    "not a ranking of models or of vendors: the models differ in repeats and in temperature, a model may have stopped early, and the judge is a model of one of the two vendors judging both",
    "not evidence that the benchmark paper's conclusions are wrong: its main comparison is between attack types within a model, and a rate common to all types does not change that ordering",
    "not an attack and not a defence",
    "seven of the eight models are not in the paper; the one that is was run through another provider path and scored by another judge than the paper's",
    "no rate pooled over models is reported or meant",
    "a model sent no temperature is not repeatable; repeats are reported, not averaged away",
    "the audit of the case files says an outcome is possible without the attacker's text, not that it is likely",
    "a label on a firing run is the author's reading; the author is an AI system working for the owner",
    "a record is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
    "the metered cost is token counts from the run logs at declared prices; it is not either provider's bill, and a log the runner did not finish is not in it",
)
RULES = {
    "counting": "the benchmark's attack_success for the run, unchanged; a run fires when it is true",
    "not_scored": "listed, kept out of the denominator, not run again",
    "interval": {
        "resample": "cases",
        "draws": control19x.BOOT_DRAWS,
        "seed": control19x.BOOT_SEED,
    },
    "labels": list(control19x.LABELS),
    "classes": list(control19x.CLASSES),
    "across_models": "for each case, the number of captured models with at least one firing run",
    "caps_usd": dict(control19x.CAPS),
    "judge_repeat_reserve_usd": control19x.JUDGE_REPEAT_RESERVE,
    "input_includes_cache_read": dict(control19x.INPUT_INCLUDES_CACHE_READ),
    "start_unit": "one environment of one repeat",
    "environment_cases": dict(control19x.ENVIRONMENT_CASES),
    "stage_one_root": control19x.STAGE_ONE_ROOT,
    "stage_one_records_sha256": STAGE_ONE_RECORDS_SHA256,
}
MODEL_IDS = tuple(control19x.MODELS)
CAPTURE_KEYS = {
    "schema",
    "benchmark",
    "model",
    "provider",
    "judge",
    "judge_votes",
    "declared_repeats",
    "repeats",
    "usage",
    "settings",
    "versions",
    "superseded_logs",
    "unfinished_logs",
}
SMOKE_KEYS = {"model", "role", "ok", "error", "usage", "at"}


def transcript_member(model):
    return "transcript-" + model + ".json"


def capture_member(model):
    return "capture-" + model + ".json"


def label_key(model, environment, case, repeat):
    return f"{model}|{environment}|{case}|{repeat}"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19X_FILES}


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "benchmark": {
            "repo": control19x.BENCHMARK_REPO,
            "commit": control19x.BENCHMARK_COMMIT,
            "environments": list(control19x.ENVIRONMENTS),
            "cases": control19x.CASES,
            "mode": "no_injection",
        },
        "models": {
            model: {**spec, "prices": list(spec["prices"])}
            for model, spec in control19x.MODELS.items()
        },
        "judge": {"model": control19x.JUDGE, "votes": control19x.JUDGE_VOTES},
        "rules": json.loads(json.dumps(RULES)),
        "model_inference": True,
        "gate_executed": False,
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path):
    raw = Path(path).read_bytes()
    p = loads(raw)
    want = build_protocol()
    if type(p) is not dict or set(p) != set(want):
        raise ValueError("protocol_inventory")
    for key, value in want.items():
        if key != "sources" and wire(p[key]) != wire(value):
            raise ValueError("protocol_inventory")
    if type(p["sources"]) is not dict or set(p["sources"]) != expected_sources():
        raise ValueError("protocol_inventory")
    for name, digest in p["sources"].items():
        target = ROOT / name
        if (
            target.is_symlink()
            or not target.is_file()
            or sha(target.read_bytes()) != digest
        ):
            raise ValueError("source_binding:" + name)
    return sha(raw)


def _check_audit(audit):
    if type(audit) is not dict or set(audit) != {"data_sha256", "cases"}:
        raise ValueError("audit_shape")
    by_case = {}
    for row in audit["cases"]:
        if (
            row["class"] not in control19x.CLASSES
            or row["class_if_negative_true"] not in control19x.CLASSES
            or row["environment"] not in control19x.ENVIRONMENTS
        ):
            raise ValueError("audit_class")
        by_case[(row["environment"], row["id"])] = row
    if len(audit["cases"]) != control19x.CASES or len(by_case) != control19x.CASES:
        raise ValueError("audit_cases")
    return by_case


def _check_smoke(smoke):
    if type(smoke) is not list:
        raise ValueError("smoke_shape")
    usage = {}
    for entry in smoke:
        if (
            type(entry) is not dict
            or not SMOKE_KEYS <= set(entry)
            or entry["role"] not in ("agent", "judge")
            or entry["model"] not in MODEL_IDS
            or type(entry["ok"]) is not bool
        ):
            raise ValueError("smoke_entry")
        control19x.add_usage(usage, entry["usage"])
    return usage


def _failed_check(smoke, model):
    """The error class of a model's latest agent check, if that check failed."""
    mine = [e for e in smoke if e["model"] == model and e["role"] == "agent"]
    if mine and not mine[-1]["ok"]:
        return mine[-1]["error"] or "check_failed"
    return None


def _model_report(model, rows, capture, by_case, labels):
    spec = control19x.MODELS[model]
    if (
        type(capture) is not dict
        or set(capture) != CAPTURE_KEYS
        or capture["model"] != model
        or capture["provider"] != spec["provider"]
        or capture["declared_repeats"] != spec["repeats"]
    ):
        raise ValueError("capture_shape:" + model)
    seen = set()
    for row in rows:
        key = (row["environment"], row["case"], row["repeat"])
        if row["model"] != model or key[:2] not in by_case or key in seen:
            raise ValueError("transcript_row:" + model)
        if type(row["repeat"]) is not int or not 1 <= row["repeat"] <= spec["repeats"]:
            raise ValueError("transcript_repeat:" + model)
        seen.add(key)
    counts = control19x.count(rows)
    firing_keys = {label_key(model, *entry) for entry in counts["firing"]}
    mine = {k: v for k, v in labels.items() if k.split("|")[0] == model}
    if set(mine) != firing_keys:
        raise ValueError("labels_cover:" + model)
    tally = {label: 0 for label in control19x.LABELS}
    for value in mine.values():
        if type(value) is not dict or value.get("label") not in control19x.LABELS:
            raise ValueError("label_value:" + model)
        tally[value["label"]] += 1
    by_class = {kind: 0 for kind in control19x.CLASSES}
    for environment, case in counts["firing_cases"]:
        by_class[by_case[(environment, case)]["class"]] += 1
    usage = {}
    for row in rows:
        control19x.add_usage(usage, row["usage"])
    metered = control19x.meter(capture["usage"])
    in_rows = control19x.meter(usage)
    if any(in_rows[p] > metered[p] + 1e-9 for p in metered):
        raise ValueError("usage_exceeds_capture:" + model)
    return {
        "id": model,
        "status": "captured",
        "provider": spec["provider"],
        "declared_repeats": spec["repeats"],
        "repeats": capture["repeats"],
        "counts": counts,
        "firing_cases_by_class": by_class,
        "labels": tally,
        "metered_usd": _rounded(metered),
        "unfinished_logs": capture["unfinished_logs"],
    }


def _rounded(spent):
    return {provider: round(value, 6) for provider, value in sorted(spent.items())}


def _stage_one(transcripts):
    """Haiku 5.5's first repeat must be the ninety records of lane 19w's pack."""
    if STAGE_ONE_MODEL not in transcripts:
        return None
    first = [r for r in transcripts[STAGE_ONE_MODEL] if r["repeat"] == 1]
    digest = sha(wire(first))
    if digest != STAGE_ONE_RECORDS_SHA256:
        raise ValueError("stage_one_records")
    return {
        "root": control19x.STAGE_ONE_ROOT,
        "records": len(first),
        "records_sha256": digest,
    }


def _across(models):
    """For each case, the captured models with at least one firing run. No pooled rate."""
    captured = [m for m in models if m["status"] == "captured"]
    firing = {}
    for m in captured:
        for environment, case in m["counts"]["firing_cases"]:
            firing.setdefault((environment, case), []).append(m["id"])
    tally = {str(n): 0 for n in range(len(captured) + 1)}
    tally["0"] = control19x.CASES - len(firing)
    for names in firing.values():
        tally[str(len(names))] += 1
    return {
        "models_captured": len(captured),
        "cases_by_models_firing": {k: v for k, v in tally.items() if v or k == "0"},
        "firing_cases": [[e, c, sorted(firing[(e, c)])] for e, c in sorted(firing)],
    }


def build_report(transcripts, captures, audit, labels, smoke):
    by_case = _check_audit(audit)
    smoke_usage = _check_smoke(smoke)
    if type(labels) is not dict:
        raise ValueError("labels_shape")
    if set(transcripts) != set(captures) or not set(transcripts) <= set(MODEL_IDS):
        raise ValueError("models")
    if {k.split("|")[0] for k in labels} - set(transcripts):
        raise ValueError("labels_model")
    stage_one = _stage_one(transcripts)
    models, lane_usage = [], dict(json.loads(json.dumps(smoke_usage)))
    for model in MODEL_IDS:
        provider = control19x.MODELS[model]["provider"]
        if model in transcripts:
            models.append(
                _model_report(
                    model, transcripts[model], captures[model], by_case, labels
                )
            )
            control19x.add_usage(lane_usage, captures[model]["usage"])
        elif _failed_check(smoke, model):
            models.append(
                {
                    "id": model,
                    "status": "not_available",
                    "provider": provider,
                    "error": _failed_check(smoke, model),
                }
            )
        else:
            models.append({"id": model, "status": "not_run", "provider": provider})
    spent = control19x.meter(lane_usage)
    classes = {kind: 0 for kind in control19x.CLASSES}
    sensitivity = {kind: 0 for kind in control19x.CLASSES}
    for row in audit["cases"]:
        classes[row["class"]] += 1
        sensitivity[row["class_if_negative_true"]] += 1
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "benchmark_commit": control19x.BENCHMARK_COMMIT,
        "audit": {
            "data_sha256": audit["data_sha256"],
            "classes": classes,
            "classes_if_negative_true": sensitivity,
        },
        "stage_one": stage_one,
        "models": models,
        "across_models": _across(models),
        "metered_usd": _rounded(spent),
        "caps_usd": dict(control19x.CAPS),
        "within_caps": all(
            spent[p] <= control19x.CAPS[p] + 1e-9 for p in control19x.CAPS
        ),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        entry = {"status": m["status"], "provider": m["provider"]}
        if m["status"] == "captured":
            c = m["counts"]
            entry.update(
                runs=c["runs"],
                scored=c["scored"],
                firing_runs=c["firing_runs"],
                firing_cases=len(c["firing_cases"]),
                rate=c["rate"],
                interval=c["interval"],
                task_rate=c["task_rate"],
                labels=m["labels"],
                repeats=[r["status"] for r in m["repeats"]],
            )
        elif m["status"] == "not_available":
            entry["error"] = m["error"]
        models[m["id"]] = entry
    return {
        "verified": True,
        "arm": ARM,
        "benchmark_commit": report["benchmark_commit"],
        "audit_classes": report["audit"]["classes"],
        "stage_one": report["stage_one"],
        "models": models,
        "cases_by_models_firing": report["across_models"]["cases_by_models_firing"],
        "model_inference": True,
        "gate_executed": False,
        "metered_usd": report["metered_usd"],
        "caps_usd": report["caps_usd"],
        "within_caps": report["within_caps"],
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, benchmark=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    captured = [
        m["id"] for m in saved.get("models", []) if m.get("status") == "captured"
    ]
    names = {"report.json", "audit.json", "labels.json", "smoke.json"}
    names |= {transcript_member(m) for m in captured} | {
        capture_member(m) for m in captured
    }
    if set(files) != names:
        raise ValueError("pack_inventory")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    audit = loads(files["audit.json"])
    if benchmark is not None:
        if control19x.benchmark_commit(benchmark) != control19x.BENCHMARK_COMMIT:
            raise ValueError("benchmark_commit")
        if wire(control19x.audit(benchmark)) != wire(audit):
            raise ValueError("audit_mismatch")
    actual = build_report(
        {m: loads(files[transcript_member(m)]) for m in captured},
        {m: loads(files[capture_member(m)]) for m in captured},
        audit,
        loads(files["labels.json"]),
        loads(files["smoke.json"]),
    )
    s_all = loads(wire(saved))
    s_all.pop("protocol_sha256", None)
    if wire(s_all) != wire(actual):
        raise ValueError("report_mismatch")
    # the receipt describes THIS host's recomputation, never the pack's saved values
    return receipt_for(actual, expected_root)


def read_inputs(transcripts, captures):
    """Records and capture records of every model that has at least one record."""
    rows, meta = {}, {}
    for model in MODEL_IDS:
        path = Path(transcripts) / (model + ".jsonl")
        if not path.exists():
            continue
        found = [json.loads(line) for line in path.read_text().splitlines() if line]
        if found:
            rows[model] = found
            meta[model] = json.loads((Path(captures) / (model + ".json")).read_text())
    return rows, meta


def run(out, *, transcripts, captures, audit, labels, smoke, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    rows, meta = read_inputs(transcripts, captures)
    audit_data = json.loads(Path(audit).read_text())
    label_data = json.loads(Path(labels).read_text())
    smoke_data = [
        {key: entry[key] for key in sorted(SMOKE_KEYS)}
        for entry in json.loads(Path(smoke).read_text())
    ]
    report = build_report(rows, meta, audit_data, label_data, smoke_data)
    report.update(protocol_sha256=protocol_digest)
    files = {
        "report.json": wire(report),
        "audit.json": wire(audit_data),
        "labels.json": wire(label_data),
        "smoke.json": wire(smoke_data),
    }
    for model in rows:
        files[transcript_member(model)] = wire(rows[model])
        files[capture_member(model)] = wire(meta[model])
    (out / "report.json").write_bytes(files["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(manifest_root + "\n")
    receipt = verify(out / "evidence.zip", manifest_root, protocol=proto_path)
    (out / "receipt.json").write_bytes(wire(receipt))
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
    launch.add_argument("--transcripts", type=Path, required=True)
    launch.add_argument("--captures", type=Path, required=True)
    launch.add_argument("--audit", type=Path, required=True)
    launch.add_argument("--labels", type=Path, required=True)
    launch.add_argument("--smoke", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    check.add_argument("--benchmark", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(
            args.out.resolve(),
            transcripts=args.transcripts,
            captures=args.captures,
            audit=args.audit,
            labels=args.labels,
            smoke=args.smoke,
        )
    else:
        receipt = verify(
            args.pack,
            args.expected_root,
            protocol=args.protocol,
            benchmark=args.benchmark,
        )
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
