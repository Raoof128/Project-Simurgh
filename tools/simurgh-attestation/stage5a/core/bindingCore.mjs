// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — bindingCore: raw 201, "No Borrowed Story". Recomputes EVERY cross-artifact
// digest from bytes (a signed stale digest is still stale — reviewer MF4), confirms the claim
// table points at the real narrative + the map's declaration (reviewer MF2), delegates the
// embedded 4Z map to evaluateVwa verbatim, and verifies the embedded narrative signature +
// span geometry. `vsnPubKeyPem` intentionally does NOT exist (reviewer MF5): narratives carry
// their own author key; a key-swap changes narrative_digest, caught right here. Plan Task 6.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { checkSpanGeometry } from "../../stage4w/core/textCore.mjs";
import { evaluateVwa } from "../../stage4z/core/vwaCore.mjs";
import { verifyArtifactSignature } from "./vncCore.mjs";

const fail = (reason, detail = {}) => ({ raw: 201, reason, detail });

export function checkBindings(bundle, { vwaPubKeyPem, tier = "public" } = {}) {
  const { narrative, vwa, claim_table, ledger, attestation } = bundle;

  const narrative_digest = recordDigest(narrative);
  const map_digest = recordDigest(vwa.map);
  const map_attestation_digest = recordDigest(vwa.attestation);
  const claim_table_digest = recordDigest(claim_table);
  const ledger_digest = recordDigest(ledger);

  // Claim table bindings (MF2): the table must point at the real narrative identity and the
  // map's precommitted declaration — never the map itself (Law 3, enforced structurally).
  if (claim_table.content.narrative_digest !== narrative_digest)
    return fail("claim_table_narrative_digest_mismatch");
  if (claim_table.content.declaration_digest !== vwa.map.declaration_digest)
    return fail("claim_table_declaration_digest_mismatch");

  // Ledger bindings.
  if (ledger.content.narrative_digest !== narrative_digest)
    return fail("ledger_narrative_digest_mismatch");
  if (ledger.content.map_digest !== map_digest) return fail("ledger_map_digest_mismatch");
  if (ledger.content.map_attestation_digest !== map_attestation_digest)
    return fail("ledger_map_attestation_digest_mismatch");
  if (ledger.content.claim_table_digest !== claim_table_digest)
    return fail("ledger_claim_table_digest_mismatch");

  // Attestation bindings (each field recomputed from bytes — MF4).
  if (attestation.claim_table_digest !== claim_table_digest)
    return fail("attestation_claim_table_digest_mismatch");
  if (attestation.ledger_digest !== ledger_digest)
    return fail("attestation_ledger_digest_mismatch");
  if (attestation.narrative_digest !== narrative_digest)
    return fail("attestation_narrative_digest_mismatch");
  if (attestation.map_attestation_digest !== map_attestation_digest)
    return fail("attestation_map_attestation_digest_mismatch");
  if (bundle.reflection_manifest) {
    if (attestation.reflection_manifest_digest !== recordDigest(bundle.reflection_manifest))
      return fail("attestation_reflection_manifest_digest_mismatch");
  }
  if (bundle.pilot_adaptation) {
    if (attestation.pilot_adaptation_digest !== recordDigest(bundle.pilot_adaptation))
      return fail("attestation_pilot_adaptation_digest_mismatch");
  }

  // Embedded 4Z map: delegate verbatim. Its raw code is REPORTED in detail, never re-mapped.
  // Audit tier runs the 4Z audit re-verify when the audit bundle is present; withheld → the
  // 4Z verifier itself records the skip (the 4Y asymmetry). vwaPubKeyPem is real: 4Z asserts
  // signing_key_digest === keyDigest(vwaPubKeyPem), so a wrong key surfaces here as 201.
  const vwaTier = tier === "audit" && vwa.audit ? "audit" : "public";
  const vwaResult = evaluateVwa(vwa, { tier: vwaTier, publicKeyPem: vwaPubKeyPem });
  if (vwaResult && vwaResult.raw)
    return fail("embedded_vwa_verify_failed", { vwa_raw: vwaResult.raw });

  // Embedded narrative signature (against its OWN author_pub_key_pem — the 163 pattern).
  if (!verifyArtifactSignature(narrative)) return fail("narrative_signature_invalid");
  const geo = checkSpanGeometry(narrative.content.narrative_body, narrative.content.span_map);
  if (geo) return fail("narrative_span_geometry_invalid", { kind: geo.detail?.kind });

  return null;
}
