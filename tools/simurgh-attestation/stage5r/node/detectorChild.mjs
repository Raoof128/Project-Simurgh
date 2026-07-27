// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 11: the blind detector child.
//
// Reads a payload on stdin, decides ONE thing by ONE declared signal, and emits a verdict receipt on
// stdout. It is told the attack class and the bytes. It is not told which control it holds, and it
// has no way to ask.
//
// The exit code is deliberately 0 for BOTH verdicts. "process exit code alone" is the first forbidden
// surrogate of §3.4, and a child that encoded its verdict in its exit status would be handing the
// parent exactly that signal to read by accident.

import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { verdictReceiptDigest } from "../core/laneB.mjs";

const sha = (s) =>
  createHash("sha256")
    .update(Buffer.from(String(s), "utf8"))
    .digest("hex");

/** The detector's own identity, so a swapped detector changes the receipt. */
export const DETECTOR_ID = "stage5r-detector-child-v1";

/**
 * Decide by the declared signal alone.
 *
 * The signal names a property of the source; the child looks for that property and nothing else. It
 * does not look at length, exit status, stderr, parse success or elapsed time — every one of those is
 * a forbidden surrogate, and a detector that consulted them would be measuring sadness.
 *
 * @param {{source: string, declared_signal: string}} payload
 * @returns {{verdict: string, evidence: string}}
 */
export function decide({ source, declared_signal }) {
  const marker = `/* SIGNAL:${declared_signal} */`;
  const present = String(source).includes(marker);
  return { verdict: present ? "detected" : "not_detected", evidence: present ? marker : "" };
}

/**
 * @param {object} payload
 * @returns {object} the verdict receipt, digest included
 */
export function buildReceipt(payload) {
  const { verdict, evidence } = decide(payload);
  const receipt = {
    control_digest: sha(payload.source),
    detector_digest: sha(DETECTOR_ID),
    declared_signal: payload.declared_signal,
    verdict,
    signal_evidence_digest: sha(evidence),
  };
  receipt.receipt_digest = verdictReceiptDigest(receipt);
  return receipt;
}

/** Read all of stdin. */
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const payload = JSON.parse(await readStdin());
  process.stdout.write(JSON.stringify(buildReceipt(payload)));
  process.exit(0);
}
