// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — green bundle builder (plan Task 9). Assembles a signed attestation from a capture
// result, computing every committed field with the SAME core functions the verifier recomputes (so
// green is raw 0 by construction). Anti-fabrication guard [PG-1]: refuses to emit unless the capture is
// really offline with a non-sentinel resolved commit + snapshot manifest. The audit-private census is
// bound via capture_log_digest.
import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { applyRecipe } from "../core/recipes.mjs";
import { normalizeDeobfuscated, scoreTableDigest, runtimeDigest } from "../core/detector.mjs";
import { thresholdCrossing, scoreInversion } from "../core/slip.mjs";
import { curveAt, benignFpAt } from "../core/curve.mjs";
import { signBundle, contentOf } from "../core/vdaCore.mjs";

const sha256 = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const PLACEHOLDER = "sha256:PLACEHOLDER";

// capture = { detector, bases:[{base_id,base_text,family}], recipes:{base_id:recipe},
//   scores:{"base_id|variant":"0.####"}, benign_probe:[{probe_id,text,score}], theta_grid:[...] }
function assertRealCapture(cap) {
  const d = cap.detector ?? {};
  if (
    cap.captured_offline !== true ||
    !d.resolved_commit_sha ||
    d.resolved_commit_sha === "PLACEHOLDER" ||
    !d.snapshot_manifest_digest ||
    d.snapshot_manifest_digest === PLACEHOLDER
  )
    throw new Error(
      "greenBundle: refusing to emit a placeholder/unwitnessed capture (anti-fabrication guard)"
    );
}

export function buildFromCapture(cap, pubPem) {
  assertRealCapture(cap);
  const d = cap.detector;
  const rd = runtimeDigest(d.runtime);
  const snap = d.snapshot_manifest_digest;
  const theta = d.reference_threshold;

  const entries = [];
  const evasions = [];
  const census = [];
  for (const b of cap.bases) {
    const recipe = cap.recipes[b.base_id];
    const evText = applyRecipe(b.base_text, recipe);
    const variants = {
      raw: { recipe: [], text: b.base_text },
      evasion: { recipe, text: evText },
      deobfuscated: { recipe, text: normalizeDeobfuscated(evText) },
    };
    for (const [variant, v] of Object.entries(variants)) {
      entries.push({
        base_id: b.base_id,
        variant,
        recipe: v.recipe,
        base_text_digest: sha256(b.base_text),
        recipe_digest: sha256(canonicalJson(v.recipe)),
        generated_text_digest: sha256(v.text),
        detector_snapshot_digest: snap,
        runtime_digest: rd,
        score: cap.scores[`${b.base_id}|${variant}`],
      });
    }
    const raw = cap.scores[`${b.base_id}|raw`];
    const ev = cap.scores[`${b.base_id}|evasion`];
    const crossing = thresholdCrossing(raw, ev, theta);
    evasions.push({
      base_id: b.base_id,
      recipe,
      generated_text_digest: sha256(evText),
      threshold_crossing: crossing,
      score_inversion: scoreInversion(raw, ev),
      reviewed_equivalent_inversion: false,
    });
    census.push({
      base_id: b.base_id,
      generated_text_digest: sha256(evText),
      disposition: crossing ? "evasion_slip" : "evasion_caught",
    });
  }

  const score_table = { digest: scoreTableDigest(entries), entries };
  const base = { score_table, benign_probe: cap.benign_probe };
  const grid = cap.theta_grid ?? [theta];
  const evasion_threshold_curve = grid.map((t) => curveAt(base, t));
  const benign_fp_curve = grid.map((t) => ({ theta: t, false_positives: benignFpAt(base, t) }));

  const auditPrivate = { schema: "simurgh.vda.capture_log.v1", entries: census };
  const capture_provenance = {
    score_table_digest: score_table.digest,
    capture_log_digest: sha256(canonicalJson(auditPrivate)),
    detector_revision: d.resolved_commit_sha,
    capture_script_digest: cap.capture_script_digest,
    captured_offline: true,
    host_class: cap.host_class ?? "unspecified",
  };

  const content = {
    schema: "simurgh.vda.detector_attestation.v1",
    ruleset_id: "vda.v1",
    detector: d,
    base_corpus: cap.bases.map((b) => ({ base_id: b.base_id, base_text: b.base_text })),
    score_table,
    evasions,
    evasion_threshold_curve,
    benign_probe: cap.benign_probe,
    benign_fp_curve,
    capture_provenance,
    public_tier_does_not_prove_capture_completeness: true,
    curve_scope: "conditional on the committed corpus",
    attestation_pub_key_pem: pubPem,
  };
  return { content, auditPrivate };
}

export function buildGreenBundle(cap, privatePem) {
  const pubPem = createPublicKey(createPrivateKey(privatePem)).export({
    type: "spki",
    format: "pem",
  });
  const { content, auditPrivate } = buildFromCapture(cap, pubPem);
  return {
    bundle: { ...content, signature: signBundle(contentOf(content), privatePem) },
    auditPrivate,
  };
}
