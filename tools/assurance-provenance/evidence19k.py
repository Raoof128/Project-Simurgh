"""Phase 19k evidence: source-bound pack for the scaled injection-style study, with verify.

The pack carries every generation's raw output. ``verify`` recomputes the outcome of each one,
the send rate per style, the five pre-set hypotheses and the whole report from those transcripts and the
committed instrument; it does not run a model, and it cannot tell whether a transcript is what
a model produced. No proposal was executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import capture19local as local
import evidence19d
import inject19k
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19k"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19k-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19k-protocol-v1"
PHASE_19K_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "evidence19k.py",
    "projection.py",
    "tests/test_inject19k.py",
    "tests/test_evidence19k.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed here, so nothing in this pack is evidence about a gate or a receiver",
    "three small 4-bit local models; nothing here transfers to a larger or a hosted model",
    "five wordings per style, written by the author who had seen the 19i results; a style's effect here is not shown to hold for other wordings",
    "the five hypotheses are fixed for the primary model only; every other model's numbers are descriptive",
    "six states are six clusters; the state-cluster interval is a coarse check, not a model of the dependence",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
SIDECARS = {
    "styles.json": lambda r: {m["id"]: m["analysis"]["styles"] for m in r["models"]},
    "hypotheses.json": lambda r: r["hypotheses"],
}
SETTINGS = {
    **{k: v for k, v in local.SETTINGS.items() if k not in ("seed_base", "seed_rule")},
    "seed_base": inject19k.SEED_BASE,
    "trials_per_wording": inject19k.TRIALS_VARIED,
    "trials_single_text": inject19k.TRIALS_SINGLE,
    "wordings": inject19k.WORDINGS,
    "bootstrap": inject19k.BOOTSTRAP,
    "seed_rule": "seed_base + schedule index, the same for every model",
}
MODEL_IDS = tuple(m["id"] for m in inject19k.MODELS)


def specs():
    return list(inject19k.MODELS)


def published_cases():
    return [
        {k: c[k] for k in ("id", "state", "style", "wording", "base_task", "source")}
        for c in inject19k.cases()
    ]


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19K_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in specs()
    ]


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "local_injection_styles_scaled",
        "styles": list(inject19k.STYLES),
        "primary_model": inject19k.PRIMARY,
        "cases_sha256": sha(wire(published_cases())),
        "models": declared_models(),
        "settings": dict(SETTINGS),
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
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or p.get("styles") != list(inject19k.STYLES)
        or p.get("primary_model") != inject19k.PRIMARY
        or p.get("cases_sha256") != sha(wire(published_cases()))
        or p.get("models") != declared_models()
        or p.get("settings") != dict(SETTINGS)
        or p.get("model_inference") is not True
        or p.get("gate_executed") is not False
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


def build_report(transcripts, capture):
    """``transcripts``: model id -> rows. ``capture``: what the capturing host recorded about
    itself and the weights; carried, and bound only where the declaration can check it."""
    recorded = capture.get("models") if type(capture) is dict else None
    if type(recorded) is not dict or set(recorded) != set(MODEL_IDS):
        raise ValueError("capture_binding")
    models = []
    for spec in specs():
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("repo") != spec["repo"]
            or got.get("revision") != spec["revision"]
        ):
            raise ValueError("capture_binding:" + spec["id"])
        models.append(
            {
                **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
                "analysis": inject19k.analyse(spec, transcripts[spec["id"]]),
            }
        )
    primary = next(m for m in models if m["id"] == inject19k.PRIMARY)
    return {
        "schema": SCHEMA,
        "arm": "local_injection_styles_scaled",
        "primary_model": inject19k.PRIMARY,
        "hypotheses": inject19k.hypotheses(primary["analysis"]),
        "cases": published_cases(),
        "schedule_digest": sha(wire([s["digest"] for s in inject19k.schedule()])),
        "settings": dict(SETTINGS),
        "models": models,
        "generations": sum(m["analysis"]["generations"] for m in models),
        "model_inference": True,
        "gate_executed": False,
        "money_spent": 0,
        "capture": capture,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        a = m["analysis"]
        models[m["id"]] = {
            "tool_use_established": a["tool_use_established"],
            "active_control": a["active_control"],
            "styles": {
                style: {"n": v["n"], "sent": v["sent"], "rate": v["rate"]}
                for style, v in a["styles"].items()
            },
            "outcomes": a["outcomes"],
        }
    return {
        "verified": True,
        "arm": "local_injection_styles_scaled",
        "generations": report["generations"],
        "styles": list(inject19k.STYLES),
        "primary_model": report["primary_model"],
        "hypotheses": {k: v["supported"] for k, v in report["hypotheses"].items()},
        "models": models,
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
        text = (Path(directory) / (model_id + ".jsonl")).read_text()
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
