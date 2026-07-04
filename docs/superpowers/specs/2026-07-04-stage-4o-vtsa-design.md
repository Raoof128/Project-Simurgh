# Stage 4O — VTSA: Verifiable Tool-Surface Attestation (Design Spec)

**Motto: AnthropicSafe First, then ReviewerSafe.**

- **Status:** Design approved 2026-07-04 (brainstorm session). No implementation yet. No tag.
- **Version target:** v2.24.0 (latest tag verified `v2.23.0-stage-4n-extraction-seismograph`).
- **Predecessors:** 4A–4C (Capability Kernel + intent + provenance), 4N (extraction seismograph, raw 47–54).

---

## 1. Motivation

Anthropic's April 2026 *Trustworthy Agents in Practice* framework assigns the Tools layer
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

Spine position: 4A–4C gate *what a call may do*; 4N attests *the committed reporting
window and chain position of events, not wall-clock time*; **4O attests *what surface the
calls ran on***.

## 2. Claim and non-claims

**Claim (frozen wording):**

> Stage 4O verifies that tool execution was gated through a manifest-bound kernel entry
> point, and that silent tool-surface swaps are rejected or evidenced as verifier
> failures.

**Machine-readable non-claims (signed into the bundle):**

```text
surface_bound_verifiable
not_tools_safe
not_mcp_server_safe
not_protocol_rug_pull_prevention
```

Prose non-claims: 4O does NOT prove MCP servers are safe; does NOT prevent rug pulls at
the protocol layer (ETDI's lane); all claims apply ONLY to calls routed through
`authorise_with_manifest`; the real-MCP capture (Lane B) is external validity, never the
normative target. Honesty guardrail vocabulary: **"surface bound, verifiable" — never
"tools safe."**

## 3. Architecture — two lanes, one verifier

- **Lane A (normative):** modelled manifest under the `simurgh.tool_manifest.v1` schema
  (§4), driven through a new Capability Kernel entry point (§6) over the existing
  3L/4A-derived corpora plus a rug-pull tamper matrix (§7). Fully offline,
  byte-reproducible.
- **Lane B (external validity only):** one frozen, digest-only capture fixture from a
  real MCP server plus a digest-only rug-pulled variant (§9). CI replays fixtures only
  and never connects to a network.
- **Attestation:** stage4o Ed25519 key signs `canonicalJson(parse(bundle))` over the
  decision corpus, drift ledger, and non-claims; two-tier verifier, offline primary.
- **Proofs:** `proofs/stage4o` Lean lemma `NoSilentToolSwap` (§10).
- **Rule:** the modelled manifest is normative; the real-MCP capture is only an
  external-validity fixture; the verifier remains fully offline and byte-reproducible.

## 4. Manifest schema (normative)

`simurgh.tool_manifest.v1`, exact-key schema validation (unknown keys, missing keys, bad
types, malformed `sha256:` values, or out-of-enum values ⇒ schema-invalid, §11):

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

`authority_class` is a closed enum with the fixed escalation order
`read_only < write < egress < destructive`; any movement up the order is an upgrade
(raw 61). `declared_sinks` entries are digests (domain-separated, §5); a run-time sink
set that is not a subset of the declared set is an expansion (raw 62). `risk_class` is the closed enum `low | medium | high`; it is informational for
4O (no gate rule keys off it in v1).

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
```

The verifier never trusts `toolset_digest` as provided. It recomputes it from the exact
ordered manifest entries and raises raw 58 if the committed toolset digest does not match
the manifest body.

## 6. Manifest commitment, epochs, kernel entry point

**Commitment envelope:** `{schema, server_id_digest, toolset_digest, tools[],
manifest_epoch, valid_from_epoch, valid_until_epoch}` + Ed25519 signature
(**stage4o-manifest key** — distinct from the **stage4o-attestation key** that signs the
evidence bundle; two keypairs, so raw 56 and an attestation-signature failure can never
be conflated). Freshness is purely logical — a commitment is valid for a run iff
`valid_from_epoch ≤ run_epoch ≤ valid_until_epoch`. Epochs are non-negative integers;
`run_epoch` is supplied by the run fixture and recorded in the receipt. Epoch
monotonicity/ordering across runs is 3Q/4N territory, not a 4O claim. No wall-clock time
appears anywhere in manifests, receipts, decisions, or the ledger.

**Kernel entry point (additive):** `authorise_with_manifest(action, *, manifest,
receipt)` in `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py`.
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

**Decision flow — fail-closed, deterministic order, first failure wins:**

| Order | Raw | Name | Check |
| --- | --- | --- | --- |
| 1 | 55 | `manifest_missing` | no commitment supplied, or commitment fails exact-key schema validation (`manifest_defect ∈ {absent, schema_invalid}`) |
| 2 | 56 | `manifest_signature_invalid` | tool-manifest commitment signature invalid |
| 3 | 57 | `manifest_epoch_invalid` | `run_epoch` outside `[valid_from_epoch, valid_until_epoch]` |
| 4 | 58 | `server_or_toolset_digest_mismatch` | server identity changed, or recomputed toolset digest ≠ committed |
| 5 | 59 | `tool_identity_mismatch` | call's tool-name digest not in manifest |
| 6 | 60 | `tool_schema_digest_mismatch` | tool present, schema digest differs |
| 7 | 61 | `authority_class_upgrade` | authority class moved up the escalation order |
| 8 | 62 | `declared_sink_expansion` | run-time sink set ⊄ declared sinks |
| 9 | 63 | `manifest_receipt_binding_mismatch` | receipt malformed, or receipt's action/manifest binding ≠ decision |

All nine map to run-level `1`. Ledger layout stays:
`39 reserved · 47–54 Stage 4N · 55–63 Stage 4O · unknown → 3`. Deterministic ordering is
a byte-reproducibility requirement: a doubly-broken arm always ledgers the same single
code. Codes are registered in `tools/simurgh-attestation/stage4h/exitCodes.mjs` (the
known golden-breaking edit, §13).

## 7. Tamper matrix (Lane A, normative)

| Tamper arm | Expected raw |
| --- | ---: |
| missing manifest | 55 |
| schema-invalid manifest | 55 (`manifest_defect: schema_invalid`) |
| signature mismatch | 56 |
| stale manifest replay | 57 |
| server identity / toolset change | 58 |
| tool added post-approval | 59 |
| schema changed | 60 |
| `read_only → write` | 61 |
| destructive-under-harmless-name | 61 (canonical arm: changes `authority_class` while preserving the name digest) |
| sink expansion | 62 |
| receipt/action/manifest binding mismatch | 63 |

Plus expected-GREEN benign arms (manifest unchanged ⇒ calls authorised) as anti-theatre
proof that the gate is not reject-all.

## 8. Verifier

Two-tier, offline primary. Rules:

1. Recompute every digest (including `toolset_digest`, §5) from bundle bytes.
2. Verify the manifest-commitment signature (stage4o-manifest key) and the bundle
   attestation signature (stage4o-attestation key) — separate keypairs, separate failure
   semantics (§11).
3. Reject any receipt whose action or manifest binding differs from the decision corpus
   (anti-laundering: authorising one manifest entry while recording another call).
4. Re-derive every tamper-arm expectation from §7 and fail on any mismatch.
5. Closed verdict list: manifest-signature invalid, attestation-signature invalid,
   toolset-digest recompute mismatch, receipt/decision binding mismatch, bundle-schema
   invalid, epoch-window violation, tamper-arm expectation miss. Any failure ⇒ verdict
   RED, non-zero exit; never silently absorbed.

**Verifier artifact failures do not allocate new 4O raw codes.** Bundle-level structural,
attestation-signature, parse, or unexpected internal verifier failures route through the
existing harness/fatal raw-code path (raw 29 `INTERNAL_ERROR_FAIL_CLOSED` → run-level 3),
while manifest-bound surface failures use 55–63. Raw 56 means the **tool-manifest
commitment** signature failed — never the Stage 4O attestation-bundle signature.

## 9. Lane B — real-MCP capture fixture (external validity only)

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

## 10. Proofs

`proofs/stage4o` contains the Lean lemma `NoSilentToolSwap`:

> If `authorise_with_manifest` accepts a call, then the recorded dispatch surface (tool
> identity, schema digest, authority class, and declared sinks) matches the committed
> manifest entry.

Contrapositive: any committed surface difference is either refused by the kernel or
appears as a ledgered drift event under raw codes 55–63; there is no silent third path.
The lemma is stated over the *recorded dispatch surface* — 4O does not and cannot prove
what a remote MCP server actually did internally (4J discipline: recorded state, not
proof of remote execution).

## 11. Error handling

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

## 12. Testing

| Layer | Tests |
| --- | --- |
| Kernel (Python) | each raw code triggered in isolation; first-failure ordering on doubly-broken arms; benign GREEN arms; differential equivalence: the three frozen entry points byte-identical on the 4A 26-decision + 4B/4C corpora |
| Digest/schema (Node) | exact-key validation; domain separation (same value, different domain ⇒ different digest); `toolset_digest` recompute; signer/verifier round-trip |
| Tamper matrix (e2e) | §7 table verbatim — every arm asserts its exact expected raw code; GREEN anti-theatre arms |
| **Kernel↔verifier parity** | the same doubly-broken manifest/action/receipt arms fed through the Python kernel and the Node verifier fixture path must yield the same first raw code |
| Cross-stage | 4N chain untouched; 4H exit-map regenerated and re-verified; K7-style all-functions E2E net composing every 4O export with the tamper matrix and cross-stage invariants — mandatory before tag, in scope from the start |

Gotcha guards: explicit `*.test.js` globs (bare-dir `node --test` fails); e2e wired into
the reproduce script and a CI stage job (`npm test` gates tests/unit only); no shelling
to `rg` in unit tests (Linux CI lacks it).

## 13. Risk register

- **Golden blast radius (budgeted, single commit):** registering codes 55–63 breaks the
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

## 14. Release boundary

Ships in v2.24.0: kernel entry point, schema/digest modules, decision harness, tamper
matrix, Lane B digest-only fixtures, attestation + verifier
(`tools/simurgh-attestation/stage4o/`), `proofs/stage4o`,
`scripts/reproduce-llm-shield-stage4o.sh`, evidence bundle under
`docs/research/llm-shield/evidence/stage-4o/`, and the 4N-pattern doc set (threat model,
validation matrix, reviewer checklist, closeout). A comprehensive docs-accuracy pass
(every doc claim verified against shipped code) precedes the tag.

Never shipped: raw captures, private keys, any non-digest tool metadata.

## 15. References

- Anthropic, *Trustworthy Agents in Practice* (April 2026) — four-layer shared
  responsibility model; tool supply-chain compromise threat vector.
- Anthropic, NIST RFI response on agentic security — secure tool calling, audit trails,
  attestation, incident reporting asks.
- ETDI: *Mitigating Tool Squatting and Rug Pull Attacks in MCP* (arXiv 2506.01333) —
  prevention-side prior art.
- GMO Flatt Security, *Poisoning Claude Code* (May 2026 incident; fixed in Claude Code
  2.1.128); Snyk *ToxicSkills* study (2026).
