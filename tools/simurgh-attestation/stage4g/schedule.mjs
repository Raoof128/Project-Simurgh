// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { ATTACK_CLASSES } from "./constants.mjs";

export function deriveCanonicalSeed({
  target_commit,
  library_hash,
  policy_hash,
  driver_hash,
  budget,
}) {
  return `sha256:${sha256Canonical({
    target_commit,
    library_hash,
    policy_hash,
    driver_hash,
    budget,
  })}`;
}

export function deriveSchedule({
  seed,
  budget,
  library_hash,
  target_commit,
  policy_hash,
  driver_hash,
}) {
  const rows = [];
  for (const klass of ATTACK_CLASSES) {
    const count = budget.per_class[klass] ?? 0;
    for (let index = 0; index < count; index += 1) {
      const id = `a${String(rows.length + 1).padStart(4, "0")}`;
      rows.push({
        id,
        target_class: klass,
        schedule_hash: `sha256:${sha256Canonical({
          seed,
          id,
          target_class: klass,
          slot: index,
          library_hash,
          target_commit,
          policy_hash,
          driver_hash,
        })}`,
      });
    }
  }
  if (rows.length !== budget.queries_total) {
    throw new Error(
      `budget queries_total ${budget.queries_total} does not equal derived schedule ${rows.length}`
    );
  }
  return rows;
}

export function scheduleDigest(schedule) {
  return `sha256:${sha256Canonical(schedule)}`;
}
