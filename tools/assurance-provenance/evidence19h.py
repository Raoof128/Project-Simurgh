"""Phase 19h evidence: source-bound pack for the local small-model capture, with verify.

The pack carries every generation's raw output. ``verify`` recomputes the outcome of each one,
the emission-shift estimate per model and the whole report from those transcripts and the
committed instrument; it does not run a model, and it cannot tell whether a transcript is what
a model produced. No proposal was executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import capture19
import capture19local as local
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19h"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19h-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19h-protocol-v1"
PHASE_19H_FILES = (
    "capture19.py",
    "capture19local.py",
    "evidence19h.py",
    "projection.py",
    "tests/test_capture19local.py",
    "tests/test_evidence19h.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed, so nothing here is evidence about a gate or a receiver",
    "small 4-bit local models; nothing here transfers to a larger or a hosted model",
    "the hosted capture under IOU-19-SPEND and the informed-attacker arm are not run and stay owed",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
    "an unverbalised belief is invisible to the keyword flag; the flag stays outside the outcome count",
    "an arm at zero or at every generation cannot support a shift estimate and is reported as not evaluable",
)
SIDECARS = {
    "shift.json": lambda r: {m["id"]: m["analysis"]["shift"] for m in r["models"]},
}


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19H_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in local.MODELS
    ]


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "local_emission_capture",
        "arms": list(capture19.ARMS),
        "framing_lines": dict(capture19.FRAMING_LINES),
        "models": declared_models(),
        "settings": dict(local.SETTINGS),
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
        or p.get("arms") != list(capture19.ARMS)
        or p.get("models") != declared_models()
        or p.get("settings") != dict(local.SETTINGS)
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
    if type(recorded) is not dict or set(recorded) != {m["id"] for m in local.MODELS}:
        raise ValueError("capture_binding")
    models = []
    for spec in local.MODELS:
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
                "analysis": local.analyse(spec, transcripts[spec["id"]]),
            }
        )
    return {
        "schema": SCHEMA,
        "arm": "local_emission_capture",
        "framing_digest": sha(wire([s["digest"] for s in local.schedule()])),
        "settings": dict(local.SETTINGS),
        "models": models,
        "generations": sum(m["analysis"]["generations"] for m in models),
        "model_inference": True,
        "gate_executed": False,
        "informed_attacker": "not_run",
        "hosted_capture": "not_run",
        "money_spent": 0,
        "capture": capture,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        a = m["analysis"]
        shift = a["shift"]
        models[m["id"]] = {
            "tool_use_established": a["tool_use_established"],
            "active_baseline": a["active"]["baseline"],
            "restricted": {
                arm: {"n": v["n"], "emitted": v["emitted"], "rate": v["rate"]}
                for arm, v in shift["arms"].items()
            },
            "evaluation_minus_deployment": shift["evaluation_minus_deployment"],
            "evaluable": shift["evaluable"],
            "awareness_flagged": shift["awareness_flag"]["flagged"],
            "truncated": a["truncated"],
        }
    return {
        "verified": True,
        "arm": "local_emission_capture",
        "generations": report["generations"],
        "models": models,
        "model_inference": True,
        "gate_executed": False,
        "informed_attacker": report["informed_attacker"],
        "hosted_capture": report["hosted_capture"],
        "money_spent": report["money_spent"],
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    names = {member(m["id"]) for m in local.MODELS}
    if set(files) != {"report.json", "capture.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    transcripts = {m["id"]: loads(files[member(m["id"])]) for m in local.MODELS}
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
    for m in local.MODELS:
        text = (Path(directory) / (m["id"] + ".jsonl")).read_text()
        out[m["id"]] = [json.loads(line) for line in text.splitlines() if line]
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
