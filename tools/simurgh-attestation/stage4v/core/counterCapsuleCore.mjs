// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V counter-capsule core + contest outcome envelope (spec §3, §6, §8).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Frozen order: pre(4T re-verify) -> 151 -> 152 -> 153 -> 154 -> 155..158 -> 159 -> map -> 160.
import crypto from "node:crypto";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { evaluateCapsuleSafe } from "../../stage4t/core/capsuleCore.mjs";
import {
  VDP_COUNTER_CAPSULE_SCHEMA,
  VDP_OUTCOME_SCHEMA,
  VDP_VERBS,
  RESPONDENT_ROLES,
  VDP_NON_CLAIMS,
} from "../constants.mjs";
import { verifyBinding, buildBinding, contestTuples } from "./bindingCore.mjs";
import { verifyRespondentCensus, respondentArtifactsIndex } from "./contestCensus.mjs";
import { deriveConflictMap, deriveSectionStatus } from "./conflictMap.mjs";

const eqArray = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

// P0 #2 — strict allowlists close prose/field smuggling. Unknown STRUCTURAL keys
// are 151; known raw/content keys (judgment_text and friends) are 159 (payloadCheck).
const TOP_LEVEL_KEYS = new Set([
  "schema",
  "respondent_role",
  "binding",
  "contests",
  "anchor_contest",
  "filed_at_beat",
  "respondent_census",
  "respondent_evidence_artifacts",
  "non_claims",
  "respondent_key_digest",
  "signature",
]);
const RECOMPUTE_CONTEST_KEYS = new Set([
  "regime",
  "section_id",
  "verb",
  "claimed_value",
  "recompute_kind",
  "evidence_digest",
]);
const JUDGMENT_CONTEST_KEYS = new Set(["regime", "section_id", "verb", "judgment_text_digest"]);
const RAW_CONTENT_KEYS = new Set([
  "judgment_text",
  "raw_prose",
  "provider_notes",
  "operator_summary",
  "prompt",
  "transcript",
  "note",
  "text",
  "body",
]);

export const unsignedCounterCapsule = (cc) => {
  const { signature, ...body } = cc;
  return body;
};

export function buildCounterCapsule({
  capsuleBundle,
  capsulePubKeyPem,
  contests,
  respondentRole = "unspecified",
  respondentCensus,
  respondentArtifacts,
  anchorContest,
  filedAtBeat,
  privKeyPem,
  pubKeyPem,
}) {
  const cc = {
    schema: VDP_COUNTER_CAPSULE_SCHEMA,
    respondent_role: respondentRole,
    contests,
    ...(anchorContest ? { anchor_contest: anchorContest } : {}),
    ...(filedAtBeat ? { filed_at_beat: filedAtBeat } : {}),
    respondent_census: respondentCensus,
    respondent_evidence_artifacts: respondentArtifacts,
    non_claims: [...VDP_NON_CLAIMS],
    respondent_key_digest: keyDigest(pubKeyPem),
  };
  cc.binding = buildBinding(capsuleBundle, capsulePubKeyPem, contestTuples(cc));
  const priv = crypto.createPrivateKey(privKeyPem);
  cc.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCounterCapsule(cc))), priv)
    .toString("hex");
  return cc;
}

export function resignCounterCapsule(cc, privKeyPem) {
  const priv = crypto.createPrivateKey(privKeyPem);
  cc.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCounterCapsule(cc))), priv)
    .toString("hex");
  return cc;
}

// A single contest's STRUCTURAL shape (151 only). Raw-content keys are NOT flagged
// here — they are deferred to payloadCheck (159) so the frozen check order holds
// (159 fires after census, never before binding). Unknown NON-content keys are 151.
function contestShapeError(c) {
  if (typeof c !== "object" || c === null)
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "contest" } };
  if (!VDP_VERBS.includes(c.verb))
    return { raw: 151, reason: "unknown_verb", detail: { verb: c.verb } };
  if (
    typeof c.regime !== "string" ||
    typeof c.section_id !== "string" ||
    c.regime.length === 0 ||
    c.section_id.length === 0 ||
    c.regime.includes("/") ||
    c.section_id.includes("/")
  )
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "target" } };
  const allowed = c.verb === "dispute_as_judgment" ? JUDGMENT_CONTEST_KEYS : RECOMPUTE_CONTEST_KEYS;
  for (const k of Object.keys(c)) {
    if (RAW_CONTENT_KEYS.has(k)) continue; // 159 territory — payloadCheck owns it
    if (!allowed.has(k))
      return { raw: 151, reason: "contest_schema_invalid", detail: { unknown_key: k } };
  }
  if (c.verb !== "dispute_as_judgment") {
    if (
      c.claimed_value === undefined ||
      typeof c.recompute_kind !== "string" ||
      !DIGEST_RE.test(c.evidence_digest ?? "")
    )
      return { raw: 151, reason: "contest_schema_invalid", detail: { part: "recompute_fields" } };
  }
  return null;
}

function schemaCheck(cc) {
  if (!cc || typeof cc !== "object" || cc.schema !== VDP_COUNTER_CAPSULE_SCHEMA)
    return { raw: 151, reason: "vdp_counter_capsule_schema_invalid", detail: { part: "schema" } };
  for (const k of Object.keys(cc)) {
    if (RAW_CONTENT_KEYS.has(k)) continue; // 159 territory — payloadCheck owns top-level prose too
    if (!TOP_LEVEL_KEYS.has(k))
      return {
        raw: 151,
        reason: "vdp_counter_capsule_schema_invalid",
        detail: { unknown_top_key: k },
      };
  }
  if (!RESPONDENT_ROLES.includes(cc.respondent_role))
    return { raw: 151, reason: "unknown_respondent_role", detail: { role: cc.respondent_role } };
  if (!Array.isArray(cc.contests) || cc.contests.length === 0)
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "contests" } };
  for (const c of [
    ...cc.contests,
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ]) {
    const e = contestShapeError(c);
    if (e) return e;
  }
  if (!Array.isArray(cc.respondent_census?.items))
    return { raw: 151, reason: "respondent_census_schema_invalid", detail: {} };
  if (!eqArray(cc.non_claims, VDP_NON_CLAIMS))
    return {
      raw: 151,
      reason: "vdp_counter_capsule_schema_invalid",
      detail: { part: "non_claims" },
    };
  return null;
}

function signatureCheck(cc, respondentPubKeyPem) {
  if (!respondentPubKeyPem || cc.respondent_key_digest !== keyDigest(respondentPubKeyPem))
    return { raw: 152, reason: "respondent_signature_invalid", detail: { part: "key_digest" } };
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedCounterCapsule(cc))),
      crypto.createPublicKey(respondentPubKeyPem),
      Buffer.from(cc.signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  return ok
    ? null
    : { raw: 152, reason: "respondent_signature_invalid", detail: { part: "signature" } };
}

// 159 — prose by digest only. Scans the TOP LEVEL + contests + anchor_contest +
// filed_at_beat (P0 #2, P1 #8). Any raw-content key anywhere is forbidden prose
// (a top-level `transcript` is smuggling, not a mere malformed field, so 159 not
// 151); judgment prose must be a well-formed digest, never inline text.
function payloadCheck(cc) {
  for (const k of Object.keys(cc))
    if (RAW_CONTENT_KEYS.has(k))
      return { raw: 159, reason: "vdp_forbidden_raw_payload", detail: { top_level_field: k } };
  const all = [
    ...cc.contests,
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ];
  for (const c of all) {
    for (const k of Object.keys(c))
      if (RAW_CONTENT_KEYS.has(k))
        return {
          raw: 159,
          reason: "vdp_forbidden_raw_payload",
          detail: { key: `${c.regime}/${c.section_id}`, field: k },
        };
    if (c.verb === "dispute_as_judgment" && !DIGEST_RE.test(c.judgment_text_digest ?? ""))
      return {
        raw: 159,
        reason: "vdp_forbidden_raw_payload",
        detail: { part: "judgment_text_digest" },
      };
  }
  return null;
}

export function evaluateContest(capsuleBundle, cc, opts = {}) {
  const ctx = {
    chainVerdict: (a) =>
      !opts.publicTier && opts.stageVerifiers?.stage4s_chain_bundle
        ? opts.stageVerifiers.stage4s_chain_bundle(a)
        : a.recorded_verdict,
  };
  // Subpoena: the contest forces the capsule to re-prove itself, sealed either way.
  const reverify = evaluateCapsuleSafe(capsuleBundle, {
    capsulePubKeyPem: opts.capsulePubKeyPem,
    stageVerifiers: opts.publicTier ? {} : (opts.stageVerifiers ?? {}),
    ...(opts.capsuleEvalOpts ?? {}),
  });
  const envelopeBase = {
    schema: VDP_OUTCOME_SCHEMA,
    capsule_reverify_result: reverify.raw,
    filed_at_beat_status: "not_supplied",
  };
  if (reverify.raw !== 0)
    return { raw: reverify.raw, envelope: { ...envelopeBase, result: { refused: true, raw: reverify.raw } } };

  for (const check of [
    () => schemaCheck(cc),
    () => (opts.publicTier ? null : signatureCheck(cc, opts.respondentPubKeyPem)),
    () => verifyBinding(cc, capsuleBundle, opts.capsulePubKeyPem),
    () => verifyRespondentCensus(cc, capsuleBundle.content.epoch),
    () => payloadCheck(cc),
  ]) {
    const r = check();
    // The envelope seals only {refused, raw} — the diagnostic reason/detail stay out of
    // the sealed digest (so JS/Python/browser parity is robust). Diagnostics are returned
    // to callers separately when needed.
    if (r)
      return {
        raw: r.raw,
        reason: r.reason,
        detail: r.detail,
        envelope: { ...envelopeBase, result: { refused: true, raw: r.raw } },
      };
  }

  const map = deriveConflictMap(capsuleBundle, cc, ctx);
  if (
    opts.expectedConflictMap !== undefined &&
    recordDigest(opts.expectedConflictMap) !== recordDigest(map)
  )
    return {
      raw: 160,
      reason: "vdp_conflict_map_mismatch",
      envelope: { ...envelopeBase, result: { refused: true, raw: 160 } },
    };

  let filedStatus = "not_supplied";
  if (cc.filed_at_beat) {
    const s = deriveSectionStatus({
      contest: cc.filed_at_beat,
      cls: "evidence_backed",
      operatorValue: cc.filed_at_beat.claimed_value,
      artifacts: respondentArtifactsIndex(cc),
      ctx,
    });
    filedStatus = s.status === "AGREED" ? "VERIFIED" : "FAILED"; // ledgered, never voids
  }
  return { raw: 0, envelope: { ...envelopeBase, filed_at_beat_status: filedStatus, result: map } };
}

export const evaluateContestPublic = (b, cc, opts = {}) =>
  evaluateContest(b, cc, { ...opts, publicTier: true });

export function evaluateContestSafe(capsuleBundle, cc, opts = {}) {
  try {
    return evaluateContest(capsuleBundle, cc, opts);
  } catch {
    return {
      raw: 161,
      envelope: {
        schema: VDP_OUTCOME_SCHEMA,
        result: { refused: true, raw: 161, reason: "internal_fail_closed" },
      },
    };
  }
}
