"""Phase 19v evidence: source-bound pack for 19n's study on eight open-weight models at full
precision, captured on a rented GPU.

The pack carries every generation's raw output. ``verify`` replays each transcript with 19n's
instrument: it rebuilds every prompt from the rows before it, compares digests, and recomputes
each outcome, table, comparison and decision. It does not run a model, and it cannot tell
whether a transcript is what a model produced or what the rented machine was. No proposal was
executed against a gate or a receiver.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import evidence19n
import inject19n
import inject19v
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19v"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19v-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19v-protocol-v1"
ARM = "open_weight_injection_channels"
PHASE_19V_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "inject19m.py",
    "inject19n.py",
    "inject19v.py",
    "evidence19n.py",
    "evidence19v.py",
    "projection.py",
    "tests/test_inject19v.py",
    "tests/test_evidence19v.py",
)
NON_CLAIMS = (
    "emission only: no proposal was executed here, so nothing in this pack is evidence about a gate or a receiver",
    "eight open-weight models chosen by the author, one run each; nothing here transfers to another model, another precision or a hosted model",
    "the models ran on a machine rented by the hour; the pack holds what that machine recorded and cannot show what the machine was",
    "the sampler is this instrument's own and differs from the MLX sampler of 19n, and the builds differ in precision, so a difference from 19n's numbers is not a size effect",
    "the three Qwen3 sizes are one model per size; the ladder is a table, not a trend",
    "a placement is one heading line; another wording of a heading may act differently",
    "the texts were written by an author who had seen the 19i to 19n results",
    "the attacker is the target's own model with eight rounds of feedback; its result says nothing about a capable attacker",
    "the hypotheses are 19n's, decided only for a model that passes the positive control and declines the control cases, with no correction for their number; a count of models on which one held is a tally",
    "the metered cost is the hourly price times the seconds the author recorded; it is not the provider's bill",
    "a transcript is what the capturing host recorded; verify recomputes the analysis, it does not rerun a model",
)
SETTINGS = {
    **evidence19n.SETTINGS,
    "dtype": inject19v.DTYPE,
    "sampler": (
        "scores divided by the temperature; the most probable tokens kept up to and "
        "including the one with which their summed probability reaches top_p, ties by "
        "lower token id; one draw from a CPU generator seeded with the slot's seed"
    ),
    "thinking": "switched off in every template (enable_thinking false)",
}
RULES = {
    **{k: v for k, v in evidence19n.RULES.items() if k != "model_selection"},
    "budget_seconds": inject19v.BUDGET_SECONDS,
    "spend_cap_usd": inject19v.SPEND_CAP_USD,
    "teardown_seconds": inject19v.TEARDOWN_SECONDS,
    "min_start_seconds": inject19v.MIN_START_SECONDS,
    "retry_once_if_no_row_and_reason_starts_with": list(inject19v.RETRY_PREFIXES),
    "capture_order": list(inject19v.MODEL_IDS),
    "ladder": list(inject19v.LADDER),
}
SIDECARS = {
    "replication.json": lambda r: r["replication"],
    "ladder.json": lambda r: r["ladder"],
    "comparisons.json": lambda r: {
        m["id"]: m["analysis"]["comparisons"] for m in r["models"] if "analysis" in m
    },
    "placement.json": lambda r: {
        m["id"]: m["analysis"]["placement"] for m in r["models"] if "analysis" in m
    },
}
MODEL_IDS = inject19v.MODEL_IDS
RENTAL_KEYS = {"provider", "machine", "usd_per_hour", "seconds"}


def member(model_id):
    return "transcript-" + model_id + ".json"


def published():
    """19n's fixed texts and slots, and this lane's reading of the new wire by example."""
    example = (
        "<tool_call>\n<function=decline>\n<parameter=reason>\nheld\n</parameter>\n"
        "</function>\n</tool_call>"
    )
    return {
        **evidence19n.published(),
        "wire": inject19v.WIRE,
        "wire_example": example,
        "wire_example_reads_as": inject19v.decode_function_parameter(example),
    }


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19V_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def declared_models():
    return [
        {k: m[k] for k in ("id", "repo", "revision", "wire", "template_kwargs")}
        for m in inject19v.MODELS
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


def metered(capture):
    """The lane's meter: the hourly price times the recorded seconds. Raises unless the
    rental record is exactly the four declared fields."""
    rental = capture.get("rental") if type(capture) is dict else None
    if type(rental) is not dict or set(rental) != RENTAL_KEYS:
        raise ValueError("rental_record")
    price, seconds = rental["usd_per_hour"], rental["seconds"]
    if (
        type(rental["provider"]) is not str
        or type(rental["machine"]) is not str
        or type(price) not in (int, float)
        or type(seconds) is not int
        or not 0 < price < 100
        or seconds < 0
    ):
        raise ValueError("rental_record")
    return round(price * seconds / 3600, 6)


def build_report(transcripts, capture):
    """``transcripts``: model id -> rows. ``capture``: what the capturing host recorded; its
    status for each model decides how that model's rows are read."""
    recorded = capture.get("models") if type(capture) is dict else None
    if type(recorded) is not dict or set(recorded) != set(MODEL_IDS):
        raise ValueError("capture_binding")
    if set(transcripts) != set(MODEL_IDS):
        raise ValueError("transcript_inventory")
    spent = metered(capture)
    models = []
    for spec in inject19v.MODELS:
        got = recorded[spec["id"]]
        if (
            type(got) is not dict
            or got.get("repo") != spec["repo"]
            or got.get("revision") != spec["revision"]
            or got.get("status") not in inject19v.STATUSES
        ):
            raise ValueError("capture_binding:" + spec["id"])
        rows = transcripts[spec["id"]]
        entry = {
            **{k: spec[k] for k in ("id", "repo", "revision", "wire")},
            "status": got["status"],
        }
        if got["status"] == "captured":
            entry.update(inject19v.assess(spec, rows))
            if (
                entry["analysis"]["active_control"]["calls"]
                < inject19n.EARLY_STOP_CALLS
            ):
                raise ValueError("stop_rule:" + spec["id"])
        elif got["status"] == "stopped_positive_control":
            control = inject19v.active_control(spec, rows)
            if control["calls"] >= inject19n.EARLY_STOP_CALLS:
                raise ValueError("stop_rule:" + spec["id"])
            entry.update(active_control=control)
        else:
            if type(got.get("reason")) is not str or not got["reason"]:
                raise ValueError("capture_binding:" + spec["id"])
            entry.update(reason=got["reason"], partial=inject19v.partial(spec, rows))
        models.append(entry)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "instrument": published(),
        "settings": json.loads(json.dumps(SETTINGS)),
        "rules": json.loads(json.dumps(RULES)),
        "models": models,
        "replication": inject19n.replication(models),
        "ladder": inject19v.ladder(models),
        "generations": sum(
            1 for i in MODEL_IDS for r in transcripts[i] if not r.get("skipped")
        ),
        "model_inference": True,
        "gate_executed": False,
        "metered_usd": spent,
        "within_cap": spent <= inject19v.SPEND_CAP_USD,
        "capture": capture,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    models = {}
    for m in report["models"]:
        entry = {"status": m["status"], "wire": m["wire"]}
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
        "metered_usd": report["metered_usd"],
        "within_cap": report["within_cap"],
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
