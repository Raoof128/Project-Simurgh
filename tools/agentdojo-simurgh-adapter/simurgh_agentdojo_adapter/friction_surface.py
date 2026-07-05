# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4Q friction machinery (Python mirror of tools/simurgh-attestation/stage4q).

Pure stdlib. Byte-parity with the Node core is enforced by the committed Lane-A corpus
(tests/fixtures/llmShield/stage4q/lane-a) — change BOTH sides or none. There is NO magic
sentinel: the crossing carries an explicit approval_binding_kind (receipt|exemption).
Motto: AnthropicSafe First, then ReviewerSafe.
"""
from __future__ import annotations

import hashlib
import json
import re

DIGEST_RE = re.compile(r"^sha256:[a-f0-9]{64}$")
KERNEL_ENTRYPOINT = "authorise_with_friction.v1"
MAX_WINDOW_STRADDLE = 1

SCHEMAS = {
    "ENVELOPE": "simurgh.vfr_friction_envelope.v1",
    "APPROVAL_RECEIPT": "simurgh.vfr_approval_receipt.v1",
    "APPROVAL_EXEMPTION": "simurgh.vfr_approval_exemption.v1",
    "BOUNDARY_CROSSING": "simurgh.vfr_boundary_crossing.v1",
    "RUN_CHAIN_ENTRY": "simurgh.vfr_run_chain_entry.v1",
    "ATTESTATION": "simurgh.vfr_attestation.v1",
}
DOMAINS = {
    "APPROVAL_RECEIPT": "SIMURGH_STAGE4Q_APPROVAL_RECEIPT_V1",
    "APPROVAL_EXEMPTION": "SIMURGH_STAGE4Q_APPROVAL_EXEMPTION_V1",
    "BOUNDARY_CROSSING": "SIMURGH_STAGE4Q_BOUNDARY_CROSSING_V1",
}
BOUNDARY_KINDS = (
    "tool_execution",
    "unsafe_export",
    "privilege_expansion",
    "consent_broadening",
    "disclosure_escalation",
)
APPROVAL_BINDING_KINDS = ("receipt", "exemption")
EXEMPTION_REASONS = ("approval_not_present",)

POLICY_ENVELOPE_KEYS = {
    "schema", "policy_id", "boundary_kinds_requiring_approval",
    "admissible_exemption_boundary_kinds", "approver_public_key_digest",
    "harness_public_key_digest", "max_window_straddle", "run_id_digest",
    "stage4n_window_anchor_digest",
}
RECEIPT_KEYS = {
    "schema", "action_digest", "request_digest", "boundary_kind",
    "stage4n_window_anchor_digest", "run_id_digest", "receipt_epoch",
    "valid_from_epoch", "valid_until_epoch", "nonce_digest",
    "approval_display_digest", "approver_public_key_digest", "signature",
}
EXEMPTION_KEYS = {
    "schema", "action_digest", "request_digest", "boundary_kind", "run_id_digest",
    "stage4n_window_anchor_digest", "exemption_reason", "exemption_policy_id",
    "harness_public_key_digest", "signature",
}
CROSSING_KEYS = {
    "schema", "action_digest", "request_digest", "boundary_kind", "crossing_epoch",
    "run_id_digest", "approval_binding_kind", "approval_binding_digest",
    "harness_public_key_digest", "signature",
}


def _normalise(v):
    if isinstance(v, list):
        return [_normalise(x) for x in v]
    if isinstance(v, dict):
        return {k: _normalise(v[k]) for k in sorted(v)}
    return v


def canonical_json(value) -> str:
    """Matches Node canonicalJson: recursive key-sort, compact separators, non-ASCII kept."""
    return json.dumps(_normalise(value), separators=(",", ":"), ensure_ascii=False)


def domain_digest(domain: str, schema: str, value) -> str:
    payload = canonical_json({"domain": domain, "schema": schema, "value": value})
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def approval_receipt_digest(receipt: dict) -> str:
    unsigned = {k: v for k, v in receipt.items() if k != "signature"}
    return domain_digest(DOMAINS["APPROVAL_RECEIPT"], SCHEMAS["APPROVAL_RECEIPT"], unsigned)


def approval_exemption_digest(exemption: dict) -> str:
    unsigned = {k: v for k, v in exemption.items() if k != "signature"}
    return domain_digest(DOMAINS["APPROVAL_EXEMPTION"], SCHEMAS["APPROVAL_EXEMPTION"], unsigned)


def crossing_digest(crossing: dict) -> str:
    unsigned = {k: v for k, v in crossing.items() if k != "signature"}
    return domain_digest(DOMAINS["BOUNDARY_CROSSING"], SCHEMAS["BOUNDARY_CROSSING"], unsigned)


def _is_digest(v) -> bool:
    return isinstance(v, str) and bool(DIGEST_RE.match(v))


def _is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= 0


def _exact(obj, keys) -> bool:
    return isinstance(obj, dict) and set(obj.keys()) == keys


def validate_envelope(e) -> dict:
    if e is None:
        return {"ok": False, "reason": "absent"}
    if not _exact(e, POLICY_ENVELOPE_KEYS) or e.get("schema") != SCHEMAS["ENVELOPE"]:
        return {"ok": False, "reason": "schema_invalid"}
    if not (isinstance(e["policy_id"], str) and e["policy_id"]):
        return {"ok": False, "reason": "schema_invalid"}
    req = e["boundary_kinds_requiring_approval"]
    if not (isinstance(req, list) and req and all(k in BOUNDARY_KINDS for k in req)):
        return {"ok": False, "reason": "schema_invalid"}
    adm = e["admissible_exemption_boundary_kinds"]
    if not (isinstance(adm, list) and all(k in BOUNDARY_KINDS for k in adm)):
        return {"ok": False, "reason": "schema_invalid"}
    if not (_is_digest(e["approver_public_key_digest"]) and _is_digest(e["harness_public_key_digest"])):
        return {"ok": False, "reason": "schema_invalid"}
    if not _is_int(e["max_window_straddle"]):
        return {"ok": False, "reason": "schema_invalid"}
    if not (_is_digest(e["run_id_digest"]) and _is_digest(e["stage4n_window_anchor_digest"])):
        return {"ok": False, "reason": "schema_invalid"}
    return {"ok": True}


def validate_receipt(r) -> dict:
    if r is None:
        return {"ok": False, "reason": "absent"}
    if not _exact(r, RECEIPT_KEYS) or r.get("schema") != SCHEMAS["APPROVAL_RECEIPT"]:
        return {"ok": False, "reason": "schema_invalid"}
    checks = [
        _is_digest(r["action_digest"]), _is_digest(r["request_digest"]),
        r["boundary_kind"] in BOUNDARY_KINDS, _is_digest(r["stage4n_window_anchor_digest"]),
        _is_digest(r["run_id_digest"]), _is_int(r["receipt_epoch"]),
        _is_int(r["valid_from_epoch"]),
        _is_int(r["valid_until_epoch"]) and r["valid_until_epoch"] >= r["valid_from_epoch"],
        r["valid_from_epoch"] <= r["receipt_epoch"] <= r["valid_until_epoch"],
        _is_digest(r["nonce_digest"]), _is_digest(r["approval_display_digest"]),
        _is_digest(r["approver_public_key_digest"]),
        isinstance(r["signature"], str) and bool(r["signature"]),
    ]
    return {"ok": True} if all(checks) else {"ok": False, "reason": "schema_invalid"}


def validate_exemption(x) -> dict:
    if x is None:
        return {"ok": False, "reason": "absent"}
    if not _exact(x, EXEMPTION_KEYS) or x.get("schema") != SCHEMAS["APPROVAL_EXEMPTION"]:
        return {"ok": False, "reason": "schema_invalid"}
    checks = [
        _is_digest(x["action_digest"]), _is_digest(x["request_digest"]),
        x["boundary_kind"] in BOUNDARY_KINDS, _is_digest(x["run_id_digest"]),
        _is_digest(x["stage4n_window_anchor_digest"]),
        x["exemption_reason"] in EXEMPTION_REASONS,
        isinstance(x["exemption_policy_id"], str) and bool(x["exemption_policy_id"]),
        _is_digest(x["harness_public_key_digest"]),
        isinstance(x["signature"], str) and bool(x["signature"]),
    ]
    return {"ok": True} if all(checks) else {"ok": False, "reason": "schema_invalid"}


def validate_crossing(c) -> dict:
    if c is None:
        return {"ok": False, "reason": "absent"}
    if not _exact(c, CROSSING_KEYS) or c.get("schema") != SCHEMAS["BOUNDARY_CROSSING"]:
        return {"ok": False, "reason": "schema_invalid"}
    checks = [
        _is_digest(c["action_digest"]), _is_digest(c["request_digest"]),
        c["boundary_kind"] in BOUNDARY_KINDS, _is_int(c["crossing_epoch"]),
        _is_digest(c["run_id_digest"]),
        c["approval_binding_kind"] in APPROVAL_BINDING_KINDS,
        _is_digest(c["approval_binding_digest"]),
        _is_digest(c["harness_public_key_digest"]),
        isinstance(c["signature"], str) and bool(c["signature"]),
    ]
    return {"ok": True} if all(checks) else {"ok": False, "reason": "schema_invalid"}


def positions_of(chain_entries, entry_digest) -> int:
    for i, e in enumerate(chain_entries):
        if e.get("entry_digest") == entry_digest:
            return i
    return -1


def _refuse(raw, reason):
    return {"raw": raw, "reason": reason}


def decide(*, envelope, receipt, exemption, crossing, chain_entries=None,
           chain_verdict=None, verify_signature=None, display_expected=None) -> dict:
    """Line-for-line mirror of pincerCore.decide (4Q spec §2.3 + Freeze 5)."""
    chain_entries = chain_entries or []
    chain_verdict = chain_verdict or {"raw": 0}
    verify = verify_signature if callable(verify_signature) else (lambda *_: False)

    ve = validate_envelope(envelope)
    if not ve["ok"]:
        return _refuse(80, ve["reason"])
    vc = validate_crossing(crossing)
    if not vc["ok"]:
        return _refuse(80, "schema_invalid")

    # Freeze 5 — No Silent Exemption branch.
    if crossing["approval_binding_kind"] == "exemption":
        if receipt is not None:
            return _refuse(84, "binding_kind_conflict")
        vx = validate_exemption(exemption)
        if not vx["ok"]:
            return _refuse(84, "approval_binding_unresolved")
        unsigned_x = {k: v for k, v in exemption.items() if k != "signature"}
        if not verify(exemption["harness_public_key_digest"], unsigned_x, exemption["signature"]):
            return _refuse(81, "exemption_signature_invalid")
        if crossing["approval_binding_digest"] != approval_exemption_digest(exemption):
            return _refuse(84, "approval_binding_digest_mismatch")
        if (
            exemption["action_digest"] != crossing["action_digest"]
            or exemption["request_digest"] != crossing["request_digest"]
            or exemption["boundary_kind"] != crossing["boundary_kind"]
            or exemption["run_id_digest"] != crossing["run_id_digest"]
            or exemption["stage4n_window_anchor_digest"] != envelope["stage4n_window_anchor_digest"]
            or exemption["exemption_policy_id"] != envelope["policy_id"]
            or exemption["harness_public_key_digest"] != envelope["harness_public_key_digest"]
            or exemption["harness_public_key_digest"] != crossing["harness_public_key_digest"]
        ):
            return _refuse(88, "friction_receipt_binding_mismatch")
        if crossing["boundary_kind"] not in envelope["admissible_exemption_boundary_kinds"]:
            return _refuse(87, "approval_exemption_not_permitted_by_policy")
        if chain_verdict["raw"] != 0:
            return _refuse(89, chain_verdict["reason"])
        return {
            "raw": 0,
            "reason": "accepted_exempt",
            "receipt_digest": approval_exemption_digest(exemption),
            "crossing_digest": crossing_digest(crossing),
        }

    if exemption is not None:
        return _refuse(84, "binding_kind_conflict")

    vr = validate_receipt(receipt)
    if not vr["ok"]:
        return _refuse(83, vr["reason"])
    unsigned_r = {k: v for k, v in receipt.items() if k != "signature"}
    if not verify(receipt["approver_public_key_digest"], unsigned_r, receipt["signature"]):
        return _refuse(81, "approval_signature_invalid")
    unsigned_c = {k: v for k, v in crossing.items() if k != "signature"}
    if not verify(crossing["harness_public_key_digest"], unsigned_c, crossing["signature"]):
        return _refuse(81, "crossing_signature_invalid")
    if not (receipt["valid_from_epoch"] <= crossing["crossing_epoch"] <= receipt["valid_until_epoch"]):
        return _refuse(82, "run_epoch_outside_validity_window")
    straddle = min(envelope["max_window_straddle"], MAX_WINDOW_STRADDLE)
    if crossing["crossing_epoch"] - receipt["receipt_epoch"] > straddle:
        return _refuse(82, "window_straddle_exceeded")
    if chain_verdict["raw"] != 0:
        return _refuse(89, chain_verdict["reason"])
    if receipt["approver_public_key_digest"] in (
        envelope["harness_public_key_digest"],
        crossing["harness_public_key_digest"],
    ):
        return _refuse(86, "approver_key_equals_harness_key")
    receipt_digest = approval_receipt_digest(receipt)
    if crossing["approval_binding_digest"] != receipt_digest:
        return _refuse(84, "approval_binding_digest_mismatch")
    approval_pos = positions_of(chain_entries, receipt_digest)
    crossing_pos = positions_of(chain_entries, crossing_digest(crossing))
    if approval_pos == -1 or crossing_pos == -1:
        return _refuse(85, "chain_position_unrecomputable")
    if approval_pos >= crossing_pos:
        return _refuse(85, "approval_not_before_crossing")
    if receipt["approver_public_key_digest"] != envelope["approver_public_key_digest"]:
        return _refuse(87, "approver_not_declared_in_policy")
    if crossing["boundary_kind"] not in envelope["boundary_kinds_requiring_approval"]:
        return _refuse(87, "boundary_kind_not_covered")
    if receipt["action_digest"] != crossing["action_digest"]:
        return _refuse(88, "action_digest_mismatch")
    if receipt["request_digest"] != crossing["request_digest"]:
        return _refuse(88, "request_digest_mismatch")
    if receipt["boundary_kind"] != crossing["boundary_kind"]:
        return _refuse(88, "boundary_kind_mismatch")
    if receipt["run_id_digest"] != crossing["run_id_digest"] or receipt["run_id_digest"] != envelope["run_id_digest"]:
        return _refuse(88, "run_id_mismatch")
    if receipt["stage4n_window_anchor_digest"] != envelope["stage4n_window_anchor_digest"]:
        return _refuse(88, "window_anchor_mismatch")
    if display_expected is not None and receipt["approval_display_digest"] != display_expected:
        return _refuse(88, "display_digest_mismatch")
    return {
        "raw": 0,
        "reason": "accepted",
        "receipt_digest": receipt_digest,
        "crossing_digest": crossing_digest(crossing),
    }
