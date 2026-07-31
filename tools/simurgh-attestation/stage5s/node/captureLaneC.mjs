#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 24 — Lane C acquisition. Live, and never CI-gated.
//
//   node captureLaneC.mjs --digest <hex> --emit docs/research/llm-shield/evidence/stage-5s/lane-c/
//
// REVISION 1 VERIFIED A CAPTURE NOTHING PRODUCED (§13, B8). This file produces it, or records
// honestly that it did not. The submission is a DIGEST and nothing else — no content, no prose, no
// identity — to three ecology mechanisms: an RFC-3161 timestamp authority, a transparency log, and
// a Bitcoin calendar via OpenTimestamps.
//
// FAILURES ARE TYPED OUTCOMES, NEVER RETRIES. A refusal, a timeout or an outage is recorded as what
// it was and sealed. Nothing here re-runs a mechanism until it looks good, because a capture
// obtained by retrying until success is a capture of the retry policy rather than of the world.
//
// AND THE RELEASE SEMANTICS ARE FROZEN HERE:
//
//   no capture  →  typed `not_captured`, and NO Lane C achievement is claimed anywhere
//   a capture   →  Task 25's offline verification becomes MANDATORY
//
// An anchor establishes that a digest existed by a time. It reads nothing, understands nothing, and
// carries ZERO witness weight (§3.1) — so a satisfied corroboration status never moves
// `witness_independence_status`, and this file never writes one.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson } from "../core/canonical.mjs";
import { EXTERNAL_ANCHOR_CLASS } from "../core/classes.mjs";

export const CAPTURE_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

/** Every way a mechanism can end. All of them are recordable; none of them is a retry. */
export const CAPTURE_OUTCOMES = Object.freeze([
  "captured",
  "not_captured_tool_absent",
  "not_captured_network_unavailable",
  "not_captured_refused_by_service",
  "not_captured_not_attempted",
  // HTTP 200 is not a capture. The transparency log answers "no entry for this digest" with a
  // successful, empty response, and the first version of this file read the status code and called
  // it captured — a fail-open in the very instrument meant to record honestly.
  "not_captured_absent_from_log",
]);

export function parseArgs(argv) {
  const opts = { digest: null, emit: null, timeout: "20" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, null];
    if (flag === "--key" || flag === "--sign") {
      return { error: `${flag} is refused: Lane C submits a digest and signs nothing` };
    }
    const name = flag.startsWith("--") ? flag.slice(2) : null;
    if (name === null || !(name in opts)) return { error: `unrecognised argument: ${arg}` };
    const value = inline ?? argv[(i += 1)];
    if (!value) return { error: `${flag} requires a value` };
    opts[name] = value;
  }
  if (!opts.digest) return { error: "--digest <hex> is required" };
  if (!/^[0-9a-f]{64}$/.test(opts.digest)) {
    return { error: "--digest must be 64 lowercase hex characters" };
  }
  if (!opts.emit) return { error: "--emit <dir> is required" };
  return opts;
}

/** Run a command, and classify what happened rather than throwing it away. */
function attempt(bin, args, deps, timeoutSeconds) {
  const run =
    deps.run ??
    ((b, a) =>
      execFileSync(b, a, {
        encoding: "utf8",
        timeout: timeoutSeconds * 1000,
        maxBuffer: 8 * 1024 * 1024,
      }));
  try {
    return { ok: true, stdout: run(bin, args) };
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/ENOENT|not found/i.test(message)) {
      return { ok: false, outcome: "not_captured_tool_absent", detail: `${bin} is not installed` };
    }
    if (/ETIMEDOUT|ENOTFOUND|EAI_AGAIN|timed out|Could not resolve|network/i.test(message)) {
      return {
        ok: false,
        outcome: "not_captured_network_unavailable",
        detail: message.slice(0, 200),
      };
    }
    return { ok: false, outcome: "not_captured_refused_by_service", detail: message.slice(0, 200) };
  }
}

/**
 * Attempt all three mechanisms over one digest. Never throws; every mechanism returns a typed record
 * whether it succeeded or not.
 */
export function captureAll({ digest, dir, deps = {}, timeoutSeconds = 20 }) {
  const records = [];

  // --- rfc3161 -------------------------------------------------------------------------------
  // A timestamp request over the digest. The token, if it arrives, is written verbatim.
  {
    const tsq = join(dir, "vwq.tsq");
    const build = attempt(
      "openssl",
      ["ts", "-query", "-digest", digest, "-sha256", "-cert", "-out", tsq],
      deps,
      timeoutSeconds
    );
    if (!build.ok) {
      records.push({
        external_anchor_class: "rfc3161",
        outcome: build.outcome,
        detail: build.detail,
      });
    } else {
      const post = attempt(
        "curl",
        [
          "-sS",
          "--max-time",
          String(timeoutSeconds),
          "-H",
          "Content-Type: application/timestamp-query",
          "--data-binary",
          `@${tsq}`,
          "-o",
          join(dir, "vwq.tsr"),
          "-w",
          "%{http_code}",
          "https://freetsa.org/tsr",
        ],
        deps,
        timeoutSeconds
      );
      records.push(
        post.ok && String(post.stdout).trim() === "200"
          ? { external_anchor_class: "rfc3161", outcome: "captured", artifact: "vwq.tsr" }
          : {
              external_anchor_class: "rfc3161",
              outcome: post.ok ? "not_captured_refused_by_service" : post.outcome,
              detail: post.ok ? `http ${String(post.stdout).trim()}` : post.detail,
            }
      );
    }
  }

  // --- rekor ---------------------------------------------------------------------------------
  // Read-only: the public log is QUERIED for the digest. Nothing is uploaded, because an upload
  // needs a signature and Lane C signs nothing — see the --key refusal above.
  {
    const query = attempt(
      "curl",
      [
        "-sS",
        "--max-time",
        String(timeoutSeconds),
        "-o",
        join(dir, "vwq-rekor-query.json"),
        "-w",
        "%{http_code}",
        `https://rekor.sigstore.dev/api/v1/index/retrieve`,
        "-X",
        "POST",
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify({ hash: `sha256:${digest}` }),
      ],
      deps,
      timeoutSeconds
    );
    // A 200 says the log ANSWERED, not that it holds anything. The body decides.
    let entries = null;
    try {
      entries = JSON.parse(readFileSync(join(dir, "vwq-rekor-query.json"), "utf8"));
    } catch {
      entries = null;
    }
    const found = Array.isArray(entries) && entries.length > 0;
    records.push(
      query.ok && String(query.stdout).trim() === "200" && found
        ? {
            external_anchor_class: "rekor",
            outcome: "captured",
            artifact: "vwq-rekor-query.json",
            entry_count: entries.length,
          }
        : {
            external_anchor_class: "rekor",
            outcome: !query.ok
              ? query.outcome
              : String(query.stdout).trim() === "200"
                ? "not_captured_absent_from_log"
                : "not_captured_refused_by_service",
            detail:
              query.ok && String(query.stdout).trim() === "200"
                ? "the log answered successfully and holds no entry for this digest"
                : query.ok
                  ? `http ${String(query.stdout).trim()}`
                  : query.detail,
          }
    );
  }

  // --- bitcoin_ots ---------------------------------------------------------------------------
  {
    // OTS stamps a FILE, so what Bitcoin will eventually commit to is sha256(file bytes) — NOT the
    // envelope digest. The first version of this file recorded "captured" and left a reader to
    // assume the anchor covered the digest it names. It does not, and the gap is one hash wide.
    //
    // So the file content is pinned exactly, and BOTH values are recorded: what was anchored, and
    // how it relates to what was submitted. Task 25 recomputes the relation rather than trusting it.
    const digestFile = join(dir, "vwq-digest.txt");
    const fileBytes = `${digest}\n`;
    writeFileSync(digestFile, fileBytes);
    const anchoredValue = createHash("sha256").update(fileBytes, "utf8").digest("hex");
    const stamp = attempt("ots", ["stamp", digestFile], deps, timeoutSeconds);
    records.push(
      stamp.ok
        ? {
            external_anchor_class: "bitcoin_ots",
            outcome: "captured",
            artifact: "vwq-digest.txt.ots",
            // The honest chain, stated in the artifact: Bitcoin will commit to `anchored_value`,
            // which is the digest of a file whose entire content is `submitted_digest` + newline.
            anchored_value: `sha256:${anchoredValue}`,
            anchored_file: "vwq-digest.txt",
            anchored_file_content: fileBytes,
            binding:
              "anchored_value = sha256(anchored_file_content); content = submitted_digest + LF",
          }
        : { external_anchor_class: "bitcoin_ots", outcome: stamp.outcome, detail: stamp.detail }
    );
  }

  return records;
}

/** The sealed record. `not_captured` is a first-class outcome, never an empty file. */
export function captureRecord(digest, records) {
  const captured = records.filter((r) => r.outcome === "captured");
  return {
    schema: "simurgh.vwq.lane-c-capture.v1",
    submitted_digest: `sha256:${digest}`,
    // The frozen release semantics, written into the artifact so a reader need not find the plan.
    capture_required: false,
    frozen_capture_verification_required: captured.length > 0,
    lane_c_state: captured.length > 0 ? "captured" : "not_captured",
    distinct_mechanisms_captured: [...new Set(captured.map((r) => r.external_anchor_class))].sort(),
    mechanisms: [...records].sort((a, b) =>
      a.external_anchor_class < b.external_anchor_class ? -1 : 1
    ),
    // §3.1, restated where it will be read: an anchor observes a digest and reads nothing.
    anchor_witness_weight: 0,
    witness_independence_status_effect: "none",
    non_claim:
      "An external anchor establishes that a digest existed by a time. It carries zero witness " +
      "weight, contributes nothing to any quorum, and never upgrades witness independence.",
  };
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`Stage 5S lane C — NOT RUN: ${parsed.error}`);
    return CAPTURE_EXIT.OPERATOR_ERROR;
  }
  try {
    mkdirSync(parsed.emit, { recursive: true });
  } catch (error) {
    log(`Stage 5S lane C — NOT RUN: ${error.message}`);
    return CAPTURE_EXIT.OPERATOR_ERROR;
  }

  const records = captureAll({
    digest: parsed.digest,
    dir: parsed.emit,
    deps,
    timeoutSeconds: Number(parsed.timeout),
  });
  const record = captureRecord(parsed.digest, records);
  writeFileSync(join(parsed.emit, "lane-c-capture.json"), `${canonicalJson(record)}\n`);

  log(`Stage 5S lane C — ${record.lane_c_state}`);
  for (const m of record.mechanisms) {
    log(`  ${m.external_anchor_class}: ${m.outcome}${m.detail ? ` (${m.detail})` : ""}`);
  }
  if (record.lane_c_state === "not_captured") {
    log("  no Lane C achievement is claimed — this is a recorded outcome, not a failure to hide");
  }
  // Exit 0 either way: a lane that is never CI-gated must not fail a build for being unreachable.
  // The STATE is in the artifact, and Task 25 refuses an unverifiable capture.
  return CAPTURE_EXIT.OK;
}

void EXTERNAL_ANCHOR_CLASS;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
