// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R schema validators (4R spec §5, §6.2). Motto: AnthropicSafe First,
// then ReviewerSafe. Every validator enforces an EXACT key set and returns
// {ok:true} or {ok:false, raw:90, reason}. Structural failures are the raw-90
// tier (spec §6.1). `assertNoSealedMaterial` is defence-in-depth for §5.2: the
// public match record must never carry mask/token/z/dleq material.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS, ROLES, DLEQ_RELATION_KINDS, POINT_HEX_RE } from "../constants.mjs";

const PHASE_ORDER = Object.freeze(["mask", "commit", "open", "sign"]);
const SEALED_KEYS = Object.freeze(["mask_point", "token", "token_nonce", "z", "dleq"]);

function fail(reason) {
  return { ok: false, raw: 90, reason };
}
const OK = Object.freeze({ ok: true });

function exactKeys(obj, keys) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const have = Object.keys(obj).sort();
  const want = [...keys].sort();
  return have.length === want.length && have.every((k, i) => k === want[i]);
}
const isHex = (v) => typeof v === "string" && POINT_HEX_RE.test(v);
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);
const isRolePair = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && exactKeys(v, ROLES);

const MASK_MESSAGE_KEYS = [
  "schema",
  "epoch",
  "run_id",
  "pair_id",
  "role",
  "slot_index",
  "mask_point",
  "operator_signature",
];
export function validateMaskMessage(obj) {
  if (!exactKeys(obj, MASK_MESSAGE_KEYS)) return fail("mask_message_keys");
  if (obj.schema !== SCHEMAS.MASK_MESSAGE) return fail("mask_message_schema");
  if (!isDigest(obj.epoch) || !isDigest(obj.pair_id)) return fail("mask_message_field");
  if (!ROLES.includes(obj.role)) return fail("mask_message_role");
  if (!Number.isInteger(obj.slot_index) || obj.slot_index < 0) return fail("mask_message_slot");
  if (!isHex(obj.mask_point)) return fail("mask_message_point");
  if (typeof obj.operator_signature !== "string") return fail("mask_message_signature");
  return OK;
}

export const DLEQ_PROOF_KEYS = [
  "schema",
  "relation_kind",
  "epoch",
  "run_id",
  "pair_id",
  "role",
  "R1",
  "R2",
  "s",
];
export function validateDleqProof(obj) {
  if (!exactKeys(obj, DLEQ_PROOF_KEYS)) return fail("dleq_proof_keys");
  if (obj.schema !== SCHEMAS.DLEQ_PROOF) return fail("dleq_proof_schema");
  if (!DLEQ_RELATION_KINDS.includes(obj.relation_kind)) return fail("dleq_relation_kind");
  if (!isHex(obj.R1) || !isHex(obj.R2) || !isHex(obj.s)) return fail("dleq_proof_field");
  return OK;
}

const TRANSCRIPT_KEYS = [
  "schema",
  "epoch",
  "run_id",
  "pair_id",
  "slot_index",
  "masks",
  "commitments",
  "openings",
  "z",
  "dleq",
  "phase_order",
  "match",
  "signatures",
];
export function validateTranscript(obj) {
  if (!exactKeys(obj, TRANSCRIPT_KEYS)) return fail("transcript_keys");
  if (obj.schema !== SCHEMAS.MATCH_TRANSCRIPT) return fail("transcript_schema");
  if (!isDigest(obj.epoch) || !isDigest(obj.pair_id)) return fail("transcript_field");
  if (typeof obj.match !== "boolean") return fail("transcript_match");
  for (const grp of [
    "masks",
    "commitments",
    "openings",
    "z",
    "dleq",
    "phase_order",
    "signatures",
  ]) {
    if (!isRolePair(obj[grp])) return fail(`transcript_${grp}_shape`);
  }
  for (const role of ROLES) {
    if (!isHex(obj.masks[role])) return fail("transcript_mask_point");
    if (!isDigest(obj.commitments[role])) return fail("pccc_token_commitment_missing");
    if (!isHex(obj.z[role])) return fail("transcript_z_point");
    const open = obj.openings[role];
    if (!exactKeys(open, ["token", "token_nonce"])) return fail("pccc_token_commitment_missing");
    if (!isDigest(open.token) || typeof open.token_nonce !== "string") {
      return fail("pccc_token_commitment_opening_invalid");
    }
    const proofs = obj.dleq[role];
    if (!Array.isArray(proofs) || proofs.length !== 2) return fail("transcript_dleq_shape");
    for (const proof of proofs) {
      const r = validateDleqProof(proof);
      if (!r.ok) return r;
    }
    const order = obj.phase_order[role];
    if (!Array.isArray(order) || order.length !== PHASE_ORDER.length) {
      return fail("pccc_phase_order_invalid");
    }
    if (!order.every((p, i) => p === PHASE_ORDER[i])) return fail("pccc_phase_order_invalid");
    if (typeof obj.signatures[role] !== "string") return fail("transcript_signature");
  }
  return OK;
}

export const MATCH_RECORD_KEYS = [
  "schema",
  "match",
  "epoch",
  "pair_id_hash",
  "pair_match_commitment",
  "transcript_digest",
  "vfr_receipt_digest",
  "respondent_notice_hash",
  "contest_pointer_hash",
  "matched_against_operator_commitment",
  "contest_route_available",
  "signatures",
];
export function validateMatchRecord(obj) {
  if (!exactKeys(obj, MATCH_RECORD_KEYS)) return fail("match_record_keys");
  if (obj.schema !== SCHEMAS.MATCH_RECORD) return fail("match_record_schema");
  if (typeof obj.match !== "boolean") return fail("match_record_match");
  if (typeof obj.contest_route_available !== "boolean") return fail("match_record_contest_flag");
  for (const f of [
    "epoch",
    "pair_id_hash",
    "pair_match_commitment",
    "transcript_digest",
    "vfr_receipt_digest",
    "respondent_notice_hash",
    "contest_pointer_hash",
    "matched_against_operator_commitment",
  ]) {
    if (!isDigest(obj[f])) return fail(`match_record_${f}`);
  }
  const sealed = assertNoSealedMaterial(obj);
  if (!sealed.ok) return sealed;
  return OK;
}

const CEREMONY_CAPTURE_KEYS = [
  "schema",
  "epoch",
  "slot_cardinality_commitment",
  "slot_ledger",
  "window_match_census",
  "refusals",
  "process_metadata",
  "vfr_crossing",
];
export function validateCeremonyCapture(obj) {
  if (!exactKeys(obj, CEREMONY_CAPTURE_KEYS)) return fail("ceremony_capture_keys");
  if (obj.schema !== SCHEMAS.CEREMONY_CAPTURE) return fail("ceremony_capture_schema");
  if (!Number.isInteger(obj.slot_cardinality_commitment)) {
    return fail("slot_cardinality_commitment_missing");
  }
  if (!Array.isArray(obj.slot_ledger)) return fail("ceremony_capture_slot_ledger");
  if (!Array.isArray(obj.refusals)) return fail("ceremony_capture_refusals");
  return OK;
}

const INVITATION_KEYS = [
  "schema",
  "epoch_policy",
  "schema_versions",
  "verifier_digest",
  "invitee_key_digest_slot",
  "signature",
];
export function validateInvitation(obj) {
  if (!exactKeys(obj, INVITATION_KEYS)) return fail("invitation_keys");
  if (obj.schema !== SCHEMAS.OPERATOR_INVITATION) return fail("invitation_schema");
  if (!isDigest(obj.verifier_digest)) return fail("invitation_verifier_digest");
  if (!Array.isArray(obj.schema_versions)) return fail("invitation_schema_versions");
  if (typeof obj.signature !== "string") return fail("invitation_signature");
  return OK;
}

export function validateAttestation(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return fail("attestation_shape");
  }
  if (obj.schema !== SCHEMAS.ATTESTATION) return fail("attestation_schema");
  for (const f of ["non_claims", "known_limitations", "rails"]) {
    if (!Array.isArray(obj[f])) return fail(`attestation_${f}`);
  }
  if (typeof obj.window_match_census !== "object" || obj.window_match_census === null) {
    return fail("attestation_census");
  }
  return OK;
}

// Defence-in-depth (§5.2): reject any sealed key anywhere in the object tree.
export function assertNoSealedMaterial(obj) {
  const seen = new Set();
  const walk = (node) => {
    if (node === null || typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);
    if (!Array.isArray(node)) {
      for (const key of Object.keys(node)) {
        if (SEALED_KEYS.includes(key)) return key;
      }
    }
    for (const value of Object.values(node)) {
      const hit = walk(value);
      if (hit) return hit;
    }
    return null;
  };
  const hit = walk(obj);
  return hit ? fail(`sealed_material_in_public_record:${hit}`) : OK;
}
