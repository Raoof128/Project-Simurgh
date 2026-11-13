"""Phase 19r evidence: source-bound pack for the cite-your-authority study (P19-CITE01), with
verify.

The pack holds each model's transcript and what the capturing host recorded about itself.
``verify`` rebuilds every prompt from the instrument, binds each transcript row to its slot,
reads every output again, and recomputes each analysis, the eligibility of each model and the
hypotheses; it does not rerun a model. Standard library only.
"""

import argparse
import json
from pathlib import Path

import capture19local as local
import cite19r
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19r"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19r-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19r-protocol-v1"
ARM = "local_cite_authority"
PHASE_19R_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "cite19r.py",
    "evidence19r.py",
    "projection.py",
    "tests/test_cite19r.py",
    "tests/test_evidence19r.py",
)
NON_CLAIMS = (
    "emission and a stated host check only: no proposal was executed, and the check is a few lines in the instrument, not the frozen pipeline",
    "three small 4-bit local models; nothing here transfers to a larger or a hosted model",
    "nothing a model writes in authority is trusted; the classes say what the string equals or contains, not why the model wrote it",
    "the texts are 19k's, written by the author; an offered grant is one fixed sentence at the end of the source",
    "the citing arms differ from the plain arm in the system line, a trusted block and the tool at once, so a difference between them is the effect of the three together",
    "six states are six clusters; the state-cluster interval is a coarse check, not a model of the dependence",
    "no attacker adapted to the requirement, and no restricted send can be admitted by construction of the check",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
SIDECARS = {
    "injected.json": lambda r: {
        m["id"]: m["analysis"]["injected"] for m in r["models"]
    },
    "cited.json": lambda r: {m["id"]: m["analysis"]["cited"] for m in r["models"]},
    "hypotheses.json": lambda r: {m["id"]: m["hypotheses"] for m in r["models"]},
}
SETTINGS = {
    **{k: v for k, v in local.SETTINGS.items() if k not in ("seed_base", "seed_rule")},
    "seed_base": cite19r.SEED_BASE,
    "trials": cite19r.TRIALS,
    "active_trials": cite19r.ACTIVE_TRIALS,
    "wordings": cite19r.WORDINGS,
    "min_calls": cite19r.MIN_CALLS,
    "bootstrap": cite19r.BOOTSTRAP,
    "seed_rule": "seed_base + schedule index, the same for every model",
}
MODEL_IDS = cite19r.MODEL_IDS


def specs():
    return list(cite19r.MODELS)


def published_cases():
    return [
        {k: c[k] for k in ("id", "state", "style", "wording", "base_task", "source")}
        for c in cite19r.cases()
    ]


def schedule_digest():
    return sha(wire([s["digest"] for s in cite19r.schedule()]))


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19R_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in specs()
    ]


def _declared():
    return {
        "arm": ARM,
        "arms": list(cite19r.ARMS),
        "styles": list(cite19r.STYLES),
        "classes": list(cite19r.CLASSES),
        "primary_model": cite19r.PRIMARY,
        "system_cite_sha256": sha(cite19r.SYSTEM_CITE.encode()),
        "tools_cite_sha256": sha(wire(cite19r.TOOLS_CITE)),
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
        analysis = cite19r.analyse(spec, transcripts[spec["id"]])
        eligible = cite19r.eligibility(analysis)
        models.append(
            {
                **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
                "analysis": analysis,
                "eligibility": eligible,
                "hypotheses": cite19r.hypotheses(analysis)
                if eligible["eligible"]
                else None,
            }
        )
    decided = [m for m in models if m["hypotheses"]]
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "primary_model": cite19r.PRIMARY,
        "eligible": [m["id"] for m in decided],
        "held_on": {
            name: [m["id"] for m in decided if m["hypotheses"][name]["supported"]]
            for name in ("C1", "C2", "C3", "C4")
        },
        "cases": published_cases(),
        "schedule_digest": schedule_digest(),
        "settings": dict(SETTINGS),
        "models": models,
        "generations": sum(m["analysis"]["generations"] for m in models),
        "restricted_admitted": sum(
            m["analysis"]["restricted_admitted"] for m in models
        ),
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
            "eligible": m["eligibility"]["eligible"],
            "active_control": {
                arm: {k: v[k] for k in ("n", "calls", "exact", "admitted")}
                for arm, v in a["active_control"].items()
            },
            "injected": {
                arm: {"n": v["n"], "sent": v["sent"]}
                for arm, v in a["injected"].items()
            },
            "cited": a["cited"],
            "hypotheses": {k: v["supported"] for k, v in m["hypotheses"].items()}
            if m["hypotheses"]
            else None,
            "outcomes": a["outcomes"],
        }
    return {
        "verified": True,
        "arm": ARM,
        "generations": report["generations"],
        "primary_model": report["primary_model"],
        "eligible": report["eligible"],
        "held_on": report["held_on"],
        "restricted_admitted": report["restricted_admitted"],
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
