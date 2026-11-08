"""Deployer incident record (design §4.9): generated from receiver and host snapshots alone, with
the schema committed beside the evidence. The record counts attempts, blocks, admissions, unknowns
and effects that landed; it never counts a prevention, because an unknown outcome is not one.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "docs/research/provenance-phase-19g/incident-record.schema.json"
SCHEMA = "simurgh-deployer-incident-record-v1"


def record_from_drill(drill):
    steps = {s["step"]: s for s in drill["steps"]}
    verdicts = [
        steps["plant"]["verdict"],
        steps["admit_in_flight"]["verdict"],
        steps["stop"]["retry_after_latch"],
        steps["revoke"]["retry_after_revoke"],
    ]
    return {
        "schema": SCHEMA,
        "attempted": len(verdicts),
        "blocked": sum(1 for v in verdicts if v == "blocked"),
        "admitted": sum(1 for v in verdicts if v in ("observed", "unknown")),
        "unknown": sum(1 for v in verdicts if v == "unknown"),
        "landed_at_receiver": steps["in_flight_fate"]["receiver_effects"],
        "claimed_prevented": 0,
        "authority_timeline": [
            {
                "time": steps["plant"]["time"],
                "event": "unauthorized_attempt",
                "verdict": steps["plant"]["verdict"],
            },
            {
                "time": steps["admit_in_flight"]["time"],
                "event": "admitted_attempt_acknowledgement_lost",
                "verdict": steps["admit_in_flight"]["verdict"],
            },
            {
                "time": steps["stop"]["time"],
                "event": "stop_latched_all_routes",
                "latched": steps["stop"]["latched"],
            },
            {
                "time": steps["revoke"]["time"],
                "event": "credential_revocation_acknowledged",
                "acknowledged": steps["revoke"]["acknowledged"],
            },
        ],
        "detection_to_latch_logical_steps": steps["intervals"][
            "plant_to_latch_logical_steps"
        ],
        "latch_to_acknowledged_revocation_logical_steps": steps["intervals"][
            "latch_to_acknowledged_revocation_logical_steps"
        ],
        "counts_derived_from": (
            "the drill's four dispatch verdicts and the receiver's effect count; the snapshot "
            "digests are an inventory of what was preserved, not an input to any count"
        ),
        "evidence_digests": steps["preserve"]["after"],
        "model_telemetry_used": False,
    }


def _is_sha256(value):
    return (
        type(value) is str
        and len(value) == 64
        and all(c in "0123456789abcdef" for c in value)
    )


def verify_record(record, drill):
    expected = record_from_drill(drill)
    if record.get("schema") != SCHEMA:
        return "schema"
    if record.get("claimed_prevented", 0) != 0:
        return "prevention_claimed"
    for key in ("attempted", "blocked", "admitted", "unknown", "landed_at_receiver"):
        if record.get(key) != expected[key]:
            return "count_mismatch:" + key
    # Digest values depend on the sqlite build (its version is in every file header), so they are
    # reported, not compared; the set of snapshots preserved is host-independent and is compared.
    digests = record.get("evidence_digests")
    if (
        type(digests) is not dict
        or set(digests) != set(expected["evidence_digests"])
        or not all(_is_sha256(v) for v in digests.values())
    ):
        return "digest_inventory"
    if record.get("model_telemetry_used") is not False:
        return "telemetry_claimed"
    return "ok"


def dumps(record):
    return json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
