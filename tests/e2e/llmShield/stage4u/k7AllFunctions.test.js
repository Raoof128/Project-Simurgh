// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U K7 all-functions E2E net (4U spec §15). Motto: AnthropicSafe First, then
// ReviewerSafe. Composes the full VRTA pipeline, proves every raw code 119..132 is
// independently reachable via the frozen check order, and asserts the kernel + 4S
// verifier were imported READ-ONLY (no new authorise_* entry, byte-frozen kernel).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildCorpus } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs";
import {
  evaluateVrta,
  evaluateVrtaSafe,
} from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";
import {
  signCharter,
  charterDigest,
  attackManifestRoot,
} from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import {
  buildFinding,
  signFinding,
  recomputeAsr,
} from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";
import {
  computeAttestation,
  signAttestation,
} from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4u/node/verify-stage4u-attestation.mjs";
import { VRTA_CHECK_ORDER } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";

const KEYDIR = "tests/fixtures/llmShield/stage4u/test-keys/";
const charterPriv = crypto.createPrivateKey(
  readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta-charter.pem")
);
const vrtaPriv = crypto.createPrivateKey(readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta.pem"));
const charterPub = crypto
  .createPublicKey(charterPriv)
  .export({ type: "spki", format: "pem" })
  .toString();
const findingPub = crypto
  .createPublicKey(vrtaPriv)
  .export({ type: "spki", format: "pem" })
  .toString();
const OPTS = { pubKeyPem: charterPub, findingPubKeyPem: findingPub };

const base = buildCorpus({ write: false }).bundle;
const clone = () => structuredClone(base);
const reFinding = (attack_id, o) =>
  signFinding(buildFinding({ attack_id, family: "ghost_hop", severity: null, ...o }), vrtaPriv);

// Each entry returns { bundle, opts } that trips exactly `code`.
const TRIP = {
  119: () => {
    const b = clone();
    delete b.lane_b_capture;
    return { bundle: b, opts: OPTS };
  },
  120: () => {
    const b = clone();
    b.finding_records[0].signature = b.finding_records[0].signature.replace(/^../, "00");
    return { bundle: b, opts: OPTS };
  },
  121: () => {
    const b = clone();
    b.attack_fixtures[0].charter_digest = "sha256:" + "f".repeat(64);
    return { bundle: b, opts: OPTS };
  },
  122: () => {
    const b = clone();
    b.attack_fixtures[0].key_refs = ["prod_signing_key"];
    return { bundle: b, opts: OPTS };
  },
  123: () => ({ bundle: clone(), opts: { ...OPTS, capBreaches: ["max_tokens"] } }),
  124: () => {
    const b = clone();
    const bad = signCharter(
      { ...b.charter, attack_manifest_root: "sha256:" + "a".repeat(64), signature: undefined },
      charterPriv
    );
    b.charter = bad;
    const cd = charterDigest(bad);
    for (const f of b.attack_fixtures) f.charter_digest = cd; // rebind so 121 passes
    return { bundle: b, opts: OPTS };
  },
  125: () => {
    const b = clone();
    b.finding_records.pop(); // a planned id now lacks a finding
    return { bundle: b, opts: OPTS };
  },
  126: () => {
    const b = clone();
    b.finding_records.push(structuredClone(b.finding_records[0])); // duplicate id
    return { bundle: b, opts: OPTS };
  },
  127: () => {
    const b = clone();
    const id = b.finding_records[0].attack_id;
    b.finding_records[0] = reFinding(id, {
      self_reported_raw: 0,
      verifier_recomputed_raw: 111,
      expected_raw: 111,
      outcome_class: "survived",
    });
    return { bundle: b, opts: OPTS };
  },
  128: () => {
    const b = clone();
    const id = b.finding_records[0].attack_id;
    b.finding_records[0] = reFinding(id, {
      self_reported_raw: 0,
      verifier_recomputed_raw: 0,
      expected_raw: 108,
      outcome_class: "survived", // should be "bypass"
    });
    return { bundle: b, opts: OPTS };
  },
  129: () => ({ bundle: clone(), opts: { ...OPTS, engine: () => 99999 } }),
  130: () => {
    const b = clone();
    b.asr = { confirmed_bypass: 1, executed_non_refusal: 58, ratio: "1/58" };
    return { bundle: b, opts: OPTS };
  },
  131: () => {
    const b = clone();
    const id = b.finding_records[0].attack_id;
    b.finding_records[0] = reFinding(id, {
      self_reported_raw: 0,
      verifier_recomputed_raw: 0,
      expected_raw: 111,
      outcome_class: "bypass", // a real bypass, but no severity
    });
    b.asr = recomputeAsr(b.finding_records).attack_success_rate; // so 130 passes, 131 fires
    return { bundle: b, opts: OPTS };
  },
  132: () => ({
    bundle: clone(),
    opts: {
      ...OPTS,
      engine: () => {
        throw new Error("boom");
      },
    },
  }),
};

test("full pipeline: corpus → attestation → verify public+audit is GREEN", () => {
  const att = signAttestation(computeAttestation(undefined, keyDigest(findingPub)), vrtaPriv);
  const K = {
    attestationPubKeyPem: findingPub,
    charterPubKeyPem: charterPub,
    findingPubKeyPem: findingPub,
  };
  assert.equal(verifyAttestation(att, { tier: "public", ...K }).raw, 0);
  assert.equal(verifyAttestation(att, { tier: "audit", ...K }).raw, 0);
});

test("green corpus bundle is GREEN through evaluateVrta (audit tier)", () => {
  const { bundle, engine } = buildCorpus({ write: false });
  assert.deepEqual(evaluateVrta(bundle, { ...OPTS, engine }), { raw: 0, reason: "green" });
});

test("tamper matrix: every VRTA code 119..132 is independently reachable in frozen order", () => {
  for (const code of VRTA_CHECK_ORDER) {
    const { bundle, opts } = TRIP[code]();
    assert.equal(evaluateVrtaSafe(bundle, opts).raw, code, `code ${code}`);
  }
});

test("read-only kernel: no adapter/src-llmShield diff and capability_kernel.py is byte-frozen", () => {
  const base = execFileSync("git", ["merge-base", "HEAD", "main"], { encoding: "utf8" }).trim();
  const diff = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  }).split("\n");
  assert.ok(
    !diff.some((p) => p.startsWith("tools/agentdojo-simurgh-adapter/")),
    "no adapter change"
  );
  assert.ok(!diff.some((p) => p.startsWith("src/llmShield")), "no src/llmShield change");
  const kernel = "tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py";
  const baseKernel = execFileSync("git", ["show", `${base}:${kernel}`], { encoding: "utf8" });
  assert.equal(readFileSync(kernel, "utf8"), baseKernel, "kernel byte-identical to base");
});
