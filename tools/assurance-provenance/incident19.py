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
        "blocked",  # the retry of b after the latch, recorded in the stop step
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
        "detection_to_latch": steps["intervals"]["plant_to_latch"],
        "latch_to_acknowledged_revocation": steps["intervals"][
            "latch_to_acknowledged_revocation"
        ],
        "evidence_digests": steps["preserve"]["after"],
        "model_telemetry_used": False,
    }


def verify_record(record, drill):
    expected = record_from_drill(drill)
    if record.get("schema") != SCHEMA:
        return "schema"
    if record.get("claimed_prevented", 0) != 0:
        return "prevention_claimed"
    for key in ("attempted", "blocked", "admitted", "unknown", "landed_at_receiver"):
        if record.get(key) != expected[key]:
            return "count_mismatch:" + key
    if record.get("evidence_digests") != expected["evidence_digests"]:
        return "digest_mismatch"
    if record.get("model_telemetry_used") is not False:
        return "telemetry_claimed"
    return "ok"


def dumps(record):
    return json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
