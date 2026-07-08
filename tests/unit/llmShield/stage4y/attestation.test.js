// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — two-tier verify + 182/188 substitution split (plan Task 10).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verify } from "../../../../tools/simurgh-attestation/stage4y/node/verify-stage4y-attestation.mjs";
import { evaluateVdr } from "../../../../tools/simurgh-attestation/stage4y/core/vdrCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const PUB = readFileSync(
  join(ROOT, "tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_vdr.pub.pem"),
  "utf8"
);
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));

test("verify --tier public passes over committed evidence (no audit bytes needed)", () => {
  assert.equal(verify({ tier: "public" }).ok, true);
});

test("verify --tier audit passes over committed evidence", () => {
  assert.equal(verify({ tier: "audit" }).ok, true);
});

test("public verify works with map + attestation ALONE (withheld_document, bytes absent)", () => {
  const map = rd("withheld_document.map.json");
  const attestation = rd("withheld_document.attestation.json");
  assert.equal(evaluateVdr({ map, attestation }, { tier: "public", publicKeyPem: PUB }).raw, 0);
});

test("substitution split: unsigned/re-bytes map → 182; re-signed-but-wrong recompute → 188", () => {
  const map = rd("incident_report_shaped.map.json");
  const audit = rd("incident_report_shaped.audit.json");
  const attestation = rd("incident_report_shaped.attestation.json");
  const bytes = new Uint8Array(readFileSync(join(EVID, "incident_report_shaped.document.txt")));

  // (a) substitute the map WITHOUT re-signing → signature no longer binds → 182.
  const substituted = structuredClone(map);
  substituted.provenance = "submitted"; // any content change breaks the digest binding
  assert.equal(
    evaluateVdr({ map: substituted, audit, attestation }, { tier: "public", publicKeyPem: PUB })
      .raw,
    182,
    "unsigned substitution → 182"
  );

  // (b) re-bytes the document but keep the committed (correctly signed) map → audit recompute 188.
  // Flip a byte on line 1 ("Serious incident report." — NO caught span), so 183 (still valid
  // ASCII) and 187 (line 1 is not a shadow region) both pass and the commitment-reopen at 188 owns it.
  const tampered = new Uint8Array(readFileSync(join(EVID, "incident_report_shaped.document.txt")));
  tampered[3] ^= 0x01; // 'i' of "Serious" → still valid ASCII
  assert.equal(
    evaluateVdr(
      { map, audit, attestation },
      { tier: "audit", publicKeyPem: PUB, documentBytes: tampered }
    ).raw,
    188,
    "re-signed-map / wrong-bytes → 188"
  );
  void bytes;
});
