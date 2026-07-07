// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC Lane A corpus (spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Deterministic corpus: one honest capsule (raw 0) + one fixture per reachable code
// 133–149. Code 150 is typed-wrapper-only (exercised in capsuleCore.test.js, not here).
// Each fixture carries eval opts where a code requires them (136 partition override,
// 148/149 views). Byte-stable: no timestamps, no randomness (deterministic salts/keys).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildEvidenceManifest } from "../core/censusCore.mjs";
import { capsuleAttestationDigest } from "../core/capsuleCore.mjs";
import { buildView, deriveCommitments } from "../core/viewCore.mjs";
import { PARTITIONS } from "../constants.mjs";
import { buildGreenBundle, resignGreen } from "./greenCapsule.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4t/expected-results/laneA");

const clone = (x) => JSON.parse(JSON.stringify(x));
const reseal = (m) => {
  m.attestation_digest = capsuleAttestationDigest(m);
  return m;
};

const firstBacked = (m) => m.content.projected_sections.find((p) => p.class === "evidence_backed");

export function buildLaneAFixtures() {
  const green = buildGreenBundle();
  const { salts } = green;
  const fixtures = [];
  const add = (name, expected_raw, bundle, evalOpts = {}) =>
    fixtures.push({ name, expected_raw, bundle, evalOpts });

  add("honest-capsule", 0, buildGreenBundle().bundle);

  // 133 — schema (fails before signature, no resign needed).
  add(
    "schema-malformed",
    133,
    (() => {
      const m = clone(green.bundle);
      m.schema = "not-a-vic-bundle";
      return m;
    })()
  );

  // 134 — tampered signature (deliberately left broken; reseal digest only).
  add(
    "signature-invalid",
    134,
    (() => {
      const m = clone(green.bundle);
      m.content.signature = "00".repeat(32);
      return reseal(m);
    })()
  );

  // 135 — binding snapshot digest mismatch.
  add(
    "template-digest-mismatch",
    135,
    (() => {
      const m = clone(green.bundle);
      m.content.template_bindings[0].template_snapshot_digest = "sha256:" + "0".repeat(64);
      return resignGreen(m);
    })()
  );

  // 136 — partition incomplete (gappy partition + matching binding digest + eval override).
  const gappy = { ...PARTITIONS.gpai_art55 };
  delete gappy.incident_dates;
  add(
    "partition-incomplete",
    136,
    (() => {
      const m = clone(green.bundle);
      m.content.template_bindings.find((b) => b.regime === "gpai_art55").partition_digest =
        recordDigest(gappy);
      return resignGreen(m);
    })(),
    { partitions: { ...PARTITIONS, gpai_art55: gappy } }
  );

  // 137 — invented projected section.
  add(
    "section-unmapped",
    137,
    (() => {
      const m = clone(green.bundle);
      m.content.projected_sections.push({
        regime: "gpai_art55",
        section_id: "invented_section",
        class: "not_derivable",
      });
      return resignGreen(m);
    })()
  );

  // 138 — census lists an item the bundle lacks (drop the anchor artifact).
  add(
    "census-missing-item",
    138,
    (() => {
      const m = clone(green.bundle);
      m.content.evidence_artifacts = m.content.evidence_artifacts.filter(
        (a) => a.kind !== "stage4n_temporal_anchor"
      );
      return resignGreen(m);
    })()
  );

  // 139 — bundle carries an artifact the manifest omits.
  add(
    "census-smuggled-item",
    139,
    (() => {
      const m = clone(green.bundle);
      m.content.evidence_artifacts.push({ kind: "smuggled", epoch: m.content.epoch, x: 1 });
      return resignGreen(m);
    })()
  );

  // 140 — tampered census root.
  add(
    "census-merkle-mismatch",
    140,
    (() => {
      const m = clone(green.bundle);
      m.content.evidence_manifest.census_root = "sha256:" + "2".repeat(64);
      return resignGreen(m);
    })()
  );

  // 141 — evidence_backed field with unresolvable evidence digest.
  add(
    "field-unbacked",
    141,
    (() => {
      const m = clone(green.bundle);
      firstBacked(m).evidence_digest = "sha256:" + "3".repeat(64);
      return resignGreen(m);
    })()
  );

  // 142 — recompute mismatch.
  add(
    "field-recompute-mismatch",
    142,
    (() => {
      const m = clone(green.bundle);
      firstBacked(m).value = "TAMPERED_VALUE";
      return resignGreen(m);
    })()
  );

  // 143 — suppression via not_derivable.
  add(
    "not-derivable-unjustified",
    143,
    (() => {
      const m = clone(green.bundle);
      const ps = firstBacked(m);
      delete ps.value;
      delete ps.evidence_digest;
      delete ps.recompute_kind;
      ps.class = "not_derivable";
      return resignGreen(m);
    })()
  );

  // 144 — suppression via requires_human_input.
  add(
    "requires-human-input-unjustified",
    144,
    (() => {
      const m = clone(green.bundle);
      const ps = firstBacked(m);
      delete ps.value;
      delete ps.evidence_digest;
      delete ps.recompute_kind;
      ps.class = "requires_human_input";
      return resignGreen(m);
    })()
  );

  // 145 — census item bound to a different epoch (re-root so 140 does not fire first).
  add(
    "incident-epoch-mismatch",
    145,
    (() => {
      const m = clone(green.bundle);
      const items = m.content.evidence_manifest.items.map((it, i) =>
        i === 0 ? { ...it, epoch: "other-epoch" } : it
      );
      m.content.evidence_manifest = buildEvidenceManifest({ epoch: m.content.epoch, items });
      return resignGreen(m);
    })()
  );

  // 146 — recorded chain verdict falsified over a real 108 bundle (consistent capsule).
  add("cross-stage-reference-invalid", 146, buildGreenBundle({ falsifyChainVerdict: true }).bundle);

  // 147 — two-stage digest mismatch (valid signature, wrong seal).
  add(
    "attestation-digest-mismatch",
    147,
    (() => {
      const m = clone(green.bundle);
      m.attestation_digest = "sha256:" + "4".repeat(64);
      return m;
    })()
  );

  // 148 — a view whose disclosed value contradicts the capsule.
  add(
    "view-inconsistent",
    148,
    green.bundle,
    (() => {
      const v = buildView(green.bundle.content, "regulator", [], salts);
      v.disclosed[0].section = { ...v.disclosed[0].section, value: "CONTRADICTION" };
      return { views: [v] };
    })()
  );

  // 149 — a view that omits a section without declaring the redaction.
  add(
    "redaction-undeclared",
    149,
    green.bundle,
    (() => {
      const v = buildView(green.bundle.content, "public", [], salts);
      v.disclosed = v.disclosed.slice(1); // drop one section without ledgering it
      return { views: [v] };
    })()
  );

  return fixtures;
}

// Serializable corpus (eval opts inlined; stageVerifiers supplied at eval time).
export function corpusDocument() {
  const cases = buildLaneAFixtures().map((f) => ({
    name: f.name,
    expected_raw: f.expected_raw,
    eval_opts: f.evalOpts,
    bundle: f.bundle,
  }));
  return { schema: "simurgh.vic.lane_a_corpus.v1", epoch: cases[0].bundle.content.epoch, cases };
}

export function writeCorpus(outDir = OUTDIR) {
  mkdirSync(outDir, { recursive: true });
  const doc = corpusDocument();
  writeFileSync(join(outDir, "corpus.json"), canonicalJson(doc) + "\n");
  return doc;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = writeCorpus();
  console.error(`stage4t Lane A: wrote ${doc.cases.length} cases`);
}
