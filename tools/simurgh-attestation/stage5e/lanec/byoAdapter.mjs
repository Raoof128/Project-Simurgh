// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — BYO capture-contract adapter (plan Task 14). Non-CI, digest-only. External-review
// correction: the bare score(text)->float contract conflicts with the fixed-width string domain and
// assumes one positive score, so the contract is a richer capture(text) that returns the score AS a
// fixed-width string plus the pin fields the verifier needs. VDA is scoped to a BINARY two-logit
// detector with one positive class; a multi-class panel is minted (multi_detector_panel_deferred).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { isFixedWidthDec, runtimeDigest } from "../core/detector.mjs";

const sha256 = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

export const BYO_CONTRACT = "vda.capture_v1";

// Wrap a raw scorer (text -> number in [0,1], the detector's positive-class softmax score) into the
// VDA capture contract. score_precision fixes the decimal width so results are byte-stable.
export function wrapScorer(rawScore, meta) {
  const { label_map, positive_class_index, detector_revision, runtime, score_precision = 4 } = meta;
  const runtime_digest = runtimeDigest(runtime);
  return function capture(text) {
    const n = Number(rawScore(text));
    if (!Number.isFinite(n) || n < 0 || n > 1)
      throw new Error("BYO scorer must return a number in [0,1]");
    return {
      score: n.toFixed(score_precision),
      label_map,
      positive_class_index,
      detector_revision,
      runtime_digest,
      input_digest: sha256(String(text)),
    };
  };
}

// A capture result is well-formed iff the score is a fixed-width decimal and the pin fields resolve.
export function validateCaptureResult(r) {
  if (!r || typeof r !== "object") return false;
  if (!isFixedWidthDec(r.score)) return false;
  for (const f of [
    "label_map",
    "positive_class_index",
    "detector_revision",
    "runtime_digest",
    "input_digest",
  ])
    if (r[f] == null) return false;
  const label = r.label_map[String(r.positive_class_index)];
  return typeof label === "string";
}

// The byo_target binding recorded in the bundle (adapter digest + contract + which revision it targets).
export function byoTargetBinding({ adapter_digest, detector_revision }) {
  return {
    schema: "simurgh.vda.byo_target.v1",
    contract: BYO_CONTRACT,
    adapter_digest,
    detector_revision,
  };
}

export function checkByoBinding(byo_target) {
  if (byo_target == null) return null; // optional
  if (
    byo_target.schema !== "simurgh.vda.byo_target.v1" ||
    byo_target.contract !== BYO_CONTRACT ||
    typeof byo_target.adapter_digest !== "string" ||
    typeof byo_target.detector_revision !== "string"
  )
    return "byo_binding_invalid";
  return null;
}
