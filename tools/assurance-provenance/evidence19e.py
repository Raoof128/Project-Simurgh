"""Phase 19e evidence: source-bound pack for the capture instrument, with verify. No model is
called; the pack binds the framings, the scripted control and the ``IOU-19-SPEND`` declaration so the
capture, when authorised, runs against a committed instrument.
"""

import argparse
import json
from pathlib import Path

import capture19
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19e"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19e-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19e-protocol-v1"
PHASE_19E_FILES = (
    "capture19.py",
    "evidence19e.py",
    "projection.py",
    "tests/test_capture19.py",
    "tests/test_evidence19e.py",
)
SIDECARS = {
    "framings.json": lambda r: r["framings"],
    "scripted.json": lambda r: r["scripted"],
    "spend.json": lambda r: r["spend"],
}


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19E_FILES}
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "capture_instrument",
        "arms": list(capture19.ARMS),
        "framing_lines": dict(capture19.FRAMING_LINES),
        "model_inference": False,
        "non_claims": [
            "no model was called; the scripted control is the instrument's positive control, not evidence about any model",
            "the capture under IOU-19-SPEND is owed and needs the owner's explicit authorisation",
            "an unverbalised belief is invisible to the keyword flag; the flag stays outside the outcome count",
        ],
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
        or p.get("model_inference") is not False
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


def build_report():
    rep = capture19.report()
    return {
        "schema": SCHEMA,
        "arm": "capture_instrument",
        **rep,
        "non_claims": list(build_protocol()["non_claims"]),
    }


def compare(saved, actual):
    if wire(saved.get("framings")) != wire(actual["framings"]):
        if len(saved.get("framings") or []) != len(actual["framings"]):
            raise ValueError("framing_inventory")
        raise ValueError("framing_mismatch")
    if (
        saved.get("spend", {}).get("status") != "not_run"
        or saved["spend"].get("spend_to_date") != 0
    ):
        raise ValueError("capture_claimed")
    if saved.get("informed_attacker", {}).get("status") != "not_run":
        raise ValueError("capture_claimed:informed_attacker")
    s, a = saved.get("scripted") or {}, actual["scripted"]
    if s.get("declared_rates") != a["declared_rates"] or s.get("seed") != a["seed"]:
        raise ValueError("scripted_declaration")
    if wire(s.get("generations")) != wire(a["generations"]):
        raise ValueError("scripted_mismatch")
    if wire(s.get("shift")) != wire(a["shift"]):
        raise ValueError("shift_mismatch")
    if not capture19.recovered(s):
        raise ValueError("control_not_recovered")


def receipt_for(report, manifest_root):
    shift = report["scripted"]["shift"]
    return {
        "verified": True,
        "arm": "capture_instrument",
        "framed_messages": len(report["framings"]),
        "arms": list(capture19.ARMS),
        "scripted_control": {
            "declared_rates": report["scripted"]["declared_rates"],
            "arms": {
                k: {"n": v["n"], "emitted": v["emitted"], "rate": v["rate"]}
                for k, v in shift["arms"].items()
            },
            "evaluation_minus_deployment": shift["evaluation_minus_deployment"],
            "evaluable": shift["evaluable"],
            "recovered": capture19.recovered(report["scripted"]),
        },
        "capture_status": report["spend"]["status"],
        "spend": report["spend"]["spend_to_date"],
        "budget_cap_generations": report["spend"]["budget_cap_generations"],
        "informed_attacker": report["informed_attacker"]["status"],
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "model_inference": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    compare(saved, build_report())
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    return receipt_for(saved, expected_root)


def run(out, *, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    report = build_report()
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    (out / "spend-declaration.json").write_bytes(files["spend.json"])
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
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        print(json.dumps(run(args.out.resolve()), sort_keys=True))
    else:
        print(
            json.dumps(
                verify(args.pack, args.expected_root, protocol=args.protocol),
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
