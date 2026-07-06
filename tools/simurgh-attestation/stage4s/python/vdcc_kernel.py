# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4S VDCC parity kernel (4S spec §16). Motto: AnthropicSafe First, then
# ReviewerSafe. A pure-stdlib Python reimplementation of the post-signature
# mathematical layers of the chain decision engine: tree invariants, window-close
# fan-out, scope lattice, budget flux, binding, replay, spine, and the bundle
# Merkle root. Its job is to prove the JS core and this kernel agree on the raw
# code for every NON-signature fixture.
#
# Python parity INTENTIONALLY excludes Ed25519 verification because zero new
# dependencies are allowed (stdlib has no Ed25519). Signature fixtures (the 101
# single-signature hop) remain JS-only; the structural missing-field 100 is
# checked here because it is field presence, not crypto.
import hashlib
import json
import sys

SENTINEL = "self"
CHAIN_BUNDLE = "simurgh.vdcc_chain_bundle.v1"
HOP_RECEIPT = "simurgh.vdcc_hop_receipt.v1"
FANOUT_COMMITMENT = "simurgh.vdcc_fanout_commitment.v1"
CROSSING_ARTIFACT = "simurgh.vdcc_crossing_artifact.v1"
D_RECEIPT = "SIMURGH_STAGE4S_RECEIPT_V1"
D_FANOUT = "SIMURGH_STAGE4S_FANOUT_V1"
D_CROSSING = "SIMURGH_STAGE4S_CROSSING_V1"
D_MERKLE_LEAF = "SIMURGH_STAGE4S_MERKLE_LEAF_V1"
D_MERKLE_NODE = "SIMURGH_STAGE4S_MERKLE_NODE_V1"


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(value):
    return "sha256:" + hashlib.sha256(canonical_json(value).encode()).hexdigest()


def receipt_digest(r):
    return record_digest({"domain": D_RECEIPT, "receipt": r})


def fanout_digest(c):
    return record_digest({"domain": D_FANOUT, "fanout": c})


def crossing_digest(a):
    return record_digest({"domain": D_CROSSING, "crossing": a})


def child_set_root(children):
    return record_digest({"domain": D_FANOUT, "child_digests": sorted(children)})


def _dd(domain, value):
    return "sha256:" + hashlib.sha256(
        canonical_json({"domain": domain, "schema": CHAIN_BUNDLE, "value": value}).encode()
    ).hexdigest()


def bundle_root(entry_digests):
    if not entry_digests:
        raise ValueError("merkle_empty")
    level = [_dd(D_MERKLE_LEAF, d) for d in entry_digests]
    while len(level) > 1:
        nxt = []
        for i in range(0, len(level), 2):
            nxt.append(level[i] if i + 1 == len(level) else _dd(D_MERKLE_NODE, [level[i], level[i + 1]]))
        level = nxt
    return level[0]


# ---- scope lattice ----
def normalize_scope(arr):
    if not isinstance(arr, list):
        raise TypeError("scope must be a list")
    out = set()
    for s in arr:
        if not isinstance(s, str) or s == "":
            raise TypeError("scope entries must be non-empty strings")
        out.add(s.lower())
    return sorted(out)


def scope_leq(a, b):
    bset = set(normalize_scope(b))
    return all(s in bset for s in normalize_scope(a))


def path_scope(scopes):
    if not scopes:
        raise TypeError("pathScope needs at least one scope")
    acc = set(normalize_scope(scopes[0]))
    for s in scopes[1:]:
        acc &= set(normalize_scope(s))
    return sorted(acc)


# ---- tree ----
def index_bundle(receipts):
    by_digest = {}
    children_of = {}
    sentinel_roots = []
    for r in receipts:
        d = receipt_digest(r)
        by_digest[d] = r
        if r["parent_receipt_digest"] is None and r["root_receipt_digest"] == SENTINEL:
            sentinel_roots.append(d)
    for d, r in by_digest.items():
        p = r["parent_receipt_digest"]
        if p is not None:
            children_of.setdefault(p, []).append(d)
    root = sentinel_roots[0] if len(sentinel_roots) == 1 else None
    return {"by_digest": by_digest, "children_of": children_of, "sentinel_roots": sentinel_roots, "root": root}


def verify_tree(index):
    by = index["by_digest"]
    if len(index["sentinel_roots"]) != 1:
        return 102
    for d, r in by.items():
        if r["parent_receipt_digest"] is not None and r["parent_receipt_digest"] not in by:
            return 103
    deleg = {}
    for r in by.values():
        if r["parent_receipt_digest"] is None:
            continue
        k = r["delegatee_key_digest"]
        deleg[k] = deleg.get(k, 0) + 1
    if any(n > 1 for n in deleg.values()):
        return 113
    reachable = set()
    cycle = [False]

    def dfs(d, stack):
        if d in stack:
            cycle[0] = True
            return
        if d in reachable:
            return
        reachable.add(d)
        stack.add(d)
        for c in index["children_of"].get(d, []):
            dfs(c, stack)
        stack.discard(d)

    if index["root"] in by:
        dfs(index["root"], set())
    for d in by:
        if d not in reachable:
            local = set()

            def probe(n):
                if n in local:
                    cycle[0] = True
                    return
                local.add(n)
                for c in index["children_of"].get(n, []):
                    probe(c)

            probe(d)
    if cycle[0]:
        return 104
    for d in by:
        if d not in reachable:
            return 105
    return 0


def verify_fanout(index, commitments):
    by = index["by_digest"]
    observed = {}
    for cd, r in by.items():
        if r["parent_receipt_digest"] is None:
            continue
        p, w = r["parent_receipt_digest"], r["window_id"]
        observed.setdefault(p, {}).setdefault(w, []).append(cd)
    for wm in observed.values():
        for w in wm:
            wm[w] = sorted(wm[w])
    declared = {}
    for c in commitments:
        if c.get("schema") != FANOUT_COMMITMENT:
            return 100
        d = c.get("declared_child_receipt_digests")
        if not isinstance(d, list) or len(set(d)) != len(d):
            return 100
        declared.setdefault(c["node_receipt_digest"], {})[c["window_id"]] = c
    for node in by:
        obs_w = observed.get(node, {})
        dec_w = declared.get(node, {})
        for w, obs_children in obs_w.items():
            c = dec_w.get(w)
            if not c:
                return 106
            if c["declared_child_count"] != len(obs_children):
                return 106
            decl_sorted = sorted(c["declared_child_receipt_digests"])
            if decl_sorted != obs_children or c["declared_child_set_root"] != child_set_root(obs_children):
                return 107
        for w, c in dec_w.items():
            if w not in obs_w and c["declared_child_count"] != 0:
                return 106
        if not obs_w and not dec_w:
            return 106
    return 0


def verify_flux(index, crossings):
    by = index["by_digest"]
    local = {}
    for cr in crossings:
        d = cr["bound_receipt_digest"]
        if d not in by:
            continue
        local[d] = local.get(d, 0) + cr["spend"]
    for d in sorted(by):
        r = by[d]
        spend = local.get(d, 0)
        if spend > r["budget_allocated"]:
            return 110
        child_budget = sum(by[c]["budget_allocated"] for c in index["children_of"].get(d, []))
        if spend + child_budget > r["budget_allocated"]:
            return 109
    return 0


def path_receipts(index, node):
    chain = []
    cur = node
    seen = set()
    while cur and cur in index["by_digest"] and cur not in seen:
        seen.add(cur)
        r = index["by_digest"][cur]
        chain.append(r)
        cur = r["parent_receipt_digest"]
    return list(reversed(chain))


def evaluate(bundle):
    # ---- 100: structural schema, signature-field presence, key index ----
    if not isinstance(bundle, dict) or bundle.get("schema") != CHAIN_BUNDLE:
        return 100
    tree = bundle.get("tree_receipts")
    detached = bundle.get("detached_receipts")
    fanouts = bundle.get("fanout_commitments")
    crossings = bundle.get("crossing_artifacts")
    if not all(isinstance(x, list) for x in (tree, detached, fanouts, crossings)):
        return 100
    pki = bundle.get("public_key_index")
    if not isinstance(pki, dict):
        return 100
    for r in list(tree) + list(detached):
        if not isinstance(r, dict) or r.get("schema") != HOP_RECEIPT:
            return 100
        if "signature_delegator" not in r or "signature_delegatee" not in r:
            return 100
    for c in fanouts:
        if not isinstance(c, dict) or c.get("schema") != FANOUT_COMMITMENT:
            return 100
        d = c.get("declared_child_receipt_digests")
        if not isinstance(d, list) or len(set(d)) != len(d):
            return 100
        if "signature_delegator" not in c:
            return 100
    for a in crossings:
        if not isinstance(a, dict) or a.get("schema") != CROSSING_ARTIFACT:
            return 100
        if "signature_actor" not in a:
            return 100

    # ---- 101 (crypto) intentionally skipped in the parity kernel ----

    tree_index = index_bundle(tree)
    tv = verify_tree(tree_index)
    if tv != 0:
        return tv
    fv = verify_fanout(tree_index, fanouts)
    if fv != 0:
        return fv

    detached_digests = {receipt_digest(r) for r in detached}
    resolved, receiptless, orphan = [], [], []
    for a in crossings:
        b = a["bound_receipt_digest"]
        if b in tree_index["by_digest"]:
            resolved.append(a)
        elif isinstance(b, str) and b and b in detached_digests:
            orphan.append(a)
        else:
            receiptless.append(a)

    by = tree_index["by_digest"]
    for d, r in by.items():
        if r["parent_receipt_digest"] is None:
            continue
        parent = by[r["parent_receipt_digest"]]
        if not scope_leq(r["scope"], parent["scope"]):
            return 108
    for a in resolved:
        ps = path_scope([r["scope"] for r in path_receipts(tree_index, a["bound_receipt_digest"])])
        if not scope_leq(normalize_scope(a["requested_scope"]), ps):
            return 108

    flv = verify_flux(tree_index, resolved)
    if flv != 0:
        return flv

    if receiptless:
        return 112
    if orphan:
        return 111

    for r in list(tree) + list(detached):
        if r["epoch"] != bundle["epoch"]:
            return 114
    for a in crossings:
        if a["epoch"] != bundle["epoch"]:
            return 114

    root = tree_index["root"]
    for d, r in by.items():
        if r["run_id"] != bundle["run_id"]:
            return 115
        expected = SENTINEL if r["parent_receipt_digest"] is None else root
        if r["root_receipt_digest"] != expected:
            return 115

    spine_set = set(bundle.get("spine_index", []))
    for r in tree:
        for v in (r.get("spine_refs") or {}).values():
            if v is not None and v not in spine_set:
                return 116

    leaves = (
        [receipt_digest(r) for r in tree]
        + [receipt_digest(r) for r in detached]
        + [fanout_digest(c) for c in fanouts]
        + [crossing_digest(a) for a in crossings]
    )
    if bundle["bundle_merkle_root"] != bundle_root(leaves):
        return 117
    return 0


def evaluate_safe(bundle):
    try:
        return evaluate(bundle)
    except Exception:
        return 118


def main():
    if len(sys.argv) < 3 or sys.argv[1] != "verify":
        print("usage: vdcc_kernel.py verify <corpus-index.json>", file=sys.stderr)
        sys.exit(2)
    import os

    corpus_path = sys.argv[2]
    base = os.path.dirname(corpus_path)
    with open(corpus_path) as fh:
        corpus = json.load(fh)
    for case in corpus["cases"]:
        with open(os.path.join(base, case["file"])) as fh:
            bundle = json.load(fh)
        print(
            json.dumps(
                {"name": case["name"], "raw": evaluate_safe(bundle)},
                sort_keys=True,
                separators=(",", ":"),
            )
        )


if __name__ == "__main__":
    main()
