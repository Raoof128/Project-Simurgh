# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4O tool-surface machinery (Python mirror of tools/simurgh-attestation/stage4o).

Pure stdlib. Byte-parity with the Node core is enforced by the committed parity vectors
(tests/fixtures/llmShield/stage4o/parity/canonical-parity.json) — change BOTH sides or none.
Motto: AnthropicSafe First, then ReviewerSafe.
"""
from __future__ import annotations

import hashlib
import json
import re

DIGEST_RE = re.compile(r"^sha256:[a-f0-9]{64}$")

TOOL_MANIFEST_SCHEMA = "simurgh.tool_manifest.v1"
COMMITMENT_SCHEMA = "simurgh.tool_manifest_commitment.v1"
RECEIPT_SCHEMA = "simurgh.tool_receipt.v1"
ACTION_SCHEMA = "simurgh.tool_action.v1"
GENESIS = "genesis"
KERNEL_ENTRYPOINT = "authorise_with_manifest.v1"

AUTHORITY_ORDER = ("read_only", "write", "egress", "destructive")
RISK_CLASSES = ("low", "medium", "high")
CONSENT_BINDINGS = ("state", "delta")

DOMAINS = {
    "SERVER_ID": "SIMURGH_STAGE4O_SERVER_ID_V1",
    "TOOLSET": "SIMURGH_STAGE4O_TOOLSET_V1",
    "TOOL_ENTRY": "SIMURGH_STAGE4O_TOOL_ENTRY_V1",
    "ACTION": "SIMURGH_STAGE4O_ACTION_V1",
    "RECEIPT": "SIMURGH_STAGE4O_RECEIPT_V1",
    "DECISION_CORPUS": "SIMURGH_STAGE4O_DECISION_CORPUS_V1",
    "ATTESTATION_BUNDLE": "SIMURGH_STAGE4O_ATTESTATION_BUNDLE_V1",
    "MERKLE_LEAF": "SIMURGH_STAGE4O_MERKLE_LEAF_V1",
    "MERKLE_NODE": "SIMURGH_STAGE4O_MERKLE_NODE_V1",
    "DELTA": "SIMURGH_STAGE4O_DELTA_V1",
    "TIMELINE": "SIMURGH_STAGE4O_TIMELINE_V1",
    "MANIFEST_COMMITMENT": "SIMURGH_STAGE4O_MANIFEST_COMMITMENT_V1",
}

_ENTRY_KEYS = ["tool_name_digest", "tool_schema_digest", "authority_class", "declared_sinks", "risk_class"]
_ENV_KEYS = [
    "schema", "manifest", "manifest_epoch", "valid_from_epoch", "valid_until_epoch",
    "previous_manifest_digest", "delta_digest", "consent_binding", "signer_public_key_pem", "signature",
]
_RECEIPT_KEYS = [
    "schema", "tool_name_digest", "tool_schema_digest", "authority_class",
    "sinks_used", "inclusion_proof", "run_epoch", "run_id_digest",
]


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
    if not isinstance(domain, str) or not domain.startswith("SIMURGH_STAGE4O_"):
        raise ValueError(f"unknown_digest_domain: {domain}")
    payload = canonical_json({"domain": domain, "schema": schema, "value": value})
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


# --- Merkle surface (manifest order; leaf/node domain separation; odd promotes) --------
def surface_leaf(entry_digest: str) -> str:
    return domain_digest(DOMAINS["MERKLE_LEAF"], TOOL_MANIFEST_SCHEMA, entry_digest)


def _node(a: str, b: str) -> str:
    return domain_digest(DOMAINS["MERKLE_NODE"], TOOL_MANIFEST_SCHEMA, [a, b])


def _levels(entry_digests):
    for d in entry_digests:
        if not DIGEST_RE.match(d):
            raise ValueError(f"merkle_leaf_invalid: {d}")
    if not entry_digests:
        raise ValueError("merkle_empty")
    all_levels = [[surface_leaf(d) for d in entry_digests]]
    while len(all_levels[-1]) > 1:
        cur = all_levels[-1]
        nxt = []
        for i in range(0, len(cur), 2):
            nxt.append(cur[i] if i + 1 == len(cur) else _node(cur[i], cur[i + 1]))
        all_levels.append(nxt)
    return all_levels


def surface_root(entry_digests) -> str:
    return _levels(entry_digests)[-1][0]


def surface_path(entry_digests, index):
    all_levels = _levels(entry_digests)
    path = []
    i = index
    for level in all_levels[:-1]:
        sib = i + 1 if i % 2 == 0 else i - 1
        if sib >= len(level):
            path.append({"sibling": None, "side": "promote"})
        else:
            path.append({"sibling": level[sib], "side": "right" if i % 2 == 0 else "left"})
        i //= 2
    return path


def verify_surface_path(entry_digest: str, path, root: str) -> bool:
    if not DIGEST_RE.match(entry_digest) or not DIGEST_RE.match(root) or not isinstance(path, list):
        return False
    acc = surface_leaf(entry_digest)
    for step in path:
        if not isinstance(step, dict):
            return False
        if step.get("side") == "promote" and step.get("sibling") is None:
            continue
        sib = step.get("sibling")
        if step.get("side") == "right" and isinstance(sib, str) and DIGEST_RE.match(sib):
            acc = _node(acc, sib)
        elif step.get("side") == "left" and isinstance(sib, str) and DIGEST_RE.match(sib):
            acc = _node(sib, acc)
        else:
            return False
    return acc == root


# --- Manifest schema / delta / envelope ------------------------------------------------
def _exact_keys(obj, keys) -> bool:
    return isinstance(obj, dict) and len(obj) == len(keys) and all(k in obj for k in keys)


def _fail(detail):
    return {"ok": False, "reason": "schema_invalid", "detail": detail}


def validate_manifest(m) -> dict:
    if not _exact_keys(m, ["schema", "server_id_digest", "toolset_digest", "tools"]):
        return _fail("manifest_keys")
    if m["schema"] != TOOL_MANIFEST_SCHEMA:
        return _fail("manifest_schema_id")
    if not DIGEST_RE.match(m["server_id_digest"]) or not DIGEST_RE.match(m["toolset_digest"]):
        return _fail("manifest_digest_format")
    if not isinstance(m["tools"], list) or not m["tools"]:
        return _fail("tools_empty")
    prev = ""
    for t in m["tools"]:
        if not _exact_keys(t, _ENTRY_KEYS):
            return _fail("entry_keys")
        if not DIGEST_RE.match(t["tool_name_digest"]) or not DIGEST_RE.match(t["tool_schema_digest"]):
            return _fail("entry_digest_format")
        if t["authority_class"] not in AUTHORITY_ORDER:
            return _fail("authority_class_enum")
        if t["risk_class"] not in RISK_CLASSES:
            return _fail("risk_class_enum")
        if not isinstance(t["declared_sinks"], list) or any(not DIGEST_RE.match(s) for s in t["declared_sinks"]):
            return _fail("sinks_format")
        if t["tool_name_digest"] <= prev:
            return _fail("tools_not_sorted_unique")
        prev = t["tool_name_digest"]
    return {"ok": True}


def tool_entry_digest(entry) -> str:
    return domain_digest(DOMAINS["TOOL_ENTRY"], TOOL_MANIFEST_SCHEMA, entry)


def compute_toolset_root(m) -> str:
    return surface_root([tool_entry_digest(t) for t in m["tools"]])


def delta_object(prev_m, next_m) -> dict:
    pb = {t["tool_name_digest"]: t for t in prev_m["tools"]}
    nb = {t["tool_name_digest"]: t for t in next_m["tools"]}
    removed = sorted(tool_entry_digest(t) for name, t in pb.items() if name not in nb)
    added = sorted(tool_entry_digest(t) for name, t in nb.items() if name not in pb)
    changed = []
    for name, t in pb.items():
        n = nb.get(name)
        if n is not None and tool_entry_digest(t) != tool_entry_digest(n):
            changed.append({
                "tool_name_digest": name,
                "before_entry_digest": tool_entry_digest(t),
                "after_entry_digest": tool_entry_digest(n),
            })
    changed.sort(key=lambda c: c["tool_name_digest"])
    return {"removed": removed, "added": added, "changed": changed}


def delta_digest(prev_m, next_m) -> str:
    return domain_digest(DOMAINS["DELTA"], TOOL_MANIFEST_SCHEMA, delta_object(prev_m, next_m))


def _is_epoch(n) -> bool:
    return isinstance(n, int) and not isinstance(n, bool) and n >= 0


def validate_envelope(env) -> dict:
    if not _exact_keys(env, _ENV_KEYS):
        return _fail("envelope_keys")
    if env["schema"] != COMMITMENT_SCHEMA:
        return _fail("envelope_schema_id")
    mv = validate_manifest(env["manifest"])
    if not mv["ok"]:
        return mv
    if not all(_is_epoch(env[k]) for k in ("manifest_epoch", "valid_from_epoch", "valid_until_epoch")):
        return _fail("epoch_format")
    if env["valid_from_epoch"] > env["valid_until_epoch"]:
        return _fail("epoch_window_inverted")
    if env["consent_binding"] not in CONSENT_BINDINGS:
        return _fail("consent_binding_enum")
    if env["manifest_epoch"] == 0:
        if env["previous_manifest_digest"] != GENESIS or env["delta_digest"] != GENESIS:
            return _fail("genesis_rules")
    elif not DIGEST_RE.match(env["previous_manifest_digest"]) or not DIGEST_RE.match(env["delta_digest"]):
        return _fail("chain_digest_format")
    if not isinstance(env["signer_public_key_pem"], str) or not isinstance(env["signature"], str):
        return _fail("signature_format")
    return {"ok": True}


def commitment_digest(env) -> str:
    unsigned = {k: v for k, v in env.items() if k != "signature"}
    return domain_digest(DOMAINS["MANIFEST_COMMITMENT"], COMMITMENT_SCHEMA, unsigned)


# --- Drift algebra ---------------------------------------------------------------------
def _rank(c) -> int:
    return AUTHORITY_ORDER.index(c)


def _narrows(prev_m, next_m) -> bool:
    pb = {t["tool_name_digest"]: t for t in prev_m["tools"]}
    for n in next_m["tools"]:
        p = pb.get(n["tool_name_digest"])
        if p is None:
            return False
        if n["tool_schema_digest"] != p["tool_schema_digest"]:
            return False
        if _rank(n["authority_class"]) > _rank(p["authority_class"]):
            return False
        if not all(s in p["declared_sinks"] for s in n["declared_sinks"]):
            return False
    return True


def classify_drift(prev_m, next_m) -> str:
    equal = len(prev_m["tools"]) == len(next_m["tools"]) and all(
        tool_entry_digest(t) == tool_entry_digest(next_m["tools"][i]) for i, t in enumerate(prev_m["tools"])
    )
    if equal:
        return "equal"
    dn = _narrows(prev_m, next_m)
    up = _narrows(next_m, prev_m)
    if dn and not up:
        return "narrowing"
    if up and not dn:
        return "broadening"
    return "incomparable"


def validate_chain(chain) -> dict:
    if not isinstance(chain, list) or not chain:
        return {"ok": False, "raw": 64, "reason": "ancestry_incomplete"}
    classifications = []
    for i, env in enumerate(chain):
        if not validate_envelope(env)["ok"]:
            return {"ok": False, "raw": 64, "reason": "ancestry_incomplete"}
        if i == 0:
            if env["manifest_epoch"] != 0 or env["previous_manifest_digest"] != GENESIS or env["delta_digest"] != GENESIS:
                return {"ok": False, "raw": 64, "reason": "ancestry_incomplete"}
            classifications.append("equal")
            continue
        prev = chain[i - 1]
        if env["manifest_epoch"] != prev["manifest_epoch"] + 1:
            return {"ok": False, "raw": 64, "reason": "ancestry_incomplete"}
        if env["previous_manifest_digest"] != commitment_digest(prev):
            return {"ok": False, "raw": 64, "reason": "prev_digest_mismatch"}
        if env["delta_digest"] != delta_digest(prev["manifest"], env["manifest"]):
            return {"ok": False, "raw": 64, "reason": "delta_digest_mismatch"}
        cls = classify_drift(prev["manifest"], env["manifest"])
        classifications.append(cls)
        if cls == "broadening" and env["consent_binding"] != "delta":
            return {"ok": False, "raw": 65, "reason": "state_bound_broadening"}
        if cls == "incomparable" and env["consent_binding"] != "delta":
            return {"ok": False, "raw": 65, "reason": "state_bound_incomparable"}
    if len(chain) > 1 and all(c in ("equal", "narrowing") for c in classifications):
        direct = classify_drift(chain[0]["manifest"], chain[-1]["manifest"])
        if direct not in ("equal", "narrowing"):
            return {"ok": False, "raw": 64, "reason": "composition_mismatch"}
    return {"ok": True, "classifications": classifications}


# --- The 12-check gate (mirror of decisionCore.gateToolCall) ---------------------------
def receipt_digest(receipt) -> str:
    return domain_digest(DOMAINS["RECEIPT"], RECEIPT_SCHEMA, receipt)


def validate_receipt(r) -> bool:
    return (
        _exact_keys(r, _RECEIPT_KEYS)
        and r["schema"] == RECEIPT_SCHEMA
        and bool(DIGEST_RE.match(r["tool_name_digest"]))
        and bool(DIGEST_RE.match(r["tool_schema_digest"]))
        and r["authority_class"] in AUTHORITY_ORDER
        and isinstance(r["sinks_used"], list)
        and all(DIGEST_RE.match(s) for s in r["sinks_used"])
        and isinstance(r["inclusion_proof"], list)
        and isinstance(r["run_epoch"], int)
        and not isinstance(r["run_epoch"], bool)
        and r["run_epoch"] >= 0
        and bool(DIGEST_RE.match(r["run_id_digest"]))
    )


def _r(raw, name, reason):
    return {"raw": raw, "name": name, "reason": reason}


def gate_tool_call(*, chain, receipt, action_digest_value, verify_commitment_signature,
                   kernel_entrypoint=KERNEL_ENTRYPOINT):
    if not isinstance(chain, list) or not chain:
        return _r(55, "manifest_missing", "absent")
    for env in chain:
        if not validate_envelope(env)["ok"]:
            return _r(55, "manifest_missing", "schema_invalid")
    head = chain[-1]
    for env in chain:
        if not verify_commitment_signature(env):
            return _r(56, "manifest_signature_invalid", "commitment_signature_invalid")
    if not validate_receipt(receipt):
        return _r(63, "manifest_receipt_binding_mismatch", "receipt_schema_invalid")
    if receipt["run_epoch"] < head["valid_from_epoch"] or receipt["run_epoch"] > head["valid_until_epoch"]:
        return _r(57, "manifest_epoch_invalid", "run_epoch_outside_validity_window")
    chain_result = validate_chain(chain)
    if not chain_result["ok"]:
        raw = chain_result["raw"]
        return _r(raw, "drift_laundering_detected" if raw == 64 else "blind_reapproval", chain_result["reason"])
    if compute_toolset_root(head["manifest"]) != head["manifest"]["toolset_digest"]:
        return _r(58, "server_or_toolset_digest_mismatch", "toolset_root_recompute_mismatch")
    entry = next((t for t in head["manifest"]["tools"] if t["tool_name_digest"] == receipt["tool_name_digest"]), None)
    if entry is None:
        return _r(59, "tool_identity_mismatch", "tool_not_in_manifest")
    if not verify_surface_path(tool_entry_digest(entry), receipt["inclusion_proof"], head["manifest"]["toolset_digest"]):
        return _r(59, "tool_identity_mismatch", "inclusion_proof_invalid")
    if receipt["tool_schema_digest"] != entry["tool_schema_digest"]:
        return _r(60, "tool_schema_digest_mismatch", "schema_digest_mismatch")
    if _rank(receipt["authority_class"]) > _rank(entry["authority_class"]):
        return _r(61, "authority_class_upgrade", "authority_class_upgrade")
    if not all(s in entry["declared_sinks"] for s in receipt["sinks_used"]):
        return _r(62, "declared_sink_expansion", "sink_not_declared")
    if not DIGEST_RE.match(action_digest_value):
        return _r(63, "manifest_receipt_binding_mismatch", "binding_mismatch")
    return {
        "raw": 0,
        "name": "accepted",
        "bindings": {
            "action_digest": action_digest_value,
            "manifest_digest": commitment_digest(head),
            "manifest_entry_digest": tool_entry_digest(entry),
            "kernel_entrypoint": kernel_entrypoint,
            "receipt_digest": receipt_digest(receipt),
            "run_id_digest": receipt["run_id_digest"],
        },
    }
