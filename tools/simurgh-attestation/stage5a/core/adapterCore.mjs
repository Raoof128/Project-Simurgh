// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — adapterCore: the pilot ingest conformance gate (raw 207). An external
// publisher's readout, adapted through the 4Z contract, must (a) pass 4Z public verify, (b)
// declare every synthesized field as adapter_derived (no silent lossiness), and (c) in the
// audit tier, hash back to the frozen raw-export digest. "A match is not an accusation": the
// adapted map is honestly marked, never presented as publisher-signed. Plan Task 8. Motto:
// AnthropicSafe First, then ReviewerSafe.
import { createHash } from "node:crypto";
import { evaluateVwa } from "../../stage4z/core/vwaCore.mjs";

const fail = (reason, detail = {}) => ({ raw: 207, reason, detail });
const sha = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");

// checkAdaptation(pilot, vwaBundle, {vwaPubKeyPem, rawExportBytes?}) → {raw:207} | null.
export function checkAdaptation(pilot, vwaBundle, { vwaPubKeyPem, rawExportBytes = null } = {}) {
  const c = pilot.content ?? pilot;

  // (a) the adapted map must verify under the 4Z PUBLIC contract (tensors from a foreign
  // export are adapter-derived; the audit tier for the map is honestly out of scope).
  const r = evaluateVwa(vwaBundle, { tier: "public", publicKeyPem: vwaPubKeyPem });
  if (r && r.raw) return fail("adapted_map_verify_failed", { vwa_raw: r.raw });

  // (b) no undeclared lossiness: the set of fields the map marks adapter_derived must equal
  // the set the pilot declares. A field synthesized but NOT declared (or vice versa) → 207.
  const declared = new Set(c.lossiness ?? []);
  const actual = new Set(vwaBundle.map.adapter_derived_fields ?? []);
  if (declared.size !== actual.size || [...actual].some((f) => !declared.has(f)))
    return fail("undeclared_lossiness", { declared: [...declared], actual: [...actual] });

  // (c) audit depth: the frozen raw export bytes must hash to the committed source digest.
  if (rawExportBytes != null && sha(rawExportBytes) !== c.source_digest)
    return fail("source_digest_mismatch");

  return null;
}
