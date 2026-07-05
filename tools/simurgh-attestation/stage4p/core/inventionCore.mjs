// SPDX-License-Identifier: AGPL-3.0-or-later
// Invention layer: pincer corroboration, relay contest, vendor disclosure projection,
// extraction bridge — four independent, closed-ledger helpers (4P spec §11). No new raw
// codes; failures map to the existing 67/68 semantics.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS, ENUMS } from "../constants.mjs";

const fail67 = { ok: false, raw: 67, reason: "schema_invalid" };
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;
const isB64 = (v) => typeof v === "string" && v.length > 0 && /^[A-Za-z0-9+/=]+$/.test(v);

// Duplicated locally (not imported from schemaCore) — core-module independence over DRY.
function exactKeys(obj, keys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const a = Object.keys(obj).sort();
  const b = [...keys].sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

const ENFORCEMENT_KEYS = [
  "schema",
  "stage4n_window_anchor_digest",
  "custody_class_digest",
  "action_class",
  "count_commitment",
  "signer_public_key",
  "signature",
];

// §11.1 — enforcement window commitment: a party's own claim to have acted against a
// custody class within a window. Schema-shape only; corroboration is pincerCorroborated.
export function validateEnforcementCommitment(c) {
  if (!exactKeys(c, ENFORCEMENT_KEYS)) return fail67;
  if (c.schema !== SCHEMAS.ENFORCEMENT) return fail67;
  if (!isDigest(c.stage4n_window_anchor_digest)) return fail67;
  if (!isDigest(c.custody_class_digest)) return fail67;
  if (!ENUMS.action_class.includes(c.action_class)) return fail67;
  if (!isDigest(c.count_commitment)) return fail67;
  if (!isB64(c.signer_public_key)) return fail67;
  if (!isB64(c.signature)) return fail67;
  return { ok: true };
}

// §11.1 — the pincer: an enforcement commitment is corroborated iff some independently
// submitted MATCHABLE custody-class signal shares BOTH the custody class digest and the
// stage4n window anchor digest. Sharing only one is not corroboration.
export function pincerCorroborated({ commitment, signals }) {
  return signals.some(
    (s) =>
      s.signal_mode === "matchable" &&
      s.custody_class_digest === commitment.custody_class_digest &&
      s.stage4n_window_anchor_digest === commitment.stage4n_window_anchor_digest
  );
}

const CONTEST_KEYS = [
  "schema",
  "contested_custody_class_digest",
  "stage4n_window_anchor_digest",
  "relay_identity_digest",
  "counter_evidence_digest",
  "signature",
];

// §11.2 — a named relay's contest of a custody-class match. relay_identity_digest is an
// opaque identity token (not necessarily a sha256 content digest), so it is checked for
// presence/type only; contested_custody_class_digest, stage4n_window_anchor_digest, and
// counter_evidence_digest are content digests and are DIGEST_RE-checked. A contest whose
// signer key does not match the claimed relay identity is a 68-class signature failure,
// not a schema failure — the closed-ledger rule keeps this off a new raw code.
export function validateRelayContest(contest, { signerKeyDigest }) {
  if (!exactKeys(contest, CONTEST_KEYS)) return fail67;
  if (contest.schema !== SCHEMAS.CONTEST) return fail67;
  if (!isDigest(contest.contested_custody_class_digest)) return fail67;
  if (!isDigest(contest.stage4n_window_anchor_digest)) return fail67;
  if (!isNonEmptyString(contest.relay_identity_digest)) return fail67;
  if (!isDigest(contest.counter_evidence_digest)) return fail67;
  if (!isB64(contest.signature)) return fail67;
  if (signerKeyDigest !== contest.relay_identity_digest)
    return { ok: false, raw: 68, reason: "contest_signer_mismatch" };
  return { ok: true };
}

// §11.3 — MF5 two-arg projection. `attestationDigest` is the body0_digest computed BEFORE
// the disclosure exists (passed in, never read off a body/bundle) — this is what breaks
// the circular-digest knot. `subject` is the single headline custody exchange the
// disclosure projects (not the whole multi-arm bundle).
export function projectVendorDisclosure(attestationDigest, subject) {
  return {
    schema: SCHEMAS.DISCLOSURE,
    declared_provider_family: subject.provider_family,
    declared_relay_count: subject.declared_relay_digests.length,
    trace_custody_class: subject.trace_custody,
    verification_result: subject.verification_raw === 0 ? "verified" : "custody_failure",
    attestation_digest: attestationDigest,
  };
}

// §11.3 — a disclosure is valid iff it is EXACTLY the recomputation of
// projectVendorDisclosure from the same inputs. Any extra or underivable field (e.g. a
// marketing claim bolted on) fails closed, since canonicalJson equality requires an exact
// key/value match.
export function verifyVendorDisclosure(disclosure, attestationDigest, subject) {
  const recomputed = projectVendorDisclosure(attestationDigest, subject);
  if (canonicalJson(disclosure) !== canonicalJson(recomputed)) return fail67;
  return { ok: true };
}

const BRIDGE_KEYS = ["cpc_custody_class_digest", "stage3t_attestation_digest", "bridge_mode"];

// §11.4 — binds a Stage 4L/4P custody-class digest to a Stage 3T extraction-attestation
// digest. digest_binding_only means exactly that: no causal claim, just two independently
// verifiable memberships. Both digests must be found in their own supplied known set —
// neither side is trusted on the other's say-so.
export function validateExtractionBridge(bridge, { knownCpcDigests, known3tDigests }) {
  if (!exactKeys(bridge, BRIDGE_KEYS)) return fail67;
  if (!ENUMS.bridge_mode.includes(bridge.bridge_mode)) return fail67;
  if (!isNonEmptyString(bridge.cpc_custody_class_digest)) return fail67;
  if (!isNonEmptyString(bridge.stage3t_attestation_digest)) return fail67;
  if (!knownCpcDigests.includes(bridge.cpc_custody_class_digest)) return fail67;
  if (!known3tDigests.includes(bridge.stage3t_attestation_digest)) return fail67;
  return { ok: true };
}
