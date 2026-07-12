// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q policy check (raw 382). Reserved artifact slots are structural unions null|object; a
// non-null branch under the current schema_version is a policy rejection (capstone + minted debts).
import { R } from "./result.mjs";
import { RESERVED_ARTIFACT_SLOTS } from "../constants.mjs";

export function checkReservedSlots(ctx) {
  const slots = ctx.bundle.reserved_slots ?? {};
  for (const name of RESERVED_ARTIFACT_SLOTS) {
    if (slots[name] !== null && slots[name] !== undefined) {
      return R(382, "reserved_slot_activated", { slot: name });
    }
  }
  return null;
}
