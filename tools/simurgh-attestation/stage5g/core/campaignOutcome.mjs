// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC campaign outcome. Only status "completed" may carry a producer transcript; a
// non-completed campaign is honest evidence but never a capture attestation (never enters evaluate).
import { CAMPAIGN_STATUS } from "../constants.mjs";
export function validateCampaign(obj) {
  if (!obj || !CAMPAIGN_STATUS.includes(obj.status)) {
    throw new Error(`invalid campaign status: ${obj?.status}`);
  }
  if (obj.status !== "completed" && obj.producer_transcript_present) {
    throw new Error("non-completed campaign must not carry a producer transcript");
  }
  return obj.status;
}
