// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure builder + verifier core for the Stage 4A-lite authority bundle. No I/O.
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";

export const STAGE4A_BUNDLE_SCHEMA = "simurgh.stage4a.authority_bundle.v1";

export function buildBundle({ summary, manifest, decisions }) {
  return {
    schema: STAGE4A_BUNDLE_SCHEMA,
    stage: "4A-lite",
    summary,
    manifest,
    decisions_count: decisions.length,
    decisions_sha256: sha256Hex(canonicalJson(decisions)),
    non_claims: manifest.non_claims,
    inheritance_statement: manifest.inheritance_statement,
  };
}
