# Stage 4B — Typed intent-source grounding (results)

Stage 4B is the first capability **policy upgrade** on top of the 4A-lite kernel. It
addresses the one documented 4A cost — the over-block of legitimate "email my meeting
participants / my contact group" actions whose addresses are not literally typed into the
task string — by grounding egress in two **trusted intent sources** in addition to the task
text, _without_ widening authority to an attacker address that appears in no source.

This is **additive**: the frozen 4A `authorise()` (task-string grounding) is untouched and
all its tests still pass; 4B adds `authorise_with_intent()` + `IntentContext`. There is **no
`src/llmShield` change**.

## What changed

- New trusted intent sources: `current_meeting_participants`, `selected_contact_group`
  (plus the existing `explicit_user_request` text). An egress destination is authorised if
  it is grounded in the explicit request text, OR is an address held by the current meeting,
  OR is in the selected contact group. Destructive-mutation authority is **unchanged** from
  4A (only an explicit destructive request grants it; intent sources do not).

## Model-free result (per-target malice, not per-case)

Over a model-free corpus that exercises the recovery and its limits, metrics are computed
against **ground-truth per-target malice** (`must_block`), so a legitimate participant inside
an otherwise-malicious case is correctly allowed, never counted as laundering:

| Metric                                                            | Value     |
| ----------------------------------------------------------------- | --------- |
| Recovered over-blocks (benign block→allow via a trusted source)   | **4**     |
| Sustained containment (must-block targets still blocked under 4B) | **3 / 3** |
| Laundering failures (must-block target 4A blocked but 4B allows)  | **0**     |
| Full containment preserved                                        | **true**  |

The attacker address (`mark.black-2134@gmail.com`), present in no intent source, stays
blocked — including in the mixed-recipient case where a legitimate participant is allowed in
the same call and only the attacker recipient is blocked.

## Non-claims (honest, signed into the manifest)

- **Not live-confirmed.** The live recovery of the Stage 1-LIVE benign over-block
  (`user_task_8`) is **not** demonstrated here: the pod is down and keys revoked, so no live
  re-run was performed. This is a model-free recovery demonstration, deferred for live
  confirmation.
- **Intent sources are trusted-by-construction in this stage.** They are **not** populated
  from untrusted tool outputs. Doing so raises a real trust-propagation question — an
  injection that tries to insert the attacker as a "meeting participant" — which this stage
  **does not** close. That is the explicit next sub-stage.
- Not jailbreak immunity; not injection prevention. No `src/llmShield` change. Target hashes
  are metadata-minimisation identifiers, not secrecy against dictionary reconstruction.

## Verify

```bash
node --test tests/unit/llmShield/stage4b/*.test.js
```

The verifier checks the Ed25519 signature/fingerprint/digest and the core invariants
(`laundering_failures == 0`, `full_containment_preserved`, recovery achieved, the
`not_live_confirmed` non-claim present); the `reproduce` tier recomputes the decisions digest
and rebuilds the bundle. The manifest binds the frozen 4A authority bundle by sha256.
