# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4S delegation-chain decision surface (4S spec §8, §11).

Pure, dependency-free port of the boundary-relevant portion of the JS chainCore:
tree invariants, window-close fan-out, scope attenuation, budget flux, binding,
and replay. Mirrors tools/simurgh-attestation/stage4s/core/chainCore.mjs.

Signature verification (101) is delegated to an injected ``verify_signature``
callable; the default fails closed (refuse-all), matching the manifest/friction
surfaces. Bundle-integrity codes 116/117 are the attestation verifier's job, not
the per-crossing kernel boundary, so they are intentionally out of scope here.

Motto: AnthropicSafe First, then ReviewerSafe.
"""
from __future__ import annotations

import hashlib
import json

SENTINEL = "self"
CHAIN_BUNDLE = "simurgh.vdcc_chain_bundle.v1"
HOP_RECEIPT = "simurgh.vdcc_hop_receipt.v1"
FANOUT_COMMITMENT = "simurgh.vdcc_fanout_commitment.v1"
CROSSING_ARTIFACT = "simurgh.vdcc_crossing_artifact.v1"
D_RECEIPT = "SIMURGH_STAGE4S_RECEIPT_V1"
D_FANOUT = "SIMURGH_STAGE4S_FANOUT_V1"


def _refuse_all(_obj) -> bool:
    return False  # fail closed unless the caller supplies real signature verification


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _record_digest(value) -> str:
    return "sha256:" + hashlib.sha256(_canonical(value).encode()).hexdigest()


def receipt_digest(r) -> str:
    return _record_digest({"domain": D_RECEIPT, "receipt": r})


def child_set_root(children) -> str:
    return _record_digest({"domain": D_FANOUT, "child_digests": sorted(children)})


def _normalize_scope(arr):
    out = set()
    for s in arr:
        out.add(s.lower())
    return sorted(out)


def _scope_leq(a, b) -> bool:
    bset = set(_normalize_scope(b))
    return all(s in bset for s in _normalize_scope(a))


def _path_scope(scopes):
    acc = set(_normalize_scope(scopes[0]))
    for s in scopes[1:]:
        acc &= set(_normalize_scope(s))
    return sorted(acc)


def _blocked(raw, reason):
    return {"raw": raw, "reason": reason, "bound_receipt_digest": ""}


def decide(bundle, crossing, verify_signature=None):
    verify = verify_signature or _refuse_all

    # ---- 100: structural schema + signature-field presence + key index ----
    if not isinstance(bundle, dict) or bundle.get("schema") != CHAIN_BUNDLE:
        return _blocked(100, "chain_bundle_schema_invalid")
    tree = bundle.get("tree_receipts")
    detached = bundle.get("detached_receipts")
    fanouts = bundle.get("fanout_commitments")
    crossings = bundle.get("crossing_artifacts")
    if not all(isinstance(x, list) for x in (tree, detached, fanouts, crossings)):
        return _blocked(100, "chain_bundle_schema_invalid")
    if not isinstance(bundle.get("public_key_index"), dict):
        return _blocked(100, "public_key_index_missing_or_malformed")
    for r in list(tree) + list(detached):
        if not isinstance(r, dict) or r.get("schema") != HOP_RECEIPT:
            return _blocked(100, "receipt_schema_invalid")
        if "signature_delegator" not in r or "signature_delegatee" not in r:
            return _blocked(100, "required_signature_field_missing")
    for c in fanouts:
        if not isinstance(c, dict) or c.get("schema") != FANOUT_COMMITMENT:
            return _blocked(100, "fanout_commitment_schema_invalid")
        d = c.get("declared_child_receipt_digests")
        if not isinstance(d, list) or len(set(d)) != len(d):
            return _blocked(100, "duplicate_declared_child_digests")

    # ---- 101: injected signature verification (fail-closed default) ----
    for r in list(tree) + list(detached):
        if not verify(r):
            return _blocked(101, "signature_invalid")

    # ---- tree index ----
    by, children_of, sentinel_roots = {}, {}, []
    for r in tree:
        d = receipt_digest(r)
        by[d] = r
        if r["parent_receipt_digest"] is None and r["root_receipt_digest"] == SENTINEL:
            sentinel_roots.append(d)
    for d, r in by.items():
        p = r["parent_receipt_digest"]
        if p is not None:
            children_of.setdefault(p, []).append(d)

    # ---- 102/103/113/104/105 ----
    if len(sentinel_roots) != 1:
        return _blocked(102, "root_missing_or_multiple")
    root = sentinel_roots[0]
    for d, r in by.items():
        if (
            r["parent_receipt_digest"] is not None
            and r["parent_receipt_digest"] not in by
        ):
            return _blocked(103, "parent_digest_mismatch")
    deleg = {}
    for r in by.values():
        if r["parent_receipt_digest"] is None:
            continue
        deleg[r["delegatee_key_digest"]] = deleg.get(r["delegatee_key_digest"], 0) + 1
    if any(n > 1 for n in deleg.values()):
        return _blocked(113, "split_brain_child")
    reachable, cyc = set(), [False]

    def dfs(d, stack):
        if d in stack:
            cyc[0] = True
            return
        if d in reachable:
            return
        reachable.add(d)
        stack.add(d)
        for c in children_of.get(d, []):
            dfs(c, stack)
        stack.discard(d)

    dfs(root, set())
    for d in by:
        if d not in reachable:
            local = set()

            def probe(n):
                if n in local:
                    cyc[0] = True
                    return
                local.add(n)
                for c in children_of.get(n, []):
                    probe(c)

            probe(d)
    if cyc[0]:
        return _blocked(104, "cycle_detected")
    for d in by:
        if d not in reachable:
            return _blocked(105, "unreachable_node")

    # ---- 106/107: fan-out ----
    observed = {}
    for cd, r in by.items():
        if r["parent_receipt_digest"] is None:
            continue
        observed.setdefault(r["parent_receipt_digest"], {}).setdefault(
            r["window_id"], []
        ).append(cd)
    for wm in observed.values():
        for w in wm:
            wm[w] = sorted(wm[w])
    declared = {}
    for c in fanouts:
        declared.setdefault(c["node_receipt_digest"], {})[c["window_id"]] = c
    for node in by:
        obs_w = observed.get(node, {})
        dec_w = declared.get(node, {})
        for w, obs_children in obs_w.items():
            c = dec_w.get(w)
            if not c or c["declared_child_count"] != len(obs_children):
                return _blocked(106, "fanout_count_mismatch")
            if sorted(c["declared_child_receipt_digests"]) != obs_children or c[
                "declared_child_set_root"
            ] != child_set_root(obs_children):
                return _blocked(107, "fanout_child_set_mismatch")
        for w, c in dec_w.items():
            if w not in obs_w and c["declared_child_count"] != 0:
                return _blocked(106, "fanout_count_mismatch")
        if not obs_w and not dec_w:
            return _blocked(106, "fanout_count_mismatch")

    # ---- binding partition ----
    detached_digests = {receipt_digest(r) for r in detached}
    resolved, receiptless, orphan = [], [], []
    for a in crossings:
        b = a["bound_receipt_digest"]
        if b in by:
            resolved.append(a)
        elif isinstance(b, str) and b and b in detached_digests:
            orphan.append(a)
        else:
            receiptless.append(a)

    # ---- 108: scope ----
    for d, r in by.items():
        if r["parent_receipt_digest"] is None:
            continue
        if not _scope_leq(r["scope"], by[r["parent_receipt_digest"]]["scope"]):
            return _blocked(108, "scope_attenuation_violation")
    for a in resolved:
        chain, cur, seen = [], a["bound_receipt_digest"], set()
        while cur and cur in by and cur not in seen:
            seen.add(cur)
            chain.append(by[cur])
            cur = by[cur]["parent_receipt_digest"]
        ps = _path_scope([r["scope"] for r in reversed(chain)])
        if not _scope_leq(_normalize_scope(a["requested_scope"]), ps):
            return _blocked(108, "scope_attenuation_violation")

    # ---- 110/109: flux ----
    local = {}
    for cr in resolved:
        local[cr["bound_receipt_digest"]] = (
            local.get(cr["bound_receipt_digest"], 0) + cr["spend"]
        )
    for d in sorted(by):
        r = by[d]
        spend = local.get(d, 0)
        if spend > r["budget_allocated"]:
            return _blocked(110, "local_spend_overflow")
        child_budget = sum(by[c]["budget_allocated"] for c in children_of.get(d, []))
        if spend + child_budget > r["budget_allocated"]:
            return _blocked(109, "budget_flux_violation")

    # ---- 112 then 111: binding ----
    if receiptless:
        return _blocked(112, "receiptless_authority_crossing")
    if orphan:
        return _blocked(111, "ghost_hop_detected")

    # ---- 114/115: replay ----
    for r in list(tree) + list(detached):
        if r["epoch"] != bundle["epoch"]:
            return _blocked(114, "epoch_replay")
    for a in crossings:
        if a["epoch"] != bundle["epoch"]:
            return _blocked(114, "epoch_replay")
    for d, r in by.items():
        if r["run_id"] != bundle["run_id"]:
            return _blocked(115, "root_replay")
        expected = SENTINEL if r["parent_receipt_digest"] is None else root
        if r["root_receipt_digest"] != expected:
            return _blocked(115, "root_replay")

    return {
        "raw": 0,
        "reason": "accepted",
        "bound_receipt_digest": crossing["bound_receipt_digest"],
    }
