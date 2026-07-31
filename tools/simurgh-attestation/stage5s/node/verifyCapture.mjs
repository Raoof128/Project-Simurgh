#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 25 — frozen-capture verification, entirely offline.
//
//   node verifyCapture.mjs --capture docs/research/llm-shield/evidence/stage-5s/lane-c/
//
// THE TWO RULES, FROZEN:
//
//   capture_required                     = false   an absent capture is `not_captured`, never green
//   frozen_capture_verification_required = true    once a capture is present
//
// An UNVERIFIABLE capture is a REFUSAL, never a skip. That is the whole point of freezing one: a
// capture nobody can re-check is a screenshot, and this stage does not ship screenshots.
//
// IT RECOMPUTES THE BINDING RATHER THAN READING IT. The OpenTimestamps anchor commits to
// `sha256(file bytes)`, not to the envelope digest the record names — a gap exactly one hash wide,
// and one the first version of the capture driver papered over by writing "captured" and leaving a
// reader to assume. So the stored `anchored_value` is a CLAIM, recomputed here from the stored file
// content, and the content itself is checked against the submitted digest.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CAPTURE_VERIFY_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

export const CAPTURE_REFUSALS = Object.freeze({
  RECORD_MALFORMED: "CAPTURE_RECORD_MALFORMED",
  ARTIFACT_ABSENT: "CAPTURE_ARTIFACT_ABSENT",
  BINDING_UNRECOMPUTABLE: "CAPTURE_BINDING_UNRECOMPUTABLE",
  BINDING_MISMATCH: "CAPTURE_BINDING_MISMATCH",
  OUTCOME_UNKNOWN: "CAPTURE_OUTCOME_UNKNOWN",
  WITNESS_WEIGHT_CLAIMED: "CAPTURE_WITNESS_WEIGHT_CLAIMED",
});

const KNOWN_OUTCOMES = new Set([
  "captured",
  "not_captured_tool_absent",
  "not_captured_network_unavailable",
  "not_captured_refused_by_service",
  "not_captured_not_attempted",
  "not_captured_absent_from_log",
]);

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/**
 * Verify a frozen capture offline. Pure apart from reading the committed directory; never throws.
 *
 * @returns {{ok: boolean, refusals: Array<object>, state: string, verified: Array<string>}}
 */
export function verifyCapture(dir, deps = {}) {
  const read = deps.readFile ?? ((p) => readFileSync(p, "utf8"));
  const exists = deps.exists ?? ((p) => existsSync(p));
  const refusals = [];

  let record;
  try {
    record = JSON.parse(read(join(dir, "lane-c-capture.json")));
  } catch (error) {
    return {
      ok: false,
      refusals: [{ reason: CAPTURE_REFUSALS.RECORD_MALFORMED, detail: error.message }],
      state: "not_captured",
      verified: [],
    };
  }

  if (record.schema !== "simurgh.vwq.lane-c-capture.v1") {
    refusals.push({ reason: CAPTURE_REFUSALS.RECORD_MALFORMED, detail: String(record.schema) });
  }
  // §3.1 is not negotiable, and the record must not quietly restate it wrongly.
  if (record.anchor_witness_weight !== 0 || record.witness_independence_status_effect !== "none") {
    refusals.push({
      reason: CAPTURE_REFUSALS.WITNESS_WEIGHT_CLAIMED,
      detail: "the capture claims an anchor contributes witness weight",
    });
  }

  const mechanisms = Array.isArray(record.mechanisms) ? record.mechanisms : [];
  const verified = [];

  for (const m of mechanisms) {
    if (!KNOWN_OUTCOMES.has(m?.outcome)) {
      refusals.push({
        reason: CAPTURE_REFUSALS.OUTCOME_UNKNOWN,
        detail: `${m?.external_anchor_class}: ${m?.outcome}`,
      });
      continue;
    }
    if (m.outcome !== "captured") continue;

    // A captured mechanism must have left something behind, and it must be here.
    if (!m.artifact || !exists(join(dir, m.artifact))) {
      refusals.push({
        reason: CAPTURE_REFUSALS.ARTIFACT_ABSENT,
        detail: `${m.external_anchor_class} claims ${m.artifact ?? "no artifact"}`,
      });
      continue;
    }

    if (m.external_anchor_class === "bitcoin_ots") {
      // The binding, RECOMPUTED. Stored values are claims to check.
      if (typeof m.anchored_file_content !== "string" || typeof m.anchored_value !== "string") {
        refusals.push({
          reason: CAPTURE_REFUSALS.BINDING_UNRECOMPUTABLE,
          detail: "the anchor records no content to recompute from",
        });
        continue;
      }
      const recomputed = `sha256:${sha256(m.anchored_file_content)}`;
      if (recomputed !== m.anchored_value) {
        refusals.push({
          reason: CAPTURE_REFUSALS.BINDING_MISMATCH,
          detail: `anchored_value is ${m.anchored_value}, the content digests to ${recomputed}`,
        });
        continue;
      }
      // And the file really does contain the digest the record says was submitted.
      if (
        m.anchored_file_content.trim() !== String(record.submitted_digest).replace(/^sha256:/, "")
      ) {
        refusals.push({
          reason: CAPTURE_REFUSALS.BINDING_MISMATCH,
          detail: "the anchored file does not contain the submitted digest",
        });
        continue;
      }
      // The committed file on disk must match the pinned content too — otherwise the record
      // describes a file that is no longer there.
      let onDisk;
      try {
        onDisk = read(join(dir, m.anchored_file));
      } catch (error) {
        refusals.push({ reason: CAPTURE_REFUSALS.ARTIFACT_ABSENT, detail: error.message });
        continue;
      }
      if (onDisk !== m.anchored_file_content) {
        refusals.push({
          reason: CAPTURE_REFUSALS.BINDING_MISMATCH,
          detail: "the committed file differs from the content the record pins",
        });
        continue;
      }
    }

    if (m.external_anchor_class === "rfc3161") {
      // Offline: the token must be a non-trivial DER blob. Full chain validation needs the TSA
      // certificate chain and is Task 30's business; what is checked here is that the artifact is
      // present, substantial, and not an error page wearing a `.tsr` name.
      let token;
      try {
        token = readFileSync(join(dir, m.artifact));
      } catch (error) {
        refusals.push({ reason: CAPTURE_REFUSALS.ARTIFACT_ABSENT, detail: error.message });
        continue;
      }
      if (token.length < 256 || token[0] !== 0x30) {
        refusals.push({
          reason: CAPTURE_REFUSALS.BINDING_MISMATCH,
          detail: `the timestamp token is ${token.length} bytes and does not begin with a DER SEQUENCE`,
        });
        continue;
      }
    }

    verified.push(m.external_anchor_class);
  }

  const state = verified.length > 0 ? "captured" : "not_captured";
  // The record's own state must agree with what was verifiable. A record claiming `captured` over
  // nothing verifiable is exactly the unverifiable capture this task refuses.
  if (record.lane_c_state === "captured" && state !== "captured") {
    refusals.push({
      reason: CAPTURE_REFUSALS.BINDING_UNRECOMPUTABLE,
      detail: "the record claims a capture and nothing in it verified",
    });
  }

  return { ok: refusals.length === 0, refusals, state, verified: verified.sort() };
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  let dir = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--capture") dir = argv[i + 1];
    else if (argv[i].startsWith("--capture=")) dir = argv[i].slice("--capture=".length);
    else if (!argv[i].startsWith("--")) continue;
    else if (argv[i] !== "--capture") {
      log(`Stage 5S capture — NOT RUN: unrecognised argument: ${argv[i]}`);
      return CAPTURE_VERIFY_EXIT.OPERATOR_ERROR;
    }
  }
  if (!dir) {
    log("Stage 5S capture — NOT RUN: --capture <dir> is required");
    return CAPTURE_VERIFY_EXIT.OPERATOR_ERROR;
  }

  const result = verifyCapture(dir, deps);
  log(`Stage 5S capture — ${result.state}`);
  if (result.verified.length) log(`  verified offline: ${result.verified.join(", ")}`);
  if (!result.ok) {
    for (const r of result.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
    return CAPTURE_VERIFY_EXIT.REFUSED;
  }
  log("  OK — every claimed capture recomputes from what is committed");
  return CAPTURE_VERIFY_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
