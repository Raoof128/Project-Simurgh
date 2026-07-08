// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — declarationCore (spec §2, plan Task 5). No Post-Hoc Declaration (192).
// Motto: AnthropicSafe First, then ReviewerSafe.
// The declaration bundle (lexicon + theta_nano + corpus manifest + total position rule +
// layer set + tokenizer) is digest-committed and signed BEFORE capture; map, capture, and
// attestation must all bind the same declaration_digest. Nothing about WHAT, WHERE, or
// WHICH LAYERS to grade may change after the readouts are seen.
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";

const fail = (detail) => ({ raw: 192, reason: "vwa_declaration_precommit_mismatch", detail });

// declaration_digest = recordDigest(canonical declaration). Canonicalisation sorts keys,
// so field order is irrelevant; any content change flips the digest.
export function declarationDigest(declaration) {
  return recordDigest(declaration);
}

// checkPrecommit(declaration, capture, map) → null | {raw:192}.
export function checkPrecommit(declaration, capture, map) {
  const dd = declarationDigest(declaration);
  if (capture?.declaration_digest !== dd) return fail("declaration_digest_mismatch_capture");
  if (map?.declaration_digest !== dd) return fail("declaration_digest_mismatch_map");
  if (map?.theta_nano !== declaration.theta_nano) return fail("theta_nano_mismatch");
  if (map?.position_rule_id !== declaration.position_rule_id) return fail("position_rule_mismatch");
  if (canonicalJson(map?.layers ?? null) !== canonicalJson(declaration.layers))
    return fail("layer_set_mismatch");
  // The total-rule teeth: the declared per-prompt token counts MUST equal what the capture
  // actually tokenised — a shrunk declaration (fewer positions than captured) is caught here
  // even though the grid would still be "total" over the censored declaration (gauntlet-2 A).
  for (const p of declaration.corpus_manifest?.prompts ?? []) {
    const seen = capture?.prompt_token_counts?.[p.prompt_id];
    if (seen === undefined || seen !== p.n_tokens) return fail("grid_positions_not_total");
  }
  return null;
}
