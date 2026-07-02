// SPDX-License-Identifier: AGPL-3.0-or-later
// K7: the all-functions net. Every exported Stage 4K function composed through the real
// pipeline. Semantic rule enforced throughout: raw 30 appears ONLY for a genuine Q8
// budget breach — every other failure must surface as 22/25/29, never 30.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { verifyEvidencePack } from "../../../tools/simurgh-attestation/stage4d/verifyPack.mjs";
import {
  certificateDigest,
  diagnose,
} from "../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  EBA_RAW_CODES,
  PCTA_RAW_CODES,
  stage4CodeForRawCode,
} from "../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { SIGNAL_CLASS_WEIGHTS } from "../../../tools/simurgh-attestation/stage4k/constants.mjs";
import { checkBudgets } from "../../../tools/simurgh-attestation/stage4k/extractionBudgetGate.mjs";
import {
  EbaSchemaError,
  buildLedger,
  consumerIdDigest,
  ledgerDigest,
} from "../../../tools/simurgh-attestation/stage4k/extractionLedger.mjs";
import {
  buildAttestation,
  buildEbaManifest,
  verifyEbaManifest,
} from "../../../tools/simurgh-attestation/stage4k/ebaManifest.mjs";
import { runEbaCore } from "../../../tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";

const FIX = "tests/fixtures/llmShield/stage4k";
const PIN = `${FIX}/eba-signer.pub`;
const H = "tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted";
const CLI = "tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";
const BUILDER = "tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs";
const EMITTER = "tools/simurgh-attestation/stage4k/emit-stage4k-evidence.mjs";
const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const event = (over = {}) => ({
  event_id: "ev_001",
  consumer_id: "consumer_alpha",
  session_id: "session_a",
  window: "2026-07",
  signal_class: "final_answer",
  response_id_digest: `sha256:${"a".repeat(64)}`,
  ...over,
});
const policyFor = (budgets) => ({
  schema: "simurgh.eba.budget-policy.v1",
  window: "2026-07",
  class_weights: { ...SIGNAL_CLASS_WEIGHTS },
  budgets,
});
const tempDir = (t, prefix) => {
  const tmp = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  return tmp;
};
const tempBundle = (t, name) => {
  const tmp = tempDir(t, "eba-allfn-");
  cpSync(`${FIX}/bundles/${name}`, `${tmp}/bundle`, { recursive: true });
  return `${tmp}/bundle`;
};

// The real DFI certificate digest from the shared 4H substrate, so in-memory
// compositions bind to the SAME containment record the fixtures bind to.
const DFI = certificateDigest(readJson(`${H}-dfi-certificate.json`));

// ---- Group 1: full happy-path function composition (no committed fixtures) ----

test("all core functions compose on clean under-budget input", () => {
  const ledger = buildLedger([event()]);
  const alpha = consumerIdDigest("consumer_alpha");
  const policy = policyFor({ [alpha]: 10 });

  assert.equal(ledger.schema, "simurgh.eba.ledger.v1");
  assert.deepEqual(checkBudgets(ledger, policy), {
    ok: true,
    rawCode: 0,
    reason: null,
    offending: [],
  });

  const attestation = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  assert.deepEqual(attestation.denied_over_budget, []);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const manifest = buildEbaManifest({
    ledger,
    attestation,
    policy,
    dfiCertificateDigest: DFI,
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.deepEqual(
    verifyEbaManifest({
      manifest,
      ledger,
      attestation,
      policy,
      dfiCertificateDigest: DFI,
      publicKey,
    }),
    { ok: true }
  );

  // Every digest slot is a real digest; nothing plaintext leaks anywhere in the chain.
  for (const d of [
    ledgerDigest(ledger),
    manifest.ledger_digest,
    manifest.attestation_digest,
    manifest.budget_policy_digest,
    manifest.dfi_certificate_digest,
    manifest.public_key_fingerprint,
  ]) {
    assert.match(d, DIGEST_RE);
  }
  const chain = JSON.stringify({ ledger, attestation, manifest });
  for (const leak of ["consumer_alpha", "session_a", "prompt", "output", "transcript"]) {
    assert.equal(chain.includes(leak), false, leak);
  }
});

// ---- Group 2: over-budget full path (raw 30 ONLY from a real Q8 breach) ----

test("over-budget composes in memory: gate fires 30, attestation records it honestly, manifest still verifies", () => {
  const gamma = consumerIdDigest("consumer_gamma");
  const ledger = buildLedger([
    event({
      event_id: "ev_1",
      consumer_id: "consumer_gamma",
      signal_class: "reward_like_judgment",
    }),
    event({
      event_id: "ev_2",
      consumer_id: "consumer_gamma",
      signal_class: "reward_like_judgment",
    }),
  ]); // weighted_total = 8
  const policy = policyFor({ [gamma]: 5 });

  const gate = checkBudgets(ledger, policy);
  assert.equal(gate.rawCode, 30);
  assert.equal(gate.reason, "extraction_budget_exceeded");
  assert.deepEqual(gate.offending, [gamma]);

  // Over-budget IS attestable (an attestation is a faithful record, not a pass stamp).
  const attestation = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  assert.deepEqual(attestation.denied_over_budget, [gamma]);
  assert.equal(attestation.per_consumer[0].under_budget, false);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const manifest = buildEbaManifest({
    ledger,
    attestation,
    policy,
    dfiCertificateDigest: DFI,
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(
    verifyEbaManifest({
      manifest,
      ledger,
      attestation,
      policy,
      dfiCertificateDigest: DFI,
      publicKey,
    }).ok,
    true
  );
});

test("committed over-budget bundle: runEbaCore yields raw 30, typed 1", async () => {
  const r = await runEbaCore({ bundleDir: `${FIX}/bundles/over-budget`, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 30);
  assert.equal(r.reason, "extraction_budget_exceeded");
  assert.equal(r.typed, 1);
});

// ---- Group 3: schema failures route 29 -> 3, never 30 ----

test("every schema violation throws EbaSchemaError at the builder", () => {
  const missing = event();
  delete missing.response_id_digest;
  const cases = [
    [[event({ signal_class: "raw_logits" })], "unknown_signal_class"],
    [[event({ nonexistent_field: "x" })], "schema_unknown_field"],
    [[missing], "schema_missing_field"],
    [[event(), event()], "duplicate_event_id"],
    [[event({ response_id_digest: "the raw response text" })], "schema_invalid_digest"],
    [[event({ prompt: "leak me" })], "schema_unknown_field"],
  ];
  for (const [events, reason] of cases) {
    assert.throws(
      () => buildLedger(events),
      (err) => err instanceof EbaSchemaError && err.reason === reason,
      reason
    );
  }
});

test("schema violations smuggled into a bundle surface as verifier raw 29 -> typed 3, never 30", async (t) => {
  const mutations = [
    ["unknown signal class", (e) => ({ ...e, signal_class: "raw_logits" })],
    ["unknown event field", (e) => ({ ...e, prompt: "leak" })],
    ["malformed response digest", (e) => ({ ...e, response_id_digest: "plaintext" })],
  ];
  for (const [name, mutate] of mutations) {
    const dir = tempBundle(t, "under-budget");
    const events = readJson(`${dir}/events.json`);
    events[0] = mutate(events[0]);
    writeFileSync(`${dir}/events.json`, JSON.stringify(events));
    const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
    assert.equal(r.rawCode, 29, name);
    assert.equal(r.typed, 3, name);
    assert.notEqual(r.rawCode, 30, name);
  }
});

// ---- Group 4: digest and manifest tamper matrix ----

test("tamper matrix: every non-breach failure surfaces as 22/25/29 — never 30", async (t) => {
  // budget-policy mutation is deterministically 22 here (NOT "22 or 30"): the frozen gate
  // order checks the manifest's budget_policy_digest binding BEFORE Q8 ever runs.
  const rows = [
    [
      "ledger count inflated",
      22,
      (d) => {
        const l = readJson(`${d}/extraction-ledger.json`);
        l.entries[0].class_counts.final_answer += 1;
        writeFileSync(`${d}/extraction-ledger.json`, JSON.stringify(l));
      },
    ],
    [
      "attestation dfi digest swapped",
      22,
      (d) => {
        const a = readJson(`${d}/extraction-attestation.json`);
        a.dfi_certificate_digest = `sha256:${"e".repeat(64)}`;
        writeFileSync(`${d}/extraction-attestation.json`, JSON.stringify(a));
      },
    ],
    [
      "budget-policy budget raised",
      22,
      (d) => {
        const p = readJson(`${d}/budget-policy.json`);
        for (const k of Object.keys(p.budgets)) p.budgets[k] = 999;
        writeFileSync(`${d}/budget-policy.json`, JSON.stringify(p));
      },
    ],
    [
      "manifest signature corrupted",
      25,
      (d) => {
        const m = readJson(`${d}/eba-manifest.json`);
        const sig = m.signature.slice("ed25519:".length);
        m.signature = `ed25519:${(sig[0] === "A" ? "B" : "A") + sig.slice(1)}`;
        writeFileSync(`${d}/eba-manifest.json`, JSON.stringify(m));
      },
    ],
    ["manifest removed", 29, (d) => unlinkSync(`${d}/eba-manifest.json`)],
    ["ledger removed", 29, (d) => unlinkSync(`${d}/extraction-ledger.json`)],
  ];
  for (const [name, expectedRaw, tamper] of rows) {
    const dir = tempBundle(t, "under-budget");
    tamper(dir);
    const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
    assert.equal(r.rawCode, expectedRaw, `${name}: got ${r.rawCode} (${r.reason})`);
    assert.notEqual(r.rawCode, 30, name);
    assert.equal(r.typed, stage4CodeForRawCode(expectedRaw), name);
  }
  // Wrong pinned key: valid bundle, foreign pin -> 25.
  const dir = tempBundle(t, "under-budget");
  const { publicKey } = generateKeyPairSync("ed25519");
  const foreignPin = join(dir, "foreign.pub");
  writeFileSync(foreignPin, publicKey.export({ type: "spki", format: "pem" }));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: foreignPin });
  assert.equal(r.rawCode, 25);
  assert.equal(r.reason, "unpinned_signer");
});

// ---- Group 5: fixture builder determinism + fresh-key self-consistency ----

test("double temp build: deterministic artifacts byte-identical, fresh-key manifests self-verify, committed tree untouched", async (t) => {
  const A = tempDir(t, "eba-build-a-");
  const B = tempDir(t, "eba-build-b-");
  for (const out of [A, B]) {
    const built = spawnSync("node", [BUILDER], {
      env: { ...process.env, STAGE4K_FIXTURE_OUT: out },
      encoding: "utf8",
    });
    assert.equal(built.status, 0, built.stderr);
  }
  for (const f of [
    "bundles/under-budget/extraction-ledger.json",
    "bundles/under-budget/extraction-attestation.json",
    "bundles/over-budget/extraction-ledger.json",
    "bundles/over-budget/extraction-attestation.json",
    "expected-results/exposure-matrix.json",
  ]) {
    assert.equal(readFileSync(`${A}/${f}`, "utf8"), readFileSync(`${B}/${f}`, "utf8"), f);
  }
  // Manifests are NOT byte-compared (fresh key per build) — but each temp tree must be
  // self-consistent: its own bundles verify under its own generated pub key.
  const rA = await runEbaCore({
    bundleDir: `${A}/bundles/under-budget`,
    pinnedPubkeyPath: `${A}/eba-signer.pub`,
  });
  assert.equal(rA.rawCode, 0, rA.reason);
  // Temp builds never dirty the committed fixtures.
  const gitDiff = spawnSync("git", ["diff", "--exit-code", "--", FIX], { encoding: "utf8" });
  assert.equal(gitDiff.status, 0, gitDiff.stdout);
});

// ---- Group 6: verifier CLI end-to-end (exit codes + --out reports) ----

test("CLI matches the programmatic API: under -> exit 0 / raw 0 / typed 0, over -> exit 1 / raw 30 / typed 1", (t) => {
  const tmp = tempDir(t, "eba-cli-");
  const under = spawnSync(
    "node",
    [
      CLI,
      "--bundle",
      `${FIX}/bundles/under-budget`,
      "--pinned-pubkey",
      PIN,
      "--out",
      `${tmp}/under.json`,
    ],
    { encoding: "utf8" }
  );
  assert.equal(under.status, 0, under.stderr);
  const ur = readJson(`${tmp}/under.json`);
  assert.equal(ur.rawCode, 0);
  assert.equal(ur.typed, 0);
  assert.equal(ur.ok, true);

  const over = spawnSync(
    "node",
    [
      CLI,
      "--bundle",
      `${FIX}/bundles/over-budget`,
      "--pinned-pubkey",
      PIN,
      "--out",
      `${tmp}/over.json`,
    ],
    { encoding: "utf8" }
  );
  assert.equal(over.status, 1, over.stderr);
  const or = readJson(`${tmp}/over.json`);
  assert.equal(or.rawCode, 30);
  assert.equal(or.typed, 1);
  assert.equal(or.ok, false);
});

// ---- Group 7: evidence emitter refusal + env-override positive control ----

test("emitter refuses to write when observed verdicts contradict the expected matrix", (t) => {
  const fixCopy = tempDir(t, "eba-emit-fix-");
  const out = join(tempDir(t, "eba-emit-out-"), "evidence");
  cpSync(FIX, fixCopy, { recursive: true });
  const matrix = readJson(`${fixCopy}/expected-results/exposure-matrix.json`);
  matrix["over-budget"].raw = 0; // lie: claim the over-budget bundle should pass
  matrix["over-budget"].typed = 0;
  writeFileSync(
    `${fixCopy}/expected-results/exposure-matrix.json`,
    JSON.stringify(matrix, null, 2)
  );
  const r = spawnSync("node", [EMITTER], {
    env: { ...process.env, STAGE4K_FIXTURE_ROOT: fixCopy, STAGE4K_EVIDENCE_OUT: out },
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /evidence refused/);
  assert.equal(existsSync(out), false, "no evidence may be written on refusal");
});

test("emitter positive control: clean temp matrix emits all five files, committed evidence untouched", (t) => {
  const fixCopy = tempDir(t, "eba-emit-ok-fix-");
  const out = join(tempDir(t, "eba-emit-ok-out-"), "evidence");
  cpSync(FIX, fixCopy, { recursive: true });
  const r = spawnSync("node", [EMITTER], {
    env: { ...process.env, STAGE4K_FIXTURE_ROOT: fixCopy, STAGE4K_EVIDENCE_OUT: out },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readdirSync(out).sort(), [
    "budget-policy.json",
    "eba-manifest.json",
    "extraction-attestation.json",
    "extraction-ledger.json",
    "extraction-summary.json",
  ]);
  const gitDiff = spawnSync(
    "git",
    ["diff", "--exit-code", "--", "docs/research/llm-shield/evidence/stage-4k"],
    { encoding: "utf8" }
  );
  assert.equal(gitDiff.status, 0, gitDiff.stdout);
});

// ---- Group 8: reproduce script end-to-end ----

test("reproduce script exits 0 and prints ALL GREEN (heaviest test; script never re-enters this file)", () => {
  const r = spawnSync("bash", ["scripts/reproduce-llm-shield-stage4k.sh"], {
    encoding: "utf8",
    timeout: 300_000,
  });
  assert.equal(r.status, 0, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /stage4k reproduce: ALL GREEN/);
});

test("node-version guard routes through the wrapper (skipped unless an alternate node < 26 exists)", (t) => {
  // A PATH with NO node at all cannot be wrapper-routed by construction (exit_via_wrapper
  // itself needs node) — so this only runs where a real pre-26 node binary exists.
  const probe = spawnSync("/usr/bin/node", ["--version"], { encoding: "utf8" });
  const major = probe.status === 0 ? Number(probe.stdout.slice(1).split(".")[0]) : NaN;
  if (!Number.isInteger(major) || major >= 26) {
    t.skip("no alternate pre-26 node available on this machine");
    return;
  }
  const r = spawnSync("bash", ["scripts/reproduce-llm-shield-stage4k.sh"], {
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(r.status, 2, "raw 28 (wrong node major) must map to typed 2 via the wrapper");
});

// ---- Group 9: cross-stage invariants (4K must not regress the shipped spine) ----

test("exit-wrapper cross-stage bands remain stable and 39 stays fail-closed", () => {
  assert.equal(EBA_RAW_CODES.EXTRACTION_BUDGET_EXCEEDED, 30);
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(30), 1);
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
  assert.equal(stage4CodeForRawCode(39), 3, "39 is reserved prose-only and must fail closed");
  for (const raw of Object.values(PCTA_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(raw), 1, `PCTA raw ${raw}`);
  }
});

test("Q0-Q7 substrate still verifies directly and src/llmShield is untouched", () => {
  const pack = readJson(`${H}-base-pack.json`);
  const packOk = verifyEvidencePack({
    pack,
    signature: readFileSync(`${H}-base-pack.sig`, "utf8").trim(),
    publicKeyPem: readFileSync(`${H}-signer.pub`, "utf8"),
  });
  assert.equal(packOk.ok, true);
  const dfi = diagnose({
    pack,
    certificate: readJson(`${H}-dfi-certificate.json`),
    manifest: readJson(`${H}-signed-pack-manifest.json`),
  });
  assert.equal(dfi.ok, true);
  const gitDiff = spawnSync("git", ["diff", "--exit-code", "--", "src/llmShield"], {
    encoding: "utf8",
  });
  assert.equal(gitDiff.status, 0, "policy-drift guard: src/llmShield must have zero diffs");
});
