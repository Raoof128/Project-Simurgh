// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function resultReason(result) {
  return result.first_failure?.reason ?? result.failed_reason ?? result.reason ?? null;
}

function observedExit(result) {
  if (Number.isInteger(result.exit_code)) return result.exit_code;
  return result.ok === true ? 0 : 1;
}

async function readResult(root, relPath) {
  try {
    return JSON.parse(await readFile(join(root, relPath), "utf8"));
  } catch (error) {
    return {
      ok: false,
      exit_code: 2,
      first_failure: {
        reason: "stage_result_schema_missing",
        message: error.message,
      },
    };
  }
}

export async function evaluateOracle({ root = ".", expectations }) {
  const entries = [];
  const failures = [];
  for (const expectation of expectations) {
    const result = await readResult(root, expectation.path);
    const observed_exit = observedExit(result);
    const observed_reason = resultReason(result);
    let reason = null;
    if (expectation.expected_exit === 0) {
      if (observed_exit !== 0 || result.ok !== true) reason = "unexpected_clean_failure";
    } else if (observed_exit === 0 || result.ok === true) {
      reason = "unexpected_red_arm_success";
    } else if (
      observed_exit !== expectation.expected_exit ||
      observed_reason !== expectation.expected_reason
    ) {
      reason =
        observed_reason === "stage_result_schema_missing"
          ? "stage_result_schema_missing"
          : "unexpected_red_arm_reason";
    }
    const entry = {
      stage: expectation.stage,
      arm: expectation.arm,
      artifact_kind: expectation.artifact_kind,
      path: expectation.path,
      expected_exit: expectation.expected_exit,
      expected_reason: expectation.expected_reason,
      observed_exit,
      observed_reason,
      pass: reason === null,
    };
    entries.push(entry);
    if (reason) failures.push({ ...entry, reason });
  }
  return { ok: failures.length === 0, entries, failures };
}
