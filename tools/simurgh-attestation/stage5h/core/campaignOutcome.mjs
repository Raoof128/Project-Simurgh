// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane C campaign outcome (5G semantics). Only status "completed" may carry disclosure
// evidence; any other status is honest evidence of a non-completion and must NOT claim a real capture.
// No raw code — this throws on an invalid/inconsistent record (fail-closed at the reproduce boundary).
import { CAMPAIGN_STATUS } from "../constants.mjs";

export function validateCampaign(obj) {
  if (!obj || !CAMPAIGN_STATUS.includes(obj.status)) {
    throw new Error(`invalid campaign status: ${obj?.status}`);
  }
  if (obj.status !== "completed" && obj.disclosure_present) {
    throw new Error("non-completed campaign must not carry completed disclosure evidence");
  }
  return obj.status;
}
