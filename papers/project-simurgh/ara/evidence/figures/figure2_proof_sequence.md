# Figure 2: Proof Protocol Sequence

**Source:** Figure 2 (TikZ sequence diagram) in main.tex, Section V
**Claims supported:** C03, C04

**Description:** UML-style sequence diagram with three actors: Daemon, SDK, Server

**Sequence steps:**

1. SDK → Server: `/pairing/challenge` (GET)
2. Server → SDK: `challenge (60s TTL)` response
3. SDK → Daemon: `forward` (challenge forwarded to daemon)
4. Daemon → SDK: `sign(challenge)` (daemon signs with private key)
5. SDK → Server: `/pairing/complete` (POST)
6. Server annotation: `✓ bind node_id_hash` (session-node binding established)
7. Daemon (internal): query OS metadata
8. Daemon (internal): `sign(proof-v1)` (daemon constructs and signs proof)
9. Daemon → SDK: `signed proof`
10. SDK → Server: `/integrity/proofs` (POST)
11. Server annotation: `✓ E1 + N1 + nonce` (triple check + continuity + nonce guard)
12. Server annotation: `append audit chain`
13. Server → SDK: `risk score + verdict`
14. SDK annotation: _Manual review required_

**Caption (verbatim):** "Simurgh proof protocol. Pairing binds the session to one node.
Each proof uses E1 (`node_id_hash` ∧ pubkey ∧ signature) and N1 (paired-node continuity).
All results append to the HMAC audit chain."

**Key invariants shown:**

- Challenge is consumed on use (single-use, 60s TTL)
- E1 triple check is applied before accepting any proof
- Every proof result (accept or reject) is appended to the audit chain
- The final output is always a manual-review verdict, never an automated finding
