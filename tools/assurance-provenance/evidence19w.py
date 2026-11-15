"""Phase 19w evidence: source-bound pack for a no-attack control on a published benchmark.

The pack carries, for every run without an injection, what the model wrote (its tool calls and
final message), the benchmark scorer's results and the run log's digest, with the model-free
audit of the case files and the author's label for each firing run. ``verify`` recomputes every
count, interval, cross-table and the meter from those members. It does not run a model or the
benchmark, and it cannot tell whether a record is what the model produced. The benchmark's own
data is not in the pack.
"""

import argparse
import json
from pathlib import Path

import control19w
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19w"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19w-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19w-protocol-v1"
ARM = "no_attack_control"
PHASE_19W_FILES = (
    "control19w.py",
    "capture19w.py",
    "evidence19w.py",
    "projection.py",
    "tests/test_control19w.py",
    "tests/test_capture19w.py",
    "tests/test_evidence19w.py",
)
NON_CLAIMS = (
    "not evidence that the benchmark paper's conclusions are wrong: its main comparison is between attack types within a model, and a rate common to all types does not change that ordering",
    "not an attack, a defence or a ranking of models",
    "one vendor's models through that vendor's own API; the paper's runs went through another provider at temperature 0",
    "the scorer's judge is not the paper's judge, so a judged check may read differently",
    "the 5.5 models take no temperature, so a run is not repeatable; repeats are reported, not averaged away",
    "the audit of the case files says an outcome is possible without the attacker's text, not that it is likely",
    "a label on a firing run is the author's reading; the author is an AI system working for the owner",
    "a record is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
    "the metered cost is token counts from the run logs at declared prices; it is not the provider's bill",
)
RULES = {
    "counting": "the benchmark's attack_success for the run, unchanged; a run fires when it is true",
    "not_scored": "listed, kept out of the denominator, not run again",
    "interval": {
        "resample": "cases",
        "draws": control19w.BOOT_DRAWS,
        "seed": control19w.BOOT_SEED,
    },
    "labels": list(control19w.LABELS),
    "classes": list(control19w.CLASSES),
    "prices_usd_per_million": {k: list(v) for k, v in control19w.PRICES.items()},
    "cache_write": control19w.CACHE_WRITE,
    "cache_read": control19w.CACHE_READ,
    "cap_stage_one_usd": control19w.CAP_STAGE_ONE,
    "first_repeat_reserve_usd": control19w.FIRST_REPEAT_RESERVE,
}
MODEL_IDS = tuple(control19w.STAGES)
CAPTURE_KEYS = {
    "schema",
    "benchmark",
    "model",
    "judge",
    "judge_votes",
    "stage",
    "declared_repeats",
    "repeats",
    "usage",
    "settings",
    "versions",
    "superseded_logs",
}


def transcript_member(model):
    return "transcript-" + model + ".json"


def capture_member(model):
    return "capture-" + model + ".json"


def label_key(row):
    return f"{row['model']}|{row['case']}|{row['repeat']}"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19W_FILES}


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "benchmark": {
            "repo": control19w.BENCHMARK_REPO,
            "commit": control19w.BENCHMARK_COMMIT,
            "environments": list(control19w.ENVIRONMENTS),
            "cases": control19w.CASES,
            "mode": "no_injection",
        },
        "stages": json.loads(json.dumps(control19w.STAGES)),
        "judge": {"model": control19w.JUDGE, "votes": control19w.JUDGE_VOTES},
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
    ids = [row["id"] for row in audit["cases"]]
    if len(ids) != control19w.CASES or len(set(ids)) != len(ids):
        raise ValueError("audit_cases")
    for row in audit["cases"]:
        if (
            row["class"] not in control19w.CLASSES
            or row["environment"] not in control19w.ENVIRONMENTS
        ):
            raise ValueError("audit_class")
    return {row["id"]: row for row in audit["cases"]}


def _model_report(model, rows, capture, by_case, labels):
    declared = control19w.STAGES[model]
    if (
        type(capture) is not dict
        or set(capture) != CAPTURE_KEYS
        or capture["model"] != model
    ):
        raise ValueError("capture_shape:" + model)
    seen = set()
    for row in rows:
        key = (row["case"], row["repeat"])
        if row["model"] != model or row["case"] not in by_case or key in seen:
            raise ValueError("transcript_row:" + model)
        if by_case[row["case"]]["environment"] != row["environment"]:
            raise ValueError("transcript_environment:" + model)
        if (
            type(row["repeat"]) is not int
            or not 1 <= row["repeat"] <= capture["declared_repeats"]
        ):
            raise ValueError("transcript_repeat:" + model)
        seen.add(key)
    counts = control19w.count(rows)
    firing_keys = {f"{model}|{case}|{repeat}" for case, repeat in counts["firing"]}
    mine = {k: v for k, v in labels.items() if k.split("|")[0] == model}
    if set(mine) != firing_keys:
        raise ValueError("labels_cover:" + model)
    tally = {label: 0 for label in control19w.LABELS}
    for value in mine.values():
        if type(value) is not dict or value.get("label") not in control19w.LABELS:
            raise ValueError("label_value:" + model)
        tally[value["label"]] += 1
    by_class = {kind: 0 for kind in control19w.CLASSES}
    for case in counts["firing_cases"]:
        by_class[by_case[case]["class"]] += 1
    usage = {}
    for row in rows:
        control19w.add_usage(usage, row["usage"])
    metered = control19w.meter(capture["usage"])
    if control19w.meter(usage) > metered + 1e-9:
        raise ValueError("usage_exceeds_capture:" + model)
    return {
        "id": model,
        "status": "captured",
        "stage": declared["stage"],
        "declared_repeats": capture["declared_repeats"],
        "repeats": capture["repeats"],
        "counts": counts,
        "firing_cases_by_class": by_class,
        "labels": tally,
        "metered_usd": round(metered, 6),
    }


def build_report(transcripts, captures, audit, labels):
    by_case = _check_audit(audit)
    if type(labels) is not dict:
        raise ValueError("labels_shape")
    if set(transcripts) != set(captures) or not set(transcripts) <= set(MODEL_IDS):
        raise ValueError("models")
    if {k.split("|")[0] for k in labels} - set(transcripts):
        raise ValueError("labels_model")
    models = []
    for model in MODEL_IDS:
        if model in transcripts:
            models.append(
                _model_report(
                    model, transcripts[model], captures[model], by_case, labels
                )
            )
        else:
            models.append(
                {
                    "id": model,
                    "status": "not_run",
                    "stage": control19w.STAGES[model]["stage"],
                }
            )
    stage_one = sum(
        m["metered_usd"]
        for m in models
        if m["status"] == "captured" and m["stage"] == 1
    )
    classes = {kind: 0 for kind in control19w.CLASSES}
    sensitivity = {kind: 0 for kind in control19w.CLASSES}
    for row in audit["cases"]:
        classes[row["class"]] += 1
        sensitivity[row["class_if_negative_true"]] += 1
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "benchmark_commit": control19w.BENCHMARK_COMMIT,
        "audit": {
            "data_sha256": audit["data_sha256"],
            "classes": classes,
            "classes_if_negative_true": sensitivity,
        },
        "models": models,
        "metered_usd_stage_one": round(stage_one, 6),
        "within_cap_stage_one": stage_one <= control19w.CAP_STAGE_ONE + 1e-9,
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        entry = {"status": m["status"], "stage": m["stage"]}
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
            )
        models[m["id"]] = entry
    return {
        "verified": True,
        "arm": ARM,
        "benchmark_commit": report["benchmark_commit"],
        "audit_classes": report["audit"]["classes"],
        "models": models,
        "model_inference": True,
        "gate_executed": False,
        "metered_usd_stage_one": report["metered_usd_stage_one"],
        "within_cap_stage_one": report["within_cap_stage_one"],
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
    names = {"report.json", "audit.json", "labels.json"}
    names |= {transcript_member(m) for m in captured} | {
        capture_member(m) for m in captured
    }
    if set(files) != names:
        raise ValueError("pack_inventory")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    audit = loads(files["audit.json"])
    if benchmark is not None:
        if control19w.benchmark_commit(benchmark) != control19w.BENCHMARK_COMMIT:
            raise ValueError("benchmark_commit")
        if wire(control19w.audit(benchmark)) != wire(audit):
            raise ValueError("audit_mismatch")
    actual = build_report(
        {m: loads(files[transcript_member(m)]) for m in captured},
        {m: loads(files[capture_member(m)]) for m in captured},
        audit,
        loads(files["labels.json"]),
    )
    s_all = loads(wire(saved))
    s_all.pop("protocol_sha256", None)
    if wire(s_all) != wire(actual):
        raise ValueError("report_mismatch")
    # the receipt describes THIS host's recomputation, never the pack's saved values
    return receipt_for(actual, expected_root)


def read_inputs(transcripts, captures):
    rows, meta = {}, {}
    for model in MODEL_IDS:
        path = Path(transcripts) / (model + ".jsonl")
        if path.exists():
            rows[model] = [
                json.loads(line) for line in path.read_text().splitlines() if line
            ]
            meta[model] = json.loads((Path(captures) / (model + ".json")).read_text())
    return rows, meta


def run(out, *, transcripts, captures, audit, labels, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    rows, meta = read_inputs(transcripts, captures)
    audit_data = json.loads(Path(audit).read_text())
    label_data = json.loads(Path(labels).read_text())
    report = build_report(rows, meta, audit_data, label_data)
    report.update(protocol_sha256=protocol_digest)
    files = {
        "report.json": wire(report),
        "audit.json": wire(audit_data),
        "labels.json": wire(label_data),
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
