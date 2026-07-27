// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 11: Lane B, the blind detector ceremony.
//
// The detector runs in a child process that receives the control's bytes and the attack class, and
// IS NOT TOLD which of the three controls it is looking at. This is what makes §3.3's pre-registered
// signal mean something operationally: a detector that cannot see the label cannot fit to it.
//
// BLINDNESS IS ASSERTED STRUCTURALLY, NOT STATISTICALLY. An earlier draft proposed comparing verdict
// distributions between a labelled and an unlabelled run, which two runs of an honest detector
// satisfy by construction — the assertion passes whether or not the child could see the label. So
// the payload itself is inspected for anything naming the control's kind, and a deliberately
// label-leaking payload is refused by this module's own guard.
//
// THE CHILD EMITS THE VERDICT RECEIPT AND THE PARENT EMBEDS ITS BYTES UNCHANGED. "The parent never
// rewrites the verdict" is otherwise only a unit test about a function nobody is obliged to call.

import { createHash } from "node:crypto";

/** Keys that would tell the child what it is looking at. */
export const LABEL_BEARING_KEYS = Object.freeze([
  "control_kind",
  "kind",
  "is_vulnerable",
  "is_safe",
  "is_orthogonal",
  "expected_detection",
  "expected_verdict",
  "label",
  "role_in_family",
  "family_position",
]);

/** Values that leak the label even under an innocent key name. */
const LEAKY_VALUE = /\b(vulnerable|safe_control|orthogonal|control[-_]?kind)\b/i;

/** Env is scrubbed to exactly this. */
export const ALLOWED_ENV_KEYS = Object.freeze(["PATH"]);

export const VERDICT_RECEIPT_DOMAIN = "simurgh.vpf.verdict-receipt.v1";

/**
 * Build the payload handed to the child. Only the bytes, the class and the declared signal.
 *
 * @param {{control_id: string, attack_class: string, source: string, declared_signal: string}} input
 * @returns {object}
 */
export function buildChildPayload({ control_id, attack_class, source, declared_signal }) {
  return { control_id, attack_class, source, declared_signal };
}

/**
 * Refuse a payload that names the control's kind, by key or by value.
 *
 * @param {object} payload
 * @returns {{ok: boolean, reason?: string}}
 */
export function assertBlind(payload) {
  if (!payload || typeof payload !== "object")
    return { ok: false, reason: "payload: not an object" };
  for (const key of Object.keys(payload)) {
    if (LABEL_BEARING_KEYS.includes(key)) {
      return {
        ok: false,
        reason: `payload key "${key}" tells the child which control it is looking at`,
      };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key === "source") continue; // the control's own bytes may legitimately say anything
    if (typeof value === "string" && LEAKY_VALUE.test(value)) {
      return { ok: false, reason: `payload value at "${key}" leaks the label: ${value}` };
    }
  }
  return { ok: true };
}

/**
 * Scrub the environment to the allowed keys. `OPERATOR*` and everything else is dropped.
 *
 * @param {Record<string,string>} env
 * @returns {Record<string,string>}
 */
export function scrubEnv(env) {
  const out = {};
  for (const k of ALLOWED_ENV_KEYS) if (env[k] !== undefined) out[k] = env[k];
  return out;
}

/**
 * Refuse argv that carries key material.
 *
 * @param {string[]} argv
 * @returns {{ok: boolean, reason?: string}}
 */
export function assertNoKeyMaterial(argv) {
  const bad = argv.find((a) => /\.pem$|\.key$|PRIVATE KEY/.test(String(a)));
  return bad ? { ok: false, reason: `argv carries key material: ${bad}` } : { ok: true };
}

/**
 * The digest the child stamps its verdict with, and the parent must reproduce byte-for-byte.
 *
 * @param {{control_digest: string, detector_digest: string, declared_signal: string,
 *          verdict: string, signal_evidence_digest: string}} receipt
 * @returns {string}
 */
export function verdictReceiptDigest(receipt) {
  const canonical = [
    receipt.control_digest,
    receipt.detector_digest,
    receipt.declared_signal,
    receipt.verdict,
    receipt.signal_evidence_digest,
  ].join(" ");
  return createHash("sha256")
    .update(Buffer.from(VERDICT_RECEIPT_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(canonical, "utf8"))
    .digest("hex");
}

/**
 * Verify a receipt the parent claims to have embedded unchanged.
 *
 * @param {object} receipt including its own `receipt_digest`
 * @returns {{ok: boolean, reason?: string}}
 */
export function verifyVerdictReceipt(receipt) {
  if (!receipt || typeof receipt !== "object")
    return { ok: false, reason: "receipt: not an object" };
  const recomputed = verdictReceiptDigest(receipt);
  if (recomputed !== receipt.receipt_digest) {
    return {
      ok: false,
      reason: `receipt digest ${recomputed} != embedded ${receipt.receipt_digest} — the parent rewrote the child's verdict`,
    };
  }
  if (!["detected", "not_detected"].includes(receipt.verdict)) {
    return {
      ok: false,
      reason: `verdict "${receipt.verdict}" is neither detected nor not_detected`,
    };
  }
  return { ok: true };
}

/**
 * A deterministic permutation from a committed seed, so control ORDER cannot leak the label either.
 *
 * @param {string[]} items
 * @param {string} seed
 * @returns {string[]}
 */
export function permute(items, seed) {
  return [...items]
    .map((item) => ({ item, k: createHash("sha256").update(`${seed} ${item}`).digest("hex") }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .map((x) => x.item);
}
