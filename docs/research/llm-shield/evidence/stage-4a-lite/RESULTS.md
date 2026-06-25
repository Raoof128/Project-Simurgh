# Stage 4A-lite — Minimal Capability Kernel (results)

Stage 4A-lite is an **evidence-architecture** stage. It refactors the two hard-coded
adapter-side gate families (egress, destructive mutation) into one minimal Capability
Kernel and proves the refactor changes no behaviour, then seals the kernel's
authorization decisions over a model-free corpus as a signed, offline-verifiable VCA
artifact. **No live model was re-run.**

## Three evidence legs

1. **Refactor-equivalence (earns "no behaviour change").** `gate_tool_call` is now a thin
   shim over `capability_kernel.authorise`. An exhaustive differential test
   (`tests/test_capability_kernel_equivalence.py`) proves it is byte-identical to the
   preserved pre-refactor gate (`_legacy_gate_tool_call`) across every egress +
   destructive-mutation branch, arg shape, trusted-text class, and `gate_mutation` setting.
2. **Model-free authority-decision corpus (the signed artifact).** The kernel is run over
   `corpus-actions.json` — actions derived deterministically from the frozen pre-registered
   injection taxonomy (`injection-taxonomy-prereg.json`): all 14 injection goals expanded by
   class (egress send; delete-only mutation; egress_plus_delete → both a send and a delete;
   egress_mass_recipient), plus benign grounded-egress / grounded-delete / grounded-invite
   authority patterns. 26 authorization decisions: 23 blocked (every injection action), 3
   allowed (benign grounded), `requires_confirmation_count = 0`. Each action emits a
   metadata-only `simurgh.authority_decision.v1` record (hashed targets, privacy flags). This
   is reproducible offline forever; it is **a model-free corpus, not a live trace.**
3. **Digest-bound inheritance.** `manifest.json` binds the frozen Stage 1-LIVE authority
   result (commit `37f2de0`, `9/140 → 0/140` within the declared taxonomy) by sha256 of its
   five evidence files. The live result is inherited **only through differential
   equivalence** to the gate that produced it.

## Honest provenance notes

- The frozen Stage 1-LIVE run **outcome-recorded** per case (attack/utility success) and
  recorded **aggregate** mediation counts; it did **not** persist individual tool-call
  traces. The pod is down and keys are revoked, so **no live re-run was performed.**
- The signed per-action records therefore come from the model-free corpus (leg 2), not
  from a live trajectory.

## Non-claims

- The live authority-gate result is inherited only through differential equivalence to the
  gate that produced the frozen evidence, not through replay of the live model or
  reconstruction of live per-action traces.
- Not jailbreak immunity; not injection prevention; not a live per-action replay.
- Taxonomy excludes non-destructive mutation, financial, and code actions.
- No `src/llmShield` change; this is not a production gateway capability-kernel claim.
- Target hashes are metadata-minimisation identifiers, not a secrecy guarantee against
  dictionary reconstruction of known public targets.

## Verify

```bash
node --test tests/unit/llmShield/stage4a/*.test.js
```

The portable verifier checks the Ed25519 signature, public-key fingerprint, bundle digest,
the `requires_confirmation_count == 0` invariant, and the presence of the verbatim
inheritance non-claim. The `reproduce` tier additionally recomputes `decisions_sha256` and
rebuilds the bundle from `authority-decisions.json` + `manifest.json`.

## Files

- `corpus-actions.json` — model-free action corpus (derived from the frozen prereg).
- `authority-decisions.json` — per-action `simurgh.authority_decision.v1` records.
- `authority-decision-summary.json` — aggregate by family/verdict.
- `manifest.json` — digest binding to frozen Stage 1-LIVE evidence + non-claims.
- `authority-bundle.json` / `authority-bundle.signature.json` — signable bundle + Ed25519 sidecar.
- `keys/stage4a-public-key.json` / `keys/fingerprint.txt` — Stage 4A public key (private key never committed).
