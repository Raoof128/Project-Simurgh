"""Phase 19s evidence: source-bound pack for the monitor study (P19-MONITOR01), with verify.

The pack holds each monitor's outputs and what the capturing host recorded about itself.
``verify`` rebuilds every transcript and prompt from the instrument and the pinned monitor
prompt, binds each output to its slot, reads every score again, and recomputes each analysis
and the hypotheses; it does not rerun a model. Standard library only.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import monitor19s
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19s"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19s-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19s-protocol-v1"
ARM = "local_monitor_twins"
PHASE_19S_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "monitor19s.py",
    "evidence19s.py",
    "projection.py",
    "tests/test_monitor19s.py",
    "tests/test_evidence19s.py",
)
PROMPT_FILES = (
    "docs/research/provenance-phase-19s/third-party/sleight-bench/control_arena.md",
    "docs/research/provenance-phase-19s/third-party/sleight-bench/LICENSE",
)
NON_CLAIMS = (
    "two small 4-bit local models as monitors; nothing here is evidence about the monitors the benchmark's authors tested or about a frontier model",
    "the agent's action is fixed and no agent runs; a transcript is one user block and one tool call, not a long session",
    "24 cases and one monitor prompt, written by others for coding-agent sessions and used here unchanged on a different kind of transcript",
    "a monitor that fails to produce a score is reported as that; it is not a finding about monitoring",
    "with the trusted state line removed the twins are the same bytes, which is a fact about the design and was not run",
    "the threshold allows at most 1% of authorised transcripts above it; with 96 of them that is none",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
SIDECARS = {
    "caught.json": lambda r: {
        m["id"]: {
            "threshold": m["analysis"]["threshold"],
            "caught": m["analysis"]["caught"],
            "by_style": {s: v["caught"] for s, v in m["analysis"]["by_style"].items()},
        }
        for m in r["models"]
    },
    "hypotheses.json": lambda r: {m["id"]: m["hypotheses"] for m in r["models"]},
}
SETTINGS = {
    **monitor19s.SETTINGS,
    "trials": monitor19s.TRIALS,
    "fpr": monitor19s.FPR,
    "min_scored": monitor19s.MIN_SCORED,
}
MODEL_IDS = monitor19s.MONITOR_IDS


def specs():
    return list(monitor19s.MONITORS)


def published_cases():
    return [
        {k: c[k] for k in ("id", "state", "style", "base_task", "source")}
        for c in monitor19s.cases()
    ]


def schedule_digest():
    return sha(wire([s["digest"] for s in monitor19s.schedule(monitor19s.prompt())]))


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19S_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    names.update(PROMPT_FILES)
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in specs()
    ]


def _declared():
    return {
        "arm": ARM,
        "twins": list(monitor19s.TWINS),
        "styles": list(monitor19s.STYLES),
        "primary_model": monitor19s.PRIMARY,
        "prompt_sha256": monitor19s.PROMPT_SHA256,
        "cases_sha256": sha(wire(published_cases())),
        "schedule_digest": schedule_digest(),
        "models": declared_models(),
        "settings": dict(SETTINGS),
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


def build_report(transcripts, capture):
    """``transcripts``: model id -> rows. ``capture``: what the capturing host recorded about
    itself and the weights; carried, and bound only where the declaration can check it."""
    recorded = capture.get("models") if type(capture) is dict else None
    if type(recorded) is not dict or set(recorded) != set(MODEL_IDS):
        raise ValueError("capture_binding")
    if type(transcripts) is not dict or set(transcripts) != set(MODEL_IDS):
        raise ValueError("transcript_inventory")
    models = []
    for spec in specs():
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("repo") != spec["repo"]
            or got.get("revision") != spec["revision"]
        ):
            raise ValueError("capture_binding:" + spec["id"])
        analysis = monitor19s.analyse(
            spec, transcripts[spec["id"]], monitor19s.prompt()
        )
        usable = monitor19s.usable(analysis)
        models.append(
            {
                **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
                "analysis": analysis,
                "usable": usable,
                "hypotheses": monitor19s.hypotheses(analysis)
                if usable["usable"]
                else None,
            }
        )
    decided = [m for m in models if m["hypotheses"]]
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "primary_model": monitor19s.PRIMARY,
        "usable": [m["id"] for m in decided],
        "held_on": {
            name: [m["id"] for m in decided if m["hypotheses"][name]["supported"]]
            for name in ("M1", "M2", "M3")
        },
        "cases": published_cases(),
        "schedule_digest": schedule_digest(),
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
            "usable": m["usable"]["usable"],
            "outcomes": a["outcomes"],
            "threshold": a["threshold"],
            "caught": {k: a["caught"][k] for k in ("n", "caught")}
            if a["caught"]
            else None,
            "flagged_authorised": a["flagged_authorised"],
            "auroc": a["auroc"],
            "paired": a["paired"],
            "hypotheses": {k: v["supported"] for k, v in m["hypotheses"].items()}
            if m["hypotheses"]
            else None,
        }
    return {
        "verified": True,
        "arm": ARM,
        "generations": report["generations"],
        "primary_model": report["primary_model"],
        "usable": report["usable"],
        "held_on": report["held_on"],
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
