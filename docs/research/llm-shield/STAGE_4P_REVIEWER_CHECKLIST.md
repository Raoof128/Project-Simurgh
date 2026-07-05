# Stage 4P — VOCA Reviewer Checklist

**Motto: AnthropicSafe First, then ReviewerSafe.**

A reviewer can confirm every 4P claim offline, from bytes, with no network and no trust in
the producer, and without generating a keypair. Requires Node ≥ 26 for byte-stable
reproduce; verification alone works on any modern Node.

## One command (full reproduce)

```bash
PATH="/opt/homebrew/opt/node@26/bin:$PATH" scripts/reproduce-llm-shield-stage4p.sh
# -> "[stage4p] ALL GREEN"
```

Regenerates the Lane A/C fixture corpus and the Lane B relay capture into the committed
tree, diffs byte-for-byte against `git`, re-runs all ten unit suites and the all-functions
e2e net, re-verifies the committed offline attestation bundle, re-runs the Stage 3M/3O
private-key audits (confirms the 4P `INSECURE_FIXTURE_ONLY` test keys stay allowlisted),
and greps the committed evidence for raw tool text. Any failure routes the exit through
`stage4CodeForRawCode` (`tools/simurgh-attestation/stage4h/exitCodes.mjs`) — never a bare
non-zero exit.

## Verify the bundle only — no keygen needed

```bash
node tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs \
  --offline docs/research/llm-shield/evidence/stage-4p/voca-attestation.json
# -> "stage4p verify: PASS raw=0 reason=accepted"
```

`verify-stage4p.mjs` never trusts anything in the attestation except the signer's public
key and the signature bytes; it independently rebuilds `body0` from the committed
fixtures, recomputes the CPC corroborating-commitments set, re-projects the vendor
disclosure from the freshly recomputed digest, and re-verifies the Ed25519 signature over
`canonicalJson({...body1, bundle_digest})`. No private key or keygen step is required to
run this — verification is a pure function of the committed bundle bytes and the embedded
public key.

## Lean

```bash
lean proofs/stage4p/OriginCustody.lean   # -> exit 0, no `sorry`
```

Six theorems: `noSilentThirdPath`, `noGhostProvider_accept`, `custodyPathMonotone`,
`noCustodyLaundering`, `ghostTrilemma` (the laundering-cost trichotomy — vanish, forge, or
self-ledger), `cpcEmissionBounded`. Gated in CI by
`.github/workflows/stage-4-lean-proofs.yml`.

## What to check by hand

1. **Normative check order is real, not aspirational.** Read
   `tools/simurgh-attestation/stage4p/core/custodyCore.mjs` top to bottom: the `// NN`
   comments match `VOCA_CHECK_ORDER` exactly
   (`67 → 68 → 69 → 78 → 70 → 71 → 72 → 73 → 74 → 75 → 76 → 77 → 79`), and raw 78 (custody
   laundering) is checked before any content comparison.
2. **Digests recompute.** Flip one byte in
   `docs/research/llm-shield/evidence/stage-4p/voca-attestation.json` and re-run the
   verify command above — it fails closed (`content_rederivation_mismatch` or
   `signature_invalid`).
3. **CPC is verifier-grade, not trust-the-builder.** `windowed_evidence_commitment` is
   published precisely because the verifier needs it to recompute `custody_class_digest`
   (`tools/simurgh-attestation/stage4p/core/cpcCore.mjs`, `verifyCpcEmission`); the raw
   `observed_evidence_digest` never appears in any committed CPC fixture
   (`tests/fixtures/llmShield/stage4p/cpc/*.json`).
4. **Cross-stage bindings are real, not modelled.** `tests/unit/llmShield/stage4p/laneb.test.js`
   asserts Lane B's `clean-declared-relay` tool-surface digest equals the actual committed
   Stage 4O manifest commitment digest — the 4O→4P binding runs against Stage 4O's own
   `manifestCore.mjs` function, not a copy.
5. **Invention layer adds no raw code.** `tools/simurgh-attestation/stage4p/core/inventionCore.mjs`
   contains no `raw:` literal outside `67` and `68` — pincer, contest, disclosure, and
   bridge failures all map onto the existing ledger.
6. **Zero `src/llmShield` changes.** `git diff v2.24.0-stage-4o-vtsa..HEAD -- src/llmShield`
   is empty — custody verification is entirely offline over recorded evidence, never a
   runtime blocking layer.

## Non-claim → enforcement mapping (16/16)

The 16 non-claims are signed byte-for-byte, in this order, into every attestation bundle
(`VOCA_NON_CLAIMS`, `tools/simurgh-attestation/stage4p/constants.mjs:72-89`), and
`verify-stage4p.mjs` fails closed (`non_claims_mismatch`) if the order or contents drift.
Beyond that signed list, each non-claim corresponds to a concrete shape or absence in the
code:

| #   | Non-claim                                        | Where enforced                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `not_provider_identity_oracle`                   | `core/custodyCore.mjs:17-90` (`verifyCustody`) compares only digests recorded in supplied evidence — no code path authenticates a live provider. `constants.mjs:92-95` (`SAFETY_RAIL`).                                                                                                                                                                                                                                                        |
| 2   | `not_proxy_blocking_system`                      | No import of any `stage4p` module from `src/llmShield/*`; `git diff v2.24.0-stage-4o-vtsa..HEAD -- src/llmShield` is empty. Verification is offline-only, never inline in a request path.                                                                                                                                                                                                                                                      |
| 3   | `not_grey_market_investigation`                  | `node/build-stage4p-fixtures.mjs` (Lane C section) uses fully synthetic provider names and tags the fixture with `source_note: "public_report_motivated_synthetic"` rather than reconstructing a real incident; the fixture at `tests/fixtures/llmShield/stage4p/lane-c/public-report-motivated` runs the ordinary undeclared-relay path and asserts `{raw: 71, reason: "relay_not_declared"}` — no incident is investigated or reconstructed. |
| 4   | `not_law_enforcement_claim`                      | `constants.mjs:92-95` (`SAFETY_RAIL`); `core/schemaCore.mjs` exact-key schemas carry only digests/enums, no identity or legal-conclusion field.                                                                                                                                                                                                                                                                                                |
| 5   | `not_model_safety_claim`                         | `core/custodyCore.mjs:51-56` (raw 72) is a digest-equality comparison, not a behavioural or safety evaluation of the model.                                                                                                                                                                                                                                                                                                                    |
| 6   | `not_proof_of_actual_provider_execution`         | `proofs/stage4p/OriginCustody.lean` header comment: "the proofs are over the recorded custody model, not physical network truth"; `constants.mjs:92-95`.                                                                                                                                                                                                                                                                                       |
| 7   | `not_detection_of_all_proxies`                   | `core/custodyCore.mjs:40-44` (raw 71) only inspects `chain.relay_identity_digests` — hops actually present in the recorded evidence; a hop that never surfaces in evidence cannot be caught.                                                                                                                                                                                                                                                   |
| 8   | `not_a_replacement_for_provider_abuse_detection` | `constants.mjs:72-89` (`VOCA_NON_CLAIMS`) — signed structurally into the bundle; the verifier makes no claim about, and has no interface to, any provider-side abuse-detection system.                                                                                                                                                                                                                                                         |
| 9   | `not_model_substitution_oracle`                  | `core/custodyCore.mjs:51-56` (raw 72) — same mechanism as #5, scoped: fires only inside the controlled Lane A/B/C evidence lanes, not against a hostile hidden upstream.                                                                                                                                                                                                                                                                       |
| 10  | `http_resale_shape_deferred_to_4p1`              | `node/laneb-relay-capture.mjs:1-19` — Lane B is built exclusively on the Stage 4O MCP harness (`capture-mcp-manifest.mjs`); no HTTP-proxy relay lane exists in the shipped fixtures (`tests/fixtures/llmShield/stage4p/lane-b/` is MCP-shaped only).                                                                                                                                                                                           |
| 11  | `window_anchor_is_public`                        | `core/digest.mjs:35-43` (`windowedEvidenceCommitment`) and `core/cpcCore.mjs:25-28` pass `stage4n_window_anchor_digest` as a plain (non-secret) hash input, read directly off the public 4N heartbeat feed.                                                                                                                                                                                                                                    |
| 12  | `match_is_not_attribution`                       | `core/schemaCore.mjs:120-131` (`MATCHABLE_KEYS`) — the CPC signal schema carries only `custody_class_digest`/`windowed_evidence_commitment`/enums, no relay identity, hostname, or account ID.                                                                                                                                                                                                                                                 |
| 13  | `private_custody_corroboration_deferred`         | `core/digest.mjs:61-73` (`custodyClassDigest`) is a plain deterministic domain-separated SHA-256, not a VOPRF/PSI private-matching primitive.                                                                                                                                                                                                                                                                                                  |
| 14  | `disclosure_budget_is_not_privacy_proof`         | `core/cpcCore.mjs:50-83` (`verifyCpcEmission`) — the budget cap is a per-window _count_ check (raw 79 `disclosure_budget_exceeded`), not an information-theoretic non-linkability guarantee.                                                                                                                                                                                                                                                   |
| 15  | `not_enforcement_verification`                   | `core/inventionCore.mjs:45-55` (`pincerCorroborated`) checks mutual digest consistency between an enforcement commitment and a CPC signal; it never verifies either party's truthfulness.                                                                                                                                                                                                                                                      |
| 16  | `not_legal_compliance_certification`             | `core/inventionCore.mjs:89-98` (`projectVendorDisclosure`) — the schema carries only `declared_provider_family`, `declared_relay_count`, `trace_custody_class`, `verification_result`, `attestation_digest`; no certification or compliance field exists anywhere in `SCHEMAS.DISCLOSURE`.                                                                                                                                                     |

## Egress / privacy scan

```bash
node --test tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js
```

Three dedicated privacy-scan tests assert: (a) no raw evidence, keys, URLs, or emails
anywhere in committed stage4p evidence; (b) no published `signal` object anywhere in the
fixture tree carries the private `observed_evidence_digest`; (c) private keys exist only
under `test-keys/`, public keys only in allowlisted signature/pubkey slots. Reproduce step
8 additionally greps the committed evidence directory for
`"description"|"inputSchema"|"hostname"|"url"` and fails closed on any match.
