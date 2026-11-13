"""Phase 19u evidence: source-bound pack for the hosted Claude lane (P19-HOSTED02), with verify.

The pack holds each model's stored rows (the provider's response for every request), the
capture record and the report. ``verify`` rebuilds the schedule, binds every row to its slot,
recomputes each row's text, token count and cost from its stored response at the declared
prices, reads every answer again and recomputes each analysis, the hypothesis and the spend.
It does not send a request. Standard library only.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import inject19u
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19u"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19u-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19u-protocol-v1"
ARM = "hosted_claude_two_runs"
PHASE_19U_FILES = (
    "capture19.py",
    "capture19local.py",
    "hosted19.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "inject19n.py",
    "inject19o.py",
    "inject19u.py",
    "evidence19u.py",
    "projection.py",
    "tests/test_inject19u.py",
    "tests/test_evidence19u.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed, so nothing here is evidence about a gate or a receiver",
    "fixed texts written by the author; no attacker adapted to these models, and a floor of zero sends says only that these texts did not move them",
    "half or a quarter of 19o's schedule, one tool, short tasks; nothing here is about these models in a long task with real tools",
    "the first run's output limit cut answers off; its rows are reported as they are and its truncated answers are neither sends nor declines",
    "the models were sent different numbers of rows and two different output limits, so their rates are not a like-for-like comparison",
    "a hosted model cannot be pinned to weights or reproduced from a seed; a row is what the provider returned once",
    "the lane's code was written by a model of the same provider's family under the owner's direction",
    "the spend is the lane's meter at the declared batch prices; the provider's bill is the authority and was not compared here",
    "verify recomputes from stored responses; it does not send a request",
)
SIDECARS = {
    "sends.json": lambda r: {
        run + "/" + m["id"]: (m["analysis"] or {}).get("sends")
        for run, models in r["runs"].items()
        for m in models
    },
    "spend.json": lambda r: r["spend"],
    "hypothesis.json": lambda r: r["hypothesis"],
}
MODEL_IDS = inject19u.MODEL_IDS
RUN_NAMES = tuple(inject19u.RUNS)


def member(run, model_id):
    return "transcript-" + run + "-" + model_id + ".json"


def capture_member(run):
    return "capture-" + run + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19U_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    keys = ("id", "provider", "api_model", "usd_per_mtok_in", "usd_per_mtok_out")
    return [{k: m[k] for k in keys} for m in inject19u.MODELS]


def schedule_digest(divisor):
    return sha(wire([s["digest"] for s in inject19u.schedule(divisor)]))


def _declared():
    return {
        "arm": ARM,
        "models": declared_models(),
        "runs": {name: dict(run) for name, run in inject19u.RUNS.items()},
        "deciding": dict(inject19u.DECIDING),
        "not_available": dict(inject19u.NOT_AVAILABLE),
        "cap_usd": inject19u.TOTAL_CAP_USD,
        "input_bound": inject19u.INPUT_BOUND,
        "active": inject19u.ACTIVE,
        "min_calls": inject19u.MIN_CALLS,
        "schedule_digests": {str(d): schedule_digest(d) for d in (2, 4)},
        "endpoint": inject19u.BATCH_URL,
        "model_inference": True,
        "gate_executed": False,
    }


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        **_declared(),
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or any(wire(p.get(k)) != wire(v) for k, v in _declared().items())
        or type(p.get("sources")) is not dict
        or set(p["sources"]) != expected_sources()
    ):
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


def _run_models(run, rows_by_model, capture, before):
    """One run's models, each bound to the run's own record, and what the run metered."""
    plan = inject19u.RUNS[run]["rows"]
    recorded = capture.get("models") if type(capture) is dict else None
    if (
        type(recorded) is not dict
        or set(recorded) != set(plan)
        or capture.get("run", "first") != run
        or capture.get("cap_usd") != inject19u.TOTAL_CAP_USD
        or capture.get("pending")
        or type(capture.get("smoke_spent_usd")) not in (int, float)
        or abs(capture["smoke_spent_usd"] - before) > 1e-6
    ):
        raise ValueError("capture_binding:" + run)
    if type(rows_by_model) is not dict or set(rows_by_model) != set(plan):
        raise ValueError("transcript_inventory")
    models, metered = [], 0.0
    for name, divisor in plan.items():
        got, rows = recorded[name], rows_by_model[name]
        whole = len(inject19u.schedule(divisor))
        if (
            type(got) is not dict
            or got.get("status") not in inject19u.STATUSES
            or got.get("rows") != len(rows)
            or (got["status"] == "captured") is not (len(rows) == whole)
            or (got["status"] == "not_captured") is not (len(rows) == 0)
        ):
            raise ValueError("capture_binding:" + run + "/" + name)
        analysis = None
        if rows:
            analysis = inject19u.analyse(inject19u.spec_for(run, name), rows, divisor)
            if round(analysis["spend"]["metered_usd"], 6) != got.get("spent_usd"):
                raise ValueError("capture_binding:" + run + "/" + name)
            metered += analysis["spend"]["metered_usd"]
        models.append(
            {
                "id": name,
                "status": got["status"],
                "reason": got.get("reason"),
                "max_tokens": inject19u.RUNS[run]["max_tokens"],
                "schedule_rows": whole,
                "analysis": analysis,
                "eligibility": inject19u.eligibility(analysis) if analysis else None,
            }
        )
    return models, metered


def build_report(transcripts, captures):
    """``transcripts``: run -> model id -> stored rows. ``captures``: run -> the run's own
    record, bound where the rows can check it (status, row count, metered spend) and chained:
    the second run starts from what the first had metered."""
    if set(transcripts) != set(RUN_NAMES) or set(captures) != set(RUN_NAMES):
        raise ValueError("run_inventory")
    smoke = captures["first"].get("smoke_spent_usd")
    if type(smoke) not in (int, float):
        raise ValueError("capture_binding:first")
    runs, total = {}, float(smoke)
    for run in RUN_NAMES:
        runs[run], metered = _run_models(run, transcripts[run], captures[run], total)
        total += metered
    analyses = {}
    for name in MODEL_IDS:
        decided_in = inject19u.DECIDING[name]
        record = next(m for m in runs[decided_in] if m["id"] == name)
        if record["status"] == "captured":
            analyses[name] = record["analysis"]
    every = [m for models in runs.values() for m in models if m["analysis"]]
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "runs": runs,
        "deciding": dict(inject19u.DECIDING),
        "not_available": dict(inject19u.NOT_AVAILABLE),
        "hypothesis": inject19u.hypothesis(analyses),
        "spend": {
            "cap_usd": inject19u.TOTAL_CAP_USD,
            "smoke_usd": round(float(smoke), 6),
            "metered_usd": round(total, 6),
            "within_cap": total <= inject19u.TOTAL_CAP_USD,
            "requests": sum(m["analysis"]["spend"]["requests"] for m in every),
        },
        "generations": sum(m["analysis"]["rows"] for m in every),
        "model_inference": True,
        "gate_executed": False,
        "captures": captures,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for run, listed in report["runs"].items():
        for m in listed:
            a = m["analysis"]
            models[run + "/" + m["id"]] = {
                "status": m["status"],
                "eligible": m["eligibility"]["eligible"] if m["eligibility"] else None,
                "active": a["active"] if a else None,
                "restricted": {k: a["restricted"][k] for k in ("n", "sent")}
                if a
                else None,
                "outcomes": a["outcomes"] if a else None,
                "metered_usd": a["spend"]["metered_usd"] if a else 0.0,
            }
    return {
        "verified": True,
        "arm": ARM,
        "generations": report["generations"],
        "models": models,
        "deciding": report["deciding"],
        "not_available": report["not_available"],
        "hypothesis": {k: v["holds"] for k, v in report["hypothesis"].items()},
        "decided_on": report["hypothesis"]["A1"]["eligible"],
        "spend": report["spend"],
        "model_inference": True,
        "gate_executed": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def _members():
    names = set()
    for run in RUN_NAMES:
        names.add(capture_member(run))
        names.update(member(run, name) for name in inject19u.RUNS[run]["rows"])
    return names


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS, *_members()}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    transcripts = {
        run: {n: loads(files[member(run, n)]) for n in inject19u.RUNS[run]["rows"]}
        for run in RUN_NAMES
    }
    captures = {run: loads(files[capture_member(run)]) for run in RUN_NAMES}
    actual = build_report(transcripts, captures)
    s_all = loads(wire(saved))
    s_all.pop("protocol_sha256", None)
    if wire(s_all) != wire(actual):
        raise ValueError("report_mismatch")
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    # the receipt describes THIS host's recomputation, never the pack's saved values
    return receipt_for(actual, expected_root)


def read_run(directory, run):
    """A run's capture directory as (model id -> rows, capture record)."""
    directory = Path(directory)
    rows = {}
    for name in inject19u.RUNS[run]["rows"]:
        path = directory / "transcripts" / (name + ".jsonl")
        text = path.read_text() if path.exists() else ""
        rows[name] = [json.loads(line) for line in text.splitlines() if line]
    return rows, json.loads((directory / "capture.json").read_text())


def run(out, *, first, second, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    transcripts, captures = {}, {}
    for name, directory in (("first", first), ("second", second)):
        transcripts[name], captures[name] = read_run(directory, name)
    report = build_report(transcripts, captures)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for name in RUN_NAMES:
        files[capture_member(name)] = wire(captures[name])
        for model_id, rows in transcripts[name].items():
            files[member(name, model_id)] = wire(rows)
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
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
    launch.add_argument("--first", type=Path, required=True)
    launch.add_argument("--second", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(args.out.resolve(), first=args.first, second=args.second)
    else:
        receipt = verify(args.pack, args.expected_root, protocol=args.protocol)
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
