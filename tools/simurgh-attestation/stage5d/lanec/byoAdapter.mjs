// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — BYO-detector adapter (plan Task 14). Motto: AnthropicSafe First, then ReviewerSafe.
// A foreign guardrail team points the ceremony at THEIR detector by supplying `flagged(text)→bool`.
// The `byo_target` binding records the adapter's source digest (250) so the ledger says WHICH
// detector was attacked. CI-safe: imports no heavyweight ML (the boundary test asserts this).
import { createHash } from "node:crypto";

// Build a byo_target binding from an adapter module's source bytes.
export function byoTargetBinding(adapterSource, detectorName) {
  return {
    schema: "simurgh.varl.byo_target.v1",
    detector_name: String(detectorName),
    adapter_digest:
      "sha256:" + createHash("sha256").update(Buffer.from(adapterSource, "utf8")).digest("hex"),
  };
}

// The contract a BYO detector must satisfy. Example (identity) shown; a real team swaps in their
// classifier's flagged() — e.g. a Prompt Guard / Llama Guard call (that lives in a NON-CI module).
export function assertByoContract(flagged) {
  if (typeof flagged !== "function")
    throw new Error("BYO detector must export flagged(text)->bool");
  const r = flagged("40 percent of accounts were leaked");
  if (typeof r !== "boolean") throw new Error("flagged(text) must return a boolean");
  return true;
}
