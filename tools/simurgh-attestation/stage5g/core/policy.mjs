// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC policy gate (raw 298). Strict min-rung; --attestation-only bypasses. Policy NEVER
// mutates integrity status — it only asks whether a truthful proven rung meets the consumer minimum.
import { CODES, rungGte, DEFAULT_MIN_RUNG } from "../constants.mjs";
export function checkPolicy(provenRung, ctx) {
  if (ctx.attestationOnly) return null;
  return rungGte(provenRung, ctx.minRung ?? DEFAULT_MIN_RUNG) ? null : CODES.VFC_POLICY_REJECTED;
}
