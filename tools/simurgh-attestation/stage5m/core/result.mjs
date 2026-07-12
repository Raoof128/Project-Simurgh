// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — result shorthand, same { raw, reason, ... } shape as the frozen 5L core.
export const R = (raw, reason, extra = {}) => ({ raw, reason, ...extra });
export const OK = (extra = {}) => ({ raw: 0, ...extra });
