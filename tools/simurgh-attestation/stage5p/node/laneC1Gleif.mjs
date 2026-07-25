// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane C1 — the frozen GLEIF capture, re-verified offline.
//
// The FIRST real resolver profile in this stage. It reads a captured-then-frozen slice of public
// registry infrastructure and re-verifies it by digest against the sha256 manifest committed
// alongside it. There is deliberately NO network path in this file: a lane that could refetch would
// not be reproducing anything, it would be re-observing, and two runs could then disagree for
// reasons no reviewer could see.
//
// THE HONEST GAP, stated here as well as in the capture's provenance so nobody meets the claim
// without it: authentication is TLS-AT-CAPTURE plus digest-frozen bytes, NOT an offline GLEIF
// signature. This lane proves the continuity axis against real public infrastructure. It does NOT
// prove GLEIF signed these bytes, and a reviewer who trusts the capture is trusting the capturer.
// The signed upgrade path is vLEI/KERI, which is Lane C2 and unreachable today.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { PRINCIPAL_TYPE, deriveSubjectId } from "../core/canonicalPrincipal.mjs";
import { RESOLVER_EVIDENCE_TYPE } from "../core/resolverEvidence.mjs";
import {
  RESOLVER_PROFILE_TYPE,
  makeResolverProfile,
  makeResolverRegistry,
} from "../core/resolverProfile.mjs";
import {
  GLEIF_PROFILE_ID,
  GLEIF_NAMESPACE,
  GLEIF_CEILING,
  mapRegistryPair,
  gleifStrengthFor,
} from "../core/gleifContinuityMap.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURE_DIR = resolve(
  HERE,
  "../../../../docs/research/llm-shield/evidence/stage-5p/gleif-capture"
);

/** The three LEIs in the frozen capture, one per observed continuity state. */
export const GLEIF_CAPTURE_LEIS = Object.freeze([
  "213800ERUMY5KWCIHJ87", // ACTIVE / ISSUED  — principal exists, binding current
  "213800Q7NV3T5PZOU403", // ACTIVE / LAPSED  — principal exists, binding decayed
  "6488T70V0O9W2T3P0H24", // INACTIVE/RETIRED — principal ceased, record still published
]);

const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");

/** Parse the committed manifest into { filename -> digest }. */
function readManifest() {
  const text = readFileSync(resolve(CAPTURE_DIR, "sha256-manifest.txt"), "utf8");
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)$/);
    if (m) out.set(m[2], m[1]);
  }
  if (out.size === 0) throw new Error("gleif capture: manifest is empty or unparseable");
  return out;
}

/**
 * Load and DIGEST-VERIFY the frozen capture.
 *
 * @param opts.tamperFirstRecordForTest flips one byte before hashing, so the digest pin can be
 *        proved capable of rejecting. A pin never shown to reject is not a pin.
 */
export function loadGleifCapture(opts = {}) {
  const manifest = readManifest();
  const records = GLEIF_CAPTURE_LEIS.map((lei, i) => {
    const file = `${lei}.json`;
    const expected = manifest.get(file);
    if (!expected) throw new Error(`gleif capture: ${file} is absent from the manifest`);
    let bytes = readFileSync(resolve(CAPTURE_DIR, file));
    if (opts.tamperFirstRecordForTest && i === 0) {
      bytes = Buffer.concat([bytes, Buffer.from(" ", "utf8")]);
    }
    const actual = sha256Hex(bytes);
    if (actual !== expected) {
      throw new Error(
        `gleif capture: digest mismatch for ${file} — manifest ${expected}, computed ${actual}`
      );
    }
    const attrs = JSON.parse(bytes.toString("utf8")).data.attributes;
    const entity_status = attrs.entity.status;
    const registration_status = attrs.registration.status;
    return Object.freeze({
      lei,
      legal_name: attrs.entity.legalName.name,
      entity_status,
      registration_status,
      // Throws on any pair the capture did not observe, rather than interpolating one.
      ...mapRegistryPair(entity_status, registration_status),
      sha256: actual,
      digest_verified: true,
    });
  });
  return Object.freeze({
    capture_id: "simurgh.vsi.gleif_capture.v1",
    authentication: "tls_at_capture_then_digest_frozen",
    // Repeated in the returned object so a consumer cannot obtain the facts without the bound.
    not_claimed: Object.freeze([
      "not_an_offline_gleif_signature",
      "not_proof_of_present_accountability",
      "not_proof_of_authority_to_act_for_the_entity",
    ]),
    records: Object.freeze(records),
  });
}

export const GLEIF_PROFILE = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: GLEIF_PROFILE_ID,
  // Trust-on-capture: the "root" this lane pins is the manifest of the frozen bytes, not a GLEIF
  // key. Naming it honestly is the difference between a pinned root and a borrowed one.
  trust_root_fpr: sha256Hex(readFileSync(resolve(CAPTURE_DIR, "sha256-manifest.txt"))),
  permitted_claim_types: ["principal"],
  ceiling: GLEIF_CEILING,
  namespace_map: { lei: GLEIF_NAMESPACE },
});

export const GLEIF_PINNED = Object.freeze({
  registry: makeResolverRegistry([GLEIF_PROFILE]),
  trusted_profile_ids: Object.freeze([GLEIF_PROFILE_ID]),
  revoked_profile_ids: Object.freeze([]),
});

const recordFor = (lei) => {
  const r = loadGleifCapture().records.find((x) => x.lei === lei);
  if (!r) throw new Error(`gleif capture: no frozen record for LEI "${lei}"`);
  return r;
};

/**
 * Build a Section 2 bundle from a captured record.
 *
 * The subject is derived from the LEI's ASCII bytes — the LEI IS the legal entity, so there is no
 * guessed equivalence between a natural person and an organisation anywhere in this lane.
 */
export function gleifEvidenceFor(lei, required) {
  const rec = recordFor(lei);
  const subject = Object.freeze({
    type: PRINCIPAL_TYPE,
    kind: "organisation",
    namespace_id: GLEIF_NAMESPACE,
    subject_id: deriveSubjectId(GLEIF_NAMESPACE, Buffer.from(rec.lei, "utf8")),
  });
  const evidence = {
    type: RESOLVER_EVIDENCE_TYPE,
    profile_id: GLEIF_PROFILE_ID,
    claim: { principal: { ...subject } },
    asserted_strength_delta: gleifStrengthFor(rec.entity_status, rec.registration_status),
    // Identity of the underlying registry bytes: the record's own verified digest.
    evidence_digest: rec.sha256,
    submission_digest_binding: sha256Hex(Buffer.from(`submission:${rec.lei}`, "utf8")),
    // B11: shape only. No adapter has verified a GLEIF signature, because there is none to verify —
    // which is exactly the honest gap this lane declares rather than papers over.
    signature: "ab12",
  };
  // Absent unless the registry positively says the entity ceased. Silence is the honest default.
  if (rec.principal_lifecycle === "ceased") evidence.principal_lifecycle = "ceased";
  return { subject: { ...subject }, required: { ...required }, evidences: [evidence] };
}
