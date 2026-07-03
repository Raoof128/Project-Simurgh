// SPDX-License-Identifier: AGPL-3.0-or-later
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { SIGNAL_CLASS_WEIGHTS } from "../stage4k/constants.mjs";
import { checkBudgets } from "../stage4k/extractionBudgetGate.mjs";
import { buildLedger, consumerIdDigest } from "../stage4k/extractionLedger.mjs";
import { CCB_ASSIGNMENT_SCHEMA, CCB_NON_CLAIMS, CCB_POLICY_SCHEMA } from "./constants.mjs";
import { clusterCommitmentDigest } from "./clusterCommitment.mjs";
import {
  buildAssignmentLedger,
  checkCompleteness,
  computeClusterCardinality,
} from "./clusterAssignmentLedger.mjs";
import { aggregateClusterExposure, checkClusterBudgets } from "./clusterBudgetGate.mjs";
import {
  buildCcbAttestation,
  buildCcbManifest,
  verifyCcbManifest,
} from "./build-stage4l-attestation.mjs";

const OUT = process.env.STAGE4L_FIXTURE_OUT || "tests/fixtures/llmShield/stage4l";
const K = "tests/fixtures/llmShield/stage4k/bundles/under-budget/eba-manifest.json";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
const D = (n) => `sha256:${n.repeat(64)}`;
const W = "2026-07";

const ev = (consumer, i, signal_class) => ({
  event_id: `ev_${consumer}_${String(i).padStart(3, "0")}`,
  consumer_id: consumer,
  session_id: `session_${consumer}`,
  window: W,
  signal_class,
  response_id_digest: D(((i % 6) + 1).toString(16)),
});
const assignment = (consumer, basisSeed) => {
  const a = {
    schema: CCB_ASSIGNMENT_SCHEMA,
    window: W,
    consumer_id_digest: consumerIdDigest(consumer),
    cluster_commitment: "",
    binding_level: "cluster",
    cluster_basis: ["payment_graph", "traffic_shape"],
    basis_digests: { payment_graph: D(basisSeed[0]), traffic_shape: D(basisSeed[1]) },
    binding_policy_digest: D("d"),
    graph_version_digest: D("e"),
    raw_identity_exported: false,
  };
  a.cluster_commitment = clusterCommitmentDigest(a);
  return a;
};
const ccbPolicy = (budgets) => ({
  schema: CCB_POLICY_SCHEMA,
  window: W,
  class_weights: { ...SIGNAL_CLASS_WEIGHTS },
  budgets,
  non_claims: [...CCB_NON_CLAIMS],
});
// deterministic distinct-but-synthetic consumer names for the 100-account arms
const hundred = Array.from({ length: 100 }, (_, i) => `consumer_${String(i).padStart(3, "0")}`);
// Unique-per-consumer basis digest for the singleton arms. Digits 0-9 are valid hex chars,
// so this matches /^sha256:[a-f0-9]{64}$/ and is unique for every i < 100.
const uniq = (i) => {
  const s = String(i).padStart(2, "0");
  return `sha256:${(s[0] + s[1]).repeat(32)}`;
};

function bundles() {
  const sharedSeed = ["b", "c"];
  const structuringAssignments = hundred.map((c) => assignment(c, sharedSeed));
  const sharedCommitment = structuringAssignments[0].cluster_commitment;
  const singletonAssignments = hundred.map((c, i) => {
    const a = assignment(c, sharedSeed);
    a.basis_digests = { payment_graph: uniq(i), traffic_shape: D("c") };
    a.cluster_commitment = clusterCommitmentDigest(a);
    return a;
  });
  const three = ["consumer_x", "consumer_y", "consumer_z"];
  const threeAssignments = three.map((c) => assignment(c, sharedSeed));
  const twoAssignments = ["consumer_x", "consumer_y"].map((c) => assignment(c, sharedSeed));
  return {
    "clean-under": {
      events: three.map((c, i) => ev(c, i, "final_answer")),
      assignments: threeAssignments,
      policy: ccbPolicy({ [sharedCommitment]: 80 }),
      expected: { raw: 0, typed: 0, reason: null },
      attest: true,
    },
    "boundary-equal": {
      events: ["consumer_x", "consumer_y"].map((c, i) => ev(c, i, "reward_like_judgment")),
      assignments: twoAssignments,
      policy: ccbPolicy({ [sharedCommitment]: 8 }),
      expected: { raw: 0, typed: 0, reason: null },
      attest: true,
    },
    "single-fat": {
      events: Array.from({ length: 25 }, (_, i) => ev("consumer_x", i, "reward_like_judgment")),
      assignments: [assignment("consumer_x", sharedSeed)],
      policy: ccbPolicy({ [sharedCommitment]: 80 }),
      expected: { raw: 41, typed: 1, reason: "cluster_budget_exceeded" },
      attest: true,
    },
    structuring: {
      events: hundred.map((c, i) => ev(c, i, "final_answer")),
      assignments: structuringAssignments,
      policy: ccbPolicy({ [sharedCommitment]: 80 }),
      accountBudgets: Object.fromEntries(hundred.map((c) => [consumerIdDigest(c), 5])),
      expected: { raw: 41, typed: 1, reason: "cluster_budget_exceeded" },
      attest: true,
    },
    "singleton-evasion": {
      events: hundred.map((c, i) => ev(c, i, "final_answer")),
      assignments: singletonAssignments,
      policy: ccbPolicy(
        Object.fromEntries(singletonAssignments.map((a) => [a.cluster_commitment, 5]))
      ),
      expected: { raw: 0, typed: 0, reason: null },
      attest: true,
      expectSingletons: 100,
    },
    "missing-assignment": {
      events: three.map((c, i) => ev(c, i, "final_answer")),
      assignments: threeAssignments.slice(0, 2),
      policy: ccbPolicy({ [sharedCommitment]: 80 }),
      expected: { raw: 40, typed: 1, reason: "cluster_commitment_missing" },
      attest: false,
    },
    "duplicate-assignment": {
      events: three.map((c, i) => ev(c, i, "final_answer")),
      assignments: [...threeAssignments, { ...threeAssignments[0] }],
      policy: ccbPolicy({ [sharedCommitment]: 80 }),
      expected: { raw: 42, typed: 1, reason: "cluster_assignment_mismatch" },
      attest: false,
    },
  };
}

function main() {
  const ebaManifestDigest = `sha256:${sha256Canonical(readJson(K))}`;
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  mkdirSync(`${OUT}/expected-results`, { recursive: true });
  writeFileSync(`${OUT}/ccb-signer.pub`, publicKeyPem);
  const matrix = {};
  for (const [name, b] of Object.entries(bundles())) {
    const dir = `${OUT}/bundles/${name}`;
    mkdirSync(dir, { recursive: true });
    writeJson(`${dir}/events.json`, b.events);
    writeJson(`${dir}/cluster-assignments.json`, b.assignments);
    writeJson(`${dir}/cluster-budget-policy.json`, b.policy);
    if (b.accountBudgets) {
      // F8 control input: a Q8-format per-account policy that PASSES on this bundle
      const accountPolicy = {
        schema: "simurgh.eba.budget-policy.v1",
        window: W,
        class_weights: { ...SIGNAL_CLASS_WEIGHTS },
        budgets: b.accountBudgets,
      };
      const gate = checkBudgets(buildLedger(b.events), accountPolicy);
      if (!gate.ok) throw new Error(`build_refused: ${name} F8 control did not pass`);
      writeJson(`${dir}/account-budget-policy.json`, accountPolicy);
    }
    if (b.attest) {
      const exposureLedger = buildLedger(b.events);
      const assignmentLedger = buildAssignmentLedger(b.assignments);
      const completeness = checkCompleteness(exposureLedger, assignmentLedger);
      if (!completeness.ok) throw new Error(`build_refused: ${name}: ${completeness.reason}`);
      const cardinality = computeClusterCardinality(assignmentLedger);
      if (b.expectSingletons && cardinality.histogram["1"] !== b.expectSingletons) {
        throw new Error(`build_refused: ${name} expected ${b.expectSingletons} singletons`);
      }
      const attestation = buildCcbAttestation({
        exposureLedger,
        assignmentLedger,
        cardinality,
        policy: b.policy,
        ebaManifestDigest,
      });
      const manifest = buildCcbManifest({
        assignmentLedger,
        attestation,
        policy: b.policy,
        cardinality,
        ebaManifestDigest,
        privateKey,
        publicKeyPem,
      });
      const check = verifyCcbManifest({
        manifest,
        assignmentLedger,
        attestation,
        policy: b.policy,
        cardinality,
        ebaManifestDigest,
        publicKey,
      });
      if (!check.ok) throw new Error(`build_refused: ${name} manifest self-check: ${check.reason}`);
      const gate = checkClusterBudgets(
        aggregateClusterExposure(exposureLedger, assignmentLedger),
        b.policy
      );
      if (gate.rawCode !== b.expected.raw) {
        throw new Error(
          `build_refused: ${name} gate produced ${gate.rawCode}, expected ${b.expected.raw}`
        );
      }
      writeJson(`${dir}/cluster-assignment-ledger.json`, assignmentLedger);
      writeJson(`${dir}/cluster-cardinality.json`, cardinality);
      writeJson(`${dir}/ccb-attestation.json`, attestation);
      writeJson(`${dir}/ccb-manifest.json`, manifest);
    }
    matrix[name] = b.expected;
  }
  writeJson(`${OUT}/expected-results/cluster-matrix.json`, matrix);
  console.log(`stage4l fixtures written to ${OUT}`);
}

main();
