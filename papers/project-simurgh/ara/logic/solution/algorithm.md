# Algorithm

## Proof Protocol

### Pairing Handshake

```
Server:  challenge ← random(32 bytes); TTL = 60s; store pending[session_id] = challenge
Browser: forward challenge to daemon
Daemon:  pairing_sig ← Sign(sk, Canonicalise({challenge, session_id, ...}))
Browser: POST /api/pairing/complete {pubkey, pairing_sig, challenge}
Server:  Verify(pk, canonical, pairing_sig) → extract pk
         node_id_hash ← SHA-256(pk)          # bare hex for browser-paired; sha256:<hex> for daemon
         bind session_id → node_id_hash
         pending[session_id] ← null          # consume challenge (single use)
```

### Proof Submission and E1 Triple Check

```
Daemon:  metadata ← ScanOS()                 # platform-specific; returns counts, not content
         proof ← {type, session_id, exam_id, sequence, timestamp, node_id_hash, daemon_version,
                   platform, capture_excluded_window_count, helper_state, challenge, signature}
         canonical ← canonicaliseDaemonPayload(proof \ {signature})
         proof.signature ← Sign(sk, canonical)   # ECDSA P-256 over SHA-256
         POST /api/integrity/proofs {proof, pubkey}

Server (E1):
  (a) SHA-256(decode(pubkey)) == proof.node_id_hash?   → fail: invalid_signature
  (b) pubkey == session.registered_key?                  → fail: invalid_signature
  (c) Verify("sha256", canonical, pubkey, proof.sig)?   → fail: invalid_signature
  (d) proof.nonce ∉ nonceGuard?                         → fail: nonce_replayed
  (e) proof.node_id_hash == session.node_id_hash (N1)?  → fail: node_mismatch
  → append to audit chain (accept or reject with reason)
```

### Global Nonce Guard

```
State: seen = Map<nonce → expiresAt>; TTL = 5 minutes
check(nonce):
  if nonce ∈ seen → {ok: false, reason: "nonce_replayed"}
  seen[nonce] ← now + 5min
  return {ok: true}
Cleanup: every 60s, evict entries where expiresAt ≤ now
```

### HMAC-SHA256 Audit Chain

```
State: chain = {prevHash: "GENESIS", entries: [], truncated: false}

append(type, payload):
  entry = {seq, ts, type, payload, prev: chain.prevHash}
  sig = HMAC-SHA256(key, JSON.stringify(entry))
  entry.sig = sig
  chain.prevHash = sig
  chain.entries.push(entry)

verify(chain, key):
  prevHash = "GENESIS"
  for entry in chain.entries:
    {sig, ...rest} = entry
    expected = HMAC-SHA256(key, JSON.stringify(rest))
    assert expected == sig AND rest.prev == prevHash
    prevHash = sig
```

### Risk Scoring

```
weights = {paste_risk: 0.25, focus_risk: 0.18, typing_risk: 0.15, idle_risk: 0.10,
           affinity_risk: 0.18, helper_risk: 0.05, daemon_risk: 0.09, session_risk: 0.05}

score = Σ weights[k] * categories[k]   where each category ∈ [0, 100]

Overrides (after weighted sum):
  paste ≥ 200 AND typed < 20  → score = max(score, 75)
  paste ≥ 80 AND score < 40   → score = 40
  affinityRaw ≥ 100           → score = max(score, 85)
  daemonRisk ≥ 40             → score = max(score, 40)
  daemonForceCritical         → score = max(score, 85)

risk_level = score ≥ 70 ? "Critical" : score ≥ 40 ? "Warning" : "Safe"
```

### Canonical Serialisation (Two Distinct Implementations)

**Browser-paired proof (recursive key sort):**

```python
def proofCanonicalise(obj):
    if isinstance(obj, dict):
        return {k: proofCanonicalise(obj[k]) for k in sorted(obj.keys())}
    elif isinstance(obj, list):
        return [proofCanonicalise(x) for x in obj]
    return obj
canonical = json.dumps(proofCanonicalise(proof_without_signature))
```

Implemented in `src/integrity/proofCanonicalise.js` and mirrored in `simurgh-node-macos` Swift.

**Device-shield daemon proof (top-level key sort only):**

```python
def canonicaliseDaemonPayload(payload):
    copy = {k: payload[k] for k in sorted(payload.keys()) if k != "signature"}
    return json.dumps(copy)
```

Implemented in `src/device/daemonProof.js:canonicaliseDaemonPayload` and mirrored in
`tools/simurgh-daemon-linux/src/canonical_json.rs`.

## Complexity

| Operation             | Complexity                         |
| --------------------- | ---------------------------------- |
| Proof validation (E1) | O(n) in proof field count (n ≤ 12) |
| Nonce guard lookup    | O(1) amortised (hash map)          |
| Audit chain append    | O(m) where m = JSON payload size   |
| Risk scoring          | O(1) (fixed 8 categories)          |
| Audit chain verify    | O(N) where N = chain length ≤ 5000 |
