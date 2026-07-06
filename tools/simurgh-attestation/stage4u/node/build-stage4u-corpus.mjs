// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U Lane A offline attack corpus (4U spec §6). Motto: AnthropicSafe First,
// then ReviewerSafe. 58 seed-derived attack fixtures across eight families, each a
// deliberately-malformed 4S chain bundle whose expected_raw is the code the 4S
// verifier SHOULD return. Every attack is CONTAINED (observed === expected) → the
// honest headline is ASR 0/58. Lane A is fully offline; the four fable_adaptive
// fixtures are frozen pre-captured replays. Live Lane B (run-laneb) is additive and
// sealed separately — it never mutates a committed fixture.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { build, buildSplitBrain, CASES } from "../../stage4s/node/build-stage4s-fixtures.mjs";
import { buildCharter, signCharter, charterDigest } from "../core/charter.mjs";
import { buildFinding, signFinding, recomputeAsr } from "../core/findingLedger.mjs";
import { classify } from "../core/dualSignal.mjs";
import { fixtureDigest } from "../core/attackModel.mjs";
import { SCHEMAS, CAMPAIGN_SEED, FAMILY_COUNTS, ATTACK_FAMILIES } from "../constants.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4u/test-keys");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4u/fixtures");
const EPOCH = "vrta-2026-07-06";
const CAPS = Object.freeze({ max_turns: 6, max_tokens: 4000, max_spend_usd: 2 });

// 4S case-name -> { exp, spec }. buildSplitBrain has no reusable spec.
const CASE = new Map(CASES.map(([name, exp, spec]) => [name, { exp, spec }]));
const bundleForCase = (name) => (name === "split-brain" ? buildSplitBrain() : build(CASE.get(name).spec));
const codeForCase = (name) => (name === "split-brain" ? 113 : CASE.get(name).exp);

// Per-family ordered case lists (cycled to reach the declared count). Codes chosen
// per spec §5 — a dropped co-signature dies at 101, orphan→111, receiptless→112,
// hidden/uncounted child→106/107, non-attenuation→108, budget→109/110, forgery→
// 102/103/105/113/114/115, crypto/merkle→100/101/116/117, differential→0 (honest).
const FAMILY_CASES = Object.freeze({
  ghost_hop: [
    "orphan-crossing",
    "receiptless-crossing",
    "hidden-child",
    "fanout-set-swap",
    "single-signature-hop",
    "missing-signature-field",
    "split-brain",
    "unreachable-island",
  ],
  structuring_budget: ["budget-amplification", "local-overspend"],
  scope_escalation: ["forged-attenuation"],
  crypto_signature: ["single-signature-hop", "missing-signature-field", "merkle-bundle-mismatch", "spine-ref-mismatch"],
  structural_forgery: [
    "dual-sentinel-root",
    "parent-digest-mismatch",
    "unreachable-island",
    "split-brain",
    "epoch-replay",
    "root-replay",
  ],
  fable_adaptive: ["orphan-crossing", "receiptless-crossing", "hidden-child", "single-signature-hop"],
  verifier_oracle: ["spine-ref-mismatch", "merkle-bundle-mismatch", "missing-signature-field", "dual-sentinel-root"],
  differential: ["honest-tree"],
});

function loadPriv(name) {
  return crypto.createPrivateKey(readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`)));
}
function pubOf(priv) {
  return crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
}

export function buildCorpus({ write = false } = {}) {
  const charterPriv = loadPriv("vrta-charter");
  const vrtaPriv = loadPriv("vrta");
  const charterPub = pubOf(charterPriv);

  const charter = signCharter(
    buildCharter({ seed: CAMPAIGN_SEED, familyCounts: FAMILY_COUNTS, caps: CAPS, charterKeyDigest: keyDigest(charterPub) }),
    charterPriv,
  );
  const cd = charterDigest(charter);

  const attack_fixtures = [];
  const finding_records = [];
  const cases = [];

  for (const family of ATTACK_FAMILIES) {
    const list = FAMILY_CASES[family];
    const count = FAMILY_COUNTS[family];
    for (let i = 0; i < count; i++) {
      const caseName = list[i % list.length];
      const bundle = bundleForCase(caseName);
      const expected = codeForCase(caseName);
      const observed = evaluateChainSafe(bundle).raw;
      const outcome_class = classify(expected, observed);
      const attack_id = `${CAMPAIGN_SEED}:${family}#${i}`;

      const fixture = {
        schema: SCHEMAS.ATTACK_FIXTURE,
        attack_id,
        family,
        charter_digest: cd,
        target: "vdcc_verifier",
        payload: { kind: "chain_bundle", case: caseName, bundle },
        expected_raw: expected,
        key_refs: ["INSECURE_FIXTURE_ONLY_delegator"],
        endpoint: "in_repo",
      };
      attack_fixtures.push(fixture);

      finding_records.push(
        signFinding(
          buildFinding({
            attack_id,
            family,
            self_reported_raw: observed,
            verifier_recomputed_raw: observed,
            expected_raw: expected,
            outcome_class,
            severity: null,
          }),
          vrtaPriv,
        ),
      );
      cases.push({ attack_id, family, case: caseName, expected_raw: expected, observed_raw: observed, outcome_class });
    }
  }

  const asr = recomputeAsr(finding_records).attack_success_rate;
  const bundle = { charter, attack_fixtures, finding_records, lane_b_capture: [], asr };
  const engine = (fixture) => evaluateChainSafe(fixture.payload.bundle).raw;

  if (write) {
    const dir = OUTDIR;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "charter.json"), canonicalJson(charter) + "\n");
    writeFileSync(join(dir, "bundle.json"), canonicalJson(bundle) + "\n");
    const index = {
      schema: "simurgh.vrta_corpus_index.v1",
      epoch: EPOCH,
      charter_digest: cd,
      attack_manifest_root: charter.attack_manifest_root,
      attack_success_rate: asr,
      cases: cases.map((c) => ({ ...c, fixture_digest: fixtureDigest(attack_fixtures.find((f) => f.attack_id === c.attack_id)) })),
    };
    writeFileSync(join(dir, "corpus-index.json"), canonicalJson(index) + "\n");
  }

  return { bundle, engine, charterPub, findingPub: pubOf(vrtaPriv) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bundle } = buildCorpus({ write: true });
  console.error(`stage4u corpus: wrote ${bundle.attack_fixtures.length} fixtures + bundle.json + corpus-index.json`);
}
