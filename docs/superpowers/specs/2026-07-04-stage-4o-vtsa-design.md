# Stage 4O — VTSA: Verifiable Tool-Surface Attestation (Design Spec)

**Motto: AnthropicSafe First, then ReviewerSafe.**

- **Status:** Design approved 2026-07-04 (brainstorm session); amended same day with the
  Monotone Consent Law (I1–I4). No implementation yet. No tag.
- **Version target:** v2.24.0 (latest tag verified `v2.23.0-stage-4n-extraction-seismograph`).
- **Predecessors:** 4A–4C (Capability Kernel + intent + provenance), 4N (extraction seismograph, raw 47–54).

---

## 1. Motivation

Anthropic's April 2026 _Trustworthy Agents in Practice_ framework assigns the Tools layer
(MCP servers, skills, plugins) to deploying organisations and names **tool supply-chain
compromise — tools changing behaviour after initial approval ("rug pulls")** — as a primary
agent-specific threat vector ("static approval doesn't survive that kind of velocity").
Corroborating 2026 incidents: the May 2026 MCP tool-poisoning attack (mitigated in Claude
Code 2.1.128), the ToxicSkills campaign (30+ malicious skills; Snyk found prompt injection
in 36% of studied skills), and Anthropic's own consent-fatigue data (93% of permission
prompts approved unread). Anthropic's NIST RFI response asks for secure tool calling,
clear audit trails of agent actions, and cryptographic attestation of what executed.

**Prior art:** ETDI (arXiv 2506.01333) proposes OAuth-signed tool definitions with
re-approval on change — a draft, prevention-side protocol requiring ecosystem adoption.
The open lane, and Simurgh's lane, is the **verification side**: byte-reproducible
receipts proving which tool surface a run was gated against, with approval-time vs
run-time drift as a ledgered, machine-detectable event. ETDI tries to stop the rug pull;
4O proves whether one happened.

Spine position: 4A–4C gate _what a call may do_; 4N attests _the committed reporting
window and chain position of events, not wall-clock time_; **4O attests _what surface the
calls ran on_**.

## 2. Claims and non-claims

**Claim 1 (frozen wording):**

> Stage 4O verifies that tool execution was gated through a manifest-bound kernel entry
> point, and that silent tool-surface swaps are rejected or evidenced as verifier
> failures.

**Claim 2 — the Monotone Consent Law (frozen wording):**

> A committed tool surface may narrow silently, but may broaden only under delta-bound
> consent, and drift can never launder across manifest epochs. Any violation is refused
> by the kernel or ledgered under raw codes 55–66; there is no silent third path.

**Machine-readable non-claims (signed into the bundle):**

```text
surface_bound_verifiable
not_tools_safe
not_mcp_server_safe
not_protocol_rug_pull_prevention
not_proof_of_human_reading
merkle_machinery_standard_crypto_novel_application
not_constitutional_compliance_claim
not_incident_prevention_claim
```

Prose non-claims: 4O does NOT prove MCP servers are safe; does NOT prevent rug pulls at
the protocol layer (ETDI's lane); all claims apply ONLY to calls routed through
`authorise_with_manifest`; the real-MCP capture (Lane B) is external validity, never the
normative target. Delta-bound consent proves the approval artifact **cryptographically
bound the change**, not that a human read it. Timeline anchoring (§9) binds at
attestation time, not in real time. Honesty guardrail vocabulary: **"surface bound,
verifiable" — never "tools safe."**

**Novelty and honesty labels** (kept falsifiable; each backed by a prior-art search on
2026-07-04):

1. Path-independent drift verdicts for agent tool surfaces (`NoDriftLaundering`) — no
   prior art found.
2. Blind vs informed re-approval as a machine-distinguishable evidence class
   (delta-bound consent) — no prior art found.
3. Time-anchored tool-surface receipts via 4N chain-position reference — structurally
   requires the 4N heartbeat; no prior art found.
4. Merkle inclusion proofs for selective surface disclosure — **standard cryptography
   (Certificate Transparency lineage), novel application**; claimed only as such.

## 3. Architecture — two lanes, one verifier

- **Lane A (normative):** modelled manifest under the `simurgh.tool_manifest.v1` schema
  (§4), driven through a new Capability Kernel entry point (§6) over the existing
  3L/4A-derived corpora plus a rug-pull tamper matrix (§7). Fully offline,
  byte-reproducible.
- **Lane B (external validity only):** one frozen, digest-only capture fixture from a
  real MCP server plus a digest-only rug-pulled variant (§10). CI replays fixtures only
  and never connects to a network.
- **Drift algebra (I1):** manifest epochs form a chain; drift between epochs is
  classified on a narrowing/broadening lattice with path-independent verdicts (§6a).
- **Consent binding (I2):** broadening or incomparable drift requires delta-bound
  re-approval; blind (state-bound) re-approval of such drift is refused and ledgered
  (§6a).
- **Selective disclosure (I3):** `toolset_digest` is a Merkle root; per-call receipts
  carry inclusion proofs (§5a).
- **Time anchoring (I4):** each 4O attestation binds its active toolset root to a 4N
  chain position, reference direction 4O→4N; the shipped 4N heartbeat is never modified
  (§9).
- **Attestation:** stage4o-attestation Ed25519 key signs `canonicalJson(parse(bundle))`
  over the decision corpus, drift ledger, timeline record, and non-claims; two-tier
  verifier, offline primary.
- **Proofs:** `proofs/stage4o` Lean theorem `MonotoneConsent` with three legs (§12).
- **Rule:** the modelled manifest is normative; the real-MCP capture is only an
  external-validity fixture; the verifier remains fully offline and byte-reproducible.

## 4. Manifest schema (normative)

`simurgh.tool_manifest.v1`, exact-key schema validation (unknown keys, missing keys, bad
types, malformed `sha256:` values, or out-of-enum values ⇒ schema-invalid, §13):

```json
{
  "schema": "simurgh.tool_manifest.v1",
  "server_id_digest": "sha256:...",
  "toolset_digest": "sha256:...",
  "tools": [
    {
      "tool_name_digest": "sha256:...",
      "tool_schema_digest": "sha256:...",
      "authority_class": "read_only | write | egress | destructive",
      "declared_sinks": ["sha256:..."],
      "risk_class": "low | medium | high"
    }
  ]
}
```

`tools` is ordered (lexicographic by `tool_name_digest`); ordering is normative because
the Merkle root (§5a) is computed over the ordered entries. `authority_class` is a closed
enum with the fixed escalation order `read_only < write < egress < destructive`; any
movement up the order is an upgrade (raw 61 per-call, or a broadening between epochs,
§6a). `declared_sinks` entries are digests (domain-separated, §5); a run-time sink set
that is not a subset of the declared set is an expansion (raw 62). `risk_class` is the
closed enum `low | medium | high`; it is informational for 4O (no gate rule keys off it
in v1).

**Privacy posture:** evidence carries only domain-separated digests and closed enums,
never raw tool descriptions, server names, tool names, or argument schemas. This is
metadata-minimised and AnthropicSafe by construction, but **not** a cryptographic secrecy
claim against dictionary inference over low-entropy tool identifiers (this limitation is
recorded in the signed non-claims).

## 5. Digest model — domain separation

Every digest is domain-separated before hashing. The canonical payload is
`{ domain, schema, value }`, serialised as canonical JSON (sorted keys, UTF-8, no
insignificant whitespace — the existing `canonicalJson` convention), then SHA-256,
rendered `sha256:<hex>`. Domains (closed list):

```text
SIMURGH_STAGE4O_SERVER_ID_V1
SIMURGH_STAGE4O_TOOLSET_V1
SIMURGH_STAGE4O_TOOL_ENTRY_V1
SIMURGH_STAGE4O_ACTION_V1
SIMURGH_STAGE4O_RECEIPT_V1
SIMURGH_STAGE4O_DECISION_CORPUS_V1
SIMURGH_STAGE4O_ATTESTATION_BUNDLE_V1
SIMURGH_STAGE4O_MERKLE_LEAF_V1
SIMURGH_STAGE4O_MERKLE_NODE_V1
SIMURGH_STAGE4O_DELTA_V1
SIMURGH_STAGE4O_TIMELINE_V1
```

The verifier never trusts `toolset_digest` as provided. It recomputes the Merkle root
(§5a) from the exact ordered manifest entries and raises raw 58 if the committed toolset
digest does not match the manifest body.

### 5a. Merkle toolset root and inclusion receipts (I3)

`toolset_digest` is the root of a binary Merkle tree whose leaves are the
domain-separated (`SIMURGH_STAGE4O_MERKLE_LEAF_V1`) digests of the ordered tool entries;
interior nodes use `SIMURGH_STAGE4O_MERKLE_NODE_V1` (leaf/node domain separation blocks
second-preimage tree attacks). An odd node at any level is promoted unchanged
(Certificate Transparency convention). Every call receipt carries the inclusion proof
(sibling-hash path, leaf index, tree size) for the tool entry it was authorised against.

**Selective surface disclosure:** the verifier supports a mode that verifies a single
receipt + inclusion proof + signed commitment envelope **without the full `tools[]`
body** — proving "the tool used in this incident was committed at approval time" without
revealing the rest of the inventory. Plugs into the 4M audience tiers and the Article 73
projection. An invalid inclusion proof means the call's tool cannot be shown in the
manifest ⇒ raw 59.

## 6. Manifest commitment, epochs, consent binding, kernel entry point

**Commitment envelope:** `{schema, server_id_digest, toolset_digest, tools[],
manifest_epoch, valid_from_epoch, valid_until_epoch, previous_manifest_digest,
delta_digest, consent_binding}` + Ed25519 signature (**stage4o-manifest key** — distinct
from the **stage4o-attestation key** that signs the evidence bundle; two keypairs, so raw
56 and an attestation-signature failure can never be conflated).

- Freshness is purely logical — a commitment is valid for a run iff
  `valid_from_epoch ≤ run_epoch ≤ valid_until_epoch`. Epochs are non-negative integers;
  `run_epoch` is supplied by the run fixture and recorded in the receipt. Epoch
  monotonicity/ordering across runs is 3Q/4N territory, not a 4O claim. No wall-clock
  time appears anywhere in manifests, receipts, decisions, or the ledger.
- For `manifest_epoch = 0`, `previous_manifest_digest` and `delta_digest` MUST both be
  the literal string `"genesis"`. For `manifest_epoch > 0`, `previous_manifest_digest`
  is the domain-separated digest of the predecessor commitment and `delta_digest` is the
  domain-separated (`SIMURGH_STAGE4O_DELTA_V1`) digest of the canonical delta object:
  `{removed: [entry digests], added: [entry digests], changed: [{tool_name_digest,
before_entry_digest, after_entry_digest}]}`, all arrays sorted.
- `consent_binding ∈ {state, delta}` records what the approval signature bound. The
  signature covers the full envelope including `consent_binding` and `delta_digest`.

### 6a. Drift algebra and the Monotone Consent Law (I1 + I2)

Define the surface partial order: `M' ⊑ M` (**narrowing**) iff `tools(M') ⊆ tools(M)`
and for every shared tool: `authority_class` did not move up the escalation order,
`declared_sinks' ⊆ declared_sinks`, and `tool_schema_digest` is unchanged. The reverse
direction is **broadening**. A schema-digest change is directionally undecidable from
digests, so it is classified **incomparable** and treated as broadening for consent
purposes.

**Consent rule (I2):** a step whose recomputed classification is narrowing may be
state-bound. A step whose recomputed classification is broadening or incomparable MUST
be delta-bound (`consent_binding = "delta"`); otherwise raw 65 `blind_reapproval`. The
approver need not be prevented from fatigue — but blind consent to a broadening becomes
a machine-distinguishable, ledgered evidence class ("the fatigued approver must ledger
the blindness").

**Path independence (I1):** the verifier never trusts claimed drift classifications. It
recomputes the classification of every epoch step from manifest bodies AND recomputes
the direct classification `M0 → Mn`. Because `⊑` is transitive, an all-narrowing chain
implies direct narrowing; any mismatch between recomputed step verdicts, claimed
verdicts, or the direct verdict ⇒ raw 64 `drift_laundering_detected`. A broadening
cannot be hidden inside a chain of claimed narrowings.

**Kernel entry point (additive):** `authorise_with_manifest(action, *, manifest,
receipt)` in `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py`.
The `manifest` argument is the commitment-chain object: the head commitment plus the
ancestor commitments required for the §6a epoch-chain checks (raw 64/65); a chain whose
ancestry is incomplete back to genesis fails closed as raw 64.
The existing three entry points (`authorise`, `authorise_with_intent`,
`authorise_with_provenance`) and their serialised decision shape remain **byte-frozen**.
`authorise_with_manifest` returns an `AuthorityDecision`-compatible object with a
`manifest_bindings` sidecar:

```python
@dataclass(frozen=True)
class ManifestBindings:
    action_digest: str
    manifest_digest: str
    manifest_entry_digest: str
    kernel_entrypoint: str  # pinned constant "authorise_with_manifest.v1"
    receipt_digest: str
    run_id_digest: str

@dataclass(frozen=True)
class ManifestAuthorityDecision:
    decision: AuthorityDecision
    manifest_bindings: ManifestBindings
```

Every manifest-bound decision carries all six binding fields; the verifier rejects any
receipt whose action or manifest binding differs from the decision corpus.

**Decision flow — fail-closed, fixed documented check order, first failure wins.** The
check sequence has three phases: commitment validation (55, 56, 57), epoch-chain
validation (64, 65), per-call surface validation (58–63); timeline binding (66) is
attestation-level and evaluated last. Numeric code order is historical (55–63 were
allocated before 64–66); the **documented order below is normative**:

| Order | Raw | Name                                | Check                                                                                                                  |
| ----- | --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | 55  | `manifest_missing`                  | no commitment supplied, or commitment fails exact-key schema validation (`manifest_defect ∈ {absent, schema_invalid}`) |
| 2     | 56  | `manifest_signature_invalid`        | tool-manifest commitment signature invalid                                                                             |
| 3     | 57  | `manifest_epoch_invalid`            | `run_epoch` outside `[valid_from_epoch, valid_until_epoch]`                                                            |
| 4     | 64  | `drift_laundering_detected`         | recomputed step/direct drift classifications inconsistent across the epoch chain (§6a)                                 |
| 5     | 65  | `blind_reapproval`                  | broadening or incomparable step with `consent_binding = "state"` (§6a)                                                 |
| 6     | 58  | `server_or_toolset_digest_mismatch` | server identity changed, or recomputed Merkle root ≠ committed `toolset_digest`                                        |
| 7     | 59  | `tool_identity_mismatch`            | call's tool-name digest not in manifest, or inclusion proof invalid (§5a)                                              |
| 8     | 60  | `tool_schema_digest_mismatch`       | tool present, schema digest differs                                                                                    |
| 9     | 61  | `authority_class_upgrade`           | call's authority class moved up the escalation order vs the committed entry                                            |
| 10    | 62  | `declared_sink_expansion`           | run-time sink set ⊄ declared sinks                                                                                     |
| 11    | 63  | `manifest_receipt_binding_mismatch` | receipt malformed, or receipt's action/manifest binding ≠ decision                                                     |
| 12    | 66  | `timeline_binding_mismatch`         | timeline record's toolset root ≠ manifest chain's root for that epoch, or referenced 4N chain position absent (§9)     |

All twelve map to run-level `1`. Ledger layout stays:
`39 reserved · 47–54 Stage 4N · 55–66 Stage 4O · unknown → 3`. Deterministic ordering is
a byte-reproducibility requirement: a multiply-broken arm always ledgers the same single
code. Codes are registered in `tools/simurgh-attestation/stage4h/exitCodes.mjs` (the
known golden-breaking edit, §15). Raw 61/62 are **per-call vs committed entry** checks;
raw 64/65 are **manifest vs manifest** (epoch chain) checks — distinct objects, no
overlap.

## 7. Tamper matrix (Lane A, normative)

| Tamper arm                                                            |                                                                   Expected raw |
| --------------------------------------------------------------------- | -----------------------------------------------------------------------------: |
| missing manifest                                                      |                                                                             55 |
| schema-invalid manifest                                               |                                         55 (`manifest_defect: schema_invalid`) |
| signature mismatch                                                    |                                                                             56 |
| stale manifest replay                                                 |                                                                             57 |
| laundering chain (two claimed "narrowings" composing to a broadening) |                                                                             64 |
| blind (state-bound) re-approval of a broadening                       |                                                                             65 |
| server identity / toolset change                                      |                                                                             58 |
| tool added post-approval                                              |                                                                             59 |
| invalid inclusion proof                                               |                                                                             59 |
| schema changed                                                        |                                                                             60 |
| `read_only → write`                                                   |                                                                             61 |
| destructive-under-harmless-name                                       | 61 (canonical arm: changes `authority_class` while preserving the name digest) |
| sink expansion                                                        |                                                                             62 |
| receipt/action/manifest binding mismatch                              |                                                                             63 |
| timeline root mismatch / absent 4N chain position                     |                                                                             66 |

Expected-GREEN benign arms: manifest unchanged ⇒ calls authorised; **state-bound
narrowing re-approval ⇒ accepted** (proves the Monotone Consent Law is not reject-all);
delta-bound broadening ⇒ accepted. Anti-theatre by construction.

## 8. Verifier

Two-tier, offline primary. Rules:

1. Recompute every digest — including the Merkle toolset root (§5a) and the delta digest
   (§6) — from bundle bytes.
2. Verify the manifest-commitment signature (stage4o-manifest key) and the bundle
   attestation signature (stage4o-attestation key) — separate keypairs, separate failure
   semantics (§13).
3. Reject any receipt whose action or manifest binding differs from the decision corpus
   (anti-laundering: authorising one manifest entry while recording another call).
4. Verify every receipt's inclusion proof against the committed root; support the
   selective-disclosure mode of §5a.
5. Recompute per-step and direct drift classifications across the epoch chain; enforce
   path independence and the consent rule (§6a).
6. Verify the timeline record against the frozen 4N evidence fixture (§9).
7. Re-derive every tamper-arm expectation from §7 and fail on any mismatch.
8. Closed verdict list: manifest-signature invalid, attestation-signature invalid,
   toolset-root recompute mismatch, delta-digest recompute mismatch, drift-composition
   mismatch, consent-binding violation, inclusion-proof invalid, receipt/decision binding
   mismatch, bundle-schema invalid, epoch-window violation, timeline-binding mismatch,
   tamper-arm expectation miss. Any failure ⇒ verdict RED, non-zero exit; never silently
   absorbed.

**Verifier artifact failures do not allocate new 4O raw codes.** Bundle-level structural,
attestation-signature, parse, or unexpected internal verifier failures route through the
existing harness/fatal raw-code path (raw 29 `INTERNAL_ERROR_FAIL_CLOSED` → run-level 3),
while manifest-bound surface failures use 55–66. Raw 56 means the **tool-manifest
commitment** signature failed — never the Stage 4O attestation-bundle signature.

## 9. Time-anchored surfaces (I4)

Each 4O attestation bundle contains a **timeline record**
`{stage4n_chain_position_digest, toolset_root, manifest_epoch}` (domain
`SIMURGH_STAGE4O_TIMELINE_V1`), binding the active toolset root to an
already-committed 4N chain position. Reference direction is strictly **4O → 4N**: the
shipped 4N heartbeat schema, evidence, and goldens are never modified; the verifier
reads the 4N chain from its frozen evidence as a fixture input, offline.

Guarantee (honest scope): **at attestation time**, this toolset root was bound to this
already-committed 4N chain position; any later claim of a different root for that epoch
fails verification (raw 66). A rug pull therefore cannot be memory-holed by rewriting
the manifest after an incident — the surface that was committed while a reporting window
was live is provable retroactively. This is anchoring at attestation time, not a
real-time claim (recorded in non-claims, §2).

## 10. Lane B — real-MCP capture fixture (external validity only)

- The capture script runs locally only, at capture time, against a public/reference MCP
  server. The raw live capture is used only at capture time and is never committed.
- The committed fixture is a redacted, **digest-only** capture manifest plus a
  digest-only rug-pulled variant. CI never commits or replays raw tool descriptions
  unless the server is explicitly public and approved for disclosure.
- Fixture README records that the captured server was public and approved for
  digest-level disclosure. Fixtures are marked `external_validity: true` in the bundle;
  normative claims cite Lane A only.
- CI egress check over `docs/research/llm-shield/evidence/stage-4o/`: no tool names,
  descriptions, schemas, or hostnames anywhere in the bundle.

## 11. Boosters included in 4O (Banger Package)

Two additions chosen deliberately over six parked alternatives (§17): best
engineering-to-impact ratio without turning the stage into a hydra.

### 11.1 Machine-readable constitutional alignment map (C1)

The attestation bundle carries a signed `constitutional_alignment` array annotating each
raw code with the Claude-constitution principle it operationalises, in claim-checked
form (3N lineage — field-equality checks over the shipped mechanism, never free prose):

```json
"constitutional_alignment": [
  {
    "raw_code": 59,
    "mechanism": "tool_identity_mismatch",
    "alignment_claim": "prevents silent substitution of the authorised tool surface",
    "non_claim": "not a model-value guarantee"
  }
]
```

One entry per code 55–66 (e.g. 65 `blind_reapproval` → informed human oversight;
no-silent-third-path → no deception by omission; §17's contest path stays parked). The
3N-style claim compiler verifies every `mechanism` field against the shipped code and
every `alignment_claim` against a closed vocabulary; unverifiable prose is excluded.

**Honesty ceiling (frozen wording):**

> Infrastructure alignment is not model-value alignment. Stage 4O operationalises
> selected oversight and non-deception principles, but it does not claim constitutional
> compliance.

### 11.2 Public-disclosure-derived retro-detection fixture (F1)

A Lane B-class fixture derived from the public disclosures of a real 2026 incident
(primary candidate: the May 2026 Claude Code MCP tool-poisoning; fallback: a disclosed
ToxicSkills skill), marked `retro_fixture: true` and `external_validity: true`.

**Hard inclusion gate:** F1 ships only if public disclosures provide enough
before/after tool-surface data to construct a digest-only fixture **without guessing**.
If the public data is incomplete, F1 is dropped from v2.24.0 and the gap is recorded in
known_limitations — never approximated.

**Claim discipline (frozen wording):** this is a _public-disclosure-derived retro
fixture_, never an "exact reconstruction". The claim is:

> Given the publicly disclosed before/after tool-surface deltas, 4O ledgers the
> corresponding manifest drift class.

Never: "4O proves the original incident would have been stopped."

## 12. Proofs

`proofs/stage4o` contains the Lean theorem `MonotoneConsent` with three legs:

1. **`NoSilentToolSwap`** — if `authorise_with_manifest` accepts a call, then the
   recorded dispatch surface (tool identity, schema digest, authority class, and
   declared sinks) matches the committed manifest entry.
2. **`NoDriftLaundering`** — the narrowing relation `⊑` is a transitive partial order,
   hence an all-narrowing epoch chain implies direct narrowing; contrapositive: a direct
   broadening implies at least one step was not a narrowing, and the verifier's
   composition check therefore cannot be satisfied by any laundering chain.
3. **`DeltaBoundBroadening`** — every accepted epoch chain satisfies: each broadening or
   incomparable step carries `consent_binding = "delta"`.

Contrapositive of the theorem: any committed surface difference is either refused by the
kernel or appears as a ledgered drift event under raw codes 55–66; there is no silent
third path. All lemmas are stated over the _recorded dispatch surface_ — 4O does not and
cannot prove what a remote MCP server actually did internally (4J discipline: recorded
state, not proof of remote execution).

## 13. Error handling

- **Schema failures (closed block preserved):** absent commitment and schema-invalid
  commitment both ledger raw 55 with closed-enum detail
  `manifest_defect ∈ {absent, schema_invalid}` (an object that does not parse cannot be
  canonicalised or signature-checked, so 55 precedes 56). Malformed receipt ⇒ raw 63.
  Unknown raw code ⇒ run-level 3 (existing 4H rule, unchanged).
- **Verifier failures:** §8 taxonomy; artifact/internal failures via raw 29 →
  run-level 3.
- **Reproduce script:** Node-major check first (abort unless Node 26 —
  `/opt/homebrew/opt/node@26/bin` locally, pinned in CI), then build → sign → verify →
  byte-idempotency `cmp`. Artifacts are generated in a temporary directory and
  moved into place last, only after successful generation and byte comparison; any step
  failing aborts with no partial bundle written.

## 14. Testing

| Layer                      | Tests                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kernel (Python)            | each raw code triggered in isolation; first-failure ordering on multiply-broken arms; benign GREEN arms; differential equivalence: the three frozen entry points byte-identical on the 4A 26-decision + 4B/4C corpora                                                                     |
| Digest/schema (Node)       | exact-key validation; domain separation (same value, different domain ⇒ different digest); Merkle root recompute; leaf/node domain separation; inclusion-proof verify (valid, invalid, wrong index, truncated path); delta-digest recompute; signer/verifier round-trip for both keypairs |
| Drift algebra              | property tests: `⊑` reflexive/antisymmetric/transitive on generated manifests; narrowing∘narrowing = narrowing; laundering chains always detected; consent rule on every classification                                                                                                   |
| Tamper matrix (e2e)        | §7 table verbatim — every arm asserts its exact expected raw code; GREEN anti-theatre arms including state-bound narrowing and delta-bound broadening                                                                                                                                     |
| **Kernel↔verifier parity** | the same multiply-broken manifest/action/receipt arms fed through the Python kernel and the Node verifier fixture path must yield the same first raw code                                                                                                                                 |
| Selective disclosure       | single receipt + inclusion proof + envelope verifies without `tools[]`; tampered proof fails                                                                                                                                                                                              |
| Timeline                   | valid 4N chain-position reference accepted; root mismatch and absent position ⇒ 66                                                                                                                                                                                                        |
| Boosters (§11)             | every `constitutional_alignment` entry passes the claim compiler (mechanism field-equality + closed alignment vocabulary); retro fixture ledgers its expected drift class from disclosure-derived digests only                                                                            |
| Cross-stage                | 4N chain untouched; 4H exit-map regenerated and re-verified; K7-style all-functions E2E net composing every 4O export with the tamper matrix and cross-stage invariants — mandatory before tag, in scope from the start                                                                   |

Gotcha guards: explicit `*.test.js` globs (bare-dir `node --test` fails); e2e wired into
the reproduce script and a CI stage job (`npm test` gates tests/unit only); no shelling
to `rg` in unit tests (Linux CI lacks it).

## 15. Risk register

- **Golden blast radius (budgeted, single commit):** registering codes 55–66 breaks the
  known exit-ledger goldens (4K exitWrapper snapshot, 4H exitWrapper snapshot +
  exit-map.json + inline map, 4L e2e net, 4M golden, 4N heartbeat golden). The plan
  enumerates the known affected goldens **and also derives the final blast radius with
  git grep / targeted test failure before the regeneration commit**. Any additional
  touched golden must be named in the commit body. Regeneration happens in one dedicated
  commit so the diff is auditable as a single mechanical change.
- **Formatting:** `docs/research/llm-shield/evidence/stage-4o/` fully `.prettierignore`d
  from the first commit (4N lesson: reproduce `cmp` breaks otherwise).
- **Overclaim scan:** non-claims phrased with the machine-readable pellets in §2; honest
  negations checked against the scanner's heuristics (4N lesson).
- **Key handling:** both stage4o keypairs (manifest + attestation, §6) follow the
  stage4n key-handling convention exactly; the plan phase verifies that convention from
  the stage4n code before generating keys.
- **Scope:** the Monotone Consent Law adds an estimated 30–40% to implementation size
  versus the pre-amendment design. If implementation reveals the drift-algebra or
  timeline machinery cannot ship honestly in v2.24.0, the fallback boundary is: I1+I2
  (codes 64–65) stay in 4O; I4 (code 66) may split to a 4O.1 follow-up. I3 is a schema
  decision and cannot be split out.

## 16. Release boundary

Ships in v2.24.0: kernel entry point, schema/digest/Merkle/delta modules, drift-algebra
classifier, decision harness, tamper matrix, Lane B digest-only fixtures, timeline
record, the signed `constitutional_alignment` map (§11.1), the F1 retro fixture iff its
hard inclusion gate passes (§11.2), attestation + verifier
(`tools/simurgh-attestation/stage4o/`), `proofs/stage4o`,
`scripts/reproduce-llm-shield-stage4o.sh`, evidence bundle under
`docs/research/llm-shield/evidence/stage-4o/`, and the 4N-pattern doc set (threat model,
validation matrix, reviewer checklist, closeout). A comprehensive docs-accuracy pass
(every doc claim verified against shipped code) precedes the tag.

Never shipped: raw captures, private keys, any non-digest tool metadata.

## 17. Roadmap — parked boosters, NOT 4O claims

Nothing in this section is a Stage 4O claim or deliverable. Parked deliberately so the
law ships:

- **4O.1 "Reflexive & Retro":** reflexive harness-surface attestation (the verifier's
  own declared tool surface under the same manifest machinery — deserves its own proof
  boundary); Claude Code / MCP proxy sample integration (product-facing, scope-
  expanding); zero-utility-tax benign-suite eval pack (needs careful benign framing);
  respondent contest path for an operator ledgered with `blind_reapproval` (4M
  pattern — due process for the accused).
- **4P candidate "Herd Drift Evidence":** multi-operator rug-pull correlation over
  public drift-event digests without inventory disclosure — novel enough to be its own
  stage.
- **4P/4Q candidate:** proof-carrying verdicts — Lean-implemented drift classifier in
  three-way parity (Python ↔ Node ↔ Lean); heavy.
- **Post-spec outreach (not spec content):** fellows-thread framing — NIST RFI asks
  (secure tool calling, audit trails, attestation) answered byte-reproducibly; existing
  channel only.

## 18. Four-axis scorecard (spec-time; re-score at closeout)

Standing rule: every stage SPEC and PLAN carries this scorecard, scored with brutal
evidence honesty. Spec-time scores below reflect a committed design with **zero
implementation**; the closeout re-score against shipped evidence is part of the stage.

| Axis                   | Score  | Defence                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                | 8/10   | Three mechanisms with no prior art found (2026-07-04 searches): path-independent drift verdicts, delta-bound consent as a machine-distinguishable evidence class, time-anchored surfaces. Not higher: mechanism-level novelty, not paradigm-level — the lattice/anti-laundering reasoning is 4L/4M lineage reapplied; I3 is honestly-labelled standard crypto.                           |
| Frontier               | 9/10   | Sits on the field's live wound: tool drift is Anthropic's #1 named agent threat vector (April 2026), incidents are months old, ETDI is a draft, nobody ships the verification side. Not higher: Lane A is modelled — frontier of evidence, not of production deployment in real MCP hosts.                                                                                               |
| Good for Anthropic     | 7.5/10 | Answers their own NIST RFI asks (secure tool calling, audit trails, attestation); fills the operator-side gap their shared-responsibility model names; delta-bound consent attacks their own 93%-unread-approvals stat. Not higher: benefit mechanism is a reference design that demonstrates the gap — actual value is contingent on visibility/adoption.                               |
| Constitution alignment | 9/10   | Delta-bound consent operationalises _informed_ human oversight; the non-claims discipline is constitutional honesty as engineering; no-silent-third-path makes "no deception, even by omission" machine-checkable. Not higher: standing tension — the constitution governs model values; this is external infrastructure ("makes clauses machine-checkable", not "is the constitution"). |

**Overall: 8.3/10 as a design** (pre-booster). With the §11 boosters included, the
spec-time targets are Novelty 9 / Frontier 9.5 / Good-for-Anthropic 9 / Constitution 9.5
(~9.3 overall) — targets, not scores, until the closeout re-score against shipped
evidence. What moves it higher, in order: (1) shipped byte-reproducible with the tamper
matrix green; (2) the F1 retro fixture surviving its hard inclusion gate; (3) an outside
party running the verifier or citing the law — the last half-point can only be awarded
externally, and claiming it ourselves would violate the honesty this stage attests.

## 18b. Implementation deltas (recorded at closeout, 2026-07-04)

The design shipped as specified. Four small deltas were surfaced during implementation and
are recorded here for audit (they were pre-declared in the plan's self-review):

1. **12th digest domain.** Commitments need their own domain for the signed envelope /
   `previous_manifest_digest` linkage, so the §5 domain list gains
   `SIMURGH_STAGE4O_MANIFEST_COMMITMENT_V1` (12 domains total).
2. **Kernel parameter name.** The Python entry point is
   `authorise_with_manifest(action, *, manifest_chain, receipt, verify_commitment_signature)` —
   `manifest_chain`, not `manifest`, because it is the commitment chain (genesis-first),
   not a single manifest.
3. **Malformed receipt ordering.** A malformed receipt ledgers raw 63 _before_ the epoch
   check (57), because 57 must read `run_epoch` off the receipt — an object that does not
   validate cannot be read. Documented in `decisionCore` and mirrored in Python.
4. **Timeline arm evaluator.** Raw 66 is attestation-level (verified by the Node verifier /
   timeline core), not kernel-level; the tamper matrix tags it `evaluator: "timeline"` and
   the Python kernel parity gate skips raw-66 rows.

**F1 outcome (§11.2 hard gate):** the public disclosure of the May-2026 incident is a
vulnerability narrative without concrete before/after tool surfaces, so the retro fixture
was **withheld** and the outcome recorded as `retro_fixture_public_data_insufficient` in
the bundle's known limitations — not approximated.

## 19. References

- Anthropic, _Trustworthy Agents in Practice_ (April 2026) — four-layer shared
  responsibility model; tool supply-chain compromise threat vector.
- Anthropic, NIST RFI response on agentic security — secure tool calling, audit trails,
  attestation, incident reporting asks.
- ETDI: _Mitigating Tool Squatting and Rug Pull Attacks in MCP_ (arXiv 2506.01333) —
  prevention-side prior art.
- RFC 6962 (Certificate Transparency) — Merkle inclusion-proof machinery reused by §5a
  (standard technique, novel application here).
- GMO Flatt Security, _Poisoning Claude Code_ (May 2026 incident; fixed in Claude Code
  2.1.128); Snyk _ToxicSkills_ study (2026).
