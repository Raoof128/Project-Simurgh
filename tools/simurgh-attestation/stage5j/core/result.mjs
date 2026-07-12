// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC result shorthand. The repo convention is a plain { raw, reason } object (cf. 5I
// vpcCore); R/OK are convenience constructors, never a class.
export const R = (raw, reason, extra = {}) => ({ raw, reason, ...extra });
export const OK = (ctx) => ({ raw: 0, ctx });
