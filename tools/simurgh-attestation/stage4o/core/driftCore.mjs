// SPDX-License-Identifier: AGPL-3.0-or-later
// Drift algebra + Monotone Consent Law chain validation (4O spec §6a). The verifier
// NEVER trusts claimed classifications: everything below is recomputed from bodies.
// Motto: AnthropicSafe First, then ReviewerSafe.
import {
  toolEntryDigest,
  deltaDigest,
  commitmentDigest,
  validateEnvelope,
} from "./manifestCore.mjs";
import { AUTHORITY_ORDER, GENESIS } from "../constants.mjs";

const rank = (c) => AUTHORITY_ORDER.indexOf(c);
const isSubset = (a, b) => a.every((x) => b.includes(x));

// True iff next ⊑ prev: tools(next) ⊆ tools(prev), and each shared tool did not move up
// the authority order, did not add sinks, and kept its schema digest.
function narrows(prevM, nextM) {
  const pb = new Map(prevM.tools.map((t) => [t.tool_name_digest, t]));
  for (const n of nextM.tools) {
    const p = pb.get(n.tool_name_digest);
    if (!p) return false;
    if (n.tool_schema_digest !== p.tool_schema_digest) return false;
    if (rank(n.authority_class) > rank(p.authority_class)) return false;
    if (!isSubset(n.declared_sinks, p.declared_sinks)) return false;
  }
  return true;
}

export function classifyDrift(prevM, nextM) {
  const equal =
    prevM.tools.length === nextM.tools.length &&
    prevM.tools.every((t, i) => toolEntryDigest(t) === toolEntryDigest(nextM.tools[i]));
  if (equal) return "equal";
  const dn = narrows(prevM, nextM); // next ⊑ prev
  const up = narrows(nextM, prevM); // prev ⊑ next
  if (dn && !up) return "narrowing";
  if (up && !dn) return "broadening";
  return "incomparable";
}

export function validateChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0)
    return { ok: false, raw: 64, reason: "ancestry_incomplete" };
  const classifications = [];
  for (let i = 0; i < chain.length; i++) {
    const env = chain[i];
    const v = validateEnvelope(env);
    if (!v.ok) return { ok: false, raw: 64, reason: "ancestry_incomplete" };
    if (i === 0) {
      if (
        env.manifest_epoch !== 0 ||
        env.previous_manifest_digest !== GENESIS ||
        env.delta_digest !== GENESIS
      ) {
        return { ok: false, raw: 64, reason: "ancestry_incomplete" };
      }
      classifications.push("equal");
      continue;
    }
    const prev = chain[i - 1];
    if (env.manifest_epoch !== prev.manifest_epoch + 1)
      return { ok: false, raw: 64, reason: "ancestry_incomplete" };
    if (env.previous_manifest_digest !== commitmentDigest(prev))
      return { ok: false, raw: 64, reason: "prev_digest_mismatch" };
    if (env.delta_digest !== deltaDigest(prev.manifest, env.manifest))
      return { ok: false, raw: 64, reason: "delta_digest_mismatch" };
    const cls = classifyDrift(prev.manifest, env.manifest);
    classifications.push(cls);
    if (cls === "broadening" && env.consent_binding !== "delta")
      return { ok: false, raw: 65, reason: "state_bound_broadening" };
    if (cls === "incomparable" && env.consent_binding !== "delta")
      return { ok: false, raw: 65, reason: "state_bound_incomparable" };
  }
  // Path independence (defense in depth; ⊑ is transitive, spec §12 NoDriftLaundering):
  // an all-{equal,narrowing} chain must classify {equal,narrowing} end-to-end.
  if (chain.length > 1 && classifications.every((c) => c === "equal" || c === "narrowing")) {
    const direct = classifyDrift(chain[0].manifest, chain.at(-1).manifest);
    if (direct !== "equal" && direct !== "narrowing")
      return { ok: false, raw: 64, reason: "composition_mismatch" };
  }
  return { ok: true, classifications };
}
