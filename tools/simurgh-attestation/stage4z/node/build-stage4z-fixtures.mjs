// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — Lane A fixture + evidence builder (plan Task 8). Motto: AnthropicSafe First,
// then ReviewerSafe. Deterministic: committed fixture key + per-fixture salts, byte-stable
// canonicalJson output. 12 fixtures matching spec §3 Lane A; clean fixtures set self_report
// to the TRUE recomputed flag_total (a hard-zero would fire 197 on a flag-bearing clean case).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { declarationDigest } from "../core/declarationCore.mjs";
import { buildMap } from "../core/mapCore.mjs";
import { signAttestation } from "../core/vwaCore.mjs";
import { scoreNano } from "../core/tensorCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4z/test-keys");

const PRIV = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vwa.pem"), "utf8");
const PUB = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vwa.pub.pem"), "utf8");

const f32 = (values) => {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
};
const saltForFixture = (id) => (key) =>
  createHash("sha256").update(`vwa-fixture-salt:${id}:${key}`).digest("hex").slice(0, 16);

// Build a clean bundle. tokenVals maps token_id → readout score (float); score(cell,token)
// = dot([1,0], [tokenVal,0]) = tokenVal, constant across cells (adequate for verifier fixtures).
function makeClean(id, { tokens, thetaVal, prompts, layers, tokenVals }) {
  const declaration = {
    schema: "simurgh.vwa.declaration.v1",
    tokens,
    theta_nano: scoreNano(thetaVal),
    corpus_manifest: {
      prompts: prompts.map((p) => ({
        prompt_id: p.prompt_id,
        n_tokens: p.n_tokens,
        prompt_digest: "sha256:" + createHash("sha256").update(p.prompt_id).digest("hex"),
      })),
    },
    position_rule_id: "all_positions",
    layers,
    tokenizer: "insecure-fixture-tokenizer-v1",
  };
  const activations = {};
  for (const p of prompts)
    for (let t = 0; t < p.n_tokens; t++)
      for (const layer of layers) activations[`${p.prompt_id}:${t}:${layer}`] = f32([1, 0]);
  const lensRows = {};
  for (const layer of layers)
    for (const tok of tokens)
      lensRows[`${layer}:${tok.token_id}`] = f32([tokenVals[tok.token_id], 0]);

  const { map, audit } = buildMap({
    declaration,
    activations,
    lensRows,
    saltFor: saltForFixture(id),
    provenance: "fixture",
  });
  const capture = {
    schema: "simurgh.vwa.capture.v1",
    model_id: "insecure-fixture-model",
    revision_digest:
      "sha256:" +
      createHash("sha256")
        .update("rev:" + id)
        .digest("hex"),
    lens_digest:
      "sha256:" +
      createHash("sha256")
        .update("lens:" + id)
        .digest("hex"),
    declaration_digest: declarationDigest(declaration),
    prompt_token_counts: Object.fromEntries(prompts.map((p) => [p.prompt_id, p.n_tokens])),
    // A COPY, not the map's own object — the capture and map are distinct artifacts, and a
    // commitment tamper must be able to make them diverge (fixture tamper_tensor_commitment).
    commitments: structuredClone(map.commitments),
    ceremony: { outcome: "captured", timestamp: "2026-07-08T00:00:00Z" },
  };
  const sign = (d, c, m, a) => signAttestation(d, c, m, a, PUB, PRIV);
  return {
    declaration,
    capture,
    map,
    audit,
    attestation: sign(declaration, capture, map, audit),
    sign,
  };
}

// Common small corpus/lexicon.
const LEX = [
  { token: "fake", token_id: 10 },
  { token: "injection", token_id: 20 },
  { token: "code", token_id: 30 },
];
const PROMPTS = [{ prompt_id: "p0", n_tokens: 2 }];
const LAYERS = [5, 8];
const THETA = 0.5;

function build() {
  const fixtures = [];
  const emit = (id, set, bundle, expected_public, expected_audit) => {
    writeFileSync(join(EVID, `${id}.bundle.json`), canonicalJson(bundle) + "\n");
    fixtures.push({ id, set, expected_public, expected_audit });
  };

  // 1 — clean multihop, no flags (all scores < θ).
  emit(
    "synthetic_clean_multihop",
    "clean",
    stripSign(
      makeClean("synthetic_clean_multihop", {
        tokens: LEX,
        thetaVal: THETA,
        prompts: PROMPTS,
        layers: LAYERS,
        tokenVals: { 10: 0.1, 20: 0.1, 30: 0.1 },
      })
    ),
    0,
    0
  );

  // 2 — clean injection-detect, flags present (fake, injection fire). self_report = true count.
  emit(
    "synthetic_clean_injection_detect",
    "clean",
    stripSign(
      makeClean("synthetic_clean_injection_detect", {
        tokens: LEX,
        thetaVal: THETA,
        prompts: PROMPTS,
        layers: LAYERS,
        tokenVals: { 10: 0.9, 20: 0.9, 30: 0.1 },
      })
    ),
    0,
    0
  );

  // 3 — clean, zero flags.
  emit(
    "synthetic_clean_zero_flags",
    "clean",
    stripSign(
      makeClean("synthetic_clean_zero_flags", {
        tokens: LEX,
        thetaVal: THETA,
        prompts: PROMPTS,
        layers: LAYERS,
        tokenVals: { 10: 0.0, 20: 0.0, 30: 0.0 },
      })
    ),
    0,
    0
  );

  // 4 — withheld tensors: publish map, drop the audit bundle. public 0, audit SKIPPED.
  {
    const b = makeClean("withheld_tensors", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.9, 20: 0.1, 30: 0.1 },
    });
    emit(
      "withheld_tensors",
      "withheld",
      {
        declaration: b.declaration,
        capture: b.capture,
        map: b.map,
        audit: null,
        attestation: b.attestation,
      },
      0,
      "SKIPPED"
    );
  }

  // 5 — tamper signature.
  {
    const b = makeClean("tamper_signature", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.1, 20: 0.1, 30: 0.1 },
    });
    b.attestation = { ...b.attestation, signature: "00".repeat(32) };
    emit("tamper_signature", "tamper", stripSign(b), 191, 191);
  }

  // 6 — post-hoc declaration: alter theta_nano in the map after signing (declaration precommit).
  {
    const b = makeClean("tamper_posthoc_declaration", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.9, 20: 0.1, 30: 0.1 },
    });
    b.map.theta_nano = scoreNano(0.99); // diverges from the signed declaration's theta
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit); // re-sign so 191 passes → 192 fires
    emit("tamper_posthoc_declaration", "tamper", stripSign(b), 192, 192);
  }

  // 7 — tensor commitment tamper: change a commitment in the map without re-signing binding.
  {
    const b = makeClean("tamper_tensor_commitment", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.1, 20: 0.1, 30: 0.1 },
    });
    const k = Object.keys(b.map.commitments)[0];
    b.map.commitments[k] = "sha256:" + "0".repeat(64);
    // re-sign so 191 passes and 193 (map vs capture commitment set) is the first failure.
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit);
    emit("tamper_tensor_commitment", "tamper", stripSign(b), 193, 193);
  }

  // 8 — omitted cell (No Silent Cell): drop a cell, re-sign.
  {
    const b = makeClean("tamper_omitted_cell", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.1, 20: 0.1, 30: 0.1 },
    });
    b.map.cells = b.map.cells.slice(0, b.map.cells.length - 1);
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit);
    emit("tamper_omitted_cell", "tamper", stripSign(b), 194, 194);
  }

  // 9 — scores doctored: publish a wrong score but keep flags/aggregates consistent; re-sign.
  //     Public-clean, audit-caught (195) — the documented asymmetry.
  {
    const b = makeClean("tamper_scores_doctored", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.9, 20: 0.1, 30: 0.1 },
    });
    for (const c of b.map.cells) {
      const s = c.scores.find((x) => x.token_id === 10);
      s.score_nano = scoreNano(0.95); // still ≥ θ, flags unchanged
    }
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit);
    emit("tamper_scores_doctored", "tamper", stripSign(b), 0, 195);
  }

  // 10 — flag flip: claim a flag the θ rule does not support; re-sign.
  {
    const b = makeClean("tamper_flag_flip", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.1, 20: 0.1, 30: 0.1 },
    });
    b.map.cells[0].flags = [10]; // token 10 scored 0.1 < θ, should not flag
    b.map.aggregates = recountFlags(b.map.cells); // keep aggregates internally consistent → 194 passes, 196 fires
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit);
    emit("tamper_flag_flip", "tamper", stripSign(b), 196, 196);
  }

  // 11 — perfect-score conflict: self_report claims 0 flags though the grid recomputes N>0.
  {
    const b = makeClean("perfect_score_conflict", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.9, 20: 0.9, 30: 0.1 },
    });
    b.map.self_report = { n_flags: 0 };
    b.attestation = b.sign(b.declaration, b.capture, b.map, b.audit);
    emit("perfect_score_conflict", "tamper", stripSign(b), 197, 197);
  }

  // 12 — shrunk declaration: capture saw 2 tokens for p0, declaration claims 1; re-sign the
  //     shrunk declaration so 191 passes and 192 (grid_positions_not_total) is the failure.
  {
    const b = makeClean("tamper_shrunk_declaration", {
      tokens: LEX,
      thetaVal: THETA,
      prompts: PROMPTS,
      layers: LAYERS,
      tokenVals: { 10: 0.9, 20: 0.1, 30: 0.1 },
    });
    // capture still reports the true count (2); shrink only the declaration.
    const shrunk = {
      ...b.declaration,
      corpus_manifest: { prompts: [{ ...b.declaration.corpus_manifest.prompts[0], n_tokens: 1 }] },
    };
    const dd = declarationDigest(shrunk);
    b.capture = { ...b.capture, declaration_digest: dd };
    b.map = { ...b.map, declaration_digest: dd };
    b.attestation = b.sign(shrunk, b.capture, b.map, b.audit);
    emit(
      "tamper_shrunk_declaration",
      "tamper",
      {
        declaration: shrunk,
        capture: b.capture,
        map: b.map,
        audit: b.audit,
        attestation: b.attestation,
      },
      192,
      192
    );
  }

  writeFileSync(join(EVID, "index.json"), canonicalJson({ fixtures }) + "\n");
  return fixtures.length;
}

// Drop the `sign` helper before serialising (it is not part of the bundle artifact).
function stripSign(b) {
  return {
    declaration: b.declaration,
    capture: b.capture,
    map: b.map,
    audit: b.audit,
    attestation: b.attestation,
  };
}
function recountFlags(cells) {
  const flags_by_token = {};
  let n_flagged_cells = 0;
  let flag_total = 0;
  for (const c of cells) {
    const flags = c.flags ?? [];
    if (flags.length) n_flagged_cells += 1;
    flag_total += flags.length;
    for (const tid of flags) flags_by_token[tid] = (flags_by_token[tid] ?? 0) + 1;
  }
  return { n_cells: cells.length, flags_by_token, n_flagged_cells, flag_total };
}

export { build };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(EVID, { recursive: true });
  const n = build();
  console.log(`stage4z fixtures written: ${n}`);
}
