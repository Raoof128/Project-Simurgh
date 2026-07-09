// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — K7 all-functions e2e net (plan Task 17). Motto: AnthropicSafe First, then
// ReviewerSafe. Exercises every export, the full tamper matrix in frozen first-failure order, the
// committed-evidence verify, and the read-only-predecessor assertion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createPublicKey, createPrivateKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenContent, buildGreenBundle, auditPrivate } from "../../../../tools/simurgh-attestation/stage5c/node/greenBundle.mjs";
import { FLAGGED_BASES } from "../../../../tools/simurgh-attestation/stage5c/core/corpus.mjs";
import { evaluateVsb, evaluateVsbSafe, signBundle, severityBindingDigest } from "../../../../tools/simurgh-attestation/stage5c/core/vsbCore.mjs";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5c/node/verify-stage5c-attestation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const priv = readFileSync(join(REPO, "tests/fixtures/llmShield/stage5c/test-keys/INSECURE_FIXTURE_ONLY_stage-vsb.pem"), "utf8");
const pub = createPublicKey(createPrivateKey(priv)).export({ type: "spki", format: "pem" });
const baseTextById = auditPrivate(FLAGGED_BASES);

// Build a signed bundle from mutated content (re-sign so the target check fires first).
function signed(mutate = (c) => c) {
  const content = { ...buildGreenContent(FLAGGED_BASES), attestation_pub_key_pem: pub };
  const m = mutate(structuredClone(content));
  return { ...m, signature: signBundle(m, priv) };
}
const evalA = (b) => evaluateVsb(b, { tier: "audit", baseTextById }).raw;
const evalP = (b) => evaluateVsb(b, { tier: "public", baseTextById }).raw;

test("committed evidence verifies raw 0 at both tiers", () => {
  const { audit, pub: p } = verifyEvidence();
  assert.equal(audit.raw, 0);
  assert.equal(p.raw, 0);
});

test("green bundle → raw 0 (both tiers)", () => {
  const b = buildGreenBundle(priv, FLAGGED_BASES);
  assert.equal(evalA(b), 0);
  assert.equal(evalP(b), 0);
});

test("tamper matrix: every code fires at its owning tier, frozen first-failure order", () => {
  // 225 — unexpected outer key (added after signing)
  const b225 = buildGreenBundle(priv, FLAGGED_BASES);
  b225.smuggled = 1;
  assert.equal(evalA(b225), 225);
  // 226 — content mutated after signing
  const b226 = buildGreenBundle(priv, FLAGGED_BASES);
  b226.mr_ruleset_id = "x";
  assert.equal(evalA(b226), 226);
  // 227 — wrong ruleset digest
  assert.equal(evalA(signed((c) => ((c.mr_ruleset_digest = "sha256:0"), c))), 227);
  // 228 — dropped grid cell
  assert.equal(evalA(signed((c) => ((c.grid = c.grid.slice(1)), c))), 228);
  // 229 — tampered mutated_text_digest
  assert.equal(evalA(signed((c) => ((c.grid[0].mutated_text_digest = "sha256:0"), c))), 229);
  // 230 — invalid equivalence_basis
  assert.equal(evalA(signed((c) => ((c.grid[0].equivalence_basis = "nope"), c))), 230);
  // 231 — flipped mutation_verdict (find a caught cell to keep partition-consistency separate)
  assert.equal(
    evalA(
      signed((c) => {
        const i = c.grid.findIndex((x) => x.cell_class === "caught");
        c.grid[i].mutation_verdict = !c.grid[i].mutation_verdict;
        return c;
      })
    ),
    231
  );
  // 232 — flipped cell_class (verdict kept) on a slipped cell
  assert.equal(
    evalA(
      signed((c) => {
        const i = c.grid.findIndex((x) => x.cell_class === "slipped");
        c.grid[i].cell_class = "caught";
        return c;
      })
    ),
    232
  );
  // 233 — a laundered-out slip with a re-fitted severity_binding (so the table is INTERNALLY
  // consistent): AUDIT recomputes the grid and catches the omission (233); PUBLIC trusts the
  // consistent table and passes. This is exactly why 233 is audit-only.
  const b233 = signed((c) => {
    c.slip_table = c.slip_table.slice(1);
    c.binding.severity_binding = severityBindingDigest(c.slip_table);
    return c;
  });
  assert.equal(evalA(b233), 233);
  assert.equal(evalP(b233), 0);
  // 234 — invalid severity
  assert.equal(evalA(signed((c) => ((c.slip_table[0].severity = "boom"), c))), 234);
  // 235 — tampered slip rate
  assert.equal(evalA(signed((c) => ((c.slip_rates[0].slip_rate_num += 1), c))), 235);
  // 236 — claimed regression
  assert.equal(evalA(signed((c) => ((c.floor_monotonicity[0].newer_slip_subset_of_older = false), c))), 236);
  // 237 — breach analyst_note (PUBLIC)
  assert.equal(evalP(signed((c) => ((c.slip_table[0].analyst_note = "bypassed the kernel"), c))), 237);
  // 238 — wrong severity_binding
  assert.equal(evalA(signed((c) => ((c.binding.severity_binding = "sha256:0"), c))), 238);
});

test("239: a throw past the signature gate is wrapped fail-closed", () => {
  const b = signed((c) => ((c.slip_rates = null), c));
  assert.equal(evaluateVsbSafe(b, { tier: "audit", baseTextById }).raw, 239);
});

test("double-fault: earlier code wins (228 before 234)", () => {
  const b = signed((c) => {
    c.grid = c.grid.slice(1); // 228
    c.slip_table[0].severity = "boom"; // 234
    return c;
  });
  assert.equal(evalA(b), 228);
});

test("read-only predecessor: stage4w/4x/4y imported byte-identical to the merge-base", () => {
  const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { cwd: REPO, encoding: "utf8" }).trim();
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", base, "--", "tools/simurgh-attestation/stage4w", "tools/simurgh-attestation/stage4x", "tools/simurgh-attestation/stage4y"],
    { cwd: REPO, encoding: "utf8" }
  ).trim();
  assert.equal(changed, "", `predecessor files changed: ${changed}`);
});
