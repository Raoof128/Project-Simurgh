// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC overclaim check (raw 296, Law 3, headline). claimed_rung > proven_rung fails closed. A
// lower claim over stronger evidence is accepted (both rungs are reported by vfcCore).
import { CODES, rungGte } from "../constants.mjs";
export function overclaim(claimedRung, provenRung) {
  return rungGte(claimedRung, provenRung) && claimedRung !== provenRung
    ? CODES.VFC_SEPARATION_OVERCLAIM
    : null;
}
