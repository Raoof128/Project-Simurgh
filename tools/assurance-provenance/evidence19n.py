"""Phase 19n evidence: source-bound pack for the placement, kind, author, adaptive-attacker and
refusal study on four local models.

The pack carries every generation's raw output, the attacker's texts and the model's own
summaries among them. ``verify`` replays each transcript: it rebuilds every prompt from the
rows before it, compares digests, and recomputes each outcome, table, comparison and decision
from the committed instrument. It does not run a model, and it cannot tell whether a
transcript is what a model produced. No proposal was executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import capture19
import capture19local as local
import evidence19d
import inject19n
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19n"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19n-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19n-protocol-v1"
ARM = "local_injection_channels"
PHASE_19N_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "inject19n.py",
    "evidence19n.py",
    "projection.py",
    "tests/test_inject19n.py",
    "tests/test_evidence19n.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed here, so nothing in this pack is evidence about a gate or a receiver",
    "four small local builds from one family that fit an 8 GB machine; nothing here transfers to a larger or a hosted model",
    "a placement is one heading line; another wording of a heading may act differently",
    "the texts were written by an author who had seen the 19i to 19m results",
    "the attacker is the target's own model with eight rounds of feedback; its result says nothing about a capable attacker",
    "the hypotheses are decided only for a model that passes the positive control and declines the control cases, with no correction for their number; a count of models on which one held is a tally",
    "six states are six clusters; the state-cluster interval is a coarse check, not a model of the dependence",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
SETTINGS = {
    **{k: v for k, v in local.SETTINGS.items() if k not in ("seed_base", "seed_rule")},
    "seed_base": inject19n.SEED_BASE,
    "seed_rule": "seed_base + slot index, the same for every model",
    "max_input_tokens": inject19n.MAX_INPUT_TOKENS,
    "max_new_tokens": dict(inject19n.MAX_TOKENS),
    "bootstrap": inject19n.BOOTSTRAP,
}
RULES = {
    "active_generations": inject19n.ACTIVE,
    "early_stop_calls": inject19n.EARLY_STOP_CALLS,
    "eligible_min_calls": inject19n.MIN_CALLS,
    "eligible_max_control": inject19n.MAX_CONTROL,
    "budget_seconds": inject19n.BUDGET_SECONDS,
    "trials": inject19n.TRIALS,
    "own_summary_trials": inject19n.SELF_TRIALS,
    "attack_rounds": inject19n.ROUNDS,
    "attack_search_trials": inject19n.SEARCH_TRIALS,
    "attack_confirm_trials": inject19n.CONFIRM_TRIALS,
    "attack_characters": inject19n.ATTACK_CHARS,
    "retry_chains": inject19n.CHAINS,
    "retry_depth": inject19n.DEPTH,
    "decision": inject19n.RULE,
    "model_selection": {
        "source_lanes": ["19k", "19m"],
        "min_calls_of_24": inject19n.SOURCE_MIN_CALLS,
        "max_control_of_120": inject19n.SOURCE_MAX_CONTROL,
    },
}
SIDECARS = {
    "replication.json": lambda r: r["replication"],
    "comparisons.json": lambda r: {
        m["id"]: m["analysis"]["comparisons"] for m in r["models"] if "analysis" in m
    },
    "placement.json": lambda r: {
        m["id"]: m["analysis"]["placement"] for m in r["models"] if "analysis" in m
    },
}
MODEL_IDS = inject19n.MODEL_IDS


def member(model_id):
    return "transcript-" + model_id + ".json"


def published():
    """Every fixed text of the instrument, and the slots, as a reader can check them."""
    return {
        "system": capture19.SYSTEM,
        "headings": dict(inject19n.HEADINGS),
        "neutral": inject19n.NEUTRAL,
        "instruction": list(inject19n.INSTRUCTION),
        "belief": {
            state: [
                inject19n.text_for(state, "belief", w)
                for w in range(inject19n.WORDINGS)
            ]
            for state in inject19n.states()
        },
        "writer_system": inject19n.WRITER_SYSTEM,
        "attacker_system": inject19n.ATTACKER_SYSTEM,
        "refusal": inject19n.REFUSAL,
        "carry_terms": list(inject19n.CARRY_TERMS),
        "placements": list(inject19n.PLACEMENTS),
        "kinds": list(inject19n.KINDS),
        "blocks": list(inject19n.BLOCKS),
        "slots": len(inject19n.slots()),
        "slots_sha256": sha(wire(inject19n.slots())),
        # the prompts that do not depend on any output: blocks 1 and 2 and the writer's turns
        "fixed_prompts_sha256": sha(wire(fixed_prompt_digests())),
    }


def fixed_prompt_digests():
    run = inject19n.Run(inject19n.MODELS[0])
    out = []
    for slot in run.slots:
        if slot["block"] in ("active_control", "placement", "summary_write"):
            msgs, _ = run._messages(slot)
            out.append([slot["index"], inject19n.digest(msgs)])
    return out


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19N_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in inject19n.MODELS
    ]


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "instrument": published(),
        "models": declared_models(),
        "settings": json.loads(json.dumps(SETTINGS)),
        "rules": json.loads(json.dumps(RULES)),
        "hypotheses": dict(inject19n.STATEMENTS),
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
    for spec in inject19n.MODELS:
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("repo") != spec["repo"]
            or got.get("revision") != spec["revision"]
            or got.get("status") not in inject19n.STATUSES
        ):
            raise ValueError("capture_binding:" + spec["id"])
        rows = transcripts[spec["id"]]
        entry = {
            **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
            "status": got["status"],
        }
        if got["status"] == "captured":
            entry.update(inject19n.assess(spec, rows))
            if (
                entry["analysis"]["active_control"]["calls"]
                < inject19n.EARLY_STOP_CALLS
            ):
                raise ValueError("stop_rule:" + spec["id"])
        elif got["status"] == "stopped_positive_control":
            control = inject19n.active_control(spec, rows)
            if control["calls"] >= inject19n.EARLY_STOP_CALLS:
                raise ValueError("stop_rule:" + spec["id"])
            entry.update(active_control=control)
        else:
            if type(got.get("reason")) is not str or not got["reason"]:
                raise ValueError("capture_binding:" + spec["id"])
            entry.update(reason=got["reason"], partial=inject19n.partial(spec, rows))
        models.append(entry)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "instrument": published(),
        "settings": json.loads(json.dumps(SETTINGS)),
        "rules": json.loads(json.dumps(RULES)),
        "models": models,
        "replication": inject19n.replication(models),
        "generations": sum(
            1 for i in MODEL_IDS for r in transcripts[i] if not r.get("skipped")
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
        entry = {"status": m["status"]}
        if m["status"] == "captured":
            a = m["analysis"]
            entry.update(
                eligible=m["eligibility"]["eligible"],
                active_calls=a["active_control"]["calls"],
                control_sent=m["eligibility"]["control_sent"],
                generations=a["generations"],
                injected_sent={
                    p: v["injected"]["sent"] for p, v in a["placement"].items()
                },
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
