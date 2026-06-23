# Stage 3X — Public VCA Timeline & External Reproduction Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign a public VCA timeline that classifies all 12 rungs (3M→3W) by their actual replay surface, and ship a single reviewer command that externally reproduces the chain offline.

**Architecture:** A pure rung table + builder produces a signed in-toto-adjacent timeline index (own 3X Ed25519 key). A generic evidence-hashes verifier re-walks any stage's `evidence-hashes.json`. The per-push gate proves timeline integrity + generic-EH across the 10 EH dirs; the deeper tier-appropriate delegated replay lives only in `scripts/reproduce-vca-chain.sh`. Offline-primary, no network.

**Tech Stack:** Node.js ESM (`node:test`, `node:crypto` Ed25519, `node:child_process` for `git rev-parse`), bash gates, the existing `tools/simurgh-attestation/canonicalise.mjs` + `keygen.mjs`.

## Global Constraints

- **No `src/llmShield/**`changes** — policy-drift fail-closed three-dot`origin/main...HEAD`(real-base fallback`origin/main`→`main`→warn-pass).
- **No new model run / guard comparison / provider / GPU-capture proof / production-readiness claim.**
- **Does NOT reduce `live_capture_origin_self_reported`. Does NOT claim uniform 12/12 full reproduction.**
- **Offline-primary** — no network in the gate or the core verifier; the heavy delegated replay never enters the ordinary push gate.
- `sha256Hex` already prefixes `sha256:` — never double-prefix. `stable(v) = JSON.stringify(v, null, 2) + "\n"`. Run `npm run format:check` + prettier on ALL new files, then `write-hashes` AFTER prettier. `evidence-hashes.json` excludes itself.
- Generic EH verifier rejects self-inclusion + absolute/`..` paths; verifier fails closed (`ok:false`, never throws). Deep-freeze the rung table/enums.
- Security-audit accusatory/named-lab scan scoped to machine `.json`. 100% function coverage on the two pure libs; CLIs subprocess-covered, excluded.
- Own 3X Ed25519 key `~/.simurgh/3x-ed25519.pem` (0600, never committed; only public key committed). Reuse only `canonicalise.mjs` (`canonicalJson`, `sha256Hex`, `fingerprintPublicKey`) + `keygen.mjs`.
- Neutral commit messages, **no Co-Authored-By trailer, no "Claude Code" tag** anywhere (PR bodies, release notes — overrides harness default).
- Smoke reserved port **33220** via `boot_server`. Branch `main-stage-3x-public-vca-timeline-external-reproduction`. Tag **v2.8.0-stage-3x-public-vca-timeline-external-reproduction**.

## Ground-truth rung table (verified on disk)

| Stage | Tag                                                       | evidence_dir | replay_tier     | EH? | reproduce script                 | key file                      |
| ----- | --------------------------------------------------------- | ------------ | --------------- | --- | -------------------------------- | ----------------------------- |
| 3M    | v1.6.0-stage-3m-verifiable-containment-attestation        | stage-3m     | index_only      | no  | —                                | attestation.public-key.json   |
| 3N    | v1.7.0-stage-3n-claim-checked-security-utility-ledger     | stage-3n     | evidence_hashes | yes | —                                | none                          |
| 3O    | v1.8.0-stage-3o-byo-gateway-containment-benchmark         | stage-3o     | evidence_hashes | yes | —                                | none                          |
| 3P    | v1.9.0-stage-3p-cross-defence-containment-attestation     | stage-3p     | evidence_hashes | yes | —                                | keys/stage3p-public-key.json  |
| 3Q    | v2.0.0-stage-3q-attestation-registry-regression-diff      | stage-3q     | evidence_hashes | yes | —                                | keys/stage3q-public-key.json  |
| 3R    | v2.1.0-stage-3r-trust-preserving-provider-fallback        | (none)       | index_only      | no  | —                                | none                          |
| 3S    | v2.2.0-stage-3s-verifiable-defensive-narrative            | stage-3s     | evidence_hashes | yes | —                                | keys/stage3s-public-key.json  |
| 3T    | v2.3.0-stage-3t-offline-capability-extraction-attestation | stage-3t     | evidence_hashes | yes | —                                | keys/stage3t-public-key.json  |
| 3U    | v2.4.0-stage-3u-red-team-hardened-extraction-attestation  | stage-3u     | evidence_hashes | yes | —                                | keys/stage3u-public-key.json  |
| 3V    | v2.5.0-stage-3v-a-recorded-external-signal-attestation    | stage-3v     | reproduce       | yes | reproduce-llm-shield-stage3v.sh  | keys/stage3v-public-key.json  |
| 3V-B  | v2.6.0-stage-3v-b-llamaguard-external-defense-attestation | stage-3v-b   | reproduce       | yes | reproduce-llm-shield-stage3vb.sh | keys/stage3vb-public-key.json |
| 3W    | v2.7.0-stage-3w-witnessed-vca-release-provenance          | stage-3w     | reproduce       | yes | reproduce-llm-shield-stage3w.sh  | keys/stage3w-public-key.json  |

Counts: tag+commit-pinned 12 · evidence_hashes_available 10 · full_reproduce_available 3 · index_only 2.

---

## File Structure

**New pure libs (100% function-coverage gated):**

- `tools/simurgh-attestation/verifyEvidenceHashesLib.mjs` — generic EH verifier.
- `tools/simurgh-attestation/stage3xTimelineLib.mjs` — `VCA_RUNGS`, `resolveFingerprint`, `buildChainSummary`, `buildTimelineIndex`.

**New runner / attestation (subprocess-covered):**

- `tools/simurgh-attestation/build-3x-timeline.mjs`, `sign-3x-timeline.mjs`, `verify-stage3x-timeline.mjs`.
- `tests/e2e/llm_shield_stage3x_tamper_runner.mjs`.

**New reviewer command:** `scripts/reproduce-vca-chain.sh`.

**New offline gate scripts:** `scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard,reproduce}-llm-shield-stage3x.*`.

**Committed evidence:** `docs/research/llm-shield/evidence/stage-3x/` — `timeline.index.json`, `timeline.signature.json`, `vca-chain-reproduction-results.json`, `evidence-hashes.json`, `self-proof-results.json`, `keys/stage3x-public-key.json` + `keys/fingerprint.txt`, `README.md`.

**Docs:** `docs/research/llm-shield/LLM_SHIELD_STAGE_3X_WRITEUP.md` + `STAGE_3X_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

**Unit tests:** `tests/unit/llmShield/stage3x/*.test.js`.

**Modify:** `scripts/check.sh` (insert after the 3W coverage block, ~line 2074).

---

## Task 1: Generic evidence-hashes verifier (pure lib)

**Files:**

- Create: `tools/simurgh-attestation/verifyEvidenceHashesLib.mjs`
- Test: `tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js`

**Interfaces:**

- Consumes: `sha256Hex` from `./canonicalise.mjs`.
- Produces: `verifyEvidenceHashes(stageDir)` → `{ ok, checked, mismatches, reason }`. Never throws, no network. `ok:false` with `reason` on: missing map, self-inclusion (`evidence-hashes.json` listed), absolute path or `..` traversal in any key, any digest mismatch.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEvidenceHashes } from "../../../../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";

test("verifies a real committed stage dir (3W)", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w");
  assert.equal(r.ok, true);
  assert.ok(r.checked >= 1);
  assert.deepEqual(r.mismatches, []);
});
test("ok:false when the map is missing", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3m");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "evidence_hashes_missing");
});
test("rejects self-inclusion", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "docs/research/llm-shield/evidence/stage-3w/evidence-hashes.json": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "self_inclusion");
});
test("rejects path traversal", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "../../../etc/passwd": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_path");
});
test("rejects absolute path", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "/etc/passwd": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_path");
});
test("reports mismatch on a bad digest", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: {
      "docs/research/llm-shield/evidence/stage-3w/provenance.json": "sha256:" + "0".repeat(64),
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "digest_mismatch");
  assert.ok(r.mismatches.length >= 1);
});
test("never throws on a nonexistent dir", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/does-not-exist");
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/simurgh-attestation/verifyEvidenceHashesLib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Generic, stage-agnostic evidence-hashes verifier. Re-walks any stage's evidence-hashes.json and
// confirms every listed file still matches its committed sha256. Pure, offline, never throws.
// Hardened: rejects a map that lists evidence-hashes.json itself, and rejects absolute paths or
// path traversal. `_injectMap` is a test-only seam (replaces the on-disk map).
import { readFileSync } from "node:fs";
import { join, isAbsolute, normalize } from "node:path";
import { sha256Hex } from "./canonicalise.mjs";

export function verifyEvidenceHashes(stageDir, { _injectMap } = {}) {
  try {
    let map;
    if (_injectMap) {
      map = _injectMap;
    } else {
      try {
        map = JSON.parse(readFileSync(join(stageDir, "evidence-hashes.json"), "utf8"));
      } catch {
        return { ok: false, checked: 0, mismatches: [], reason: "evidence_hashes_missing" };
      }
    }
    const entries = Object.entries(map);
    for (const [p] of entries) {
      if (p.endsWith("evidence-hashes.json"))
        return { ok: false, checked: 0, mismatches: [], reason: "self_inclusion" };
      if (isAbsolute(p) || normalize(p).split("/").includes(".."))
        return { ok: false, checked: 0, mismatches: [], reason: "unsafe_path" };
    }
    const mismatches = [];
    let checked = 0;
    for (const [p, expected] of entries) {
      checked += 1;
      let actual;
      try {
        actual = sha256Hex(readFileSync(p, "utf8"));
      } catch {
        mismatches.push(p);
        continue;
      }
      if (actual !== expected) mismatches.push(p);
    }
    if (mismatches.length > 0) return { ok: false, checked, mismatches, reason: "digest_mismatch" };
    return { ok: true, checked, mismatches: [], reason: "ok" };
  } catch {
    return { ok: false, checked: 0, mismatches: [], reason: "threw" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/verifyEvidenceHashesLib.mjs tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js
git commit -m "feat(3x): generic offline evidence-hashes verifier (rejects self-inclusion + traversal)"
```

---

## Task 2: Timeline library (rung table + index builder)

**Files:**

- Create: `tools/simurgh-attestation/stage3xTimelineLib.mjs`
- Test: `tests/unit/llmShield/stage3x/timelineLib.test.js`

**Interfaces:**

- Consumes: `canonicalJson`, `sha256Hex`, `fingerprintPublicKey`; `node:child_process` `execFileSync` for `git rev-parse`; `node:fs`.
- Produces:
  - `VCA_RUNGS` (frozen array of 12, each `{ stage, tag, headline, replay_tier, evidence_dir|null, full_reproduce_available, evidence_hashes_available, reproduce_command|null, index_only_reason|null, replay_surface_reason }`).
  - `resolveMergeCommit(tag)` → 40-char sha (via `git rev-parse <tag>^{commit}`).
  - `resolveFingerprint(rung)` → `sha256:...` or `null` (reads `keys/<...>-public-key.json` then `attestation.public-key.json`).
  - `evidenceRootDigest(rung)` → `sha256:...` of that stage's `evidence-hashes.json`, or `null` for index_only/no-EH.
  - `buildChainSummary()` → `{ rungs_total, tag_commit_pinned, evidence_hashes_reverified, full_reproduce_available, index_only }`.
  - `buildTimelineIndex()` → `{ schema:"simurgh.vca.public_timeline.v1", stage:"3X", chain_summary, claim_summary, rungs:[...], non_claims:[...] }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3x/timelineLib.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VCA_RUNGS,
  buildChainSummary,
  buildTimelineIndex,
} from "../../../../tools/simurgh-attestation/stage3xTimelineLib.mjs";

test("VCA_RUNGS has 12 frozen rungs 3M..3W", () => {
  assert.equal(VCA_RUNGS.length, 12);
  assert.equal(Object.isFrozen(VCA_RUNGS), true);
  assert.equal(VCA_RUNGS[0].stage, "3M");
  assert.equal(VCA_RUNGS[VCA_RUNGS.length - 1].stage, "3W");
});
test("chain summary matches the locked counts", () => {
  assert.deepEqual(buildChainSummary(), {
    rungs_total: 12,
    tag_commit_pinned: 12,
    evidence_hashes_reverified: 10,
    full_reproduce_available: 3,
    index_only: 2,
  });
});
test("index: schema, claim_summary false, non-claims, deterministic", () => {
  const idx = buildTimelineIndex();
  assert.equal(idx.schema, "simurgh.vca.public_timeline.v1");
  assert.equal(idx.claim_summary.claims_uniform_full_reproduction, false);
  assert.ok(idx.non_claims.includes("does_not_claim_uniform_12_12_full_reproduction"));
  assert.ok(idx.non_claims.includes("does_not_reduce_live_capture_origin_self_reported"));
  assert.deepEqual(idx, buildTimelineIndex());
});
test("every rung is tag+commit pinned with a replay_surface_reason", () => {
  const idx = buildTimelineIndex();
  assert.equal(idx.rungs.length, 12);
  for (const r of idx.rungs) {
    assert.match(r.merge_commit, /^[0-9a-f]{40}$/);
    assert.ok(typeof r.replay_surface_reason === "string" && r.replay_surface_reason.length > 0);
  }
});
test("index_only rungs (3M,3R) carry reasons; 3R has null evidence_dir + digest", () => {
  const idx = buildTimelineIndex();
  const m = idx.rungs.find((r) => r.stage === "3M");
  const rr = idx.rungs.find((r) => r.stage === "3R");
  assert.equal(m.index_only_reason, "index_only_for_3x_chain_hashing");
  assert.equal(rr.index_only_reason, "index_only_source_feature_stage_no_evidence_directory");
  assert.equal(rr.evidence_root_digest, null);
});
test("evidence_hashes rungs expose a sha256 evidence_root_digest", () => {
  const idx = buildTimelineIndex();
  const u = idx.rungs.find((r) => r.stage === "3U");
  assert.equal(u.replay_tier, "evidence_hashes");
  assert.match(u.evidence_root_digest, /^sha256:[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3x/timelineLib.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/simurgh-attestation/stage3xTimelineLib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure timeline library for Stage 3X. Builds the signed public VCA timeline index from a frozen
// rung table + committed evidence on disk. Resolves tag->commit via git (offline). No network,
// no model, no src/llmShield. index_only rungs are bound by tag/commit/headline/fingerprint only.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence";

export const VCA_RUNGS = Object.freeze(
  [
    [
      "3M",
      "v1.6.0-stage-3m-verifiable-containment-attestation",
      "Offline-verifiable provider-agnostic containment attestation",
      "index_only",
      "stage-3m",
      false,
      false,
      null,
      "index_only_for_3x_chain_hashing",
      "Stage 3M predates the project-wide evidence-hashes.json pattern; 3X binds its tag, merge commit, headline, public key fingerprint, and available attestation metadata, but does not claim generic evidence-hash replay for this rung.",
    ],
    [
      "3N",
      "v1.7.0-stage-3n-claim-checked-security-utility-ledger",
      "Claim-checked security/utility ledger",
      "evidence_hashes",
      "stage-3n",
      false,
      true,
      null,
      null,
      "Stage 3N exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3O",
      "v1.8.0-stage-3o-byo-gateway-containment-benchmark",
      "BYO-gateway containment benchmark",
      "evidence_hashes",
      "stage-3o",
      false,
      true,
      null,
      null,
      "Stage 3O exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3P",
      "v1.9.0-stage-3p-cross-defence-containment-attestation",
      "Cross-defence containment attestation",
      "evidence_hashes",
      "stage-3p",
      false,
      true,
      null,
      null,
      "Stage 3P exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3Q",
      "v2.0.0-stage-3q-attestation-registry-regression-diff",
      "Attestation registry + regression diff",
      "evidence_hashes",
      "stage-3q",
      false,
      true,
      null,
      null,
      "Stage 3Q exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3R",
      "v2.1.0-stage-3r-trust-preserving-provider-fallback",
      "Trust-preserving provider fallback",
      "index_only",
      null,
      false,
      false,
      null,
      "index_only_source_feature_stage_no_evidence_directory",
      "Stage 3R was a source feature stage under src/llmShield/gateway rather than an evidence-directory stage; 3X binds its tag, merge commit, and headline but does not claim evidence-directory replay.",
    ],
    [
      "3S",
      "v2.2.0-stage-3s-verifiable-defensive-narrative",
      "Verifiable defensive narrative",
      "evidence_hashes",
      "stage-3s",
      false,
      true,
      null,
      null,
      "Stage 3S exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3T",
      "v2.3.0-stage-3t-offline-capability-extraction-attestation",
      "Offline capability-extraction attestation",
      "evidence_hashes",
      "stage-3t",
      false,
      true,
      null,
      null,
      "Stage 3T exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3U",
      "v2.4.0-stage-3u-red-team-hardened-extraction-attestation",
      "Red-team-hardened extraction attestation",
      "evidence_hashes",
      "stage-3u",
      false,
      true,
      null,
      null,
      "Stage 3U exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
    ],
    [
      "3V",
      "v2.5.0-stage-3v-a-recorded-external-signal-attestation",
      "Recorded external-signal containment attestation",
      "reproduce",
      "stage-3v",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3v.sh",
      null,
      "Stage 3V exposes a full offline reproduce script; 3X delegates replay to it.",
    ],
    [
      "3V-B",
      "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
      "Live Llama Guard 4 external-defence containment attestation",
      "reproduce",
      "stage-3v-b",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3vb.sh",
      null,
      "Stage 3V-B exposes a full offline reproduce script; 3X delegates replay to it.",
    ],
    [
      "3W",
      "v2.7.0-stage-3w-witnessed-vca-release-provenance",
      "Witnessed VCA release provenance",
      "reproduce",
      "stage-3w",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3w.sh",
      null,
      "Stage 3W exposes a full offline reproduce script; 3X delegates replay to it.",
    ],
  ].map((r) =>
    Object.freeze({
      stage: r[0],
      tag: r[1],
      headline: r[2],
      replay_tier: r[3],
      evidence_dir: r[4] ? `${EV}/${r[4]}` : null,
      full_reproduce_available: r[5],
      evidence_hashes_available: r[6],
      reproduce_command: r[7],
      index_only_reason: r[8],
      replay_surface_reason: r[9],
    })
  )
);

const NON_CLAIMS = Object.freeze([
  "does_not_reexecute_live_models",
  "does_not_prove_original_gpu_capture",
  "does_not_reduce_live_capture_origin_self_reported",
  "does_not_claim_production_readiness",
  "does_not_claim_general_jailbreak_resistance",
  "does_not_claim_uniform_12_12_full_reproduction",
]);

export function resolveMergeCommit(tag) {
  return execFileSync("git", ["rev-parse", `${tag}^{commit}`], { encoding: "utf8" }).trim();
}

export function resolveFingerprint(rung) {
  if (!rung.evidence_dir) return null;
  const keysDir = join(rung.evidence_dir, "keys");
  let pem = null;
  if (existsSync(keysDir)) {
    const f = readdirSync(keysDir).find((n) => n.endsWith("public-key.json"));
    if (f) pem = JSON.parse(readFileSync(join(keysDir, f), "utf8")).public_key_pem;
  }
  if (!pem) {
    const alt = join(rung.evidence_dir, "attestation.public-key.json");
    if (existsSync(alt)) pem = JSON.parse(readFileSync(alt, "utf8")).public_key_pem;
  }
  return pem ? fingerprintPublicKey(pem) : null;
}

export function evidenceRootDigest(rung) {
  if (!rung.evidence_hashes_available || !rung.evidence_dir) return null;
  return sha256Hex(readFileSync(join(rung.evidence_dir, "evidence-hashes.json"), "utf8"));
}

export function buildChainSummary() {
  return {
    rungs_total: VCA_RUNGS.length,
    tag_commit_pinned: VCA_RUNGS.length,
    evidence_hashes_reverified: VCA_RUNGS.filter((r) => r.evidence_hashes_available).length,
    full_reproduce_available: VCA_RUNGS.filter((r) => r.full_reproduce_available).length,
    index_only: VCA_RUNGS.filter((r) => r.replay_tier === "index_only").length,
  };
}

export function buildTimelineIndex() {
  const rungs = VCA_RUNGS.map((r) => ({
    stage: r.stage,
    tag: r.tag,
    merge_commit: resolveMergeCommit(r.tag),
    headline: r.headline,
    replay_tier: r.replay_tier,
    evidence_dir: r.evidence_dir,
    evidence_root_digest: evidenceRootDigest(r),
    public_key_fingerprint: resolveFingerprint(r),
    full_reproduce_available: r.full_reproduce_available,
    evidence_hashes_available: r.evidence_hashes_available,
    reproduce_command: r.reproduce_command,
    index_only_reason: r.index_only_reason,
    replay_surface_reason: r.replay_surface_reason,
  }));
  return {
    schema: "simurgh.vca.public_timeline.v1",
    stage: "3X",
    chain_summary: buildChainSummary(),
    claim_summary: {
      claims_uniform_full_reproduction: false,
      claims_new_containment_capability: false,
      claims_live_model_reexecution: false,
      claims_external_origin_truth: false,
    },
    rungs,
    non_claims: [...NON_CLAIMS],
  };
}

// canonicalJson re-exported for the runner's signing/hash path.
export { canonicalJson };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3x/timelineLib.test.js`
Expected: PASS (6 tests). (Requires the 12 tags to exist locally — they do.)

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage3xTimelineLib.mjs tests/unit/llmShield/stage3x/timelineLib.test.js
git commit -m "feat(3x): public VCA timeline lib — frozen rung table, tier classification, index builder"
```

---

## Task 3: Runner — build timeline evidence

**Files:**

- Create: `tools/simurgh-attestation/build-3x-timeline.mjs`
- Create (generated): `docs/research/llm-shield/evidence/stage-3x/{timeline.index.json,provenance.json}`
- Test: `tests/unit/llmShield/stage3x/build.test.js`

**Interfaces:**

- Consumes: `buildTimelineIndex`, `canonicalJson`, `sha256Hex`.
- Produces: `buildIndexFile()` → index object; CLI `build [--update] | hash | verify | write-hashes | verify-hashes`. `write-hashes` walks the 3X evidence dir, **excludes `evidence-hashes.json`**.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3x/build.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndexFile } from "../../../../tools/simurgh-attestation/build-3x-timeline.mjs";

test("index file has 12 rungs and the locked schema", () => {
  const idx = buildIndexFile();
  assert.equal(idx.schema, "simurgh.vca.public_timeline.v1");
  assert.equal(idx.rungs.length, 12);
});
test("index file is deterministic", () => {
  assert.deepEqual(buildIndexFile(), buildIndexFile());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3x/build.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the runner**

```js
// tools/simurgh-attestation/build-3x-timeline.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3X runner. Offline + deterministic. Builds the signed public VCA timeline index, writes
// metadata-only evidence, re-verifies byte-stable. write-hashes runs AFTER prettier and EXCLUDES
// evidence-hashes.json itself.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";
import { buildTimelineIndex } from "./stage3xTimelineLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildIndexFile() {
  return buildTimelineIndex();
}

export function buildProvenance() {
  return {
    schema: "simurgh.stage3x.provenance.v1",
    stage: "3X",
    builds_on: "v2.7.0-stage-3w-witnessed-vca-release-provenance",
    offline_primary: true,
    network_required: false,
    reviewer_command: "scripts/reproduce-vca-chain.sh",
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
  const idx = buildIndexFile();
  if (cmd === "build") {
    if (update) {
      await writeFile(join(EV, "timeline.index.json"), stable(idx));
      await writeFile(join(EV, "provenance.json"), stable(buildProvenance()));
      console.log("stage3x: evidence written (update; run prettier then sign + write-hashes)");
      return;
    }
    if (stable(await rd("timeline.index.json")) !== stable(idx)) throw new Error("index drifted");
    console.log("stage3x evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(JSON.stringify({ index_sha256: sha256Hex(canonicalJson(idx)) }, null, 2));
  } else if (cmd === "verify") {
    if (stable(await rd("timeline.index.json")) !== stable(idx))
      throw new Error("index reproduction mismatch");
    console.log("stage3x: timeline index reproduces");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3x: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3x: evidence hashes match");
  } else {
    console.error("usage: build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3x runner:", e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run test, generate evidence, verify**

Run: `node --test tests/unit/llmShield/stage3x/build.test.js`
Expected: PASS (2 tests).
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs build --update`
Run: `npx prettier --write "docs/research/llm-shield/evidence/stage-3x/**/*.json"`
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs verify`
Expected: `stage3x: timeline index reproduces`.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/build-3x-timeline.mjs tests/unit/llmShield/stage3x/build.test.js docs/research/llm-shield/evidence/stage-3x/*.json
git commit -m "feat(3x): runner + generated timeline index + provenance"
```

---

## Task 4: 3X Ed25519 key + signer

**Files:**

- Create: `tools/simurgh-attestation/sign-3x-timeline.mjs`
- Create (committed): `docs/research/llm-shield/evidence/stage-3x/keys/stage3x-public-key.json`, `keys/fingerprint.txt`
- Create (NOT committed): `~/.simurgh/3x-ed25519.pem`

- [ ] **Step 1: Generate the keypair (one-time)**

```bash
mkdir -p ~/.simurgh docs/research/llm-shield/evidence/stage-3x/keys
node tools/simurgh-attestation/keygen.mjs \
  --out-private ~/.simurgh/3x-ed25519.pem \
  --out-public docs/research/llm-shield/evidence/stage-3x/keys/stage3x-public-key.json
chmod 600 ~/.simurgh/3x-ed25519.pem
node -e 'console.log(JSON.parse(require("fs").readFileSync("docs/research/llm-shield/evidence/stage-3x/keys/stage3x-public-key.json")).fingerprint)' > docs/research/llm-shield/evidence/stage-3x/keys/fingerprint.txt
```

- [ ] **Step 2: Write the signer**

```js
// tools/simurgh-attestation/sign-3x-timeline.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3X timeline index. Reads SIMURGH_3X_PRIVATE_KEY_PATH (default
// ~/.simurgh/3x-ed25519.pem); CI never runs this. Signs canonicalJson(parse(index)).
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_3X_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3x-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3x-public-key.json"), "utf8"));
  const index = JSON.parse(await readFile(join(EV, "timeline.index.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(index), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.vca.public_timeline.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "timeline.signature.json"), stable(sidecar));
  console.log("stage3x: signed; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error("stage3x sign:", e.message);
  process.exit(1);
});
```

- [ ] **Step 3: Sign**

Run: `node tools/simurgh-attestation/sign-3x-timeline.mjs`
Expected: `stage3x: signed; fingerprint sha256:...`.

- [ ] **Step 4: Commit (public key + signer + sidecar — never the private key)**

```bash
git add tools/simurgh-attestation/sign-3x-timeline.mjs docs/research/llm-shield/evidence/stage-3x/keys docs/research/llm-shield/evidence/stage-3x/timeline.signature.json
git status --porcelain | grep -i pem && echo "ABORT: key staged" || git commit -m "feat(3x): own Ed25519 key + local signer; sign timeline index"
```

---

## Task 5: Two-tier verifier

**Files:**

- Create: `tools/simurgh-attestation/verify-stage3x-timeline.mjs`
- Test: `tests/unit/llmShield/stage3x/verifier.test.js`

**Interfaces:**

- Produces: `verifyTimeline({ index, sidecar, publicKeyPem, reproduce, rebuild })` → `{ ok, checks }`. Portable: `bundle_sha256`, `fingerprint`, `signature`, `schema` (`simurgh.vca.public_timeline.v1`), `not_uniform_claim` (`claim_summary.claims_uniform_full_reproduction === false`). `--reproduce`: `reproduce` (byte-stable), `evidence_root_digests_recomputed`, `merge_commits_recomputed`, `chain_summary_recomputed`. Fails closed; never throws.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3x/verifier.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyTimeline } from "../../../../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { buildIndexFile } from "../../../../tools/simurgh-attestation/build-3x-timeline.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const index = JSON.parse(readFileSync(`${EV}/timeline.index.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/timeline.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3x-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyTimeline({ index, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes digests + commits + chain summary", () => {
  const r = verifyTimeline({
    index,
    sidecar,
    publicKeyPem: pub,
    reproduce: true,
    rebuild: buildIndexFile,
  });
  assert.equal(r.ok, true);
  assert.equal(r.checks.evidence_root_digests_recomputed, true);
  assert.equal(r.checks.merge_commits_recomputed, true);
  assert.equal(r.checks.chain_summary_recomputed, true);
});
test("fails closed on missing input (never throws)", () => {
  assert.equal(verifyTimeline({ index: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a flipped replay_tier", () => {
  const t = JSON.parse(JSON.stringify(index));
  t.rungs[0].replay_tier = "reproduce";
  assert.equal(verifyTimeline({ index: t, sidecar, publicKeyPem: pub }).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3x/verifier.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the verifier**

```js
// tools/simurgh-attestation/verify-stage3x-timeline.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier OFFLINE verifier for the Stage 3X public VCA timeline. No network. portable: signature
// over canonicalJson(index) + fingerprint + structural gates. --reproduce: re-derive byte-stable
// AND recompute evidence_root_digests, merge_commits, chain_summary. Fails closed; never throws.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

function portableChecks({ index, sidecar, publicKeyPem }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(index), "utf8");
  checks.bundle_sha256 = sha256Hex(canonical) === sidecar.bundle_sha256;
  checks.fingerprint = fingerprintPublicKey(publicKeyPem) === sidecar.public_key_fingerprint;
  let sigOk = false;
  const sig =
    typeof sidecar.signature === "string" ? sidecar.signature.replace(/^base64:/, "") : "";
  try {
    sigOk = crypto.verify(
      null,
      canonical,
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(sig, "base64")
    );
  } catch {
    sigOk = false;
  }
  checks.signature = !!sigOk;
  checks.schema = index.schema === "simurgh.vca.public_timeline.v1";
  checks.not_uniform_claim = index.claim_summary?.claims_uniform_full_reproduction === false;
  return checks;
}

export function verifyTimeline({ index, sidecar, publicKeyPem, reproduce = false, rebuild } = {}) {
  try {
    if (!index || !sidecar || !publicKeyPem) return { ok: false, checks: { input_present: false } };
    const checks = portableChecks({ index, sidecar, publicKeyPem });
    if (reproduce) {
      if (typeof rebuild !== "function")
        return { ok: false, checks: { ...checks, reproduce_rebuild_missing: true } };
      const stable = (v) => JSON.stringify(v, null, 2) + "\n";
      const rebuilt = rebuild();
      checks.reproduce = stable(rebuilt) === stable(index);
      const byStage = (arr) => Object.fromEntries(arr.map((r) => [r.stage, r]));
      const a = byStage(rebuilt.rungs);
      const b = byStage(index.rungs);
      checks.evidence_root_digests_recomputed = Object.keys(b).every(
        (s) => a[s]?.evidence_root_digest === b[s].evidence_root_digest
      );
      checks.merge_commits_recomputed = Object.keys(b).every(
        (s) => a[s]?.merge_commit === b[s].merge_commit
      );
      checks.chain_summary_recomputed =
        canonicalJson(rebuilt.chain_summary) === canonicalJson(index.chain_summary);
    }
    return { ok: Object.values(checks).every(Boolean), checks };
  } catch {
    return { ok: false, checks: { threw: true } };
  }
}

async function cli() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const EV = "docs/research/llm-shield/evidence/stage-3x";
  const reproduce = process.argv.includes("--reproduce");
  const index = JSON.parse(await readFile(join(EV, "timeline.index.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "timeline.signature.json"), "utf8"));
  const pub = JSON.parse(
    await readFile(join(EV, "keys", "stage3x-public-key.json"), "utf8")
  ).public_key_pem;
  let rebuild;
  if (reproduce) ({ buildIndexFile: rebuild } = await import("./build-3x-timeline.mjs"));
  const result = verifyTimeline({ index, sidecar, publicKeyPem: pub, reproduce, rebuild });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`)
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run test + reproduce**

Run: `node --test tests/unit/llmShield/stage3x/verifier.test.js`
Expected: PASS (4 tests).
Run: `node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce`
Expected: JSON `"ok": true`.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/verify-stage3x-timeline.mjs tests/unit/llmShield/stage3x/verifier.test.js
git commit -m "feat(3x): two-tier offline timeline verifier (recomputes digests/commits/summary)"
```

---

## Task 6: Tamper / negative self-proof

**Files:**

- Create: `tests/e2e/llm_shield_stage3x_tamper_runner.mjs`
- Create (generated): `docs/research/llm-shield/evidence/stage-3x/self-proof-results.json`
- Test: `tests/unit/llmShield/stage3x/tamper.test.js`

**Interfaces:**

- Produces: `runStage3xSelfProof()` → `{ all_passed, cases, counters }`. ≥9 cases: `evidence_root_digest_edited`, `tag_edited`, `merge_commit_edited`, `public_key_fingerprint_edited`, `replay_tier_flipped`, `signature_tampered`, `wrong_public_key`, `file_removed`, plus generic-EH self-proofs `eh_self_inclusion` + `eh_path_traversal`. Counters `accepted_tampered_bundles` and `eh_unsafe_accepted` stay 0.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3x/tamper.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { runStage3xSelfProof } from "../../../../tests/e2e/llm_shield_stage3x_tamper_runner.mjs";

test("every tamper case rejected, counters zero", () => {
  const r = runStage3xSelfProof();
  assert.equal(r.all_passed, true);
  assert.ok(r.cases.length >= 9);
  assert.equal(r.counters.accepted_tampered_bundles, 0);
  assert.equal(r.counters.eh_unsafe_accepted, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3x/tamper.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the tamper runner**

```js
// tests/e2e/llm_shield_stage3x_tamper_runner.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3X negative self-proof. Mutates committed evidence; asserts the offline verifier rejects
// each (ok:false). Also self-proofs the generic EH verifier's hardening. Counters stay 0.
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyTimeline } from "../../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { verifyEvidenceHashes } from "../../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const index = JSON.parse(readFileSync(`${EV}/timeline.index.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/timeline.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3x-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3xSelfProof() {
  const cases = [];
  const reject = (name, idx, s = sidecar, p = pub) =>
    cases.push({
      name,
      rejected: verifyTimeline({ index: idx, sidecar: s, publicKeyPem: p }).ok === false,
    });

  const ehStage = index.rungs.find((r) => r.evidence_root_digest);
  const d = clone(index);
  d.rungs.find((r) => r.stage === ehStage.stage).evidence_root_digest = "sha256:" + "0".repeat(64);
  reject("evidence_root_digest_edited", d);

  const tg = clone(index);
  tg.rungs[0].tag = "v9.9.9-fake";
  reject("tag_edited", tg);

  const mc = clone(index);
  mc.rungs[0].merge_commit = "0".repeat(40);
  reject("merge_commit_edited", mc);

  const fp = clone(index);
  const withKey = fp.rungs.find((r) => r.public_key_fingerprint);
  withKey.public_key_fingerprint = "sha256:" + "1".repeat(64);
  reject("public_key_fingerprint_edited", fp);

  const rt = clone(index);
  rt.rungs.find((r) => r.stage === "3M").replay_tier = "reproduce";
  reject("replay_tier_flipped", rt);

  const st = clone(sidecar);
  st.signature = "base64:" + Buffer.from("nope").toString("base64");
  reject("signature_tampered", index, st);

  const wrong = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", index, sidecar, wrong);

  cases.push({
    name: "file_removed",
    rejected: verifyTimeline({ index, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  // generic EH hardening self-proofs
  const ehSelf = verifyEvidenceHashes("x", {
    _injectMap: { "x/evidence-hashes.json": "sha256:y" },
  });
  cases.push({
    name: "eh_self_inclusion",
    rejected: ehSelf.ok === false && ehSelf.reason === "self_inclusion",
  });
  const ehTrav = verifyEvidenceHashes("x", { _injectMap: { "../../etc/passwd": "sha256:y" } });
  cases.push({
    name: "eh_path_traversal",
    rejected: ehTrav.ok === false && ehTrav.reason === "unsafe_path",
  });

  const counters = {
    accepted_tampered_bundles: cases.filter((c) => !c.rejected).length,
    eh_unsafe_accepted: [ehSelf, ehTrav].filter((r) => r.ok).length,
  };
  return {
    all_passed: cases.every((c) => c.rejected) && Object.values(counters).every((v) => v === 0),
    cases,
    counters,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runStage3xSelfProof();
  writeFileSync(`${EV}/self-proof-results.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify({ all_passed: r.all_passed, counters: r.counters }, null, 2));
  if (!r.all_passed) process.exit(1);
}
```

- [ ] **Step 4: Run test + generate self-proof**

Run: `node --test tests/unit/llmShield/stage3x/tamper.test.js`
Expected: PASS (1 test).
Run: `node tests/e2e/llm_shield_stage3x_tamper_runner.mjs`
Expected: `"all_passed": true`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3x_tamper_runner.mjs tests/unit/llmShield/stage3x/tamper.test.js docs/research/llm-shield/evidence/stage-3x/self-proof-results.json
git commit -m "feat(3x): negative self-proof tamper suite (>=9 cases incl EH hardening, counters zero)"
```

---

## Task 7: Reviewer command — full delegated replay

**Files:**

- Create: `scripts/reproduce-vca-chain.sh`
- Create (generated): `docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json`

**Interfaces:** the single external-reviewer entry point. Verifies the signed timeline, then for each rung runs the tier-appropriate replay and writes the results artifact (incl. `tier_summary` — the amendment).

- [ ] **Step 1: Write the reviewer script**

```bash
# scripts/reproduce-vca-chain.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3X external reviewer command. Verifies the signed VCA timeline, then replays each rung by
# its tier (reproduce script | generic evidence-hashes verify | index_only tag/commit pin) and
# emits a reproduction-results artifact. Offline; no network. Run from the repo root.
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3x"

echo "Stage 3X — VCA chain external reproduction"
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce >/dev/null || {
  echo "timeline verify FAILED" >&2; exit 1; }

node - <<'NODE'
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const { verifyEvidenceHashes } = require("./tools/simurgh-attestation/verifyEvidenceHashesLib.mjs");
const EV = "docs/research/llm-shield/evidence/stage-3x";
const idx = JSON.parse(fs.readFileSync(`${EV}/timeline.index.json`, "utf8"));
const results = [];
for (const r of idx.rungs) {
  const out = { stage: r.stage, replay_tier: r.replay_tier, tag_commit_pinned: false, evidence_root_digest_matched: null, reproduce_passed: null };
  try {
    const commit = execFileSync("git", ["rev-parse", `${r.tag}^{commit}`], { encoding: "utf8" }).trim();
    out.tag_commit_pinned = commit === r.merge_commit;
  } catch { out.tag_commit_pinned = false; }
  if (r.replay_tier === "evidence_hashes") {
    out.evidence_root_digest_matched = verifyEvidenceHashes(r.evidence_dir).ok;
  } else if (r.replay_tier === "reproduce") {
    out.evidence_root_digest_matched = verifyEvidenceHashes(r.evidence_dir).ok;
    try { execFileSync("bash", [r.reproduce_command], { stdio: "ignore" }); out.reproduce_passed = true; }
    catch { out.reproduce_passed = false; }
  }
  results.push(out);
}
const tier = (t) => results.filter((x) => x.replay_tier === t);
const passed = (x) =>
  x.tag_commit_pinned &&
  (x.evidence_root_digest_matched === null || x.evidence_root_digest_matched === true) &&
  (x.reproduce_passed === null || x.reproduce_passed === true);
const tierSummary = (t) => ({ total: tier(t).length, passed: tier(t).filter(passed).length });
const artifact = {
  schema: "simurgh.vca.chain_reproduction_results.v1",
  timeline_verified: true,
  rungs_total: results.length,
  rungs_passed: results.filter(passed).length,
  rungs_failed: results.filter((x) => !passed(x)).length,
  offline_only: true,
  network_required: false,
  tier_summary: {
    reproduce: tierSummary("reproduce"),
    evidence_hashes: tierSummary("evidence_hashes"),
    index_only: tierSummary("index_only"),
  },
  results,
  non_claims: [
    "does_not_reexecute_live_models",
    "does_not_prove_original_gpu_capture",
    "does_not_reduce_live_capture_origin_self_reported",
    "does_not_claim_production_readiness",
    "does_not_claim_general_jailbreak_resistance",
  ],
};
fs.writeFileSync(`${EV}/vca-chain-reproduction-results.json`, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ rungs_passed: artifact.rungs_passed, rungs_failed: artifact.rungs_failed, tier_summary: artifact.tier_summary }, null, 2));
if (artifact.rungs_failed > 0) process.exit(1);
NODE
echo "Stage 3X VCA chain reproduction: PASS"
```

- [ ] **Step 2: Make executable, run it, prettier the artifact**

Run: `chmod +x scripts/reproduce-vca-chain.sh && scripts/reproduce-vca-chain.sh`
Expected: prints `tier_summary` with reproduce 3/3, evidence_hashes 10/10, index_only 2/2; `Stage 3X VCA chain reproduction: PASS`.
Run: `npx prettier --write "docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json"`

- [ ] **Step 3: Commit**

```bash
git add scripts/reproduce-vca-chain.sh docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json
git commit -m "feat(3x): reviewer command reproduce-vca-chain.sh + results artifact (tier_summary)"
```

---

## Task 8: Offline gate scripts

**Files:**

- Create: `scripts/smoke-llm-shield-stage3x.sh`, `scripts/security-audit-llm-shield-stage3x.sh`, `scripts/privacy-audit-llm-shield-stage3x.mjs`, `scripts/consistency-audit-llm-shield-stage3x.mjs`, `scripts/policy-drift-guard-llm-shield-stage3x.sh`, `scripts/reproduce-llm-shield-stage3x.sh`

- [ ] **Step 1: smoke + reproduce + policy-drift**

```bash
# scripts/smoke-llm-shield-stage3x.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
PORT="${SIMURGH_STAGE3X_PORT:-33220}"
LOG_DIR="${SIMURGH_STAGE3X_LOG_DIR:-.simurgh_check_logs/stage3x-smoke}"
mkdir -p "$LOG_DIR"
SRV_PID=""
cleanup() { [[ -n "$SRV_PID" ]] && { kill "$SRV_PID" 2>/dev/null || true; wait "$SRV_PID" 2>/dev/null || true; }; }
trap cleanup EXIT
# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

echo "LLM Shield 3X public-VCA-timeline smoke"
node --check tools/simurgh-attestation/build-3x-timeline.mjs
boot_server "$PORT" "$LOG_DIR/server.log" "Stage 3X server" -- \
  env SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js
SRV_PID="$BOOTED_PID"

node tools/simurgh-attestation/build-3x-timeline.mjs verify
node tools/simurgh-attestation/build-3x-timeline.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3x-timeline.mjs >/dev/null
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce >/dev/null
node tests/e2e/llm_shield_stage3x_tamper_runner.mjs >/dev/null
echo "stage3x smoke: passed"
```

```bash
# scripts/reproduce-llm-shield-stage3x.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Stage 3X offline reproduction"
node tools/simurgh-attestation/build-3x-timeline.mjs verify
node tools/simurgh-attestation/build-3x-timeline.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce
node tests/e2e/llm_shield_stage3x_tamper_runner.mjs
echo "Stage 3X reproduction: PASS"
```

```bash
# scripts/policy-drift-guard-llm-shield-stage3x.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE=""
for ref in origin/main main; do
  if git rev-parse --verify --quiet "$ref" >/dev/null; then BASE="$ref"; break; fi
done
if [[ -z "$BASE" ]]; then echo "policy-drift-3x: no base ref; warn-pass"; exit 0; fi
CHANGED="$(git diff --name-only "$BASE...HEAD" -- src/llmShield || true)"
if [[ -n "$CHANGED" ]]; then
  echo "policy-drift-3x: Stage 3X is tooling-only but src/llmShield changed:" >&2
  echo "$CHANGED" >&2; exit 1
fi
echo "policy-drift-3x: PASS (no src/llmShield changes)"
```

- [ ] **Step 2: security + privacy + consistency audits (incl generic-EH across 10 dirs)**

```bash
# scripts/security-audit-llm-shield-stage3x.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3x"
echo "Stage 3X security audit"
if grep -RniE "deepseek|moonshot|minimax|attacker|stolen|fraudulent|guilty" "$EV"/*.json "$EV"/keys/*.json; then
  echo "named-lab / accusatory wording in machine artifact" >&2; exit 1
fi
node -e '
const i = require("./'"$EV"'/timeline.index.json");
if (i.schema !== "simurgh.vca.public_timeline.v1") throw new Error("schema");
if (i.claim_summary.claims_uniform_full_reproduction !== false) throw new Error("must not claim uniform reproduction");
if (!i.non_claims.includes("does_not_reduce_live_capture_origin_self_reported")) throw new Error("missing sacred non-claim");
if (i.chain_summary.rungs_total !== 12) throw new Error("expected 12 rungs");
'
echo "Stage 3X security audit: pass"
```

```js
// scripts/privacy-audit-llm-shield-stage3x.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3x";
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
  const t = await readFile(f, "utf8");
  for (const rx of FORBIDDEN)
    if (rx.test(t)) {
      console.error(`privacy violation in ${f}: ${rx}`);
      bad += 1;
    }
}
if (bad) {
  console.error(`stage3x privacy audit: ${bad} violation(s)`);
  process.exit(1);
}
console.log(`stage3x privacy audit: PASS (${files.length} file(s), metadata-only)`);
```

```js
// scripts/consistency-audit-llm-shield-stage3x.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Re-derives the index + verifies the signature, AND re-walks all 10 evidence_hashes rungs with
// the generic verifier (offline chain-health for the digest tier).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyTimeline } from "../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { buildIndexFile } from "../tools/simurgh-attestation/build-3x-timeline.mjs";
import { verifyEvidenceHashes } from "../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3x";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const committed = await rd("timeline.index.json");
if (stable(committed) !== stable(buildIndexFile())) {
  console.error("index does not re-derive");
  process.exit(1);
}
const sidecar = await rd("timeline.signature.json");
const pub = (await rd("keys/stage3x-public-key.json")).public_key_pem;
const r = verifyTimeline({
  index: committed,
  sidecar,
  publicKeyPem: pub,
  reproduce: true,
  rebuild: buildIndexFile,
});
if (!r.ok) {
  console.error("consistency: verify failed", JSON.stringify(r.checks));
  process.exit(1);
}
let ehFail = 0;
for (const rung of committed.rungs.filter((x) => x.replay_tier === "evidence_hashes")) {
  if (!verifyEvidenceHashes(rung.evidence_dir).ok) {
    console.error("EH re-verify failed:", rung.stage);
    ehFail += 1;
  }
}
if (ehFail) process.exit(1);
console.log("stage3x consistency audit: PASS (index + signature + 10/10 EH dirs)");
```

- [ ] **Step 3: chmod, run all, write-hashes, reproduce, smoke**

Run: `chmod +x scripts/smoke-llm-shield-stage3x.sh scripts/security-audit-llm-shield-stage3x.sh scripts/policy-drift-guard-llm-shield-stage3x.sh scripts/reproduce-llm-shield-stage3x.sh`
Run: `scripts/security-audit-llm-shield-stage3x.sh && node scripts/privacy-audit-llm-shield-stage3x.mjs && node scripts/consistency-audit-llm-shield-stage3x.mjs && scripts/policy-drift-guard-llm-shield-stage3x.sh`
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs write-hashes && scripts/reproduce-llm-shield-stage3x.sh && scripts/smoke-llm-shield-stage3x.sh`
Expected: each PASS; `stage3x smoke: passed`.

- [ ] **Step 4: Commit**

```bash
git add scripts/*-llm-shield-stage3x.* docs/research/llm-shield/evidence/stage-3x/evidence-hashes.json
git commit -m "feat(3x): offline smoke + security/privacy/consistency(EH 10/10) + policy-drift + reproduce"
```

---

## Task 9: Wire offline gates into check.sh + coverage

**Files:**

- Modify: `scripts/check.sh` (insert after the 3W coverage block, ~line 2074, before "3E-core docker smoke")

- [ ] **Step 1: Insert the 3X offline gate block** (mirror the 3W block exactly, swapping 3w→3x and adding a generic-EH chain step)

```bash
# ── LLM Shield 3X public VCA timeline (offline gates only) ─────────
step "LLM Shield 3X public-VCA-timeline smoke"
if scripts/smoke-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-smoke.log" 2>&1; then
  pass "LLM Shield 3X public-VCA-timeline smoke"
else
  fail "LLM Shield 3X public-VCA-timeline smoke"; tail -60 "$LOG_DIR/llm-shield-stage3x-smoke.log"
fi

step "LLM Shield 3X security audit"
if scripts/security-audit-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-security.log" 2>&1; then
  pass "LLM Shield 3X security audit"
else
  fail "LLM Shield 3X security audit"; tail -40 "$LOG_DIR/llm-shield-stage3x-security.log"
fi

step "LLM Shield 3X privacy audit"
if node scripts/privacy-audit-llm-shield-stage3x.mjs > "$LOG_DIR/llm-shield-stage3x-privacy.log" 2>&1; then
  pass "LLM Shield 3X privacy audit"
else
  fail "LLM Shield 3X privacy audit"; tail -40 "$LOG_DIR/llm-shield-stage3x-privacy.log"
fi

step "LLM Shield 3X consistency audit (index + 10/10 evidence-hash dirs)"
if node scripts/consistency-audit-llm-shield-stage3x.mjs > "$LOG_DIR/llm-shield-stage3x-consistency.log" 2>&1; then
  pass "LLM Shield 3X consistency audit (index + 10/10 evidence-hash dirs)"
else
  fail "LLM Shield 3X consistency audit (index + 10/10 evidence-hash dirs)"; tail -40 "$LOG_DIR/llm-shield-stage3x-consistency.log"
fi

step "LLM Shield 3X policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-policy.log" 2>&1; then
  pass "LLM Shield 3X policy-drift guard"
else
  fail "LLM Shield 3X policy-drift guard"; tail -40 "$LOG_DIR/llm-shield-stage3x-policy.log"
fi

step "LLM Shield 3X timeline lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/verifyEvidenceHashesLib.mjs \
  --test-coverage-include=tools/simurgh-attestation/stage3xTimelineLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js \
  tests/unit/llmShield/stage3x/timelineLib.test.js \
  tests/unit/llmShield/stage3x/build.test.js \
  tests/unit/llmShield/stage3x/verifier.test.js \
  tests/unit/llmShield/stage3x/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3x-coverage.log" 2>&1; then
  pass "LLM Shield 3X timeline lib coverage"
else
  fail "LLM Shield 3X timeline lib coverage"; tail -100 "$LOG_DIR/llm-shield-stage3x-coverage.log"
fi
```

- [ ] **Step 2: Verify coverage = 100% on both pure libs**

Run the coverage command from the block above without redirection.
Expected: `verifyEvidenceHashesLib.mjs` and `stage3xTimelineLib.mjs` both 100% function coverage; all tests pass. If `stage3xTimelineLib.mjs`'s `canonicalJson` re-export shows as an uncovered function, drop that re-export line (the runner imports `canonicalJson` directly from `./canonicalise.mjs`) and re-run.

- [ ] **Step 3: Syntax check + full suite**

Run: `bash -n scripts/check.sh && echo "syntax ok"`
Run: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: syntax ok; all pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/check.sh
git commit -m "feat(3x): wire offline smoke + audits + policy-drift + coverage into check.sh"
```

---

## Task 10: Reviewer docs + evidence README + format + re-hash

**Files:**

- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3X_WRITEUP.md`, `STAGE_3X_THREAT_MODEL.md`, `STAGE_3X_VALIDATION_MATRIX.md`, `STAGE_3X_REVIEWER_CHECKLIST.md`, `STAGE_3X_CLOSEOUT.md`
- Create: `docs/research/llm-shield/evidence/stage-3x/README.md`

- [ ] **Step 1: Evidence README** — crown + signed headline (verbatim from spec); the chain_summary table (12 pinned / 10 EH / 3 reproduce / 2 index-only); file inventory; the single reviewer command `scripts/reproduce-vca-chain.sh`; explicit note that offline reproduction needs no network and no `gh`.

- [ ] **Step 2: Four reviewer docs + top-level reviewer packet** — writeup (the replay-map framing; tiers; what 3X does NOT claim, esp. no uniform 12/12, no reduction of `live_capture_origin_self_reported`), threat model (proves/does-not-prove + the tamper matrix incl. EH self-inclusion/traversal), validation matrix (each spec requirement → gate/test), reviewer checklist (one-command path for an external reviewer with no private context), closeout. Neutral, non-accusatory; no "Claude Code" anywhere.

- [ ] **Step 3: Format, regenerate, re-sign, re-hash**

Run: `npm run format:check` — fix flagged files with `npx prettier --write <files>`.
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs build --update`
Run: `scripts/reproduce-vca-chain.sh` (regenerate results artifact)
Run: `npx prettier --write "docs/research/llm-shield/evidence/stage-3x/**/*.json"`
Run: `node tools/simurgh-attestation/sign-3x-timeline.mjs`
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs write-hashes`
Run: `node tools/simurgh-attestation/build-3x-timeline.mjs verify-hashes`
Expected: `stage3x: evidence hashes match`.

- [ ] **Step 4: Final reproduce + full check**

Run: `scripts/reproduce-llm-shield-stage3x.sh` → `Stage 3X reproduction: PASS`.
Run: `npm test` then `bash scripts/check.sh`
Expected: full suite green (the three known macOS-only failures — secret-scan venv false positive, Stage 2.6 Windows .NET, Linux Rust/xvfb — are unrelated to 3X).

- [ ] **Step 5: Commit**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3X_WRITEUP.md docs/research/llm-shield/STAGE_3X_*.md docs/research/llm-shield/evidence/stage-3x
git commit -m "docs(3x): writeup, threat model, validation matrix, reviewer checklist, closeout, evidence README"
```

---

## Task 11: Ship — PR, CI, tag, release

- [ ] **Step 1: Push + PR** (neutral body, NO Claude Code tag)

```bash
git push -u origin main-stage-3x-public-vca-timeline-external-reproduction
gh pr create --title "Stage 3X: Public VCA Timeline & External Reproduction Packet (v2.8.0)" --body "<summary: signed public VCA timeline over 12 rungs 3M..3W; mixed-tier (3 reproduce / 10 evidence_hashes / 2 index_only); one reviewer command scripts/reproduce-vca-chain.sh; offline-primary, zero src/llmShield; does NOT claim uniform 12/12 reproduction; does NOT reduce live_capture_origin_self_reported; tamper suite all-rejected; reproduces byte-identical. This change is part of Project Simurgh's VCA research pipeline; claims are bounded by the signed evidence, verifier outputs, and documented non-claims.>"
```

- [ ] **Step 2: Wait for CI green** (`gh pr checks <N>`). Triage any real failure before merge.

- [ ] **Step 3: Merge, sync, re-verify**

```bash
gh pr merge <N> --merge --delete-branch
git checkout main && git pull origin main
scripts/reproduce-llm-shield-stage3x.sh
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce | grep '"ok"'
scripts/reproduce-vca-chain.sh | tail -1
```

- [ ] **Step 4: Tag + release** (neutral notes, NO Claude Code tag)

```bash
git tag -a v2.8.0-stage-3x-public-vca-timeline-external-reproduction -m "Stage 3X: public VCA timeline & external reproduction packet"
git push origin v2.8.0-stage-3x-public-vca-timeline-external-reproduction
gh release create v2.8.0-stage-3x-public-vca-timeline-external-reproduction --title "Stage 3X: Public VCA Timeline & External Reproduction Packet" --notes "<neutral banger: the VCA chain becomes a public replay map — 12/12 tag+commit pinned, 10/12 evidence-hash re-verifiable offline, 3/12 full reproduce, 2/12 index-only with signed reasons; one reviewer command. Claims bounded by signed evidence, verifier outputs, and documented non-claims.>"
```

---

## Self-Review

**Spec coverage:**

- Generic EH verifier (self-inclusion + traversal + digest match, fails closed) → Task 1. ✅
- Timeline lib (frozen 12-rung table, tiers, fingerprints incl. 3M `attestation.public-key.json`, chain_summary, claim_summary, index) → Task 2. ✅
- Runner + evidence → Task 3. Own key + signer → Task 4. Two-tier verifier (recompute digests/commits/summary, fails closed) → Task 5. ✅
- Tamper ≥9 incl. EH self-inclusion + traversal → Task 6. ✅
- Reviewer command + results artifact **with `tier_summary` (amendment)** → Task 7. ✅
- Offline gate scripts incl. generic-EH across 10 dirs (consistency audit); full delegated replay only in reviewer command → Task 8. ✅
- check.sh wiring + 100% coverage on both pure libs → Task 9. ✅
- Docs + reviewer packet + README → Task 10. Ship → Task 11. ✅
- Globals (zero src/llmShield, offline-primary, no uniform-12/12 claim, no reduction of `live_capture_origin_self_reported`, evidence-hashes excludes itself, neutral text/no Claude Code tag) → Global Constraints + enforced in Tasks 1/5/8/11. ✅

**Placeholder scan:** No TBD/TODO; every code step complete. PR/release `<...>` summaries are author-filled neutral prose at ship time (Task 11), not logic placeholders. Doc bodies (Task 10) are descriptive deliverables, not code.

**Type consistency:** `verifyEvidenceHashes(stageDir,{_injectMap})`, `VCA_RUNGS`, `buildChainSummary`, `buildTimelineIndex`, `buildIndexFile`, `verifyTimeline({index,sidecar,publicKeyPem,reproduce,rebuild})`, `runStage3xSelfProof` names match across all referencing tasks. Schema strings `simurgh.vca.public_timeline.v1` / `.signature.v1` / `simurgh.vca.chain_reproduction_results.v1` consistent (Tasks 2/3/4/5/7). The verifier's `rebuild` is the runner's `buildIndexFile` (Task 5 ↔ Task 3). ✅
