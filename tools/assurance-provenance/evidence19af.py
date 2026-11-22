"""Phase 19af evidence: source-bound pack for three questions asked of small local models
(P19-LOCAL04), with verify.

The pack holds every kept generation of both arms for both models, the capture's own record
(revisions, file digests, host, whether a run was resumed) and the gate's side as it was run
at capture. ``verify`` runs on any host with the standard library and no model: it binds
every generation to the schedule the protocol pins, reads each one again with the earlier
lanes' readers, and recomputes the report and the hypotheses. It cannot recompute a model's
output. The gate's side is recomputed by a test that needs the hash-locked set.
"""

import argparse
import json
from pathlib import Path

import capture19local as local
import evidence19d
import local19af
import monitor19s
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19af"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19af-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19af-protocol-v1"
ARM = "local_models_three_questions"
ARMS = ("R", "O")
PHASE_19AF_FILES = (
    "local19af.py",
    "evidence19af.py",
    "capture19local.py",
    "capture19.py",
    "inject19.py",
    "monitor19s.py",
    "full19ae.py",
    "projection.py",
    "tests/test_local19af.py",
    "tests/test_evidence19af.py",
)
OTHER_SOURCES = (
    "docs/research/transfer-phase-17/tasks.json",
    "docs/research/provenance-phase-19s/third-party/sleight-bench/control_arena.md",
)
NON_CLAIMS = (
    "two small local models on an 8 GB laptop are not the models anyone deploys, and nothing here transfers to a hosted model",
    "the restriction texts, the omission and the split are the author's, on six synthetic tasks, with four trials per cell",
    "a monitor's seconds on this machine say nothing about a monitor on a server; the comparison shows an order of magnitude and no more",
    "the lane does not show that a restriction which arrives as text should be obeyed or ignored; it shows what these models and this gate do with one",
    "a verifier cannot recompute a model's output; it can check that the report follows from the kept generations",
    "the gate's side ran on the capture machine and is recomputed by a test, not by verify",
)
SIDECARS = {"hypotheses.json": lambda r: r["hypotheses"]}


def member(arm, model_id):
    return f"transcript-{arm}-{model_id}.json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19AF_FILES} | set(
        OTHER_SOURCES
    )


def _schedule_digest(rows):
    return sha(
        wire(
            [
                [r["index"], r["task_id"], r["arm"], r["trial"], r["seed"], r["digest"]]
                for r in rows
            ]
        )
    )


def _declared():
    return {
        "arm": ARM,
        "models": [
            {k: local.model(i)[k] for k in ("id", "repo", "revision", "wire")}
            for i in local19af.MODELS
        ],
        "settings": {"agent": local.SETTINGS, "monitor": monitor19s.SETTINGS},
        "trials": local19af.TRIALS,
        "notices_sha256": sha(wire(list(local19af.NOTICES))),
        "added_sha256": sha(local19af.ADDED.encode()),
        "schedule_digest": {
            "R": _schedule_digest(local19af.schedule_r()),
            "O": _schedule_digest(local19af.schedule_o()),
        },
        "eligibility": {
            "min_plain_share": local19af.MIN_PLAIN_SHARE,
            "min_read": local19af.MIN_READ,
        },
        "model_inference": True,
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


def _gate_ok(gate):
    return (
        type(gate) is dict
        and set(gate) == {"restriction", "bodies", "dispatch_seconds"}
        and type(gate["restriction"]) is list
        and all(
            type(r) is dict and set(r) == {"wording", "channel", "verdict", "effects"}
            for r in gate["restriction"]
        )
        and type(gate["bodies"]) is list
        and [r.get("body") if type(r) is dict else None for r in gate["bodies"]]
        == list(local19af.BODIES)
        and type(gate["dispatch_seconds"]) is list
        and all(type(x) in (int, float) for x in gate["dispatch_seconds"])
    )


def build_report(transcripts, capture, gate):
    if not _gate_ok(gate):
        raise ValueError("gate_rows")
    arm_r = {
        i: local19af.analyse_r(local19af.judge_r(local.model(i), transcripts["R"][i]))
        for i in local19af.MODELS
    }
    arm_o = {
        i: local19af.analyse_o(local19af.judge_o(transcripts["O"][i]))
        for i in local19af.MODELS
    }
    gate_part = {"restriction": gate["restriction"], "bodies": gate["bodies"]}
    models = capture.get("models") if type(capture) is dict else None
    if type(models) is not dict or set(models) != set(local19af.MODELS):
        raise ValueError("capture_models")
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "arm_r": arm_r,
        "arm_o": arm_o,
        "gate": gate_part,
        "window": {
            "monitor_call_seconds": {i: arm_o[i]["seconds"] for i in local19af.MODELS},
            "gate_dispatch_seconds": local19af._spread(gate["dispatch_seconds"]),
        },
        "hypotheses": local19af.hypotheses(arm_r, arm_o, gate_part),
        "capture": {
            i: {
                "revision": models[i].get("revision"),
                "R": models[i].get("R"),
                "O": models[i].get("O"),
            }
            for i in local19af.MODELS
        },
        "host": capture.get("host"),
        "model_inference": True,
        "non_claims": list(NON_CLAIMS),
    }


def receipt_for(report, manifest_root):
    return {
        "verified": True,
        "arm": ARM,
        "generations": sum(
            (report["capture"][i][a] or {}).get("generations", 0)
            for i in local19af.MODELS
            for a in ARMS
        ),
        "models": {
            i: {
                "eligible": report["arm_r"][i]["eligible"],
                "usable_monitor": report["arm_o"][i]["usable"],
            }
            for i in local19af.MODELS
        },
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "gate_executed": True,
        "model_inference": True,
        "money_spent": 0,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def _names():
    return {member(a, i) for a in ARMS for i in local19af.MODELS}


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", "capture.json", "gate.json", *SIDECARS, *_names()}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    transcripts = {
        a: {i: loads(files[member(a, i)]) for i in local19af.MODELS} for a in ARMS
    }
    actual = build_report(
        transcripts, loads(files["capture.json"]), loads(files["gate.json"])
    )
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
    out = {a: {} for a in ARMS}
    for a in ARMS:
        for i in local19af.MODELS:
            text = (Path(directory) / f"transcript-{a}-{i}.jsonl").read_text()
            out[a][i] = [json.loads(line) for line in text.splitlines() if line]
    return out


def run(out, capture_dir, *, gate=None, protocol=None):
    """Pack a finished capture. ``gate`` is the gate's side; when it is not given it is run
    here, which needs the hash-locked set."""
    capture_dir = Path(capture_dir)
    transcripts = read_transcripts(capture_dir)
    capture = json.loads((capture_dir / "capture.json").read_text())
    gate = local19af.gate_rows() if gate is None else gate
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    report = build_report(transcripts, capture, gate)
    report.update(protocol_sha256=protocol_digest)
    files = {
        "report.json": wire(report),
        "capture.json": wire(capture),
        "gate.json": wire(gate),
    }
    for a in ARMS:
        for i in local19af.MODELS:
            files[member(a, i)] = wire(transcripts[a][i])
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
    launch.add_argument("--capture", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(args.out.resolve(), args.capture.resolve())
    else:
        receipt = verify(args.pack, args.expected_root, protocol=args.protocol)
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
