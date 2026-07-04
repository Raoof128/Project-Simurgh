// SPDX-License-Identifier: AGPL-3.0-or-later
// Manifest schema, digest, delta, and commitment-envelope machinery (4O spec §4, §6).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import { surfaceRoot } from "./merkleSurface.mjs";
import {
  DOMAINS,
  TOOL_MANIFEST_SCHEMA,
  COMMITMENT_SCHEMA,
  AUTHORITY_ORDER,
  RISK_CLASSES,
  CONSENT_BINDINGS,
  GENESIS,
} from "../constants.mjs";

const fail = (detail) => ({ ok: false, reason: "schema_invalid", detail });
const exactKeys = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every((k) => k in obj);

const ENTRY_KEYS = [
  "tool_name_digest",
  "tool_schema_digest",
  "authority_class",
  "declared_sinks",
  "risk_class",
];

export function validateManifest(m) {
  if (!exactKeys(m, ["schema", "server_id_digest", "toolset_digest", "tools"]))
    return fail("manifest_keys");
  if (m.schema !== TOOL_MANIFEST_SCHEMA) return fail("manifest_schema_id");
  if (!DIGEST_RE.test(m.server_id_digest) || !DIGEST_RE.test(m.toolset_digest))
    return fail("manifest_digest_format");
  if (!Array.isArray(m.tools) || m.tools.length === 0) return fail("tools_empty");
  let prev = "";
  for (const t of m.tools) {
    if (!exactKeys(t, ENTRY_KEYS)) return fail("entry_keys");
    if (!DIGEST_RE.test(t.tool_name_digest) || !DIGEST_RE.test(t.tool_schema_digest))
      return fail("entry_digest_format");
    if (!AUTHORITY_ORDER.includes(t.authority_class)) return fail("authority_class_enum");
    if (!RISK_CLASSES.includes(t.risk_class)) return fail("risk_class_enum");
    if (!Array.isArray(t.declared_sinks) || t.declared_sinks.some((s) => !DIGEST_RE.test(s)))
      return fail("sinks_format");
    if (t.tool_name_digest <= prev) return fail("tools_not_sorted_unique");
    prev = t.tool_name_digest;
  }
  return { ok: true };
}

export const toolEntryDigest = (entry) =>
  domainDigest(DOMAINS.TOOL_ENTRY, TOOL_MANIFEST_SCHEMA, entry);
export const computeToolsetRoot = (m) => surfaceRoot(m.tools.map(toolEntryDigest));

export function deltaObject(prevM, nextM) {
  const pb = new Map(prevM.tools.map((t) => [t.tool_name_digest, t]));
  const nb = new Map(nextM.tools.map((t) => [t.tool_name_digest, t]));
  const removed = [];
  const added = [];
  const changed = [];
  for (const [name, t] of pb) if (!nb.has(name)) removed.push(toolEntryDigest(t));
  for (const [name, t] of nb) if (!pb.has(name)) added.push(toolEntryDigest(t));
  for (const [name, t] of pb) {
    const n = nb.get(name);
    if (n && toolEntryDigest(t) !== toolEntryDigest(n)) {
      changed.push({
        tool_name_digest: name,
        before_entry_digest: toolEntryDigest(t),
        after_entry_digest: toolEntryDigest(n),
      });
    }
  }
  removed.sort();
  added.sort();
  changed.sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  return { removed, added, changed };
}

export const deltaDigest = (prevM, nextM) =>
  domainDigest(DOMAINS.DELTA, TOOL_MANIFEST_SCHEMA, deltaObject(prevM, nextM));

const ENV_KEYS = [
  "schema",
  "manifest",
  "manifest_epoch",
  "valid_from_epoch",
  "valid_until_epoch",
  "previous_manifest_digest",
  "delta_digest",
  "consent_binding",
  "signer_public_key_pem",
  "signature",
];
const isEpoch = (n) => Number.isInteger(n) && n >= 0;

export function validateEnvelope(env) {
  if (!exactKeys(env, ENV_KEYS)) return fail("envelope_keys");
  if (env.schema !== COMMITMENT_SCHEMA) return fail("envelope_schema_id");
  const mv = validateManifest(env.manifest);
  if (!mv.ok) return mv;
  if (![env.manifest_epoch, env.valid_from_epoch, env.valid_until_epoch].every(isEpoch))
    return fail("epoch_format");
  if (env.valid_from_epoch > env.valid_until_epoch) return fail("epoch_window_inverted");
  if (!CONSENT_BINDINGS.includes(env.consent_binding)) return fail("consent_binding_enum");
  if (env.manifest_epoch === 0) {
    if (env.previous_manifest_digest !== GENESIS || env.delta_digest !== GENESIS)
      return fail("genesis_rules");
  } else if (!DIGEST_RE.test(env.previous_manifest_digest) || !DIGEST_RE.test(env.delta_digest)) {
    return fail("chain_digest_format");
  }
  if (typeof env.signer_public_key_pem !== "string" || typeof env.signature !== "string")
    return fail("signature_format");
  return { ok: true };
}

export function commitmentDigest(env) {
  const { signature, ...unsigned } = env;
  void signature;
  return domainDigest(DOMAINS.MANIFEST_COMMITMENT, COMMITMENT_SCHEMA, unsigned);
}
