"""Phase 19m evidence: source-bound pack for the 19k study on eight more local models.

The pack carries every generation's raw output. ``verify`` recomputes each outcome, 19k's
analysis, eligibility, the eight hypotheses for every eligible model, the replication counts
and the three predictions from those transcripts and the committed instrument. It does not
run a model, and it cannot tell whether a transcript is what a model produced. No proposal
was executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import evidence19k
import inject19k
import inject19m
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19m"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19m-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19m-protocol-v1"
ARM = "local_injection_styles_more_models"
PHASE_19M_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "evidence19m.py",
    "projection.py",
    "tests/test_inject19m.py",
    "tests/test_evidence19m.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed here, so nothing in this pack is evidence about a gate or a receiver",
    "small local builds that fit an 8 GB machine; nothing here transfers to a larger or a hosted model",
    "the cases and wordings are 19k's, written by an author who had seen the 19i results",
    "the hypotheses are decided only for a model that passes the positive control and declines the control cases; other models are described",
    "eight models from two families are not a sample of models; a count of models on which a hypothesis held is a tally, not a rate with an interval",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
RULES = {
    "active_generations": inject19m.ACTIVE,
    "early_stop_calls": inject19m.EARLY_STOP_CALLS,
    "eligible_min_calls": inject19m.MIN_CALLS,
    "eligible_max_control": inject19m.MAX_CONTROL,
    "wording_spread": inject19m.SPREAD,
    "trial_agreement": inject19m.AGREEMENT,
    "budget_seconds": inject19m.BUDGET_SECONDS,
    "reference_19k": inject19m.REFERENCE_19K,
    "low_llama_control": inject19m.LOW_LLAMA_CONTROL,
}
SIDECARS = {
    "replication.json": lambda r: r["replication"],
    "predictions.json": lambda r: r["predictions"],
    "styles.json": lambda r: {
        m["id"]: m["analysis"]["styles"] for m in r["models"] if "analysis" in m
    },
}
MODEL_IDS = inject19m.MODEL_IDS


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19M_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in inject19m.MODELS
    ]


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "styles": list(inject19k.STYLES),
        "cases_sha256": sha(wire(evidence19k.published_cases())),
        "schedule_digest": sha(wire([s["digest"] for s in inject19k.schedule()])),
        "models": declared_models(),
        "settings": dict(evidence19k.SETTINGS),
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


def build_report(transcripts, capture):
    """``transcripts``: model id -> rows. ``capture``: what the capturing host recorded; its
    status for each model decides how that model's rows are read."""
    recorded = capture.get("models") if type(capture) is dict else None
    if type(recorded) is not dict or set(recorded) != set(MODEL_IDS):
        raise ValueError("capture_binding")
    if set(transcripts) != set(MODEL_IDS):
        raise ValueError("transcript_inventory")
    models = []
    for spec in inject19m.MODELS:
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("repo") != spec["repo"]
            or got.get("revision") != spec["revision"]
            or got.get("status") not in inject19m.STATUSES
        ):
            raise ValueError("capture_binding:" + spec["id"])
        rows = transcripts[spec["id"]]
        entry = {
            **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
            "status": got["status"],
        }
        if got["status"] == "captured":
            entry.update(inject19m.assess(spec, rows))
        elif got["status"] == "stopped_positive_control":
            control = inject19m.active_control(spec, rows)
            if control["calls"] >= inject19m.EARLY_STOP_CALLS:
                raise ValueError("stop_rule:" + spec["id"])
            entry.update(active_control=control)
        else:
            if type(got.get("reason")) is not str or not got["reason"]:
                raise ValueError("capture_binding:" + spec["id"])
            entry.update(reason=got["reason"], partial=inject19m.partial(rows))
        models.append(entry)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "cases": evidence19k.published_cases(),
        "schedule_digest": sha(wire([s["digest"] for s in inject19k.schedule()])),
        "settings": dict(evidence19k.SETTINGS),
        "rules": json.loads(json.dumps(RULES)),
        "models": models,
        "replication": inject19m.replication(models),
        "predictions": inject19m.predictions(models),
        "generations": sum(len(transcripts[i]) for i in MODEL_IDS),
        "model_inference": True,
        "gate_executed": False,
        "money_spent": 0,
        "capture": capture,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        entry = {"status": m["status"]}
        if m["status"] == "captured":
            a = m["analysis"]
            entry.update(
                eligible=m["eligibility"]["eligible"],
                active_calls=a["active_control"]["calls"],
                styles={s: v["sent"] for s, v in a["styles"].items()},
                injected_sent=m["extras"]["injected_sent"],
                hypotheses=(
                    {k: v["supported"] for k, v in m["hypotheses"].items()}
                    if m["hypotheses"]
                    else None
                ),
            )
        elif m["status"] == "stopped_positive_control":
            entry.update(active_calls=m["active_control"]["calls"])
        else:
            entry.update(reason=m["reason"], partial_rows=m["partial"]["rows"])
        models[m["id"]] = entry
    return {
        "verified": True,
        "arm": ARM,
        "generations": report["generations"],
        "models": models,
        "replication": {
            "eligible_models": report["replication"]["eligible_models"],
            "held_on": {h: len(v) for h, v in report["replication"]["held_on"].items()},
        },
        "predictions": {
            k: (v["held"] if v["decided"] else "not_decided")
            for k, v in report["predictions"].items()
        },
        "model_inference": True,
        "gate_executed": False,
        "money_spent": report["money_spent"],
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    names = {member(i) for i in MODEL_IDS}
    if set(files) != {"report.json", "capture.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    transcripts = {i: loads(files[member(i)]) for i in MODEL_IDS}
    actual = build_report(transcripts, loads(files["capture.json"]))
    s_all = loads(wire(saved))
    s_all.pop("protocol_sha256", None)
    if wire(s_all) != wire(actual):
        raise ValueError("report_mismatch")
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    # the receipt describes THIS host's recomputation, never the pack's saved values
    return receipt_for(actual, expected_root)


def read_transcripts(directory):
    out = {}
    for model_id in MODEL_IDS:
        path = Path(directory) / (model_id + ".jsonl")
        text = path.read_text() if path.exists() else ""
        out[model_id] = [json.loads(line) for line in text.splitlines() if line]
    return out


def run(out, *, transcripts, capture, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    rows = read_transcripts(transcripts)
    meta = json.loads(Path(capture).read_text())
    report = build_report(rows, meta)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report), "capture.json": wire(meta)}
    for model_id, model_rows in rows.items():
        files[member(model_id)] = wire(model_rows)
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
    launch.add_argument("--transcripts", type=Path, required=True)
    launch.add_argument("--capture", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(
            args.out.resolve(), transcripts=args.transcripts, capture=args.capture
        )
    else:
        receipt = verify(args.pack, args.expected_root, protocol=args.protocol)
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
