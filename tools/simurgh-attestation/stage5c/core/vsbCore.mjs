// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — orchestrator (plan Task 7; codes 225/226/238/239 + the frozen order). Motto:
// AnthropicSafe First, then ReviewerSafe. evaluateVsb runs VSB_CHECK_ORDER 225→238 first-failure;
// evaluateVsbSafe wraps any throw → 239 (fail closed). Signature is Ed25519 over
// canonicalJson(content) (content = bundle minus `signature`).
import {
  createHash,
  sign as cryptoSign,
  verify as cryptoVerify,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VSB_SCHEMAS } from "../constants.mjs";
import { composedRulesetDigest, fourXSliceMatches, MR_IDS_5C } from "./mrRuleset.mjs";
import { checkGrid } from "./gridCore.mjs";
import { checkSilentSlip, checkSeverity, checkBreachScreen } from "./slipLedger.mjs";
import { checkSlipRates, checkFloorMonotonicity } from "./slipRateCore.mjs";

const BUNDLE_KEYS = [
  "schema",
  "mr_ruleset_id",
  "mr_ruleset_digest",
  "gate_reductions",
  "base_corpus",
  "grid",
  "slip_table",
  "slip_rates",
  "floor_monotonicity",
  "binding",
  "attestation_pub_key_pem",
  "non_claims",
  "known_limitations",
];
const SLIP_ENTRY_KEYS = new Set([
  "mr_id",
  "base_id",
  "mechanism",
  "gate_version",
  "severity",
  "severity_basis",
  "analyst_note",
]);
const GRID_CELL_KEYS = new Set([
  "mr_id",
  "base_id",
  "equivalence_basis",
  "mutated_text_digest",
  "mutation_verdict",
  "cell_class",
]);

export const contentOf = (bundle) => {
  const { signature, ...content } = bundle;
  return content;
};

// severity_binding = sha256 of the blind child's OUTPUT rows {mr_id, base_id, severity,
// severity_basis} (sorted) — a rewritten severity/basis changes it → 238 (P0-6/PF4).
export function severityBindingDigest(slipTable) {
  const rows = slipTable
    .map((e) => ({
      mr_id: e.mr_id,
      base_id: e.base_id,
      severity: e.severity,
      severity_basis: e.severity_basis,
    }))
    .sort((a, b) => `${a.mr_id}|${a.base_id}`.localeCompare(`${b.mr_id}|${b.base_id}`));
  return "sha256:" + createHash("sha256").update(canonicalJson(rows)).digest("hex");
}

export function signBundle(content, privKeyPem) {
  return cryptoSign(
    null,
    Buffer.from(canonicalJson(content), "utf8"),
    createPrivateKey(privKeyPem)
  ).toString("base64");
}

function bad(raw, reason, detail) {
  return { raw, reason, detail };
}

// 225 — schema / allowlist / shape.
function checkSchema(bundle) {
  if (typeof bundle !== "object" || bundle === null)
    return bad(225, "vsb_schema_invalid", { not_object: true });
  if (bundle.schema !== VSB_SCHEMAS.SLIP_LEDGER)
    return bad(225, "vsb_schema_invalid", { schema: bundle.schema });
  const outer = new Set(Object.keys(bundle));
  for (const k of BUNDLE_KEYS)
    if (!outer.has(k)) return bad(225, "vsb_schema_invalid", { missing: k });
  for (const k of outer)
    if (k !== "signature" && !BUNDLE_KEYS.includes(k))
      return bad(225, "vsb_schema_invalid", { unexpected: k });
  if (!Array.isArray(bundle.grid) || !Array.isArray(bundle.slip_table))
    return bad(225, "vsb_schema_invalid", { shape: "grid/slip_table" });
  for (const c of bundle.grid)
    for (const k of Object.keys(c))
      if (!GRID_CELL_KEYS.has(k)) return bad(225, "vsb_schema_invalid", { grid_field: k });
  for (const e of bundle.slip_table)
    for (const k of Object.keys(e))
      if (!SLIP_ENTRY_KEYS.has(k)) return bad(225, "vsb_schema_invalid", { slip_field: k });
  return null;
}

// 226 — Ed25519 signature over canonicalJson(content).
function checkSignature(bundle) {
  try {
    const ok = cryptoVerify(
      null,
      Buffer.from(canonicalJson(contentOf(bundle)), "utf8"),
      createPublicKey(bundle.attestation_pub_key_pem),
      Buffer.from(bundle.signature ?? "", "base64")
    );
    return ok ? null : bad(226, "vsb_signature_invalid", {});
  } catch (e) {
    return bad(226, "vsb_signature_invalid", { error: String(e && e.message) });
  }
}

// 238 — Lane binding: severity binding reconciliation (Lane B) + Lane-C detector binding shape.
function checkLaneBinding(bundle) {
  const b = bundle.binding ?? {};
  if (b.severity_binding !== severityBindingDigest(bundle.slip_table))
    return bad(238, "vsb_lane_binding_invalid", { severity_binding_mismatch: true });
  const lc = b.lane_c_binding;
  if (lc != null) {
    if (lc.kind !== "external_detector")
      return bad(238, "vsb_lane_binding_invalid", { bad_kind: lc.kind });
    for (const f of [
      "detector_id",
      "detector_version",
      "threshold",
      "base_corpus_digest",
      "verdict_log_digest",
    ])
      if (lc[f] === undefined) return bad(238, "vsb_lane_binding_invalid", { missing: f });
  }
  return null;
}

// evaluateVsb: the frozen first-failure order. mrIds defaults to the composed table; baseTextById
// enables the recompute codes (Lane A: committed fixtures; Lane C audit: audit-private log).
export function evaluateVsb(
  bundle,
  { tier = "audit", baseTextById = null, mrIds = MR_IDS_5C } = {}
) {
  let r;
  if ((r = checkSchema(bundle))) return r; // 225
  if ((r = checkSignature(bundle))) return r; // 226
  // 227 — composed ruleset digest + 4X-slice witness
  if (bundle.mr_ruleset_digest !== composedRulesetDigest() || !fourXSliceMatches())
    return bad(227, "vsb_mr_ruleset_mismatch", {});
  if ((r = checkGrid(bundle.grid, bundle.base_corpus, mrIds, baseTextById))) return r; // 228-232
  if (tier === "audit" && (r = checkSilentSlip(bundle.grid, bundle.slip_table))) return r; // 233
  if ((r = checkSeverity(bundle.slip_table))) return r; // 234
  if ((r = checkSlipRates(bundle.grid, bundle.base_corpus, bundle.slip_rates))) return r; // 235
  const basesWithText =
    baseTextById && bundle.base_corpus.map((b) => ({ ...b, base_text: baseTextById[b.base_id] }));
  if ((r = checkFloorMonotonicity(bundle.floor_monotonicity, { tier, basesWithText, mrIds })))
    return r; // 236
  if ((r = checkBreachScreen(bundle.slip_table))) return r; // 237
  if ((r = checkLaneBinding(bundle))) return r; // 238
  return { raw: 0 };
}

// 239 — fail-closed wrapper.
export function evaluateVsbSafe(bundle, opts) {
  try {
    return evaluateVsb(bundle, opts);
  } catch (e) {
    return bad(239, "internal_fail_closed_vsb", { error: String(e && e.message) });
  }
}
