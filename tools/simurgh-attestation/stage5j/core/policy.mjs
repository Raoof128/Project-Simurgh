// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC reserved-slot policy (346, both tiers). The arc-spine slots are structural unions
// (null | object); a non-null branch under the current schema_version is a future-stage feature that
// THIS verifier must reject (a strict-null schema would be caught at 332 first — reviewer P2). Late in
// the order because it is a POLICY-house check, not because it is expensive.
import { R } from "./result.mjs";
import { VRC_RESERVED_ARTIFACT_SLOTS } from "../constants.mjs";

export function checkReservedSlots(ctx) {
  for (const slot of VRC_RESERVED_ARTIFACT_SLOTS) {
    if (ctx.bundle[slot] !== null) return R(346, "reserved_slot_activated", { slot });
  }
  return null;
}
