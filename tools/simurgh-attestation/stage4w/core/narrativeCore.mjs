// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W narrative core — build/sign/verify + frozen check order + density (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RECOMPUTE_REGISTRY, KIND_EVIDENCE_SOURCE } from "../../stage4t/core/projectionCore.mjs";
import {
  VSN_NARRATIVE_SCHEMA,
  SPAN_TYPES,
  AUTHOR_ROLES,
  LEAKAGE_RULESET_ID,
} from "../constants.mjs";
import { bodyBytes, checkNormalisation, checkSpanGeometry } from "./textCore.mjs";
import { checkLeakage, capsuleValueStrings } from "./leakageGate.mjs";
import {
  buildNarrativeBinding,
  verifyNarrativeBinding,
  checkEvidenceLocality,
  checkJudgments,
  capsuleEvidenceIndex,
} from "./narrativeBinding.mjs";

const eq = (a, b) => canonicalJson(a) === canonicalJson(b);
const sign = (content, privKeyPem) =>
  crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(privKeyPem))
    .toString("base64");

export function buildNarrative({
  capsuleBundle,
  capsulePubKeyPem,
  body,
  spanMap,
  judgments,
  authorRole,
  privKeyPem,
  pubKeyPem,
}) {
  const content = {
    schema: VSN_NARRATIVE_SCHEMA,
    narrative_body: body,
    span_map: spanMap,
    judgments: judgments ?? [],
    binding: buildNarrativeBinding(capsuleBundle, capsulePubKeyPem, body, spanMap),
    author_role: authorRole,
    leakage_ruleset: LEAKAGE_RULESET_ID,
  };
  return { content, signature: sign(content, privKeyPem), author_pub_key_pem: pubKeyPem };
}

export const resignNarrative = (n, privKeyPem) => ({
  ...n,
  signature: sign(n.content, privKeyPem),
});

// Strict allowlists (162). 162/171 boundary (spec §2, reviewer P1 #5 Option B):
// 162 rejects unknown STRUCTURAL keys outside allowed containers (incl. outer bundle
// keys); 171 catches forbidden payload MATERIAL nested inside otherwise-allowed opaque
// containers (e.g. signed_judgment.content). Both fire — no gap beside `content`.
const OUTER_KEYS = ["content", "signature", "author_pub_key_pem"];
const TOP_KEYS = [
  "schema",
  "narrative_body",
  "span_map",
  "judgments",
  "binding",
  "author_role",
  "leakage_ruleset",
];
const SPAN_BASE = ["span_id", "start_byte", "end_byte", "type"];
const SPAN_KEYS = {
  slot_bound: [
    ...SPAN_BASE,
    "regime",
    "section_id",
    "claimed_value",
    "recompute_kind",
    "evidence_digest",
  ],
  judgment: [...SPAN_BASE, "judgment_id", "judgment_digest"],
  unverified_prose: SPAN_BASE,
};
const keysOk = (obj, allowed) => {
  const ks = Object.keys(obj ?? {});
  return ks.length === allowed.length && ks.every((k) => allowed.includes(k));
};

function schemaCheck(narrative) {
  const bad = (reason, detail) => ({ raw: 162, reason, detail });
  if (!keysOk(narrative, OUTER_KEYS)) return bad("vsn_schema_invalid", { field: "outer_keys" });
  const c = narrative?.content;
  if (!c || c.schema !== VSN_NARRATIVE_SCHEMA)
    return bad("vsn_schema_invalid", { field: "schema" });
  if (!keysOk(c, TOP_KEYS)) return bad("vsn_schema_invalid", { field: "top_level_keys" });
  if (!AUTHOR_ROLES.includes(c.author_role)) return bad("unknown_author_role", {});
  if (c.leakage_ruleset !== LEAKAGE_RULESET_ID) return bad("unknown_leakage_ruleset", {});
  for (const s of c.span_map ?? []) {
    if (!SPAN_TYPES.includes(s.type)) return bad("unknown_span_type", { span_id: s.span_id });
    if (!keysOk(s, SPAN_KEYS[s.type])) return bad("span_schema_invalid", { span_id: s.span_id });
  }
  for (const j of c.judgments ?? []) {
    const allowed =
      j.reserved === true
        ? ["judgment_id", "signed_judgment", "reserved"]
        : ["judgment_id", "signed_judgment"];
    if (!keysOk(j, allowed)) return bad("judgment_schema_invalid", { judgment_id: j.judgment_id });
  }
  return null;
}

function signatureCheck(narrative) {
  try {
    const ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(narrative.content)),
      crypto.createPublicKey(narrative.author_pub_key_pem),
      Buffer.from(narrative.signature, "base64")
    );
    return ok ? null : { raw: 163, reason: "vsn_signature_invalid", detail: {} };
  } catch {
    return { raw: 163, reason: "vsn_signature_invalid", detail: {} };
  }
}

// 169 — lens-not-blender projection identity + recompute (spec §2 Patch 1).
function slotRecomputeCheck(content, capsuleBundle, ctx) {
  const sections = new Map(
    (capsuleBundle.content.projected_sections ?? []).map((p) => [`${p.regime}/${p.section_id}`, p])
  );
  const sealed = capsuleEvidenceIndex(capsuleBundle);
  const bad = (kind, span_id) => ({
    raw: 169,
    reason: "vsn_slot_recompute_mismatch",
    detail: { kind, span_id },
  });
  for (const s of content.span_map ?? []) {
    if (s.type !== "slot_bound") continue;
    const p = sections.get(`${s.regime}/${s.section_id}`);
    if (!p || p.class !== "evidence_backed") return bad("no_matching_projected_section", s.span_id);
    if (p.recompute_kind !== s.recompute_kind || p.evidence_digest !== s.evidence_digest)
      return bad("derivation_blend", s.span_id);
    if (!eq(s.claimed_value, p.value)) return bad("claimed_value_drift", s.span_id);
    const artifact = sealed[s.evidence_digest];
    const fn = RECOMPUTE_REGISTRY[s.recompute_kind];
    const kindOk =
      artifact !== undefined && artifact.kind === KIND_EVIDENCE_SOURCE[s.recompute_kind];
    if (fn === undefined || !kindOk) return bad("recompute_unavailable", s.span_id);
    if (!eq(fn(artifact, ctx), s.claimed_value)) return bad("recompute_mismatch", s.span_id);
  }
  return null;
}

// 171 — recursive forbidden-payload scan over the WHOLE bundle (spec §2 Patch 6,
// reviewer P0 #1). Allows "PUBLIC KEY" (author_pub_key_pem is legitimate) but rejects
// "PRIVATE KEY" anywhere. Scans top-level fields too, so forbidden material beside
// `content` (which the signature does not cover) cannot hide.
const FORBIDDEN_KEY =
  /^(prompt|completion|transcript|raw_transcript|api_key|tool_output|provider_message|network|egress_url)$/i;
export function payloadCheck(value, path = "narrative") {
  if (typeof value === "string")
    return value.includes("PRIVATE KEY")
      ? {
          raw: 171,
          reason: "vsn_payload_violation",
          detail: { path, kind: "private_key_material" },
        }
      : null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const r = payloadCheck(value[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(k))
        return {
          raw: 171,
          reason: "vsn_payload_violation",
          detail: { path: `${path}.${k}`, kind: "forbidden_key" },
        };
      const r = payloadCheck(v, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

// Evidence density (spec §2) — derived from the VERIFIED span map only, never filed.
export function computeEvidenceDensity(content) {
  const total = bodyBytes(content.narrative_body).length;
  let slot = 0;
  let judg = 0;
  for (const s of content.span_map ?? []) {
    const len = s.end_byte - s.start_byte;
    if (s.type === "slot_bound") slot += len;
    else if (s.type === "judgment") judg += len;
  }
  return {
    slot_bound_bytes: slot,
    judgment_bytes: judg,
    voice_bytes: total - slot - judg, // declared prose + unspanned connective text
    total_bytes: total,
  };
}

// Frozen public order: 162→163→164→165→166→167→168→169→170→171 (spec §2).
export function evaluateNarrative(capsuleBundle, narrative, { capsulePubKeyPem, ctx }) {
  const checks = [
    () => schemaCheck(narrative),
    () => signatureCheck(narrative),
    () => checkNormalisation(narrative.content.narrative_body),
    () => checkSpanGeometry(narrative.content.narrative_body, narrative.content.span_map),
    () => verifyNarrativeBinding(narrative.content, capsuleBundle, capsulePubKeyPem),
    () => checkEvidenceLocality(narrative.content, capsuleBundle),
    () => checkJudgments(narrative.content),
    () => slotRecomputeCheck(narrative.content, capsuleBundle, ctx),
    () =>
      checkLeakage(
        narrative.content.narrative_body,
        narrative.content.span_map,
        capsuleValueStrings(capsuleBundle.content)
      ),
    () => payloadCheck(narrative),
  ];
  for (const check of checks) {
    const r = check();
    if (r) return r;
  }
  return { raw: 0, density: computeEvidenceDensity(narrative.content) };
}

export function evaluateNarrativeSafe(capsuleBundle, narrative, opts) {
  try {
    return evaluateNarrative(capsuleBundle, narrative, opts);
  } catch {
    return { raw: 172, reason: "vsn_internal_fail_closed", detail: {} };
  }
}
