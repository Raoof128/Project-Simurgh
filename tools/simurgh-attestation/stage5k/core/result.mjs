// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC result shorthand. Plain { raw, reason } object (cf. 5I/5J); R/OK are convenience
// constructors, never a class.
export const R = (raw, reason, extra = {}) => ({ raw, reason, ...extra });
export const OK = (ctx) => ({ raw: 0, ctx });
