// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 11, rebuilt at Task 18: the blind detector child.
//
// Reads a payload on stdin, decides ONE thing by ONE declared signal, and emits a verdict receipt on
// stdout. It is told the attack class and the bytes. It is not told which control it holds, and it
// has no way to ask.
//
// WHAT CHANGED AT TASK 18, AND WHY IT HAD TO. Until now this child decided by looking for a marker
// comment naming the declared signal — an answer key written into the exam paper by the control's own
// author. Every §4.1 condition passed and none of it was about a defect. The decision now comes from
// `core/signals.mjs`, where a signal is a predicate about a defect and an unknown signal id throws
// instead of quietly answering "not detected".
//
// THE RECEIPT CARRIES THREE OUTCOMES, NOT TWO. `verdict` is detected / not-detected, but a
// not-detected because the construct is absent and a not-detected because the construct is present
// and clean are different facts, and the campaign needs to tell them apart to say
// `premise_not_applicable` about a member honestly. That difference rides in `signal_evidence`, which
// is digested into the receipt, so the parent cannot rewrite it without breaking the digest chain.
//
// The exit code is deliberately 0 for BOTH verdicts. "process exit code alone" is the first forbidden
// surrogate of §3.4, and a child that encoded its verdict in its exit status would be handing the
// parent exactly that signal to read by accident.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verdictReceiptDigest, NOT_APPLICABLE, APPLIES_CLEAN } from "../core/laneB.mjs";
import { evaluateSignal } from "../core/signals.mjs";

const sha = (s) =>
  createHash("sha256")
    .update(Buffer.from(String(s), "utf8"))
    .digest("hex");

/** The detector's own name. It identifies; it does not authenticate — that is what the digest is for. */
export const DETECTOR_ID = "stage5r-detector-child-v2";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The digest of what this detector ACTUALLY IS: the child's bytes and the signal predicates it
 * dispatches to. A name in a receipt survives a rewritten implementation; a digest does not.
 *
 * @returns {string}
 */
export function detectorImplementationDigest() {
  const parts = [
    readFileSync(join(HERE, "detectorChild.mjs")),
    readFileSync(join(HERE, "../core/signals.mjs")),
  ];
  const h = createHash("sha256").update(Buffer.from(DETECTOR_ID, "utf8"));
  for (const p of parts) h.update(Buffer.from([0x00])).update(p);
  return h.digest("hex");
}

/**
 * Decide by the declared signal alone.
 *
 * The signal names a property of the source; the child evaluates that property and nothing else. It
 * does not look at length, exit status, stderr, parse success or elapsed time — every one of those is
 * a forbidden surrogate, and a detector that consulted them would be measuring sadness.
 *
 * @param {{source: string, declared_signal: string}} payload
 * @returns {{verdict: string, applies: boolean, unsupported: boolean, evidence: string}}
 */
export function decide({ source, declared_signal }) {
  const r = evaluateSignal(declared_signal, source);
  const evidence =
    r.verdict === "detected" ? r.evidence : r.applies ? APPLIES_CLEAN : NOT_APPLICABLE;
  return { verdict: r.verdict, applies: r.applies, unsupported: r.unsupported, evidence };
}

/**
 * @param {object} payload
 * @param {string} [implementationDigest] injectable so a test can pin the receipt without the files
 * @returns {object} the verdict receipt, digest included
 */
export function buildReceipt(payload, implementationDigest) {
  const { verdict, applies, unsupported, evidence } = decide(payload);
  const receipt = {
    control_digest: sha(payload.source),
    detector_digest: implementationDigest ?? detectorImplementationDigest(),
    declared_signal: payload.declared_signal,
    verdict,
    signal_evidence: evidence,
    signal_evidence_digest: sha(evidence),
    signal_applies: applies,
    signal_unsupported: unsupported,
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
