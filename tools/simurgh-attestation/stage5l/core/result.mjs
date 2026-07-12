// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q result shorthand. Plain { raw, reason } object (cf. 5K); R/OK are convenience
// constructors, never a class.
export const R = (raw, reason, extra = {}) => ({ raw, reason, ...extra });
export const OK = (ctx) => ({ raw: 0, ctx });
