// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — verdict shape. R(raw, reason, extra) is a failure; OK(extra) is the green verdict.
export function R(raw, reason, extra = {}) {
  return { raw, reason, ...extra };
}
export function OK(extra = {}) {
  return { raw: 0, reason: "ok", ...extra };
}
