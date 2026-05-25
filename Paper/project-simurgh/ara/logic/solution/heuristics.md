# Heuristics

## H01 — Paste Override: Hard Critical Floor

**Statement:** If paste_payload_chars ≥ 200 AND chars_typed < 20, force risk_score ≥ 75
regardless of weighted sum.

**Rationale:** A large paste with minimal own typing is a high-fidelity signal for AI-assisted
answer submission. The weighted sum can underweight this in isolation; the override ensures
it always triggers Critical review.

**Sensitivity:** Threshold of 200 chars and 20 typed is a design choice, not empirically
calibrated. Lower thresholds increase false positives for legitimate copy-paste workflows.

**Bounds:** Applies only when both conditions hold simultaneously. Does not fire for paste-only
(without the low-typing condition).

**Code ref:** `src/execution/proof_protocol.py` (mirrors `src/academic/riskScoring.js:80-81`)

**Source:** Explicit in `src/academic/riskScoring.js`

---

## H02 — Affinity Critical Floor

**Statement:** If `hostileCount` > 0 (i.e., `capture_excluded_window_count` > 0 in an accepted
proof), force `affinity_risk = 100` and risk_score ≥ 85.

**Rationale:** A capture-excluded window during an active session is the system's highest-fidelity
signal for the Invisible Window attack class. Forcing Critical review prevents any weighted-sum
combination from suppressing it.

**Sensitivity:** Any non-zero count triggers the override. This means a single excluded window —
including legitimate system windows with this flag — triggers Critical. False positive rate is
unknown without empirical data.

**Bounds:** Applies only to Windows/macOS platforms where the daemon can read affinity flags.
Linux X11 path does NOT set `hostileCount` based on capture-exclusion (different semantics).

**Code ref:** `src/execution/proof_protocol.py` (mirrors `src/academic/riskScoring.js:86-88`)

**Source:** Explicit in `src/academic/riskScoring.js`

---

## H03 — Uniform Error Code for Oracle Prevention

**Statement:** All three E1 failure modes (hash mismatch, key mismatch, signature failure) return
the same reason code: `invalid_signature`.

**Rationale:** Differentiating error codes would allow an adversary to probe which check failed,
potentially leaking information about the session's registered key or the structure of valid
proofs.

**Sensitivity:** Any deviation from uniform error coding introduces a timing or content oracle.

**Bounds:** Applies only to E1 triple-check failures. Other failure modes (schema, nonce,
node-continuity) have distinct reason codes.

**Code ref:** `src/execution/proof_protocol.py` (mirrors `src/device/daemonProof.js:170-188`)

**Source:** Explicit in `src/device/daemonProof.js`

---

## H04 — Confidence Floor of 0.5

**Statement:** The `confidence` field in the risk output is computed as
`clamp(0.5 + risk_score / 200, 0, 1)`. Minimum confidence is always 0.5.

**Rationale:** Heuristic-based results always carry at least baseline certainty. A confidence
of 0 would suggest the system has no information; a floor of 0.5 acknowledges that a structured
metadata signal — even a weak one — is better than no signal.

**Sensitivity:** The formula is linear in risk_score. The 0.5 floor and the 1/200 coefficient
are design choices with no empirical calibration.

**Bounds:** Applies only to the local-heuristic scoring path. The Claude narrative layer (when
enabled) may produce its own confidence estimate.

**Code ref:** `src/execution/proof_protocol.py` (mirrors `src/academic/riskScoring.js:93-95`)

**Source:** Explicit in `src/academic/riskScoring.js`

---

## H05 — Global Nonce Guard (Not Per-Session)

**Statement:** The nonce guard is a single global in-memory store with 5-minute TTL. Session
binding comes from the proof's `session_id` field and the ECDSA signature, not from the nonce
guard architecture.

**Rationale:** A per-session nonce guard would require coordination between nonce guard and
session lifecycle (eviction, expiry). The global guard is simpler and prevents the only attack
it needs to block: submitting the same proof twice. Session binding via signed `session_id` is
cryptographically stronger than nonce-guard-based session isolation.

**Sensitivity:** The 5-minute TTL means a nonce is only protected against replay for 5 minutes.
Cross-session replay after TTL expiry is theoretically possible but requires session key reuse.

**Bounds:** Applies only to the browser-paired Ed25519 proof path. The device-shield daemon
proof uses `challenge` (server-issued, consumed on use) for replay protection.

**Code ref:** `src/integrity/nonceGuard.js`

**Source:** Explicit in `src/integrity/nonceGuard.js` (source comment)

---

## H06 — WPM Threshold for Typing-Anomaly Detection

**Statement:** `effective_wpm` ≥ 250 → `typing_risk = 90`; ≥ 180 → `typing_risk = 50`.

**Rationale:** Human typing speed rarely exceeds 150 WPM in sustained bursts. WPM ≥ 250
strongly suggests machine-generated input or clipboard injection.

**Sensitivity:** The thresholds are conservative upper bounds for human performance but not
calibrated against a specific student population baseline. Different student cohorts may have
different WPM distributions.

**Bounds:** `effective_wpm` is calculated server-side from character-count and time data.
It cannot detect the origin of characters (human vs. AI-generated), only the rate.

**Code ref:** `src/execution/proof_protocol.py` (mirrors `src/academic/riskScoring.js:52-54`)

**Source:** Explicit in `src/academic/riskScoring.js`
