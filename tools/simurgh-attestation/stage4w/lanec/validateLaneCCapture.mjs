// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane C capture validation (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// The capture seals digests, never transcripts (non-claims 5 and 6).
import { VSN_LANEC_CAPTURE_SCHEMA } from "../constants.mjs";
import { payloadCheck } from "../core/narrativeCore.mjs";

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const VALID_RAW = new Set([0, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172]);

export function validateLaneCCapture(cap) {
  const err = (error) => ({ error });
  if (cap?.schema !== VSN_LANEC_CAPTURE_SCHEMA) return err("bad_schema");
  if (!["standard", "adversarial"].includes(cap.mode)) return err("bad_mode");
  if (!DIGEST.test(cap.prompt_digest ?? "") || !DIGEST.test(cap.completion_digest ?? ""))
    return err("bad_digests");
  if (cap.model_refused === true) {
    if (cap.verify_result !== undefined) return err("refused_with_result");
  } else if (!VALID_RAW.has(cap.verify_result?.raw)) return err("bad_verify_raw");
  if (payloadCheck(cap, "capture")) return err("raw_payload_material");
  return null;
}
