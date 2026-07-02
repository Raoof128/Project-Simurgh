// SPDX-License-Identifier: AGPL-3.0-or-later
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { certificateDigest, diagnose } from "../stage4h/dfiCertificate.mjs";
import { SIGNAL_CLASS_WEIGHTS } from "./constants.mjs";
import { checkBudgets } from "./extractionBudgetGate.mjs";
import { buildLedger, consumerIdDigest } from "./extractionLedger.mjs";
import { buildAttestation, buildEbaManifest, verifyEbaManifest } from "./ebaManifest.mjs";

// Overridable so the reproduce script regenerates into a TEMP dir and byte-compares the
// deterministic artifacts (ledger, attestation, exposure matrix) without churning committed
// fixtures (fresh key per build otherwise rewrites the manifest signature -> dirty tree).
const OUT = process.env.STAGE4K_FIXTURE_OUT || "tests/fixtures/llmShield/stage4k";
const H = "tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

const RD = (n) => `sha256:${n.repeat(64)}`; // deterministic response-id digests (synthetic)
const evs = (consumer, session, window, classes) =>
  classes.map((signal_class, i) => ({
    event_id: `ev_${consumer}_${session}_${String(i).padStart(2, "0")}`,
    consumer_id: consumer,
    session_id: session,
    window,
    signal_class,
    response_id_digest: RD(((i % 6) + 1).toString(16)),
  }));

// Synthetic multi-session streams (spec fixture arithmetic; substrate_is_synthetic_fixture_stream).
function bundles() {
  const W = "2026-07";
  const underEvents = [
    // consumer_alpha: cross-session cumulative 10 <= 12
    ...evs("consumer_alpha", "session_a", W, [
      "final_answer",
      "final_answer",
      "final_answer",
      "tool_use_trajectory",
    ]),
    ...evs("consumer_alpha", "session_b", W, ["final_answer", "final_answer", "reasoning_trace"]),
    // consumer_beta: boundary 8 == 8 (budget inclusive)
    ...evs("consumer_beta", "session_c", W, [
      "reasoning_trace",
      "reasoning_trace",
      "tool_use_trajectory",
    ]),
  ];
  const overEvents = [
    // consumer_gamma: cross-session cumulative 18 > 10
    ...evs("consumer_gamma", "session_d", W, [
      "reward_like_judgment",
      "reward_like_judgment",
      "reasoning_trace",
    ]),
    ...evs("consumer_gamma", "session_e", W, ["reward_like_judgment", "reasoning_trace"]),
  ];
  const policyFor = (budgets) => ({
    schema: "simurgh.eba.budget-policy.v1",
    window: W,
    class_weights: { ...SIGNAL_CLASS_WEIGHTS },
    budgets,
  });
  return {
    "under-budget": {
      events: underEvents,
      policy: policyFor({
        [consumerIdDigest("consumer_alpha")]: 12,
        [consumerIdDigest("consumer_beta")]: 8,
      }),
      expected: { raw: 0, typed: 0, reason: null },
    },
    "over-budget": {
      events: overEvents,
      policy: policyFor({ [consumerIdDigest("consumer_gamma")]: 10 }),
      expected: { raw: 30, typed: 1, reason: "extraction_budget_exceeded" },
    },
  };
}

function main() {
  // Re-verify the shared 4H substrate BEFORE binding to it (build-refusal, not trust).
  const pack = readJson(`${H}-base-pack.json`);
  const cert = readJson(`${H}-dfi-certificate.json`);
  const manifest4h = readJson(`${H}-signed-pack-manifest.json`);
  const packOk = verifyEvidencePack({
    pack,
    signature: readFileSync(`${H}-base-pack.sig`, "utf8").trim(),
    publicKeyPem: readFileSync(`${H}-signer.pub`, "utf8"),
  });
  if (!packOk.ok) throw new Error("build_refused: 4H substrate pack failed verification");
  const dfi = diagnose({ pack, certificate: cert, manifest: manifest4h });
  if (!dfi.ok) throw new Error(`build_refused: 4H substrate diagnose failed: ${dfi.reason}`);
  const dfiCertificateDigest = certificateDigest(cert);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  mkdirSync(`${OUT}/expected-results`, { recursive: true });
  writeFileSync(`${OUT}/eba-signer.pub`, publicKeyPem);

  const matrix = {};
  for (const [name, b] of Object.entries(bundles())) {
    const dir = `${OUT}/bundles/${name}`;
    mkdirSync(dir, { recursive: true });
    const ledger = buildLedger(b.events);
    const attestation = buildAttestation({ ledger, policy: b.policy, dfiCertificateDigest });
    const manifest = buildEbaManifest({
      ledger,
      attestation,
      policy: b.policy,
      dfiCertificateDigest,
      privateKey,
      publicKeyPem,
    });
    const check = verifyEbaManifest({
      manifest,
      ledger,
      attestation,
      policy: b.policy,
      dfiCertificateDigest,
      publicKey,
    });
    if (!check.ok) throw new Error(`build_refused: ${name} manifest self-check: ${check.reason}`);
    const gate = checkBudgets(ledger, b.policy);
    if (gate.rawCode !== b.expected.raw) {
      throw new Error(
        `build_refused: ${name} gate produced ${gate.rawCode}, expected ${b.expected.raw}`
      );
    }
    writeJson(`${dir}/events.json`, b.events);
    writeJson(`${dir}/budget-policy.json`, b.policy);
    writeJson(`${dir}/extraction-ledger.json`, ledger);
    writeJson(`${dir}/extraction-attestation.json`, attestation);
    writeJson(`${dir}/eba-manifest.json`, manifest);
    matrix[name] = b.expected;
  }
  writeJson(`${OUT}/expected-results/exposure-matrix.json`, matrix);
  console.log(`stage4k fixtures written to ${OUT}`);
}

main();
