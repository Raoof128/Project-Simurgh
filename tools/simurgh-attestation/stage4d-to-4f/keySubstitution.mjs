// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_CLASSES = ["stage4d_pack", "stage4e_scenario_pack", "stage4f_cell_frontier"];

function reasonOf(result) {
  return result.first_failure?.reason ?? result.failed_reason ?? result.reason ?? null;
}

export async function evaluateWrongKeyResult({ root = ".", klass, path }) {
  const result = JSON.parse(await readFile(join(root, path), "utf8"));
  const observedReason = reasonOf(result);
  const ok =
    result.ok === false &&
    result.exit_code !== 0 &&
    (observedReason === "external_pubkey_mismatch" ||
      observedReason === "embedded_key_mismatch" ||
      observedReason === "signature_verification_failed" ||
      observedReason === "frontier_signature_invalid" ||
      observedReason === "pack_verify_failed");
  return {
    class: klass,
    ok,
    method: "observed_wrong_key_verification",
    path,
    observed_exit: result.exit_code,
    observed_reason: observedReason,
  };
}

export function requireKeySubstitutionCoverage(entries) {
  const byClass = new Map(entries.map((entry) => [entry.class, entry]));
  const failures = [];
  for (const klass of REQUIRED_CLASSES) {
    const entry = byClass.get(klass);
    if (!entry || entry.ok !== true) {
      failures.push({ reason: "key_substitution_not_tested", class: klass });
    }
  }
  return { ok: failures.length === 0, failures };
}
