// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — evaluate pipeline + tamper matrix (plan Task 9/10). Every code fires at its tier
// in frozen first-failure order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  evaluateVarl,
  evaluateVarlSafe,
  signBundle,
  contentOf,
} from "../../../../tools/simurgh-attestation/stage5d/core/varlCore.mjs";
import {
  buildGreenBundle,
  buildGreenContentWithKey,
  auditPrivate,
} from "../../../../tools/simurgh-attestation/stage5d/node/greenBundle.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const priv = readFileSync(
  join(REPO, "tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_stage-varl.pem"),
  "utf8"
);
const log = auditPrivate();
const audit = (b) => evaluateVarl(b, { tier: "audit", auditPrivate: log }).raw;
const pub = (b) => evaluateVarl(b, { tier: "public" }).raw;
// Re-sign a mutated content so a non-signature check fires first.
const signed = (mutate) => {
  const c = mutate(structuredClone(buildGreenContentWithKey(priv)));
  return { ...c, signature: signBundle(c, priv) };
};

test("green bundle → raw 0 at both tiers", () => {
  const b = buildGreenBundle(priv);
  assert.equal(audit(b), 0);
  assert.equal(pub(b), 0);
});

test("tamper matrix fires each code in frozen order", () => {
  const b = buildGreenBundle(priv);
  // 240 unexpected key (added after signing)
  assert.equal(audit({ ...b, smuggled: 1 }), 240);
  // 241 content mutated after signing
  assert.equal(audit({ ...b, ruleset_id: "x" }), 241);
  // 242 wrong source digest
  assert.equal(audit(signed((c) => ((c.gate_registry[0].source_digest = "sha256:0"), c))), 242);
  // 243 non-contiguous rounds
  assert.equal(audit(signed((c) => ((c.rungs[0].round = 9), c))), 243);
  // 244 tampered evasion digest
  assert.equal(
    audit(signed((c) => ((c.rungs[0].evasions[0].evasion_digest = "sha256:0"), c))),
    244
  );
  // 245 flipped watcher verdict
  assert.equal(
    audit(signed((c) => ((c.rungs[0].evasions[0].watcher_verdict_at_target = true), c))),
    245
  );
  // 246 wrong closed count
  assert.equal(audit(signed((c) => ((c.rungs[0].closed_count = 3), c))), 246);
  // 247 open rung with empty residual
  assert.equal(audit(signed((c) => ((c.rungs[2].residual_class = ""), c))), 247);
  // 248 wrong durability
  assert.equal(audit(signed((c) => ((c.rungs[0].durability = "durable"), c))), 248);
  // 249 fabricated all-three corner
  assert.equal(
    audit(
      signed(
        (c) => (
          (c.trilemma_corners[1].diacritic_overblock = false),
          (c.trilemma_corners[1].closes_confusables = true),
          c
        )
      )
    ),
    249
  );
  // 250 malformed byo_target
  assert.equal(audit(signed((c) => ((c.byo_target = { schema: "wrong" }), c))), 250);
  // 251 inconsistent provenance
  assert.equal(
    audit(
      signed(
        (c) => (
          (c.attester_provenance = {
            schema: "simurgh.varl.attester_provenance.v1",
            model_id: "claude-sonnet-5",
            org_id: "x",
            base_id: "synonym_veil_pct",
            response_digest: "sha256:0",
          }),
          c
        )
      )
    ),
    251
  );
  // 252 overclaim analyst_note (PUBLIC)
  assert.equal(pub(signed((c) => ((c.analyst_note = "this gate is now unbreakable"), c))), 252);
  // 252 unreviewed exact claim (PUBLIC)
  assert.equal(pub(signed((c) => ((c.rungs[0].evasions[0].human_reviewed = false), c))), 252);
});

test("253 audit-only: swapped audit-private log fails audit, passes public", () => {
  const b = buildGreenBundle(priv);
  const badLog = { ...auditPrivate(), attempt_count: 999 };
  assert.equal(evaluateVarl(b, { tier: "audit", auditPrivate: badLog }).raw, 253);
  assert.equal(evaluateVarl(b, { tier: "public" }).raw, 0); // public has no log to check
});

test("254 wrapper: an unexpected throw (BigInt in the audit log) is wrapped fail-closed", () => {
  const b = buildGreenBundle(priv);
  const throwingLog = { schema: b.audit_private_schema, rounds: [], evil: 1n }; // canonicalJson throws on BigInt
  assert.equal(evaluateVarlSafe(b, { tier: "audit", auditPrivate: throwingLog }).raw, 254);
});

test("double fault: earlier code wins (242 before 246)", () => {
  const b = signed((c) => {
    c.gate_registry[0].source_digest = "sha256:0"; // 242
    c.rungs[0].closed_count = 3; // 246
    return c;
  });
  assert.equal(audit(b), 242);
});
