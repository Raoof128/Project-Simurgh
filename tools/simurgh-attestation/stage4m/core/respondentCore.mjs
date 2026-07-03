// SPDX-License-Identifier: AGPL-3.0-or-later
// Respondent path (spec §4.4): the accused runs the SAME verification and files a signed
// contest. Contest is recorded, never adjudicated. Signature verification is an injected
// async callback so this file runs unchanged in the browser.
import { canonicalJson, DIGEST_RE, recordDigest } from "./canonical.mjs";
import {
  CONTEST_TYPES,
  VXD_ACK_SCHEMA,
  VXD_CONTEST_DOMAIN,
  VXD_CONTEST_SCHEMA,
} from "../constants.mjs";

const fail = (reason) => ({ ok: false, rawCode: 46, reason });

export function contestSigningPayload(record) {
  const { signature, ...payload } = record;
  return `${VXD_CONTEST_DOMAIN}${canonicalJson(payload)}`;
}

export function implicationReport({ records, respondentClusters }) {
  const referenced = [];
  const matched = new Set();
  for (const record of records) {
    const haystack = canonicalJson(record);
    for (const cluster of respondentClusters) {
      if (haystack.includes(cluster)) {
        referenced.push({
          record_digest: recordDigest(record),
          schema: record.schema,
          window: typeof record.window === "string" ? record.window : null,
          matched_cluster: cluster,
        });
        matched.add(cluster);
      }
    }
  }
  return {
    referenced,
    not_referenced_in_bundle: respondentClusters.filter((c) => !matched.has(c)).sort(),
  };
}

const CONTEST_FIELDS = [
  "contest_type",
  "contested_records",
  "respondent_public_key",
  "schema",
  "signature",
  "statement_digest",
];
const ACK_FIELDS = [
  "contest_digest",
  "respondent_public_key",
  "schema",
  "signature",
  "statement_digest",
];
const KEY_RE = /^ed25519:[A-Za-z0-9+/=]+$/;

async function checkSignature(record, keyB64, verifySig) {
  if (typeof record.signature !== "string" || !record.signature.startsWith("ed25519:"))
    return false;
  return verifySig({
    publicKeySpkiB64: keyB64,
    message: contestSigningPayload(record),
    signatureB64: record.signature.slice("ed25519:".length),
  });
}

export async function validateContest({ contest, recordsByDigest, verifySig }) {
  if (!contest || typeof contest !== "object" || Array.isArray(contest))
    return fail("schema_invalid");
  const keys = Object.keys(contest).sort();
  if (keys.length !== CONTEST_FIELDS.length || !keys.every((k, i) => k === CONTEST_FIELDS[i])) {
    return fail("schema_invalid");
  }
  if (contest.schema !== VXD_CONTEST_SCHEMA) return fail("schema_invalid");
  if (!DIGEST_RE.test(contest.statement_digest)) return fail("schema_invalid");
  if (!KEY_RE.test(contest.respondent_public_key)) return fail("schema_invalid");
  if (!CONTEST_TYPES.includes(contest.contest_type)) return fail("unknown_contest_type");
  if (!Array.isArray(contest.contested_records) || contest.contested_records.length === 0) {
    return fail("schema_invalid");
  }
  for (const cr of contest.contested_records) {
    if (!cr || typeof cr.window !== "string" || !DIGEST_RE.test(cr.record_digest)) {
      return fail("schema_invalid");
    }
    if (!recordsByDigest.has(cr.record_digest)) return fail("dangling_record_reference");
  }
  const keyB64 = contest.respondent_public_key.slice("ed25519:".length);
  const ok = await checkSignature(contest, keyB64, verifySig);
  return ok ? { ok: true } : fail("signature_invalid");
}

export async function validateAcknowledgement({
  ack,
  contestDigests,
  verifySig,
  providerPublicKeySpkiB64,
}) {
  if (!ack || typeof ack !== "object" || Array.isArray(ack)) return fail("schema_invalid");
  const keys = Object.keys(ack).sort();
  if (keys.length !== ACK_FIELDS.length || !keys.every((k, i) => k === ACK_FIELDS[i])) {
    return fail("schema_invalid");
  }
  if (ack.schema !== VXD_ACK_SCHEMA) return fail("schema_invalid");
  if (!DIGEST_RE.test(ack.statement_digest)) return fail("schema_invalid");
  if (!DIGEST_RE.test(ack.contest_digest)) return fail("schema_invalid");
  if (!contestDigests.has(ack.contest_digest)) return fail("dangling_contest_digest");
  const ok = await checkSignature(ack, providerPublicKeySpkiB64, verifySig);
  return ok ? { ok: true } : fail("signature_invalid");
}
