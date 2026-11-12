"""Phase 19o evidence: source-bound pack for 19k's cases and 19n's placement block on hosted
OpenAI models.

The pack carries every provider response as it came back. ``verify`` recomputes each row's
text, token count and metered cost from its stored response, binds each row to the schedule,
and recomputes every outcome, table and decision from the committed instrument. It sends no
request, and it cannot tell whether a stored response is what the provider returned. No
proposal was executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import evidence19k
import inject19n
import inject19o
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19o"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19o-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19o-protocol-v1"
ARM = "hosted_openai_fixed_prompts"
PHASE_19O_FILES = (
    "capture19.py",
    "capture19local.py",
    "hosted19.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "inject19n.py",
    "inject19o.py",
    "evidence19o.py",
    "projection.py",
    "tests/test_hosted19.py",
    "tests/test_inject19o.py",
    "tests/test_evidence19o.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed here, so nothing in this pack is evidence about a gate or a receiver",
    "a hosted model is whatever the provider served on the day; the model named in each response is recorded and nothing about its weights is known",
    "no sampling parameter was sent and no seed can reproduce a generation; a rerun is a new sample",
    "a hosted model answers with a tool-call object, so its reading differs from the raw-text reading of the local lanes; the two are not the same measurement",
    "the cases and texts are 19k's and 19n's, written for small local models by an author who had seen their results",
    "six models from one provider are not a sample of models; a count of models on which a hypothesis held is a tally",
    "the cost is this lane's meter at list prices, not the provider's bill",
    "a stored response is what the capturing host recorded; verify recomputes the analysis, it does not call the provider",
)
RULES = {
    "active_generations": inject19o.ACTIVE,
    "early_stop_calls": inject19o.EARLY_STOP_CALLS,
    "eligible_min_calls": inject19o.MIN_CALLS,
    "eligible_max_control_styles": inject19o.MAX_CONTROL_STYLES,
    "eligible_max_control_placement": inject19o.MAX_CONTROL_PLACEMENT,
    "launches": inject19o.LAUNCHES,
    "budget_seconds": inject19o.BUDGET_SECONDS,
    "total_cap_usd": inject19o.TOTAL_CAP_USD,
    "reading": "strict: exactly one tool call and no other visible text; lenient, for sensitivity: exactly one tool call",
    "sampling": "no temperature, top_p or seed is sent; the provider's defaults apply",
}
SIDECARS = {
    "replication.json": lambda r: r["replication"],
    "spend.json": lambda r: {
        m["id"]: (
            m.get("spend") or m.get("active_control", m.get("partial", {})).get("spend")
        )
        for m in r["models"]
    },
    "placement.json": lambda r: {
        m["id"]: m["placement"]["placement"] for m in r["models"] if "placement" in m
    },
}
MODEL_IDS = inject19o.MODEL_IDS


def member(model_id):
    return "transcript-" + model_id + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19O_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    keys = ("id", "provider", "api_model", "max_tokens", "usd_per_mtok_in")
    keys += ("usd_per_mtok_out", "cap_usd", "wire")
    return [{k: m[k] for k in keys} for m in inject19o.MODELS]


def instrument():
    sched = inject19o.schedule()
    return {
        "rows": len(sched),
        "schedule_digest": sha(wire([s["digest"] for s in sched])),
        "styles_cases_sha256": sha(wire(evidence19k.published_cases())),
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
        "smoke": inject19o.SMOKE,
        "seed_base": inject19o.SEED_BASE,
    }


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "instrument": instrument(),
        "models": declared_models(),
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


def check_cap(spec, rows):
    """The meter stops a model before a request once its cap is reached, so every row but
    the last must have been sent with the meter below the cap."""
    if sum(r["cost_usd"] for r in rows[:-1]) >= spec["cap_usd"]:
        raise ValueError("cap_exceeded:" + spec["id"])


def build_report(transcripts, capture):
    """``transcripts``: model id -> rows. ``capture``: what the capturing host recorded; its
    status for each model decides how that model's rows are read."""
    recorded = capture.get("models") if type(capture) is dict else None
    if type(recorded) is not dict or set(recorded) != set(MODEL_IDS):
        raise ValueError("capture_binding")
    if set(transcripts) != set(MODEL_IDS):
        raise ValueError("transcript_inventory")
    models = []
    for spec in inject19o.MODELS:
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("api_model") != spec["api_model"]
            or got.get("provider") != spec["provider"]
            or got.get("status") not in inject19o.STATUSES
        ):
            raise ValueError("capture_binding:" + spec["id"])
        rows = transcripts[spec["id"]]
        if type(rows) is not list:
            raise ValueError("transcript_inventory")
        entry = {
            **{k: spec[k] for k in ("id", "provider", "api_model")},
            "status": got["status"],
        }
        if got["status"] == "captured":
            entry.update(inject19o.assess(spec, rows))
            calls = entry["styles"]["analysis"]["active_control"]["calls"]
            if calls < inject19o.EARLY_STOP_CALLS:
                raise ValueError("stop_rule:" + spec["id"])
        elif got["status"] == "stopped_positive_control":
            control = inject19o.active_control(spec, rows)
            if control["calls"] >= inject19o.EARLY_STOP_CALLS:
                raise ValueError("stop_rule:" + spec["id"])
            entry.update(active_control=control)
        else:
            if type(got.get("reason")) is not str or not got["reason"]:
                raise ValueError("capture_binding:" + spec["id"])
            entry.update(reason=got["reason"], partial=inject19o.partial(spec, rows))
        check_cap(spec, rows)
        models.append(entry)
    metered = sum(r["cost_usd"] for i in MODEL_IDS for r in transcripts[i])
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "instrument": instrument(),
        "rules": json.loads(json.dumps(RULES)),
        "models": models,
        "replication": inject19o.replication(models),
        "generations": sum(len(transcripts[i]) for i in MODEL_IDS),
        "metered_usd": round(metered, 6),
        "model_inference": True,
        "gate_executed": False,
        "capture": capture,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        entry = {"status": m["status"]}
        if m["status"] == "captured":
            a = m["styles"]["analysis"]
            entry.update(
                active_calls=a["active_control"]["calls"],
                eligible_for_styles=m["styles"]["eligibility"]["eligible"],
                eligible_for_placement=m["placement"]["eligibility"]["eligible"],
                control_sent={
                    "styles": a["styles"]["control"]["sent"],
                    "placement": m["placement"]["control_sent"],
                },
                injected_sent={
                    "styles": m["styles"]["extras"]["injected_sent"],
                    "placement": sum(
                        v["injected"]["sent"]
                        for v in m["placement"]["placement"].values()
                    ),
                },
                metered_usd=m["spend"]["metered_usd"],
                served_models=m["spend"]["served_models"],
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
        "metered_usd": report["metered_usd"],
        "models": models,
        "replication": {
            "eligible_for_styles": report["replication"]["eligible_for_styles"],
            "eligible_for_placement": report["replication"]["eligible_for_placement"],
            "held_on": {h: len(v) for h, v in report["replication"]["held_on"].items()},
        },
        "model_inference": True,
        "gate_executed": False,
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
