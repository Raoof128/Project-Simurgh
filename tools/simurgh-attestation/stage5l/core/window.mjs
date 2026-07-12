// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q raw 374: committed review-window coherence. Fires iff NOT window_coherent (P0-7c).
// This is a coherence sanity gate on the COMMITTED window, not the precedence proof (that is 373).
import { R } from "./result.mjs";

export function checkWindowCoherence(ctx) {
  const w = ctx.bundle.review_window;
  const coherent =
    w &&
    typeof w.window_open_not_before === "number" &&
    ctx.tsaUpperBound !== null &&
    w.window_open_not_before >= ctx.tsaUpperBound &&
    w.window_close_after > w.window_open_not_before &&
    w.required_anchor_profile === ctx.committedProfile;
  return coherent ? null : R(374, "window_incoherent");
}
