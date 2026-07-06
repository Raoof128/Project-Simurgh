// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attack fixture model (4U spec §3, §5). Motto: AnthropicSafe First,
// then ReviewerSafe. A fixture declares its target, payload, expected verifier
// verdict, and the fixture-only keys/endpoints it is allowed to touch.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, ATTACK_FAMILIES, CAMPAIGN_SEED, SCHEMAS } from "../constants.mjs";

export const ATTACK_FIXTURE_FIELDS = Object.freeze([
  "schema",
  "attack_id",
  "family",
  "charter_digest",
  "target",
  "payload",
  "expected_raw",
  "key_refs",
  "endpoint",
]);
const TARGETS = new Set(["vdcc_verifier", "kernel"]);
const PAYLOAD_KINDS = new Set(["chain_bundle", "kernel_action", "parity_case"]);
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

export function validateFixture(fixture) {
  const bad = (detail) => ({ raw: 119, reason: "attack_fixture_schema_invalid", detail });
  if (!fixture || typeof fixture !== "object") return bad({ shape: true });
  for (const k of ATTACK_FIXTURE_FIELDS) if (!(k in fixture)) return bad({ missing: k });
  if (fixture.schema !== SCHEMAS.ATTACK_FIXTURE) return bad({ schema: fixture.schema });
  if (!ATTACK_FAMILIES.includes(fixture.family)) return bad({ family: fixture.family });
  if (!Number.isInteger(fixture.expected_raw)) return bad({ expected_raw: true });
  if (!TARGETS.has(fixture.target)) return bad({ target: fixture.target });
  if (!fixture.payload || !PAYLOAD_KINDS.has(fixture.payload.kind))
    return bad({ payload_kind: fixture.payload && fixture.payload.kind });
  if (!DIGEST_RE.test(fixture.charter_digest)) return bad({ charter_digest: true });
  if (!Array.isArray(fixture.key_refs)) return bad({ key_refs: true });
  if (typeof fixture.endpoint !== "string") return bad({ endpoint: true });
  if (!fixture.attack_id.startsWith(`${CAMPAIGN_SEED}:${fixture.family}#`)) return bad({ attack_id: fixture.attack_id });
  return { raw: 0, reason: "green" };
}

export function fixtureDigest(fixture) {
  return recordDigest({ domain: DOMAINS.FIXTURE, fixture });
}

// Third arg is the precomputed charterDigest(charter) — cheap for callers that
// verify many fixtures against one charter.
export function bindsCharter(fixture, _charter, expectedDigest) {
  return fixture.charter_digest === expectedDigest;
}

// Non-malice: only fixture-only keys and in-repo/localhost endpoints allowed.
const FIXTURE_KEY_RE = /^INSECURE_FIXTURE_ONLY_[A-Za-z-]+$/;
const ALLOWED_ENDPOINTS = new Set(["in_repo", "localhost"]);
export function nonMaliceViolation(fixture) {
  for (const k of fixture.key_refs || []) if (!FIXTURE_KEY_RE.test(k)) return `non_fixture_key:${k}`;
  if (!ALLOWED_ENDPOINTS.has(fixture.endpoint)) return `third_party_endpoint:${fixture.endpoint}`;
  return null;
}
