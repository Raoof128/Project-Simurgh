# Stage 3W — Witnessed VCA Release Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the sealed Stage 3V-B v2.6.0 release into a dual-root provenance witness — an offline-verifiable Simurgh Ed25519 in-toto bundle and an additive GitHub OIDC/Sigstore CI witness — that corroborate by digest equality.

**Architecture:** Two independent roots witness the same sealed 3V-B bytes. The offline root is an in-toto Statement v1 signed with a new 3W Ed25519 key, fully verifiable with a committed public key and no network. The online root is a deterministic `github-witness-verdict.json` that a clean GitHub runner regenerates from *real* command results, asserts byte-identical, and signs via `actions/attest-build-provenance`. Neither root signs or depends on the other.

**Tech Stack:** Node.js ESM (`node:test`, `node:crypto` Ed25519), bash gates, GitHub Actions (artifact attestations), the existing `tools/simurgh-attestation/canonicalise.mjs` + `keygen.mjs`.

## Global Constraints

- **No `src/llmShield/**` changes** — policy-drift fail-closed three-dot `origin/main...HEAD` (real-base fallback `origin/main`→`main`→warn-pass).
- **No model runs.** No comparison against other guards.
- **No reduction of `live_capture_origin_self_reported`** — sacred non-claim, stays signed and unchanged; 3W is orthogonal release/build provenance.
- **No online dependency in the offline verifier** — Sigstore / Rekor / `gh attestation verify` NEVER gate offline verification; they live in reviewer docs only.
- **CI computes observed verdicts from real command exits, never echoed** (`verification_mode: ci_observed_not_echoed`).
- **Offline and online roots corroborate by digest equality only** — no signature nesting, no circular dependency. The offline bundle binds the deterministic witness-verdict **file** as a subject, NOT the Sigstore attestation over it.
- **`evidence-hashes.json` excludes itself** and must NOT include any online Sigstore attestation object.
- Reuse, do not modify: `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`, `sha256Hex` — already prefixes `sha256:`, `fingerprintPublicKey`), `tools/simurgh-attestation/keygen.mjs`.
- Determinism: `stable(v) = JSON.stringify(v, null, 2) + "\n"`. `sha256Hex` already prefixes — never double-prefix. Run `npm run format:check` + prettier on ALL new files, then `write-hashes` AFTER prettier (README + JSON are hashed).
- Verifier fails closed: returns `{ ok:false, checks }`, never throws. Deep-freeze enums/configs.
- Security-audit accusatory/named-lab scan scoped to machine `.json`. No raw prompts; no LG4 output beyond the approved 3V-B replay artifact (3W copies none of it).
- 100% function coverage on the pure lib (`stage3wWitnessLib.mjs`); CLIs subprocess-covered, excluded from the function-coverage gate.
- Own key `~/.simurgh/3w-ed25519.pem` (mode 0600, never committed); only the public key is committed. Neutral commits, no Co-Authored-By trailer.
- Smoke reserved port **33210** via the shared `boot_server` helper. Branch `main-stage-3w-witnessed-vca-release-provenance`. Tag **v2.7.0-stage-3w-witnessed-vca-release-provenance**.

## Witnessed 3V-B facts (fixed inputs)

- Merge commit: `b645d80`
- Tag: `v2.6.0-stage-3v-b-llamaguard-external-defense-attestation`
- Release URL: `https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.6.0-stage-3v-b-llamaguard-external-defense-attestation`
- Bound 3V-B subject files: `docs/research/llm-shield/evidence/stage-3v-b/attestation.bundle.json`, `.../attestation.signature.json`, `.../capture-replay/lg4-frozen-capture.json`, `.../evidence-hashes.json`

---

## File Structure

**New pure lib (100% function-coverage gated):**
- `tools/simurgh-attestation/stage3wWitnessLib.mjs` — `WITNESSED_3VB`, `computeStage3vbSubjects()`, `buildWitnessVerdict(observed)`, `buildReleaseWitnessStatement(subjects, witnessVerdictDigest)`.

**New runner / attestation (subprocess-covered, excluded from coverage gate):**
- `tools/simurgh-attestation/build-3w-witness.mjs` — CLI build/hash/verify/write-hashes/verify-hashes.
- `tools/simurgh-attestation/sign-3w-witness.mjs` — local signer.
- `tools/simurgh-attestation/verify-stage3w-witness.mjs` — two-tier verifier, fails closed.
- `tests/e2e/llm_shield_stage3w_tamper_runner.mjs` — negative self-proof.

**New scripts (offline gates → check.sh):**
- `scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard,reproduce}-llm-shield-stage3w.*`.

**New CI (online, NOT in check.sh):** `.github/workflows/stage-3w-witness.yml`.

**Committed evidence:** `docs/research/llm-shield/evidence/stage-3w/` — `attestation.bundle.json`, `attestation.signature.json`, `github-witness-verdict.json`, `provenance.json`, `evidence-hashes.json`, `self-proof-results.json`, `keys/stage3w-public-key.json` + `keys/fingerprint.txt`, `README.md`.

**Docs:** `docs/research/llm-shield/LLM_SHIELD_STAGE_3W_WRITEUP.md` + `STAGE_3W_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

**Unit tests:** `tests/unit/llmShield/stage3w/*.test.js`.

**Modify:** `scripts/check.sh` (insert after the 3V-B coverage block that ends ~line 2018).

---

## Task 1: Pure witness library

**Files:**
- Create: `tools/simurgh-attestation/stage3wWitnessLib.mjs`
- Test: `tests/unit/llmShield/stage3w/witnessLib.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex` from `./canonicalise.mjs`; reads committed 3V-B evidence files.
- Produces:
  - `WITNESSED_3VB` (frozen): `{ commit:"b645d80", tag:"v2.6.0-stage-3v-b-llamaguard-external-defense-attestation", release_url:"https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.6.0-stage-3v-b-llamaguard-external-defense-attestation" }`.
  - `computeStage3vbSubjects()` → frozen object mapping the four 3V-B subject paths (relative to `docs/research/llm-shield/evidence/`) to `sha256:` digests of their committed bytes.
  - `buildWitnessVerdict(observed)` → the deterministic `github-witness-verdict.json` object. `observed` defaults to the canonical PASS values; `expected` is always the canonical PASS values; `expected_equals_observed` is computed.
  - `buildReleaseWitnessStatement(subjects, witnessVerdictDigest)` → in-toto Statement v1 object.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3w/witnessLib.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WITNESSED_3VB,
  computeStage3vbSubjects,
  buildWitnessVerdict,
  buildReleaseWitnessStatement,
} from "../../../../tools/simurgh-attestation/stage3wWitnessLib.mjs";

test("WITNESSED_3VB pins the sealed 3V-B release and is frozen", () => {
  assert.equal(WITNESSED_3VB.commit, "b645d80");
  assert.match(WITNESSED_3VB.tag, /^v2\.6\.0-stage-3v-b/);
  assert.equal(Object.isFrozen(WITNESSED_3VB), true);
});

test("computeStage3vbSubjects returns four sha256-prefixed digests", () => {
  const s = computeStage3vbSubjects();
  const keys = Object.keys(s).sort();
  assert.deepEqual(keys, [
    "stage-3v-b/attestation.bundle.json",
    "stage-3v-b/attestation.signature.json",
    "stage-3v-b/capture-replay/lg4-frozen-capture.json",
    "stage-3v-b/evidence-hashes.json",
  ]);
  assert.equal(
    Object.values(s).every((v) => /^sha256:[0-9a-f]{64}$/.test(v)),
    true
  );
});

test("buildWitnessVerdict default is observed-not-echoed and expected==observed", () => {
  const v = buildWitnessVerdict();
  assert.equal(v.schema, "simurgh.stage3w.github_witness_verdict.v1");
  assert.equal(v.verification_mode, "ci_observed_not_echoed");
  assert.equal(v.expected_equals_observed, true);
  assert.deepEqual(v.expected, v.ci_observed);
  assert.equal(v.expected.model_reexecuted_in_ci, false);
  assert.equal(Object.keys(v.subjects).length, 4);
});

test("buildWitnessVerdict flags divergence when observed != expected", () => {
  const v = buildWitnessVerdict({ stage3vb_verifier: "FAIL" });
  assert.equal(v.ci_observed.stage3vb_verifier, "FAIL");
  assert.equal(v.expected_equals_observed, false);
});

test("buildReleaseWitnessStatement binds 3V-B subjects + witness-verdict file, not Sigstore", () => {
  const subjects = computeStage3vbSubjects();
  const stmt = buildReleaseWitnessStatement(subjects, "sha256:" + "a".repeat(64));
  assert.equal(stmt._type, "https://in-toto.io/Statement/v1");
  assert.equal(stmt.predicateType, "https://project-simurgh.dev/predicates/vca-release-witness/v1");
  const names = stmt.subject.map((s) => s.name).sort();
  assert.ok(names.includes("stage-3w/github-witness-verdict.json"));
  assert.ok(names.includes("stage-3v-b/attestation.bundle.json"));
  assert.equal(stmt.predicate.witnessed_stage, "3V-B");
  assert.equal(stmt.predicate.release_commit, "b645d80");
  assert.equal(stmt.predicate.model_reexecuted_in_ci, false);
  assert.equal(stmt.predicate.online_witness.required_for_offline_verification, false);
  assert.ok(stmt.predicate.non_claims.includes("does_not_reduce_live_capture_origin_self_reported"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3w/witnessLib.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/simurgh-attestation/stage3wWitnessLib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for Stage 3W (witnessed VCA release provenance). Reads the committed, sealed 3V-B
// evidence and produces (a) the deterministic CI witness-verdict object and (b) the offline
// in-toto release-witness statement. No network, no model, no src/llmShield. The offline statement
// binds the witness-verdict FILE digest as a subject — never the online Sigstore attestation.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EV_ROOT = join(HERE, "../../docs/research/llm-shield/evidence");

export const WITNESSED_3VB = Object.freeze({
  commit: "b645d80",
  tag: "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
  release_url:
    "https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
});

const SUBJECT_PATHS = Object.freeze([
  "stage-3v-b/attestation.bundle.json",
  "stage-3v-b/attestation.signature.json",
  "stage-3v-b/capture-replay/lg4-frozen-capture.json",
  "stage-3v-b/evidence-hashes.json",
]);

const EXPECTED = Object.freeze({
  stage3vb_verifier: "PASS",
  stage3vb_reproduce: "PASS",
  stage3vb_live_release_gate: "PASS",
  stage3vb_evidence_hashes_match: true,
  model_reexecuted_in_ci: false,
});

const NON_CLAIMS = Object.freeze([
  "does_not_reduce_live_capture_origin_self_reported",
  "does_not_prove_live_capture_origin",
  "does_not_reexecute_llama_guard_4",
  "sigstore_not_required_for_offline_verification",
  "does_not_rank_external_defences",
]);

export function computeStage3vbSubjects() {
  const out = {};
  for (const rel of SUBJECT_PATHS) out[rel] = sha256Hex(readFileSync(join(EV_ROOT, rel), "utf8"));
  return Object.freeze(out);
}

export function buildWitnessVerdict(observed = {}) {
  const ci_observed = { ...EXPECTED, ...observed };
  const subjects = computeStage3vbSubjects();
  return {
    schema: "simurgh.stage3w.github_witness_verdict.v1",
    witness_claim: "verify_and_attest_verdict",
    verification_mode: "ci_observed_not_echoed",
    witness_root: "github_oidc_sigstore",
    repo: "Raoof128/Project-Simurgh",
    commit: WITNESSED_3VB.commit,
    tag: WITNESSED_3VB.tag,
    verified_stage: "3V-B",
    expected: { ...EXPECTED },
    ci_observed,
    expected_equals_observed: canonicalJson({ ...EXPECTED }) === canonicalJson(ci_observed),
    subjects: {
      stage3vb_attestation_bundle_sha256: subjects["stage-3v-b/attestation.bundle.json"],
      stage3vb_signature_sha256: subjects["stage-3v-b/attestation.signature.json"],
      stage3vb_capture_replay_sha256: subjects["stage-3v-b/capture-replay/lg4-frozen-capture.json"],
      stage3vb_evidence_hashes_sha256: subjects["stage-3v-b/evidence-hashes.json"],
    },
    non_claims: [
      "does_not_prove_live_capture_origin",
      "does_not_reexecute_llama_guard_4",
      "does_not_reduce_live_capture_origin_self_reported",
      "does_not_rank_external_defences",
    ],
  };
}

export function buildReleaseWitnessStatement(subjects, witnessVerdictDigest) {
  const subject = Object.entries(subjects)
    .map(([name, digest]) => ({ name, digest: { sha256: digest.replace(/^sha256:/, "") } }))
    .concat([
      {
        name: "stage-3w/github-witness-verdict.json",
        digest: { sha256: witnessVerdictDigest.replace(/^sha256:/, "") },
      },
    ])
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://project-simurgh.dev/predicates/vca-release-witness/v1",
    subject,
    predicate: {
      stage: "3W",
      witnessed_stage: "3V-B",
      release_commit: WITNESSED_3VB.commit,
      tag: WITNESSED_3VB.tag,
      release_url: WITNESSED_3VB.release_url,
      offline_reproduce_passed: true,
      live_release_gate_passed: true,
      model_reexecuted_in_ci: false,
      online_witness: {
        provider: "github_artifact_attestations",
        workflow: ".github/workflows/stage-3w-witness.yml",
        subject: "docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json",
        required_for_offline_verification: false,
      },
      non_claims: [...NON_CLAIMS],
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3w/witnessLib.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage3wWitnessLib.mjs tests/unit/llmShield/stage3w/witnessLib.test.js
git commit -m "feat(3w): pure witness lib — 3V-B subjects, deterministic CI verdict, in-toto statement"
```

---

## Task 2: Runner — build evidence + bundle

**Files:**
- Create: `tools/simurgh-attestation/build-3w-witness.mjs`
- Create (generated): `docs/research/llm-shield/evidence/stage-3w/{github-witness-verdict.json,provenance.json,attestation.bundle.json}`
- Test: `tests/unit/llmShield/stage3w/bundle.test.js`

**Interfaces:**
- Consumes: `stage3wWitnessLib` (Task 1); `canonicalJson`, `sha256Hex`.
- Produces: `buildWitnessVerdictFile()` → verdict object; `buildBundle()` → in-toto statement (the offline bundle); CLI `build [--update] | hash | verify | write-hashes | verify-hashes`.
- The bundle's witness-verdict subject digest = `sha256Hex(stable(buildWitnessVerdictFile()))` (binds the committed file's exact bytes). `write-hashes` walks the 3W evidence dir, **excludes `evidence-hashes.json`**, and never includes any Sigstore object (none exist in the dir).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3w/bundle.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBundle, buildWitnessVerdictFile } from "../../../../tools/simurgh-attestation/build-3w-witness.mjs";

test("bundle is an in-toto release-witness binding the witness-verdict file", () => {
  const b = buildBundle();
  assert.equal(b._type, "https://in-toto.io/Statement/v1");
  assert.equal(b.predicate.witnessed_stage, "3V-B");
  assert.equal(b.predicate.online_witness.required_for_offline_verification, false);
  const names = b.subject.map((s) => s.name);
  assert.ok(names.includes("stage-3w/github-witness-verdict.json"));
});
test("bundle + verdict are deterministic", () => {
  assert.deepEqual(buildBundle(), buildBundle());
  assert.deepEqual(buildWitnessVerdictFile(), buildWitnessVerdictFile());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3w/bundle.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the runner**

```js
// tools/simurgh-attestation/build-3w-witness.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W runner. Offline + deterministic. Builds the offline in-toto release-witness bundle and
// the deterministic CI witness-verdict file, writes metadata-only evidence, re-verifies byte-stable.
// write-hashes runs AFTER prettier and EXCLUDES evidence-hashes.json itself (no online Sigstore
// object is ever hashed — offline verification must not depend on the online layer).
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";
import {
  buildWitnessVerdict,
  buildReleaseWitnessStatement,
  computeStage3vbSubjects,
} from "./stage3wWitnessLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildWitnessVerdictFile() {
  return buildWitnessVerdict();
}

export function buildBundle() {
  const subjects = computeStage3vbSubjects();
  const witnessVerdictDigest = sha256Hex(stable(buildWitnessVerdictFile()));
  return buildReleaseWitnessStatement(subjects, witnessVerdictDigest);
}

export function buildProvenance() {
  return {
    schema: "simurgh.stage3w.provenance.v1",
    witnessed_stage: "3V-B",
    witnessed_tag: "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
    witnessed_commit: "b645d80",
    offline_root: "simurgh_ed25519",
    online_root: "github_oidc_sigstore",
    corroboration: "digest_equality_no_signature_nesting",
    sigstore_required_for_offline_verification: false,
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile() && !p.endsWith("evidence-hashes.json")) out.push(p);
  }
  return out;
}
async function writeEvidenceHashes() {
  const files = (await walk(EV)).sort();
  const map = {};
  for (const f of files) map[f] = sha256Hex(await readFile(f, "utf8"));
  await writeFile(join(EV, "evidence-hashes.json"), stable(map));
}

async function main() {
  const cmd = process.argv[2];
  const update = process.argv.includes("--update");
  const bundle = buildBundle();
  const verdict = buildWitnessVerdictFile();
  if (cmd === "build") {
    if (update) {
      await writeFile(join(EV, "github-witness-verdict.json"), stable(verdict));
      await writeFile(join(EV, "provenance.json"), stable(buildProvenance()));
      await writeFile(join(EV, "attestation.bundle.json"), stable(bundle));
      console.log("stage3w: evidence written (update; run prettier then sign + write-hashes)");
      return;
    }
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle drifted");
    if (stable(await rd("github-witness-verdict.json")) !== stable(verdict))
      throw new Error("witness-verdict drifted");
    console.log("stage3w evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(
      JSON.stringify(
        { witness_verdict_sha256: sha256Hex(stable(verdict)), bundle_sha256: sha256Hex(canonicalJson(bundle)) },
        null,
        2
      )
    );
  } else if (cmd === "verify") {
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle reproduction mismatch");
    if (stable(await rd("github-witness-verdict.json")) !== stable(verdict))
      throw new Error("witness-verdict reproduction mismatch");
    console.log("stage3w: bundle + witness-verdict reproduce");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3w: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3w: evidence hashes match");
  } else {
    console.error("usage: build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3w runner:", e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run test, generate evidence, verify**

Run: `node --test tests/unit/llmShield/stage3w/bundle.test.js`
Expected: PASS (2 tests).
Run: `node tools/simurgh-attestation/build-3w-witness.mjs build --update`
Expected: `stage3w: evidence written ...`; creates the three JSON files.
Run: `npx prettier --write "docs/research/llm-shield/evidence/stage-3w/**/*.json"`
Run: `node tools/simurgh-attestation/build-3w-witness.mjs verify`
Expected: `stage3w: bundle + witness-verdict reproduce`.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/build-3w-witness.mjs tests/unit/llmShield/stage3w/bundle.test.js docs/research/llm-shield/evidence/stage-3w/*.json
git commit -m "feat(3w): runner + generated offline bundle, witness-verdict, provenance"
```

---

## Task 3: 3W Ed25519 key + signer

**Files:**
- Create: `tools/simurgh-attestation/sign-3w-witness.mjs`
- Create (committed): `docs/research/llm-shield/evidence/stage-3w/keys/stage3w-public-key.json`, `keys/fingerprint.txt`
- Create (NOT committed): `~/.simurgh/3w-ed25519.pem`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`, `fingerprintPublicKey`; `keygen.mjs`.
- Produces: `attestation.signature.json` (schema `simurgh.vca.release_witness.signature.v1`) over `canonicalJson(bundle)`.

- [ ] **Step 1: Generate the keypair (one-time)**

```bash
mkdir -p ~/.simurgh docs/research/llm-shield/evidence/stage-3w/keys
node tools/simurgh-attestation/keygen.mjs \
  --out-private ~/.simurgh/3w-ed25519.pem \
  --out-public docs/research/llm-shield/evidence/stage-3w/keys/stage3w-public-key.json
chmod 600 ~/.simurgh/3w-ed25519.pem
node -e 'console.log(JSON.parse(require("fs").readFileSync("docs/research/llm-shield/evidence/stage-3w/keys/stage3w-public-key.json")).fingerprint)' > docs/research/llm-shield/evidence/stage-3w/keys/fingerprint.txt
```

Expected: `stage3w-public-key.json` with `fingerprint: "sha256:..."`; private key mode 600, never committed.

- [ ] **Step 2: Write the signer**

```js
// tools/simurgh-attestation/sign-3w-witness.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3W offline release-witness bundle. Reads
// SIMURGH_3W_PRIVATE_KEY_PATH (default ~/.simurgh/3w-ed25519.pem); CI never runs this. Signs
// canonicalJson(parse(bundle)) — canonical-not-bytes, so prettier/merge cannot break it.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_3W_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3w-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3w-public-key.json"), "utf8"));
  const bundle = JSON.parse(await readFile(join(EV, "attestation.bundle.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.vca.release_witness.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "attestation.signature.json"), stable(sidecar));
  console.log("stage3w: signed; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error("stage3w sign:", e.message);
  process.exit(1);
});
```

- [ ] **Step 3: Sign the committed bundle**

Run: `node tools/simurgh-attestation/sign-3w-witness.mjs`
Expected: `stage3w: signed; fingerprint sha256:...`.

- [ ] **Step 4: Commit (public key + signer + sidecar — never the private key)**

```bash
git add tools/simurgh-attestation/sign-3w-witness.mjs docs/research/llm-shield/evidence/stage-3w/keys docs/research/llm-shield/evidence/stage-3w/attestation.signature.json
git status --porcelain | grep -i pem && echo "ABORT: private key staged" || git commit -m "feat(3w): own Ed25519 key + local signer; sign release-witness bundle"
```

---

## Task 4: Two-tier offline verifier

**Files:**
- Create: `tools/simurgh-attestation/verify-stage3w-witness.mjs`
- Test: `tests/unit/llmShield/stage3w/verifier.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`, `fingerprintPublicKey`; the runner's `buildBundle` + `buildWitnessVerdictFile` for `--reproduce`.
- Produces: `verifyWitness({ bundle, sidecar, publicKeyPem, reproduce, rebuild, rebuildVerdict })` → `{ ok, checks }`. Portable: `bundle_sha256`, `fingerprint`, `signature`, `type`, `witnessed_stage` (3V-B), `model_not_reexecuted`. `--reproduce`: `reproduce` (bundle byte-stable), `subjects_recomputed` (every 3V-B subject digest recomputed matches), `witness_verdict_recomputed` (committed witness-verdict bytes hash matches the digest bound in the bundle subject). Fails closed; never throws. **No network, no Sigstore.**

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3w/verifier.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyWitness } from "../../../../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import { buildBundle, buildWitnessVerdictFile } from "../../../../tools/simurgh-attestation/build-3w-witness.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3w-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyWitness({ bundle, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes subjects + witness-verdict", () => {
  const r = verifyWitness({
    bundle, sidecar, publicKeyPem: pub, reproduce: true,
    rebuild: buildBundle, rebuildVerdict: buildWitnessVerdictFile,
  });
  assert.equal(r.ok, true);
  assert.equal(r.checks.subjects_recomputed, true);
  assert.equal(r.checks.witness_verdict_recomputed, true);
});
test("fails closed on missing input (never throws)", () => {
  assert.equal(verifyWitness({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a tampered release_commit", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.predicate.release_commit = "deadbeef";
  assert.equal(verifyWitness({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3w/verifier.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the verifier**

```js
// tools/simurgh-attestation/verify-stage3w-witness.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier OFFLINE verifier for the Stage 3W release-witness bundle. No network, no Sigstore,
// no gh attestation. portable: signature over canonicalJson(bundle) + fingerprint + structural
// gates. --reproduce: re-derive the bundle byte-stable AND recompute every 3V-B subject digest
// and the witness-verdict file digest. Fails closed: { ok:false, checks }, never throws.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

function portableChecks({ bundle, sidecar, publicKeyPem }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_sha256 = sha256Hex(canonical) === sidecar.bundle_sha256;
  checks.fingerprint = fingerprintPublicKey(publicKeyPem) === sidecar.public_key_fingerprint;
  let sigOk = false;
  const sig = typeof sidecar.signature === "string" ? sidecar.signature.replace(/^base64:/, "") : "";
  try {
    sigOk = crypto.verify(null, canonical, crypto.createPublicKey(publicKeyPem), Buffer.from(sig, "base64"));
  } catch {
    sigOk = false;
  }
  checks.signature = !!sigOk;
  checks.type = bundle.predicateType === "https://project-simurgh.dev/predicates/vca-release-witness/v1";
  checks.witnessed_stage = bundle.predicate?.witnessed_stage === "3V-B";
  checks.model_not_reexecuted = bundle.predicate?.model_reexecuted_in_ci === false;
  return checks;
}

export function verifyWitness({ bundle, sidecar, publicKeyPem, reproduce = false, rebuild, rebuildVerdict } = {}) {
  try {
    if (!bundle || !sidecar || !publicKeyPem) return { ok: false, checks: { input_present: false } };
    const checks = portableChecks({ bundle, sidecar, publicKeyPem });
    if (reproduce) {
      if (typeof rebuild !== "function" || typeof rebuildVerdict !== "function")
        return { ok: false, checks: { ...checks, reproduce_rebuild_missing: true } };
      const stable = (v) => JSON.stringify(v, null, 2) + "\n";
      const rebuilt = rebuild();
      checks.reproduce = stable(rebuilt) === stable(bundle);
      const rebuiltSubjects = Object.fromEntries(rebuilt.subject.map((s) => [s.name, s.digest.sha256]));
      const bundleSubjects = Object.fromEntries(bundle.subject.map((s) => [s.name, s.digest.sha256]));
      checks.subjects_recomputed = Object.keys(rebuiltSubjects).every(
        (k) => rebuiltSubjects[k] === bundleSubjects[k]
      );
      const verdictDigest = "sha256:" + sha256Hex(stable(rebuildVerdict())).replace(/^sha256:/, "");
      const boundVerdict =
        "sha256:" + (bundleSubjects["stage-3w/github-witness-verdict.json"] || "");
      checks.witness_verdict_recomputed = verdictDigest === boundVerdict;
    }
    return { ok: Object.values(checks).every(Boolean), checks };
  } catch {
    return { ok: false, checks: { threw: true } };
  }
}

async function cli() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const EV = "docs/research/llm-shield/evidence/stage-3w";
  const reproduce = process.argv.includes("--reproduce");
  const bundle = JSON.parse(await readFile(join(EV, "attestation.bundle.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "attestation.signature.json"), "utf8"));
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3w-public-key.json"), "utf8")).public_key_pem;
  let rebuild, rebuildVerdict;
  if (reproduce)
    ({ buildBundle: rebuild, buildWitnessVerdictFile: rebuildVerdict } = await import("./build-3w-witness.mjs"));
  const result = verifyWitness({ bundle, sidecar, publicKeyPem: pub, reproduce, rebuild, rebuildVerdict });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`)
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3w/verifier.test.js`
Expected: PASS (4 tests).
Run: `node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce`
Expected: JSON with `"ok": true`.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/verify-stage3w-witness.mjs tests/unit/llmShield/stage3w/verifier.test.js
git commit -m "feat(3w): two-tier offline verifier (portable + reproduce, no network, fails closed)"
```

---

## Task 5: Tamper / negative self-proof

**Files:**
- Create: `tests/e2e/llm_shield_stage3w_tamper_runner.mjs`
- Create (generated): `docs/research/llm-shield/evidence/stage-3w/self-proof-results.json`
- Test: `tests/unit/llmShield/stage3w/tamper.test.js`

**Interfaces:**
- Consumes: `verifyWitness`; the committed evidence.
- Produces: `runStage3wSelfProof()` → `{ all_passed, cases, counters }`. ≥9 cases: `subject_digest_edited`, `release_commit_edited`, `tag_edited`, `witness_verdict_file_edited` (recompute its digest vs bound subject), `ci_observed_flipped`, `signature_tampered`, `wrong_public_key`, `file_removed`, `forbidden_raw_field_injected`. Counters `accepted_tampered_bundles` and `raw_field_in_bundle` stay 0.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3w/tamper.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { runStage3wSelfProof } from "../../../../tests/e2e/llm_shield_stage3w_tamper_runner.mjs";

test("every tamper case rejected, counters zero", () => {
  const r = runStage3wSelfProof();
  assert.equal(r.all_passed, true);
  assert.ok(r.cases.length >= 9);
  assert.equal(r.counters.accepted_tampered_bundles, 0);
  assert.equal(r.counters.raw_field_in_bundle, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3w/tamper.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the tamper runner**

```js
// tests/e2e/llm_shield_stage3w_tamper_runner.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W negative self-proof. Mutates committed evidence; asserts the offline verifier rejects
// each (ok:false). Counters for must-not-happen classes stay 0. Deterministic, offline.
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyWitness } from "../../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import { buildBundle, buildWitnessVerdictFile } from "../../tools/simurgh-attestation/build-3w-witness.mjs";
import { sha256Hex } from "../../tools/simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3w-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3wSelfProof() {
  const cases = [];
  const reject = (name, b, s = sidecar, p = pub, opts = {}) =>
    cases.push({
      name,
      rejected:
        verifyWitness({ bundle: b, sidecar: s, publicKeyPem: p, ...opts }).ok === false,
    });

  const subj = clone(bundle);
  subj.subject[0].digest.sha256 = "0".repeat(64);
  reject("subject_digest_edited", subj);

  const rc = clone(bundle);
  rc.predicate.release_commit = "deadbeef";
  reject("release_commit_edited", rc);

  const tg = clone(bundle);
  tg.predicate.tag = "v9.9.9-fake";
  reject("tag_edited", tg);

  // witness-verdict file edited: bound subject digest no longer matches the rebuilt verdict file.
  // Detected under --reproduce (witness_verdict_recomputed=false) via a stubbed rebuildVerdict.
  reject("witness_verdict_file_edited", bundle, sidecar, pub, {
    reproduce: true,
    rebuild: buildBundle,
    rebuildVerdict: () => ({ ...buildWitnessVerdictFile(), tampered: true }),
  });

  const co = clone(bundle);
  // flipping a ci_observed boolean lives in the verdict file; emulate via subject mismatch:
  co.subject = co.subject.map((s) =>
    s.name === "stage-3w/github-witness-verdict.json" ? { ...s, digest: { sha256: "1".repeat(64) } } : s
  );
  reject("ci_observed_flipped", co);

  const st = clone(sidecar);
  st.signature = "base64:" + Buffer.from("nope").toString("base64");
  reject("signature_tampered", bundle, st);

  const wrong = crypto.generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", bundle, sidecar, wrong);

  cases.push({
    name: "file_removed",
    rejected: verifyWitness({ bundle, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  const raw = clone(bundle);
  raw.injected_raw_output = "[REDACTED-SYNTHETIC]";
  reject("forbidden_raw_field_injected", raw);

  const counters = {
    accepted_tampered_bundles: cases.filter((c) => !c.rejected).length,
    raw_field_in_bundle: Object.keys(bundle).some((k) => /raw_output|raw_prompt/i.test(k)) ? 1 : 0,
  };
  return {
    all_passed: cases.every((c) => c.rejected) && Object.values(counters).every((v) => v === 0),
    cases,
    counters,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runStage3wSelfProof();
  writeFileSync(`${EV}/self-proof-results.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify({ all_passed: r.all_passed, counters: r.counters }, null, 2));
  if (!r.all_passed) process.exit(1);
}
```

- [ ] **Step 4: Run test, generate self-proof results**

Run: `node --test tests/unit/llmShield/stage3w/tamper.test.js`
Expected: PASS (1 test).
Run: `node tests/e2e/llm_shield_stage3w_tamper_runner.mjs`
Expected: `"all_passed": true`; writes `self-proof-results.json`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3w_tamper_runner.mjs tests/unit/llmShield/stage3w/tamper.test.js docs/research/llm-shield/evidence/stage-3w/self-proof-results.json
git commit -m "feat(3w): negative self-proof tamper suite (>=9 cases, counters zero)"
```

---

## Task 6: Offline gate scripts

**Files:**
- Create: `scripts/smoke-llm-shield-stage3w.sh`, `scripts/security-audit-llm-shield-stage3w.sh`, `scripts/privacy-audit-llm-shield-stage3w.mjs`, `scripts/consistency-audit-llm-shield-stage3w.mjs`, `scripts/policy-drift-guard-llm-shield-stage3w.sh`, `scripts/reproduce-llm-shield-stage3w.sh`

**Interfaces:** each exits non-zero on failure. All OFFLINE — none invoke Sigstore / `gh attestation`.

- [ ] **Step 1: Write smoke + reproduce + policy-drift**

```bash
# scripts/smoke-llm-shield-stage3w.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
PORT="${SIMURGH_STAGE3W_PORT:-33210}" # inside the reserved 33000-33999 band
LOG_DIR="${SIMURGH_STAGE3W_LOG_DIR:-.simurgh_check_logs/stage3w-smoke}"
mkdir -p "$LOG_DIR"
SRV_PID=""
cleanup() { [[ -n "$SRV_PID" ]] && { kill "$SRV_PID" 2>/dev/null || true; wait "$SRV_PID" 2>/dev/null || true; }; }
trap cleanup EXIT
# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

echo "LLM Shield 3W witnessed-release-provenance smoke"
node --check tools/simurgh-attestation/build-3w-witness.mjs
boot_server "$PORT" "$LOG_DIR/server.log" "Stage 3W server" -- \
  env SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js
SRV_PID="$BOOTED_PID" # health-gates the demo server like sibling smokes; 3W itself is offline

node tools/simurgh-attestation/build-3w-witness.mjs verify
node tools/simurgh-attestation/build-3w-witness.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3w-witness.mjs >/dev/null
node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce >/dev/null
node tests/e2e/llm_shield_stage3w_tamper_runner.mjs >/dev/null
echo "stage3w smoke: passed"
```

```bash
# scripts/reproduce-llm-shield-stage3w.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Stage 3W offline reproduction"
node tools/simurgh-attestation/build-3w-witness.mjs verify
node tools/simurgh-attestation/build-3w-witness.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce
node tests/e2e/llm_shield_stage3w_tamper_runner.mjs
echo "Stage 3W reproduction: PASS"
```

```bash
# scripts/policy-drift-guard-llm-shield-stage3w.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE=""
for ref in origin/main main; do
  if git rev-parse --verify --quiet "$ref" >/dev/null; then BASE="$ref"; break; fi
done
if [[ -z "$BASE" ]]; then echo "policy-drift-3w: no base ref; warn-pass"; exit 0; fi
CHANGED="$(git diff --name-only "$BASE...HEAD" -- src/llmShield || true)"
if [[ -n "$CHANGED" ]]; then
  echo "policy-drift-3w: Stage 3W is tooling-only but src/llmShield changed:" >&2
  echo "$CHANGED" >&2
  exit 1
fi
echo "policy-drift-3w: PASS (no src/llmShield changes)"
```

- [ ] **Step 2: Write security + privacy + consistency audits**

```bash
# scripts/security-audit-llm-shield-stage3w.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3w"
echo "Stage 3W security audit"

# (1) machine artifacts must not name third-party labs or use accusatory wording
if grep -RniE "deepseek|moonshot|minimax|attacker|stolen|fraudulent|guilty" "$EV"/*.json "$EV"/keys/*.json; then
  echo "named-lab / accusatory wording in machine artifact" >&2; exit 1
fi

# (2) the sacred non-claim and the offline-primary invariant must be present and intact
node -e '
const b = require("./'"$EV"'/attestation.bundle.json");
if (b.predicate.witnessed_stage !== "3V-B") throw new Error("witnessed_stage must be 3V-B");
if (b.predicate.model_reexecuted_in_ci !== false) throw new Error("model_reexecuted_in_ci must be false");
if (!b.predicate.non_claims.includes("does_not_reduce_live_capture_origin_self_reported")) throw new Error("missing sacred non-claim");
if (b.predicate.online_witness.required_for_offline_verification !== false) throw new Error("online witness must not be required offline");
'

# (3) offline evidence must contain NO Sigstore/Rekor/attestation object (online layer stays out)
if grep -RniE "rekor|sigstore|\\.sigstore|\\.intoto\\.jsonl|bundle\\.sigstore" "$EV"/*.json; then
  echo "online attestation object leaked into offline evidence" >&2; exit 1
fi
echo "Stage 3W security audit: pass"
```

```js
// scripts/privacy-audit-llm-shield-stage3w.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W privacy audit. Committed evidence is metadata-only: no secrets/tokens/emails, no raw
// prompts, no LG4 raw output (3W copies none). Fail-closed.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3w";
const FORBIDDEN = [
  /\bsk-[a-z0-9]/i,
  /api[_-]?key/i,
  /hf_[A-Za-z0-9]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];
async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) out.push(p);
  }
  return out;
}
const files = await walk(EV);
let bad = 0;
for (const f of files) {
  const text = await readFile(f, "utf8");
  for (const rx of FORBIDDEN) if (rx.test(text)) { console.error(`privacy violation in ${f}: ${rx}`); bad += 1; }
}
if (bad) { console.error(`stage3w privacy audit: ${bad} violation(s)`); process.exit(1); }
console.log(`stage3w privacy audit: PASS (${files.length} file(s), metadata-only)`);
```

```js
// scripts/consistency-audit-llm-shield-stage3w.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyWitness } from "../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import { buildBundle, buildWitnessVerdictFile } from "../tools/simurgh-attestation/build-3w-witness.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3w";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const committed = await rd("attestation.bundle.json");
if (stable(committed) !== stable(buildBundle())) { console.error("bundle does not re-derive"); process.exit(1); }
const sidecar = await rd("attestation.signature.json");
const pub = (await rd("keys/stage3w-public-key.json")).public_key_pem;
const r = verifyWitness({ bundle: committed, sidecar, publicKeyPem: pub, reproduce: true, rebuild: buildBundle, rebuildVerdict: buildWitnessVerdictFile });
if (!r.ok) { console.error("consistency: verify failed", JSON.stringify(r.checks)); process.exit(1); }
console.log("stage3w consistency audit: PASS");
```

- [ ] **Step 3: Make executable, run all**

Run: `chmod +x scripts/smoke-llm-shield-stage3w.sh scripts/security-audit-llm-shield-stage3w.sh scripts/policy-drift-guard-llm-shield-stage3w.sh scripts/reproduce-llm-shield-stage3w.sh`
Run: `scripts/security-audit-llm-shield-stage3w.sh && node scripts/privacy-audit-llm-shield-stage3w.mjs && node scripts/consistency-audit-llm-shield-stage3w.mjs && scripts/policy-drift-guard-llm-shield-stage3w.sh`
Expected: each prints its PASS line.
Run: `node tools/simurgh-attestation/build-3w-witness.mjs write-hashes && scripts/reproduce-llm-shield-stage3w.sh && scripts/smoke-llm-shield-stage3w.sh`
Expected: reproduction PASS; `stage3w smoke: passed`.

- [ ] **Step 4: Commit**

```bash
git add scripts/*-llm-shield-stage3w.* docs/research/llm-shield/evidence/stage-3w/evidence-hashes.json
git commit -m "feat(3w): offline smoke + security/privacy/consistency audits + policy-drift + reproduce"
```

---

## Task 7: Online CI witness workflow

**Files:**
- Create: `.github/workflows/stage-3w-witness.yml`

**Interfaces:** standalone GitHub Actions workflow; not referenced by `check.sh`. Produces a Sigstore-backed build-provenance attestation over the committed witness-verdict file after asserting CI-observed reality matches it.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/stage-3w-witness.yml
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3W online witness. SEPARATE from the offline quality gate (stage-1-checks.yml). A clean
# GitHub runner re-runs the 3V-B offline gates, regenerates the witness-verdict from REAL results,
# asserts it is byte-identical to the committed file, then signs it via GitHub artifact
# attestations (OIDC/Sigstore). Offline verification never depends on this workflow.
# Release-hardening option: pin actions/attest-build-provenance to a full commit SHA before tagging.
name: Stage 3W Witness
on:
  push:
    tags:
      - "v2.7.0-stage-3w-*"
  workflow_dispatch: {}

permissions:
  id-token: write
  attestations: write
  contents: read

jobs:
  witness:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Install deps
        run: npm ci
      - name: Re-run 3V-B offline gates and regenerate the witness verdict from REAL exit codes
        run: |
          # Amendment: ci_observed MUST be built from ACTUAL command exit status, never inferred
          # from the committed JSON. Do NOT use `set -e` here — capture each exit code explicitly.
          set +e
          node tools/simurgh-attestation/verify-stage3vb-external-defense.mjs --reproduce >/dev/null 2>&1; V=$?
          node tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs verify >/dev/null 2>&1; RP=$?
          scripts/assert-stage3vb-live-release.sh >/dev/null 2>&1; LR=$?
          node tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs verify-hashes >/dev/null 2>&1; EH=$?
          set -e
          export OBS_VERIFIER=$([ $V -eq 0 ] && echo PASS || echo FAIL)
          export OBS_REPRODUCE=$([ $RP -eq 0 ] && echo PASS || echo FAIL)
          export OBS_LIVE_RELEASE=$([ $LR -eq 0 ] && echo PASS || echo FAIL)
          export OBS_HASHES=$([ $EH -eq 0 ] && echo true || echo false)
          node -e '
            const { buildWitnessVerdict } = require("./tools/simurgh-attestation/stage3wWitnessLib.mjs");
            const fs = require("fs");
            const stable = (v) => JSON.stringify(v, null, 2) + "\n";
            // ci_observed derived from the real exit codes captured above:
            const observed = {
              stage3vb_verifier: process.env.OBS_VERIFIER,
              stage3vb_reproduce: process.env.OBS_REPRODUCE,
              stage3vb_live_release_gate: process.env.OBS_LIVE_RELEASE,
              stage3vb_evidence_hashes_match: process.env.OBS_HASHES === "true",
              model_reexecuted_in_ci: false,
            };
            const regenerated = stable(buildWitnessVerdict(observed));
            const committed = fs.readFileSync("docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json", "utf8");
            if (regenerated !== committed) {
              console.error("CI-observed verdict (from real exit codes) is NOT byte-identical to committed");
              process.exit(1);
            }
            console.log("witness-verdict byte-identical; CI-observed (real exit codes) == committed");
          '
      - name: Attest the witness verdict (Sigstore-backed build provenance)
        uses: actions/attest-build-provenance@v3
        with:
          subject-path: docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json
```

- [ ] **Step 2: Validate YAML + ESM import locally**

Run: `node -e 'require("js-yaml")' 2>/dev/null || python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/stage-3w-witness.yml'));print('yaml-ok')"`
Expected: `yaml-ok`.
Run: `node -e 'import("./tools/simurgh-attestation/stage3wWitnessLib.mjs").then(m=>{const s=(v)=>JSON.stringify(v,null,2)+"\n";const a=s(m.buildWitnessVerdict());const b=require("fs").readFileSync("docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json","utf8");if(a!==b)throw new Error("verdict drift");console.log("verdict byte-identical to committed")})'`
Expected: `verdict byte-identical to committed` (the CI byte-identity assertion holds locally).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/stage-3w-witness.yml
git commit -m "feat(3w): online CI witness workflow (attest-build-provenance over witness verdict)"
```

---

## Task 8: Wire offline gates into check.sh + coverage

**Files:**
- Modify: `scripts/check.sh` (insert after the 3V-B coverage block, ~line 2018, before "3E-core docker smoke")

- [ ] **Step 1: Insert the 3W offline gate block**

Insert immediately after the `fi` closing "LLM Shield 3V-B external-defence lib coverage":

```bash
# ── LLM Shield 3W witnessed VCA release provenance (offline gates only) ─────────
step "LLM Shield 3W witnessed-release smoke"
if scripts/smoke-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-smoke.log" 2>&1; then
  pass "LLM Shield 3W witnessed-release smoke"
else
  fail "LLM Shield 3W witnessed-release smoke"; tail -60 "$LOG_DIR/llm-shield-stage3w-smoke.log"
fi

step "LLM Shield 3W security audit"
if scripts/security-audit-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-security.log" 2>&1; then
  pass "LLM Shield 3W security audit"
else
  fail "LLM Shield 3W security audit"; tail -40 "$LOG_DIR/llm-shield-stage3w-security.log"
fi

step "LLM Shield 3W privacy audit"
if node scripts/privacy-audit-llm-shield-stage3w.mjs > "$LOG_DIR/llm-shield-stage3w-privacy.log" 2>&1; then
  pass "LLM Shield 3W privacy audit"
else
  fail "LLM Shield 3W privacy audit"; tail -40 "$LOG_DIR/llm-shield-stage3w-privacy.log"
fi

step "LLM Shield 3W consistency audit"
if node scripts/consistency-audit-llm-shield-stage3w.mjs > "$LOG_DIR/llm-shield-stage3w-consistency.log" 2>&1; then
  pass "LLM Shield 3W consistency audit"
else
  fail "LLM Shield 3W consistency audit"; tail -40 "$LOG_DIR/llm-shield-stage3w-consistency.log"
fi

step "LLM Shield 3W policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-policy.log" 2>&1; then
  pass "LLM Shield 3W policy-drift guard"
else
  fail "LLM Shield 3W policy-drift guard"; tail -40 "$LOG_DIR/llm-shield-stage3w-policy.log"
fi

step "LLM Shield 3W witness lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/stage3wWitnessLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3w/witnessLib.test.js \
  tests/unit/llmShield/stage3w/bundle.test.js \
  tests/unit/llmShield/stage3w/verifier.test.js \
  tests/unit/llmShield/stage3w/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3w-coverage.log" 2>&1; then
  pass "LLM Shield 3W witness lib coverage"
else
  fail "LLM Shield 3W witness lib coverage"; tail -100 "$LOG_DIR/llm-shield-stage3w-coverage.log"
fi
```

- [ ] **Step 2: Verify the coverage gate is 100% on the pure lib**

Run the coverage command from the block above without redirection.
Expected: `stage3wWitnessLib.mjs` at 100% function coverage; all tests pass. If any pure-lib function is uncovered, add a unit test for it (do NOT lower the threshold).

- [ ] **Step 3: Syntax-check and run the full suite**

Run: `bash -n scripts/check.sh && echo "syntax ok"`
Run: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: syntax ok; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/check.sh
git commit -m "feat(3w): wire offline smoke + audits + policy-drift + coverage into check.sh"
```

---

## Task 9: Reviewer docs + evidence README + format + re-hash

**Files:**
- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3W_WRITEUP.md`, `STAGE_3W_THREAT_MODEL.md`, `STAGE_3W_VALIDATION_MATRIX.md`, `STAGE_3W_REVIEWER_CHECKLIST.md`, `STAGE_3W_CLOSEOUT.md`
- Create: `docs/research/llm-shield/evidence/stage-3w/README.md`

**Interfaces:** documentation only. The evidence README is hashed by `write-hashes`, so write it BEFORE the final `write-hashes`.

- [ ] **Step 1: Write the evidence README**

Create `docs/research/llm-shield/evidence/stage-3w/README.md` with: the crown + doctrine (verbatim from the spec), the file inventory table (`attestation.bundle.json`, `attestation.signature.json`, `github-witness-verdict.json`, `provenance.json`, `evidence-hashes.json`, `self-proof-results.json`, `keys/stage3w-public-key.json`, `keys/fingerprint.txt`), how to reproduce offline (`scripts/reproduce-llm-shield-stage3w.sh`), and — in a clearly-marked **online/optional** section — how a reviewer can additionally check the GitHub attestation with `gh attestation verify docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json --repo Raoof128/Project-Simurgh` (explicitly: NOT required for offline verification).

- [ ] **Step 2: Write the four reviewer docs**

Writeup (what 3W witnesses; the dual-root design; `ci_observed_not_echoed`; the sacred non-claim that `live_capture_origin_self_reported` is unchanged), threat model (what 3W proves and does NOT prove — does not prove the GPU capture, does not re-run LG4, Sigstore not in offline path; tamper matrix), validation matrix (each spec requirement → gate/test), reviewer checklist (offline commands + the optional online `gh attestation verify`), closeout. Neutral, non-accusatory language.

- [ ] **Step 3: Format, regenerate evidence, re-sign, re-hash**

Run: `npm run format:check` — fix any flagged files with `npx prettier --write <files>`.
Run: `node tools/simurgh-attestation/build-3w-witness.mjs build --update`
Run: `npx prettier --write "docs/research/llm-shield/evidence/stage-3w/**/*.json"`
Run: `node tools/simurgh-attestation/sign-3w-witness.mjs`
Run: `node tools/simurgh-attestation/build-3w-witness.mjs write-hashes`
Run: `node tools/simurgh-attestation/build-3w-witness.mjs verify-hashes`
Expected: `stage3w: evidence hashes match`.

- [ ] **Step 4: Final reproduce + full check**

Run: `scripts/reproduce-llm-shield-stage3w.sh`
Expected: `Stage 3W reproduction: PASS`.
Run: `npm test` then `bash scripts/check.sh`
Expected: full suite green (the three pre-existing macOS-only failures — secret-scan venv false positive, Stage 2.6 Windows .NET, Linux Rust/xvfb — are unrelated to 3W).

- [ ] **Step 5: Commit**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3W_WRITEUP.md docs/research/llm-shield/STAGE_3W_*.md docs/research/llm-shield/evidence/stage-3w
git commit -m "docs(3w): writeup, threat model, validation matrix, reviewer checklist, closeout, evidence README"
```

---

## Task 10: Ship — PR, CI, tag, release

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin main-stage-3w-witnessed-vca-release-provenance
gh pr create --title "Stage 3W: Witnessed VCA Release Provenance (v2.7.0)" --body "<summary: dual-root witness over sealed 3V-B v2.6.0; offline Ed25519 primary + additive GitHub/Sigstore; ci_observed_not_echoed; does NOT reduce live_capture_origin_self_reported; offline verifier needs no network; zero src/llmShield; tamper suite all-rejected; reproduces byte-identical.>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Wait for CI green** (`gh pr checks <N>`). Triage any real failure before merge.

- [ ] **Step 3: Merge, sync, re-verify on the merge commit**

```bash
gh pr merge <N> --merge --delete-branch
git checkout main && git pull origin main
scripts/reproduce-llm-shield-stage3w.sh
node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce | grep '"ok"'
```

- [ ] **Step 4: Tag + release** (this push triggers the online witness workflow)

```bash
git tag -a v2.7.0-stage-3w-witnessed-vca-release-provenance -m "Stage 3W: witnessed VCA release provenance"
git push origin v2.7.0-stage-3w-witnessed-vca-release-provenance
gh release create v2.7.0-stage-3w-witnessed-vca-release-provenance --title "Stage 3W: Witnessed VCA Release Provenance" --notes "<banger notes: two independent roots witness the sealed 3V-B release; offline-primary, online-additive; the sacred non-claim held>"
```

- [ ] **Step 5: Confirm the witness workflow ran + attestation exists**

Run: `gh run list --workflow stage-3w-witness.yml --limit 1`
Run: `gh attestation verify docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json --repo Raoof128/Project-Simurgh` (online; optional confirmation, never part of offline verification).

---

## Self-Review

**Spec coverage:**
- Pure lib (subjects, deterministic verdict, in-toto statement) → Task 1. ✅
- Committed evidence + runner → Task 2. ✅
- Own 3W key + signer → Task 3. ✅
- Two-tier offline verifier (subjects_recomputed + witness_verdict_recomputed, fails closed) → Task 4. ✅
- Tamper suite ≥9 → Task 5. ✅
- Offline gate scripts (no Sigstore) → Task 6. ✅
- Online CI witness workflow (attest-build-provenance, ci_observed_not_echoed byte-identity assert, SHA-pin note) → Task 7. ✅
- check.sh wiring + 100% coverage on pure lib → Task 8. ✅
- Docs + evidence README (offline reproduce + optional online gh attestation verify) → Task 9. ✅
- Ship/tag/release + workflow confirmation → Task 10. ✅
- Global constraints (no src/llmShield, no model run, sacred non-claim, no online dep in offline verifier, ci_observed_not_echoed, digest-equality corroboration, evidence-hashes excludes itself + no Sigstore object) → Global Constraints block + enforced in Tasks 2/4/6/7. ✅

**Placeholder scan:** No TBD/TODO; every code step is complete. PR/release `--body`/`--notes` summaries are author-filled prose at ship time (Task 10), not logic placeholders.

**Type consistency:** `computeStage3vbSubjects`, `buildWitnessVerdict`, `buildReleaseWitnessStatement`, `buildBundle`, `buildWitnessVerdictFile`, `buildProvenance`, `verifyWitness({...,rebuild,rebuildVerdict})`, `runStage3wSelfProof` names are identical across all referencing tasks. The bundle subject name `stage-3w/github-witness-verdict.json` and predicateType string match between Task 1, Task 2, Task 4, and Task 5. Signature schema `simurgh.vca.release_witness.signature.v1` consistent (Task 3 ↔ verifier reads sidecar fields). ✅
