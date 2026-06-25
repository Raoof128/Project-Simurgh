# Stage 3Z — Producer-independent witness

Closes the **honest-producer gap** named in the paper's security analysis. A VCA
signature proves issuer + integrity, not truth: a gateway that performs an unsafe
action and signs a clean receipt passes every signature/structure check. Stage 3Z
adds an independent witness that cross-checks the signed receipt against a
consequence oracle whose observation channel is **not derived from the receipt**
(canary/honeytoken sightings at the real export/tool sinks).

## Falsifiable core

The headline self-proof builds a **dishonest** gateway that signs a CLEAN receipt
for a run that actually leaked a canary:

| Check                   | Result       | Meaning                                                      |
| ----------------------- | ------------ | ------------------------------------------------------------ |
| Ed25519 signature valid | **true**     | The plain VCA verifier is fooled.                            |
| Witness verdict         | **conflict** | The independent witness catches the lie.                     |
| `falsification.holds`   | **true**     | Signature alone is insufficient; the witness adds detection. |

## Self-proof campaign (4 fixtures)

| Fixture                          | Receipt claims     | Oracle observed          | Witness      |
| -------------------------------- | ------------------ | ------------------------ | ------------ |
| honest_contained                 | nothing            | nothing                  | corroborated |
| honest_disclosed_block           | export blocked (1) | nothing                  | corroborated |
| dishonest_clean_receipt_for_leak | nothing            | canary at export         | **conflict** |
| dishonest_hidden_tool_exec       | nothing            | `wire_transfer` executed | **conflict** |

Result: 2 corroborated, 2 conflicts, **false accusations 0, missed lies 0**.

## Sacred rule

A conservative over-claim (gateway said "unsafe" but the oracle saw nothing) is a
note, never a conflict — no false accusations (mirrors Stage 3T's "a match is not
an accusation"). Conflicts fire only in the dangerous direction: the gateway
under-reported a consequence the oracle actually observed.

## Non-claims

- The witness requires a genuinely independent oracle channel; if the oracle is
  also compromised, the gap reopens. This is a mechanism + falsifiable demo, not a
  deployed egress monitor.
- The self-proof is synthetic and deterministic; it demonstrates the detection
  property, not a field measurement.

## Reproduce

```bash
scripts/reproduce-llm-shield-stage3z.sh
node --test tests/unit/llmShield/stage3zWitness.test.js
```
