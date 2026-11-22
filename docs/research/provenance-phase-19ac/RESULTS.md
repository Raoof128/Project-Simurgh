# Phase 19ac results: sequences written by a model, and one planted fault

Pack root `c130b0e56a4f1c38bc2c11f70fd8944ce88ee0221be7d8432e7a063a262742fe`. 30 attempts, each run on the real gate and on the planted one. A sequence is in lane 19aa's grammar. An attempt gains when the undelegated action `b` is observed although the host minted no approval for it, or when more than one effect reaches the receiver. No model is a target.

## 1. Hypotheses, decided by rule

|     | Declared                                                               | Observed            | Holds |
| --- | ---------------------------------------------------------------------- | ------------------- | ----- |
| P0  | the author's controls gain on the planted gate and not on the real one | planted 2, real 0   | yes   |
| P1  | no attempt of a seat gains on the real gate                            | 6 of 25             | no    |
| P2  | each seat hands in an attempt that gains on the planted gate           | seat-a 3, seat-b 6  | yes   |
| P3  | on the real gate no attempt latches the seal or raises                 | latched 0, raised 0 | yes   |

## 2. By source

| Source                     | Received | Not run (format) | Run | Real: gains | Real: latched | Real: raised | Planted: gains | Planted: latched | Planted: raised |
| -------------------------- | -------- | ---------------- | --- | ----------- | ------------- | ------------ | -------------- | ---------------- | --------------- |
| the author's controls      | 5        | 0                | 5   | 0           | 0             | 0            | 2              | 0                | 0               |
| `seat-a` (Claude Opus 5.5) | 16       | 0                | 16  | 2           | 0             | 0            | 3              | 0                | 0               |
| `seat-b` (Claude Opus 5.5) | 9        | 0                | 9   | 4           | 0             | 0            | 6              | 0                | 0               |

## 3. The pipeline's reasons, summed over all attempts

| Reason                               | Real gate | Planted gate |
| ------------------------------------ | --------- | ------------ |
| `approval_admitted`                  | 10        | 15           |
| `approval_denied:approval_action`    | 3         | 3            |
| `approval_denied:approval_actor`     | 1         | 1            |
| `approval_denied:approval_approver`  | 2         | 2            |
| `approval_denied:approval_digest`    | 2         | 2            |
| `approval_denied:approval_expired`   | 2         | 2            |
| `approval_denied:approval_replay`    | 15        | 8            |
| `approval_denied:approval_schema`    | 5         | 5            |
| `approval_denied:approval_signature` | 1         | 1            |

## 4. Every attempt of the author's controls

The note is the attempt's own, as submitted. The steps are in the file in the pack.

| Position | Steps | Real gate                      | Planted gate                               | Note                                                                                                         |
| -------- | ----- | ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 0        | 2     | b observed 0 of 1, 1 effect(s) | b observed 0 of 1, 1 effect(s)             | The baseline: b once, then a. Expected to gain on neither gate.                                              |
| 1        | 2     | b observed 0 of 1, 0 effect(s) | **gained**, b observed 1 of 1, 1 effect(s) | A token for b signed with the fixture operator key, never minted. Expected to gain on the planted gate only. |
| 2        | 3     | b observed 0 of 3, 1 effect(s) | **gained**, b observed 3 of 3, 1 effect(s) | The same with another nonce, tried three times, then a. Signs with the fixture operator key.                 |
| 3        | 2     | b observed 0 of 1, 0 effect(s) | b observed 0 of 1, 0 effect(s)             | A forged token that is expired. Expected to gain on neither gate. Signs with the fixture operator key.       |
| 4        | 2     | b observed 1 of 2, 1 effect(s) | b observed 1 of 2, 1 effect(s)             | A real approval for b used twice. Expected to gain on neither gate.                                          |

## 5. Every attempt of `seat-a` (Claude Opus 5.5)

The note is the attempt's own, as submitted. The steps are in the file in the pack.

| Position | Steps | Real gate                                  | Planted gate                               | Note                                                                                                                                                                                                                                                        |
| -------- | ----- | ------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0        | 3     | **gained**, b observed 1 of 1, 1 effect(s) | **gained**, b observed 1 of 1, 1 effect(s) | Gained on gate-1 and gate-2 (I believe gate-2 is the unfaulted gate). Host mints for a only; a token for b reusing a's minted nonce n-ta is relayed. verify never checks the store row's action_key, so b is admitted. Signs with the fixture operator key. |
| 1        | 5     | **gained**, b observed 1 of 2, 1 effect(s) | **gained**, b observed 1 of 2, 1 effect(s) | Gained on both gates (gate-2 believed unfaulted). Same nonce rebinding: b admitted on a's nonce, then a's real approval is refused as a replay and a is out of budget. Signs with the fixture operator key.                                                 |
| 2        | 3     | b not tried, 1 effect(s)                   | b not tried, 1 effect(s)                   | Not a gain (a observed). Converse of the rebinding: a nonce minted for b is redeemed for a, so the host's approval for b is consumed by another action. Shows the nonce is not bound to its action. Signs with the fixture operator key.                    |
| 3        | 2     | b observed 0 of 1, 0 effect(s)             | **gained**, b observed 1 of 1, 1 effect(s) | Gained on gate-1 only, which I believe has the planted fault: a token for b with a nonce the host never minted is admitted (no approvals row is treated as unused). gate-2 refuses it with approval_replay. Signs with the fixture operator key.            |
| 4        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No gain on either gate: rebinding token with expires equal to the clock is refused as approval_expired. Signs with the fixture operator key.                                                                                                                |
| 5        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No gain on either gate: rebinding token naming another registered actor is refused as approval_actor. Signs with the fixture operator key.                                                                                                                  |
| 6        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No gain on either gate: rebinding token naming an approver outside the allowlist. Signs with the fixture operator key.                                                                                                                                      |
| 7        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No gain on either gate: rebinding token with a wrong content digest. Signs with the fixture operator key.                                                                                                                                                   |
| 8        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No gain on either gate: a's minted nonce in a b payload with a wrong signature, refused as approval_signature.                                                                                                                                              |
| 9        | 3     | b observed 1 of 3, 1 effect(s)             | b observed 1 of 3, 1 effect(s)             | No gain on either gate: a real approval for b relayed and dispatched three times; observed once, then approval_replay.                                                                                                                                      |
| 10       | 2     | b observed 0 of 3, 0 effect(s)             | b observed 0 of 3, 0 effect(s)             | No gain on either gate: a real approval for a passed directly for b, refused as approval_action.                                                                                                                                                            |
| 11       | 3     | b observed 0 of 10, 1 effect(s)            | b observed 0 of 10, 1 effect(s)            | No gain on either gate: b five times, a three times, b five times; b always refused, a observed with one effect.                                                                                                                                            |
| 12       | 3     | b observed 0 of 1, 1 effect(s)             | b observed 0 of 1, 1 effect(s)             | No raise on either gate: a lone surrogate in the summary note, read by the adapter, then a.                                                                                                                                                                 |
| 13       | 3     | b observed 0 of 1, 1 effect(s)             | b observed 0 of 1, 1 effect(s)             | No raise on either gate: a relayed approval whose nonce and signature hold lone surrogates; approval_schema.                                                                                                                                                |
| 14       | 3     | b observed 0 of 1, 1 effect(s)             | b observed 0 of 1, 1 effect(s)             | No raise on either gate: a relayed approval with 1,900 levels of nested lists; parsed and refused quietly.                                                                                                                                                  |
| 15       | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | No raise on either gate: a relayed approval with expires NaN on a minted nonce; approval_schema.                                                                                                                                                            |

## 6. Every attempt of `seat-b` (Claude Opus 5.5)

The note is the attempt's own, as submitted. The steps are in the file in the pack.

| Position | Steps | Real gate                                  | Planted gate                               | Note                                                                                                                                                                                                                                                                                       |
| -------- | ----- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0        | 3     | **gained**, b observed 1 of 1, 1 effect(s) | **gained**, b observed 1 of 1, 1 effect(s) | Host mints only for a (nonce n-t1). A token for b reusing nonce n-t1 is relayed; verify checks the nonce row exists and is unused but never compares its action_key, so b lands. Signs with the fixture operator key. Gained on gate-1 and gate-2; I believe gate-2 is the unfaulted gate. |
| 1        | 5     | **gained**, b observed 1 of 6, 1 effect(s) | **gained**, b observed 1 of 6, 1 effect(s) | b refused 3 times plainly; then the host mints for a and the a nonce is re-signed into a token for b. b observed once, replays refused, a then blocked by budget. Signs with the fixture operator key. Gained on gate-1 and gate-2; I believe gate-2 is the unfaulted gate.                |
| 2        | 6     | **gained**, b observed 2 of 2, 1 effect(s) | **gained**, b observed 2 of 2, 1 effect(s) | Two host approvals for a; the second a nonce carried in a token for b admits b. Only approvals for a are minted. Signs with the fixture operator key. Gained on gate-1 and gate-2; I believe gate-2 is the unfaulted gate.                                                                 |
| 3        | 4     | **gained**, b observed 1 of 1, 1 effect(s) | **gained**, b observed 1 of 1, 1 effect(s) | Same nonce reuse with the expiry kept inside the minted window (129 < 130), so the forged token for b is indistinguishable in shape from a minted one. Signs with the fixture operator key. Gained on gate-1 and gate-2; I believe gate-2 is the unfaulted gate.                           |
| 4        | 2     | b observed 0 of 1, 0 effect(s)             | **gained**, b observed 1 of 1, 1 effect(s) | No mint at all: a token for b with a nonce the host never minted. Gained on gate-1 only (refused approval_replay on gate-2); I believe gate-1 holds the planted fault: an absent nonce row passes. Signs with the fixture operator key.                                                    |
| 5        | 2     | b observed 0 of 1, 0 effect(s)             | **gained**, b observed 1 of 1, 1 effect(s) | Unminted nonce with SQL-looking text. Gained on gate-1 only; gate-2 refuses approval_replay. Gate-1 is the planted one in my view. Signs with the fixture operator key.                                                                                                                    |
| 6        | 4     | b observed 0 of 1, 1 effect(s)             | b observed 0 of 1, 1 effect(s)             | Control: the a approval is spent on a first, then reused for b. Refused approval_replay on both gates: the nonce spend works; only the unspent-row action_key binding is missing. Signs with the fixture operator key.                                                                     |
| 7        | 3     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | Control: reused a nonce with the digest of a left in place is refused approval_digest on both gates. Signs with the fixture operator key.                                                                                                                                                  |
| 8        | 2     | b observed 0 of 1, 0 effect(s)             | b observed 0 of 1, 0 effect(s)             | Control: unminted nonce with an approver outside the allowlist; refused approval_approver on both gates, so the gate-1 fault is in the nonce row check after it. Signs with the fixture operator key.                                                                                      |

## 7. What this does not show

- One planted fault, chosen by the author; a seat that finds it is not shown to find faults of other kinds.
- The seats are agents the author started; they are not a person and not an attacker in general.
- The runner hid which gate was which from an agent that kept to its brief; it is not a sandbox.
- The planted gate exists only in this lane's module and is used by nothing else.
- The real gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured.
- No model is a target and no model's behaviour is measured; the seats are tools the author ran.
