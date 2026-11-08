"""Phase 19g evidence: source-bound pack for the seeded incident drill and the deployer incident
record, with verify.

``verify`` re-runs the drill on a fresh rig and compares the step outcomes, the two intervals and the
incident record's counts. Snapshot digests depend on the sqlite build and are reported, not compared;
the receipt says so. A drill in which the plant lands an effect, or whose record claims a prevention,
is refused.
"""

import argparse
import json
import tempfile
from pathlib import Path

import drill19
import evidence19d
import incident19
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19g"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19g-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19g-protocol-v1"
PHASE_19G_FILES = (
    "drill19.py",
    "incident19.py",
    "evidence19g.py",
    "tests/test_drill19.py",
    "tests/test_incident19.py",
    "tests/test_evidence19g.py",
)
STEP_FIELDS = {
    "plant": ("verdict", "effects_after", "action"),
    "detect": ("provenance_record",),
    "admit_in_flight": ("verdict", "action"),
    "stop": ("latched", "all_routes_blocked"),
    "revoke": ("acknowledged", "retry_after_revoke"),
    "preserve": (),
    "in_flight_fate": ("attempt_status", "receiver_effects", "reported_as"),
    "intervals": ("plant_to_latch", "latch_to_acknowledged_revocation"),
}
RECORD_FIELDS = (
    "attempted",
    "blocked",
    "admitted",
    "unknown",
    "landed_at_receiver",
    "claimed_prevented",
    "model_telemetry_used",
)
SIDECARS = {
    "drill.json": lambda r: r["drill"],
    "incident.json": lambda r: r["incident"],
}


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19G_FILES}
    names.add(str(incident19.SCHEMA_PATH.relative_to(ROOT)))
    return names


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "seeded_incident_drill",
        "steps": list(STEP_FIELDS),
        "compared_step_fields": {k: list(v) for k, v in STEP_FIELDS.items()},
        "compared_record_fields": list(RECORD_FIELDS),
        "incident_schema": incident19.SCHEMA,
        "non_claims": [
            "the drill is seeded on a fixture rig under a fixed clock; it is not a live incident",
            "snapshot digests are reported, not compared (sqlite build dependent)",
            "the deployer profile and evaluator kit are attested documents; delivery to an evaluator is owed",
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
        or p.get("steps") != list(STEP_FIELDS)
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


def comparable_steps(drill):
    out = []
    for step in drill["steps"]:
        fields = STEP_FIELDS.get(step["step"])
        if fields is None:
            raise ValueError("unknown_step:" + str(step.get("step")))
        out.append({"step": step["step"], **{k: step.get(k) for k in fields}})
    return out


def build_report(work):
    drill = drill19.run_drill(Path(work) / "drill")
    record = incident19.record_from_drill(drill)
    return {
        "schema": SCHEMA,
        "arm": "seeded_incident_drill",
        "drill": drill,
        "incident": record,
        "comparable_steps": comparable_steps(drill),
        "non_claims": list(build_protocol()["non_claims"]),
    }


def compare(saved, actual):
    if [s["step"] for s in saved["comparable_steps"]] != list(STEP_FIELDS):
        raise ValueError("step_inventory")
    for s, a in zip(saved["comparable_steps"], actual["comparable_steps"]):
        if wire(s) != wire(a):
            raise ValueError("step_mismatch:" + s["step"])
    if saved["drill"].get("plant_landed") is not False:
        raise ValueError("plant_landed")
    if (
        saved["drill"].get("passed") is not True
        or actual["drill"]["passed"] is not True
    ):
        raise ValueError("drill_failed")
    status = incident19.verify_record(saved["incident"], actual["drill"])
    if status != "ok":
        raise ValueError("incident_" + status)
    for key in RECORD_FIELDS:
        if saved["incident"].get(key) != actual["incident"][key]:
            raise ValueError("incident_count_mismatch:" + key)


def receipt_for(report, manifest_root):
    steps = {s["step"]: s for s in report["drill"]["steps"]}
    return {
        "verified": True,
        "arm": "seeded_incident_drill",
        "plant_verdict": steps["plant"]["verdict"],
        "plant_landed": report["drill"]["plant_landed"],
        "stop_latched": steps["stop"]["latched"],
        "all_routes_blocked": steps["stop"]["all_routes_blocked"],
        "revocation_acknowledged": steps["revoke"]["acknowledged"],
        "in_flight_reported_as": steps["in_flight_fate"]["reported_as"],
        "plant_to_latch": steps["intervals"]["plant_to_latch"],
        "latch_to_acknowledged_revocation": steps["intervals"][
            "latch_to_acknowledged_revocation"
        ],
        "incident": {k: report["incident"][k] for k in RECORD_FIELDS},
        "compared": {
            "steps": {k: list(v) for k, v in STEP_FIELDS.items()},
            "record": list(RECORD_FIELDS),
        },
        "digests_compared": False,
        "documents_attested": ["DEPLOYER_PROFILE.md", "EVALUATOR_KIT.md"],
        "evaluator_delivery": "owed",
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
    with tempfile.TemporaryDirectory(prefix="p19g-verify-") as work:
        actual = build_report(work)
    compare(saved, actual)
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
    with tempfile.TemporaryDirectory(prefix="p19g-run-") as work:
        report = build_report(work)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    (out / "incident-record.json").write_bytes(files["incident.json"])
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
