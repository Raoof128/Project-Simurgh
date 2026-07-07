// Stage 4V K7 all-functions e2e net (spec §15). Every export exercised; ten named gates.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  recordDigest,
  canonicalJson,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import * as constants from "../../../../tools/simurgh-attestation/stage4v/constants.mjs";
import * as binding from "../../../../tools/simurgh-attestation/stage4v/core/bindingCore.mjs";
import * as census from "../../../../tools/simurgh-attestation/stage4v/core/contestCensus.mjs";
import * as cmap from "../../../../tools/simurgh-attestation/stage4v/core/conflictMap.mjs";
import * as core from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import {
  buildGreenContest,
  buildMirrorContest,
  resignCounterGreen,
} from "../../../../tools/simurgh-attestation/stage4v/node/greenContest.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs";
import * as att from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4v/node/verify-stage4v-attestation.mjs";
import { verifyContestLaneBCapture } from "../../../../tools/simurgh-attestation/stage4v/laneb/run-laneb-contest-ceremony.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const S4V = join(ROOT, "tools/simurgh-attestation/stage4v");
const green = buildGreenBundle();
const OPTS = {
  capsulePubKeyPem: green.pubKeyPem,
  stageVerifiers: STAGE_VERIFIERS,
};

test("compose: every stage4v export is a defined function or value", () => {
  for (const mod of [constants, binding, census, cmap, core, att])
    for (const [k, v] of Object.entries(mod)) assert.notEqual(v, undefined, k);
  // exercise the pure exports
  assert.ok(binding.contestTuples({ contests: [] }).length === 0);
  assert.ok(binding.keyString({ regime: "a", section_id: "b" }) === "a/b");
  assert.ok(census.referencedDigests({ contests: [] }) instanceof Set);
  assert.ok(typeof core.unsignedCounterCapsule({ signature: "x", a: 1 }).a === "number");
});

test("gate 1 — tamper matrix: every corpus case reproduces expected_raw (audit)", () => {
  const doc = corpusDocument();
  for (const c of doc.cases) {
    const capsule = c.capsule_override ?? doc.reference_capsule_bundle;
    const res = core.evaluateContestSafe(capsule, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
      ...(c.eval_opts ?? {}),
    });
    assert.equal(res.raw, c.expected_raw, c.name);
    assert.equal(recordDigest(res.envelope), c.expected_envelope_digest, c.name);
  }
});

test("gate 2 — meta: only_152 invalid sig, 153-160 validly resigned", () => {
  const doc = corpusDocument();
  const pub = crypto.createPublicKey(doc.respondent_pubkey_pem);
  const ok = (cc) => {
    try {
      return crypto.verify(
        null,
        Buffer.from(canonicalJson(core.unsignedCounterCapsule(cc))),
        pub,
        Buffer.from(cc.signature ?? "", "hex")
      );
    } catch {
      return false;
    }
  };
  let invalid = 0;
  for (const c of doc.cases) {
    if (c.expected_raw === 152) {
      assert.equal(ok(c.counter_capsule), false);
      invalid++;
    } else if (c.expected_raw >= 153 && c.expected_raw <= 160) {
      assert.equal(ok(c.counter_capsule), true, c.name);
    }
  }
  assert.equal(invalid, 1, "exactly one 152 fixture");
});

test("gate 3 — mirror_contest_all_agreed hard gate", () => {
  const m = buildMirrorContest();
  const { raw, envelope } = core.evaluateContestSafe(m.capsuleBundle, m.counterCapsule, {
    capsulePubKeyPem: m.capsulePubKeyPem,
    respondentPubKeyPem: m.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 0);
  assert.ok(envelope.result.sections.length >= 6);
  assert.ok(envelope.result.sections.every((s) => s.status === "AGREED"));
});

test("gate 4 — status-locality hard gate (from the corpus pair)", () => {
  const doc = corpusDocument();
  const run = (name) => {
    const c = doc.cases.find((x) => x.name === name);
    return core.evaluateContestSafe(doc.reference_capsule_bundle, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
    }).envelope.result.sections;
  };
  const withX = run("locality-with-failed-section").filter(
    (s) => s.key !== "gpai_art55/serious_incident_response"
  );
  assert.deepEqual(withX, run("locality-without-failed-section"));
});

test("gate 5 — subpoena: tampered capsule seals reverify 134, refused", () => {
  const doc = corpusDocument();
  const c = doc.cases.find((x) => x.name === "subpoena-capsule-tampered");
  const res = core.evaluateContestSafe(c.capsule_override, c.counter_capsule, {
    capsulePubKeyPem: doc.capsule_pubkey_pem,
    respondentPubKeyPem: doc.respondent_pubkey_pem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(res.raw, 134);
  assert.equal(res.envelope.capsule_reverify_result, 134);
  assert.equal(res.envelope.result.refused, true);
});

test("gate 6 — reference-capsule immutability", () => {
  assert.equal(constants.STAGE4T_REFERENCE_CAPSULE.capsule_root, green.bundle.content.capsule_root);
  assert.equal(
    constants.STAGE4T_REFERENCE_CAPSULE.attestation_digest,
    green.bundle.attestation_digest
  );
});

test("gate 7 — registry-authority: stage4v defines no recompute fns, imports the 4T registry", () => {
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".mjs")) files.push(p);
    }
  };
  walk(S4V);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.equal(
      /RECOMPUTE_REGISTRY\s*=/.test(src),
      false,
      `${f} must not define RECOMPUTE_REGISTRY`
    );
    assert.equal(/function\s+recompute\b/.test(src), false, `${f} must not define recompute()`);
  }
  const conflictSrc = readFileSync(join(S4V, "core/conflictMap.mjs"), "utf8");
  assert.ok(/from "\.\.\/\.\.\/stage4t\/core\/projectionCore\.mjs"/.test(conflictSrc));
  assert.ok(/RECOMPUTE_REGISTRY/.test(conflictSrc));
});

test("gate 8 — read-only kernel: no src/llmShield diff, no authorise_ token", () => {
  const diff = execFileSync(
    "git",
    ["diff", "--name-only", "v2.30.0-stage-4t-vic", "--", "src/llmShield"],
    {
      cwd: ROOT,
      encoding: "utf8",
    }
  ).trim();
  assert.equal(diff, "", "src/llmShield must be byte-frozen since 4T");
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".mjs")) files.push(p);
    }
  };
  walk(S4V);
  for (const f of files) assert.equal(/authorise_/.test(readFileSync(f, "utf8")), false, f);
});

test("gate 9 — frozen 4T/4S/4U artifacts", () => {
  const diff = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "v2.30.0-stage-4t-vic",
      "--",
      "tools/simurgh-attestation/stage4t",
      "tools/simurgh-attestation/stage4s",
      "tools/simurgh-attestation/stage4u",
    ],
    { cwd: ROOT, encoding: "utf8" }
  ).trim();
  assert.equal(diff, "", "stage4t/4s/4u dirs must be byte-identical to the 4T tag");
});

test("gate 10 — wrapper: internal throw after pre-verify -> 161", () => {
  const g = buildGreenContest();
  const poisoned = JSON.parse(JSON.stringify(g.counterCapsule));
  poisoned.respondent_evidence_artifacts.push({ kind: "x", bad: 10n });
  const { raw } = core.evaluateContestSafe(g.capsuleBundle, poisoned, {
    ...OPTS,
    respondentPubKeyPem: g.respondentPubKeyPem,
    publicTier: true,
  });
  assert.equal(raw, 161);
});

test("attestation both tiers + Lane B capture verify", () => {
  const attestation = att.signAttestation(att.computeAttestation());
  assert.deepEqual(verifyAttestation(attestation, { tier: "public" }), { ok: true });
  assert.deepEqual(verifyAttestation(attestation, { tier: "audit" }), { ok: true });
  const cap = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-4v/laneb/capture.json"),
      "utf8"
    )
  );
  assert.equal(verifyContestLaneBCapture(cap).ok, true);
});

test("misc exports exercised: buildLaneAFixtures, resignCounterGreen", () => {
  assert.ok(buildLaneAFixtures().length >= 19);
  const g = buildGreenContest();
  assert.ok(resignCounterGreen(g.counterCapsule).signature);
});
