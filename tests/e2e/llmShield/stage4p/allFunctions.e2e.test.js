// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P VOCA all-functions E2E net (4P spec §13/§14, K7 pattern). Composes every
// stage4p export end-to-end: export-surface inventory, full bundle composition with a
// throwaway key, the whole top-level tamper matrix through the offline verifier, the
// cross-stage invariants binding 4P to 4O/4N/4L, a scoped privacy scan over committed
// evidence + fixture "signal" objects, and byte idempotency of the fixture/Lane-B
// builders. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";

import {
  DIGEST_RE,
  recordDigest,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { validateHeartbeat } from "../../../../tools/simurgh-attestation/stage4n/core/recordCore.mjs";
import { commitmentDigest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";

import * as constantsMod from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";
import * as chainCoreMod from "../../../../tools/simurgh-attestation/stage4p/core/chainCore.mjs";
import * as cpcCoreMod from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";
import * as custodyCoreMod from "../../../../tools/simurgh-attestation/stage4p/core/custodyCore.mjs";
import * as digestMod from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import * as inventionCoreMod from "../../../../tools/simurgh-attestation/stage4p/core/inventionCore.mjs";
import * as schemaCoreMod from "../../../../tools/simurgh-attestation/stage4p/core/schemaCore.mjs";
import * as buildAttestationMod from "../../../../tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs";
import * as verifyMod from "../../../../tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs";

const { buildBundle } = buildAttestationMod;
const { verifyBundle } = verifyMod;
const { surfaceBindingDigest } = digestMod;

const FIX = "tests/fixtures/llmShield/stage4p";
const EVID = "docs/research/llm-shield/evidence/stage-4p";
const STAGE4O_FIX = "tests/fixtures/llmShield/stage4o";
const STAGE4L_BUILD = "tools/simurgh-attestation/stage4l/build-stage4l-attestation.mjs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
function throwawayKeyPem() {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ type: "pkcs8", format: "pem" });
}

// ============================================================================================
// Section 1: Export inventory. Every stage4p core/* module + the two node/* modules that
// expose a real API surface (buildBundle/buildBody0, verifyBundle) are imported and their
// export-name set is checked against a frozen list — a dead or silently renamed export fails
// the net. `build-stage4p-fixtures.mjs` and `laneb-relay-capture.mjs` are executable-only
// scripts (zero named exports, side-effecting on import — they overwrite the committed
// fixture tree); they are exercised via subprocess in Section 6 (byte idempotency) instead of
// `import()`, so a builder bug fails a targeted assertion rather than aborting the whole
// `node --test` process via the script's own `process.exit`.
// ============================================================================================
const EXPORT_INVENTORY = {
  "constants.mjs": constantsMod,
  "core/chainCore.mjs": chainCoreMod,
  "core/cpcCore.mjs": cpcCoreMod,
  "core/custodyCore.mjs": custodyCoreMod,
  "core/digest.mjs": digestMod,
  "core/inventionCore.mjs": inventionCoreMod,
  "core/schemaCore.mjs": schemaCoreMod,
  "node/build-stage4p-attestation.mjs": buildAttestationMod,
  "node/verify-stage4p.mjs": verifyMod,
};
const FROZEN_EXPORTS = {
  "constants.mjs": [
    "DOMAINS",
    "ENTROPY_BITS_BY_KIND",
    "ENTROPY_FLOOR_BITS",
    "ENUMS",
    "GENESIS",
    "SAFETY_RAIL",
    "SCHEMAS",
    "VOCA_NON_CLAIMS",
  ],
  "core/chainCore.mjs": ["verifyHopChain"],
  "core/cpcCore.mjs": ["buildCpcSignal", "verifyCpcEmission"],
  "core/custodyCore.mjs": ["verifyCustody"],
  "core/digest.mjs": [
    "custodyClassDigest",
    "custodyPathDigest",
    "domainDigest",
    "hopReceiptDigest",
    "hopReplayDigest",
    "surfaceBindingDigest",
    "windowedEvidenceCommitment",
  ],
  "core/inventionCore.mjs": [
    "pincerCorroborated",
    "projectVendorDisclosure",
    "validateEnforcementCommitment",
    "validateExtractionBridge",
    "validateRelayContest",
    "verifyVendorDisclosure",
  ],
  "core/schemaCore.mjs": [
    "validateCpcSignal",
    "validateCustodyReceipt",
    "validateEnvelope",
    "validateHopReceipt",
  ],
  "node/build-stage4p-attestation.mjs": ["buildBody0", "buildBundle"],
  "node/verify-stage4p.mjs": ["verifyBundle"],
};

test("export inventory: every stage4p core/node module exposes exactly its frozen export set", () => {
  assert.deepEqual(Object.keys(EXPORT_INVENTORY).sort(), Object.keys(FROZEN_EXPORTS).sort());
  for (const [file, mod] of Object.entries(EXPORT_INVENTORY)) {
    assert.deepEqual(Object.keys(mod).sort(), [...FROZEN_EXPORTS[file]].sort(), file);
    for (const name of FROZEN_EXPORTS[file]) {
      assert.notEqual(mod[name], undefined, `${file}: export "${name}" is undefined`);
    }
  }
});

// ============================================================================================
// Section 2: Full composition. Rebuild the bundle in-process with a throwaway key, verify it
// offline, assert raw 0.
// ============================================================================================
test("full composition: a freshly built bundle (throwaway key) verifies clean end-to-end", () => {
  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  const out = verifyBundle(bundle);
  assert.equal(out.ok, true, out.reason);
  assert.equal(out.raw, 0);
});

// ============================================================================================
// Section 3: Tamper matrix. Every top-level bundle field is load-bearing: string fields get a
// one-character flip, arrays lose their last element, objects gain an injected key, and the
// one boolean field is flipped. Each arm starts from a fresh clone of the clean base bundle
// (no cross-arm state).
// ============================================================================================
function flipChar(s) {
  if (typeof s !== "string" || s.length === 0) throw new Error("flipChar: not a non-empty string");
  const code = s.charCodeAt(0);
  const rotated = ((code - 32 + 1) % 95) + 32; // rotate within printable ASCII, always differs
  return String.fromCharCode(rotated) + s.slice(1);
}
const dropLast = (arr) => arr.slice(0, -1);
const injectKey = (obj) => ({ ...obj, __tamper_injected_key__: "e2e-net" });

const FIELD_MUTATIONS = {
  schema: flipChar,
  non_claims: dropLast,
  safety_rail: flipChar,
  arms: dropLast,
  cpc_signals: dropLast,
  corroborating_commitments: dropLast,
  enforcement_commitment: injectKey,
  pincer_corroborated: (v) => !v,
  relay_contests: dropLast,
  custody_extraction_bridge: injectKey,
  metrics: injectKey,
  stage4n_window_anchor_digest: flipChar,
  stage4o_surface_commitment_digest: flipChar,
  disclosure_subject: injectKey,
  vendor_custody_disclosure: injectKey,
  signer_public_key_pem: flipChar,
  bundle_digest: flipChar,
  signature: flipChar,
};

test("tamper matrix: every top-level bundle field fails verification when mutated", () => {
  const base = buildBundle({ keyPem: throwawayKeyPem() });
  assert.equal(verifyBundle(base).raw, 0, "sanity: base bundle must verify clean first");

  // Field-coverage guard: the mutation table must cover EVERY top-level bundle key, and only
  // those keys (catches a field added to the builder without a matching tamper arm).
  assert.deepEqual(Object.keys(base).sort(), Object.keys(FIELD_MUTATIONS).sort());

  for (const [field, mutate] of Object.entries(FIELD_MUTATIONS)) {
    const mutated = structuredClone(base);
    mutated[field] = mutate(structuredClone(base[field]));
    assert.notDeepEqual(mutated[field], base[field], `${field}: mutation was a no-op`);
    const out = verifyBundle(mutated);
    assert.equal(out.ok, false, `field "${field}" should fail verification when tampered`);
    assert.notEqual(out.raw, 0, `field "${field}": raw must be nonzero on tamper`);
  }
});

// ============================================================================================
// Section 4: Cross-stage invariants.
// ============================================================================================

// (a) The clean Lane B arm's surface digest, and the committed stage4o-surface.json
// commitment digest, both equal a FRESH surfaceBindingDigest recomputed from the referenced
// Stage 4O fixture manifest via commitmentDigest (Stage 4O's own core function) — never from
// a value trusted off either committed file.
test("cross-stage (a): Lane B surface digest recomputes from the 4O fixture manifest via surfaceBindingDigest", () => {
  const cleanChain = readJson(`${STAGE4O_FIX}/chains/clean-chain.json`).chain;
  const chosenEnvelope = cleanChain[0];
  const recomputedSurface = surfaceBindingDigest({
    stage4o_manifest_digest: commitmentDigest(chosenEnvelope),
    stage4o_toolset_digest: chosenEnvelope.manifest.toolset_digest,
    stage4o_manifest_epoch: chosenEnvelope.manifest_epoch,
  });

  const committedSurface = readJson(`${FIX}/stage4o-surface.json`);
  assert.equal(recomputedSurface, committedSurface.commitment_digest);

  const cleanLaneB = readJson(`${FIX}/lane-b/clean-declared-relay/input.json`);
  assert.equal(cleanLaneB.custodyReceipt.tool_surface_digest, recomputedSurface);
  assert.equal(cleanLaneB.observed.tool_surface_digest, recomputedSurface);
  assert.equal(cleanLaneB.stage4o_surface_commitment_digest, recomputedSurface);
});

// (b) stage4n-anchor.json's committed record digests recompute from the referenced Stage 4N
// feed file via validateHeartbeat (Stage 4N's own schema gate) + recordDigest — never trusted
// off the committed anchor file itself.
test("cross-stage (b): stage4n-anchor.json digests recompute from the referenced Stage 4N feed", () => {
  const anchor = readJson(`${FIX}/stage4n-anchor.json`);
  const feedRecords = readFileSync(anchor.source_path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const currentRecord = feedRecords[0];
  const nextRecord = feedRecords[1];

  assert.deepEqual(validateHeartbeat(currentRecord), { ok: true });
  assert.deepEqual(validateHeartbeat(nextRecord), { ok: true });
  assert.equal(currentRecord.window_id, anchor.current_window_id);
  assert.equal(nextRecord.window_id, anchor.next_window_id);
  assert.equal(recordDigest(currentRecord), anchor.record_digest);
  assert.equal(recordDigest(nextRecord), anchor.next_record_digest);
});

// (c) corroborating_commitments is shape-compatible with 4L's hardcoded reserved `[]` slot —
// both are arrays of DIGEST_RE-shaped strings (4P's is populated, 4L's stays empty by design,
// spec §1.4 guard 2). This test asserts shape ONLY and never touches the 4L artifact.
test("cross-stage (c): corroborating_commitments is the same DIGEST_RE[] slot-type as 4L's reserved []", () => {
  const ccbSource = readFileSync(STAGE4L_BUILD, "utf8");
  assert.match(
    ccbSource,
    /corroborating_commitments:\s*\[\]/,
    "4L's reserved corroborating_commitments slot must stay hardcoded []"
  );

  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  assert.ok(Array.isArray(bundle.corroborating_commitments));
  assert.ok(bundle.corroborating_commitments.length > 0, "4P's slot must be populated");
  for (const c of bundle.corroborating_commitments) {
    assert.equal(typeof c, "string");
    assert.match(c, DIGEST_RE);
  }

  // The committed 4L evidence artifacts are read, never written — shape-compatibility check
  // only, no mutation.
  for (const file of [
    "docs/research/llm-shield/evidence/stage-4l/structuring-ccb-attestation.json",
    "docs/research/llm-shield/evidence/stage-4l/singleton-evasion-ccb-attestation.json",
  ]) {
    const att = readJson(file);
    assert.ok(Array.isArray(att.corroborating_commitments));
    assert.deepEqual(att.corroborating_commitments, []);
  }
});

// ============================================================================================
// Section 5: Privacy scan. Pure Node `fs` walk — never shells out to `rg` (Linux CI lacks it).
// MF1 (raw evidence never published) is scoped to (i) every committed byte under the stage4p
// evidence dir, and (ii) any object keyed `signal` anywhere in the stage4p fixture tree —
// NOT the whole fixture tree by raw text, since `observed_evidence_digest` legitimately
// appears inside synthetic test-fixture `input` blocks under tests/fixtures/.../cpc/.
// ============================================================================================
function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

const PRIVATE_KEY_RE = /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/;
const PUBLIC_KEY_RE = /-----BEGIN PUBLIC KEY-----/;
const URL_RE = /https?:\/\//;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TEST_KEYS_DIR = join(FIX, "test-keys");

test("privacy scan: committed stage4p evidence carries no raw evidence, keys, urls, or emails", () => {
  const files = walkFiles(EVID);
  assert.ok(files.length > 0, "evidence dir must not be empty");
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!text.includes("observed_evidence_digest"), `${file}: raw evidence digest leaked`);
    assert.ok(!PRIVATE_KEY_RE.test(text), `${file}: private key material leaked`);
    assert.ok(!URL_RE.test(text), `${file}: URL leaked`);
    assert.ok(!EMAIL_RE.test(text), `${file}: email leaked`);
  }
});

test("privacy scan: no published `signal` object anywhere in the stage4p fixture tree carries observed_evidence_digest", () => {
  function scan(node, file) {
    if (Array.isArray(node)) {
      node.forEach((v) => scan(v, file));
      return;
    }
    if (node && typeof node === "object") {
      if ("signal" in node && node.signal && typeof node.signal === "object") {
        assert.ok(
          !("observed_evidence_digest" in node.signal),
          `${file}: published signal object carries observed_evidence_digest`
        );
      }
      for (const v of Object.values(node)) scan(v, file);
    }
  }
  const jsonFiles = [...walkFiles(FIX), ...walkFiles(EVID)].filter(
    (f) => f.endsWith(".json") && !f.startsWith(`${TEST_KEYS_DIR}/`)
  );
  assert.ok(jsonFiles.length > 0);
  for (const file of jsonFiles) scan(readJson(file), file);
});

test("privacy scan: private keys only under test-keys/, public keys only in allowlisted slots", () => {
  for (const file of walkFiles(FIX)) {
    const text = readFileSync(file, "utf8");
    if (PRIVATE_KEY_RE.test(text)) {
      assert.ok(file.startsWith(`${TEST_KEYS_DIR}/`), `${file}: private key outside test-keys/`);
    }
  }

  function scanPublicKeyPlacement(node, file, keyName) {
    if (Array.isArray(node)) {
      node.forEach((v) => scanPublicKeyPlacement(v, file, keyName));
      return;
    }
    if (typeof node === "string") {
      if (PUBLIC_KEY_RE.test(node)) {
        const allowed = file.startsWith(`${TEST_KEYS_DIR}/`) || /public_key/i.test(keyName ?? "");
        assert.ok(allowed, `${file}: public key material in unexpected field "${keyName}"`);
      }
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) scanPublicKeyPlacement(v, file, k);
    }
  }
  const jsonFiles = [...walkFiles(FIX), ...walkFiles(EVID)].filter((f) => f.endsWith(".json"));
  for (const file of jsonFiles) scanPublicKeyPlacement(readJson(file), file, null);
});

// ============================================================================================
// Section 6: Byte idempotency. Rerun the fixture builder + Lane B capture twice via
// execFileSync (subprocess — a builder bug fails this assertion instead of aborting the whole
// `node --test` process). The committed attestation is NOT rebuilt here (its private key
// lives outside the repo) — Section 2/3 already re-verify it in-process; this section only
// re-verifies the offline committed bundle once more for good measure.
// ============================================================================================
test("byte idempotency: fixture builder + Lane B capture rerun leaves the committed tree unchanged", () => {
  const FIXTURE_BUILDER = "tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs";
  const LANEB_CAPTURE = "tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs";
  for (let i = 0; i < 2; i++) {
    execFileSync(process.execPath, [FIXTURE_BUILDER], { stdio: "pipe" });
    execFileSync(process.execPath, [LANEB_CAPTURE], { stdio: "pipe" });
    // git diff --exit-code throws (nonzero exit) if the rerun produced different bytes.
    execFileSync("git", ["diff", "--exit-code", "--", FIX], { stdio: "pipe" });
  }
});

test("byte idempotency: the committed offline attestation still verifies clean", () => {
  const attestation = readJson(`${EVID}/voca-attestation.json`);
  const out = verifyBundle(attestation);
  assert.equal(out.ok, true, out.reason);
  assert.equal(out.raw, 0);
});
