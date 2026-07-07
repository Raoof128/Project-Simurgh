// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V VDP Lane A corpus (spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Deterministic corpus: honest + mirror + subpoena + one fixture per raw 151-160 +
// status matrix + locality pair. Every mutation clones the green contest and is
// RE-SIGNED via resignCounterGreen — EXCEPT the 152 fixture (deliberately broken sig).
// Byte-stable: deterministic salts/keys, no timestamps, no randomness.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { capsuleAttestationDigest } from "../../stage4t/core/capsuleCore.mjs";
import { buildGreenBundle, STAGE_VERIFIERS } from "../../stage4t/node/greenCapsule.mjs";
import { VDP_LANE_A_CORPUS_SCHEMA } from "../constants.mjs";
import { buildBinding, contestTuples } from "../core/bindingCore.mjs";
import { buildRespondentCensus } from "../core/contestCensus.mjs";
import { evaluateContestSafe } from "../core/counterCapsuleCore.mjs";
import { buildGreenContest, buildMirrorContest, resignCounterGreen } from "./greenContest.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const OUTDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/expected-results/laneA");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

const clone = (x) => JSON.parse(JSON.stringify(x));
const green = buildGreenBundle();
const RESPPUB = readPub("vdp-respondent");
const EVAL_OPTS = {
  capsulePubKeyPem: green.pubKeyPem,
  respondentPubKeyPem: RESPPUB,
  stageVerifiers: STAGE_VERIFIERS,
};

// Rebuild binding over a mutated contest set, then re-sign (needed when contests change).
function rebindAndResign(cc) {
  cc.binding = buildBinding(green.bundle, green.pubKeyPem, contestTuples(cc));
  return resignCounterGreen(cc);
}

export function buildLaneAFixtures() {
  const fixtures = [];
  const add = (name, expected_raw, counter_capsule, extra = {}) =>
    fixtures.push({ name, expected_raw, counter_capsule, ...extra });

  // honest + mirror
  add("honest-contest", 0, buildGreenContest().counterCapsule);
  add("mirror-contest", 0, buildMirrorContest().counterCapsule);

  // subpoena: capsule_override = green 4T bundle with tampered inner signature.
  const tamperedCapsule = clone(green.bundle);
  tamperedCapsule.content.signature = "00".repeat(32);
  tamperedCapsule.attestation_digest = capsuleAttestationDigest(tamperedCapsule);
  add("subpoena-capsule-tampered", 134, buildGreenContest().counterCapsule, {
    capsule_override: tamperedCapsule,
  });

  // 151 — schema malformed (fails before signature; no resign needed).
  add(
    "schema-malformed",
    151,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.schema = "not-a-vdp";
      return m;
    })()
  );
  // 151 — invalid respondent_role.
  add(
    "role-invalid",
    151,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.respondent_role = "martian";
      return resignCounterGreen(m);
    })()
  );
  // 152 — broken signature (deliberately left broken).
  add(
    "signature-invalid",
    152,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.signature = "00".repeat(32);
      return m;
    })()
  );
  // 153 — binding root mismatch.
  add(
    "binding-root-mismatch",
    153,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.binding.capsule_root = "sha256:" + "0".repeat(64);
      return resignCounterGreen(m);
    })()
  );
  // 154 — drop one contest, keep stale binding.
  add(
    "set-digest-mismatch",
    154,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.contests = m.contests.slice(1); // binding still commits to full set
      return resignCounterGreen(m);
    })()
  );
  // 154 — duplicate contest (binding rebuilt over doubled set -> duplicate detected).
  add(
    "duplicate-contest",
    154,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.contests = [...m.contests, m.contests[0]];
      return rebindAndResign(m);
    })()
  );
  // 155 — respondent census item digest mismatch.
  add(
    "census-item-mismatch",
    155,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.respondent_census.items[0].digest = "sha256:" + "b".repeat(64);
      return resignCounterGreen(m);
    })()
  );
  // 156 — census omits an artifact that is present.
  add(
    "census-omits-evidence",
    156,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.respondent_evidence_artifacts.push({
        kind: "kernel_decision_records",
        epoch: "vic-incident-epoch-0001",
        decisions: [],
      });
      return resignCounterGreen(m);
    })()
  );
  // 157 — census root mismatch.
  add(
    "census-root-mismatch",
    157,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.respondent_census.census_root = "sha256:" + "0".repeat(64);
      return resignCounterGreen(m);
    })()
  );
  // 158 — census epoch mismatch: ALL items at a foreign epoch with a consistent
  // root (digests unchanged, so 138/140 pass; item.epoch != capsule.epoch -> 145 -> 158).
  add(
    "census-epoch-mismatch",
    158,
    (() => {
      const m = buildGreenContest().counterCapsule;
      const items = m.respondent_census.items.map((i) => ({ ...i, epoch: "other-epoch" }));
      m.respondent_census = buildRespondentCensus({ epoch: "other-epoch", items });
      return resignCounterGreen(m);
    })()
  );
  // 159 — forbidden raw payload on a contest.
  add(
    "raw-payload",
    159,
    (() => {
      const m = buildGreenContest().counterCapsule;
      m.contests[3].judgment_text = "raw prose";
      return resignCounterGreen(m);
    })()
  );
  // 160 — presented conflict map mismatch (expected map with a flipped status).
  const g160 = buildGreenContest();
  const good160 = evaluateContestSafe(g160.capsuleBundle, g160.counterCapsule, EVAL_OPTS).envelope
    .result;
  const flipped = clone(good160);
  flipped.sections[1].status = "AGREED";
  add("conflict-map-mismatch", 160, g160.counterCapsule, {
    eval_opts: { expectedConflictMap: flipped },
  });

  // status matrix: single-status scoreable contests (all raw 0).
  const anchorArt = {
    kind: "stage4n_temporal_anchor",
    epoch: "vic-incident-epoch-0001",
    beat_index: 40,
  };
  const kernel2 = {
    kind: "kernel_decision_records",
    epoch: "vic-incident-epoch-0001",
    decisions: [{ decision: "blocked" }, { decision: "blocked" }],
  };
  const singleCensus = (arts) =>
    buildRespondentCensus({
      epoch: "vic-incident-epoch-0001",
      items: arts.map((a) => ({
        kind: a.kind,
        digest: recordDigest(a),
        epoch: "vic-incident-epoch-0001",
      })),
    });
  const mkSingle = (contests, arts) => {
    const cc = {
      schema: "simurgh.vdp.counter_capsule.v1",
      respondent_role: "deployer",
      contests,
      respondent_census: singleCensus(arts),
      respondent_evidence_artifacts: arts,
      non_claims: buildGreenContest().counterCapsule.non_claims,
      respondent_key_digest: buildGreenContest().counterCapsule.respondent_key_digest,
    };
    cc.binding = buildBinding(green.bundle, green.pubKeyPem, contestTuples(cc));
    return resignCounterGreen(cc);
  };
  add(
    "status-judgment-only",
    0,
    mkSingle(
      [
        {
          regime: "gpai_art55",
          section_id: "root_cause_analysis",
          verb: "dispute_as_judgment",
          judgment_text_digest: "sha256:" + "0".repeat(64),
        },
      ],
      [kernel2]
    )
  );
  add(
    "status-not-contestable",
    0,
    mkSingle(
      [
        {
          regime: "gpai_art55",
          section_id: "no_such_section",
          verb: "dispute_as_judgment",
          judgment_text_digest: "sha256:" + "0".repeat(64),
        },
      ],
      [kernel2]
    )
  );

  // locality pair: with vs without the recompute_failed dispute; other statuses stable.
  const gWith = buildGreenContest().counterCapsule;
  add("locality-with-failed-section", 0, gWith);
  const gWithout = buildGreenContest().counterCapsule;
  gWithout.contests = gWithout.contests.filter(
    (c) => !(c.regime === "gpai_art55" && c.section_id === "serious_incident_response")
  );
  add("locality-without-failed-section", 0, rebindAndResign(gWithout));

  return fixtures;
}

export function corpusDocument() {
  const cases = buildLaneAFixtures().map((f) => {
    const capsule = f.capsule_override ?? green.bundle;
    const res = evaluateContestSafe(capsule, f.counter_capsule, {
      ...EVAL_OPTS,
      ...(f.eval_opts ?? {}),
    });
    return {
      name: f.name,
      expected_raw: f.expected_raw,
      counter_capsule: f.counter_capsule,
      ...(f.capsule_override ? { capsule_override: f.capsule_override } : {}),
      ...(f.eval_opts ? { eval_opts: f.eval_opts } : {}),
      expected_envelope_digest: recordDigest(res.envelope),
    };
  });
  return {
    schema: VDP_LANE_A_CORPUS_SCHEMA,
    reference_capsule_bundle: green.bundle,
    capsule_pubkey_pem: green.pubKeyPem,
    respondent_pubkey_pem: RESPPUB,
    cases,
  };
}

export function writeCorpus(outDir = OUTDIR) {
  mkdirSync(outDir, { recursive: true });
  const doc = corpusDocument();
  writeFileSync(join(outDir, "corpus.json"), canonicalJson(doc) + "\n");
  return doc;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = writeCorpus();
  console.error(`stage4v Lane A: wrote ${doc.cases.length} contest cases`);
}
