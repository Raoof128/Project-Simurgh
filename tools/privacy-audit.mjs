#!/usr/bin/env node
// Privacy audit — recursively scans the project's data directories and any
// JSON files passed as arguments for forbidden field names. Exits 1 on any
// violation so it can be wired into CI.
//
// Usage:
//   node tools/privacy-audit.mjs                          # default scan paths
//   node tools/privacy-audit.mjs path/to/file.json ...    # explicit targets
//   node tools/privacy-audit.mjs --quiet                  # suppress per-file output

import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join, basename } from "node:path";

import { FORBIDDEN_LOCAL_FIELD_NAMES } from "../src/device/forbiddenLocalFields.js";

// Stage 2.7: forbidden raw-field list sourced from the shared module so the
// privacy audit, server validator, and security tests share one truth.
const FORBIDDEN_FIELDS = new Set(FORBIDDEN_LOCAL_FIELD_NAMES);

// These are explicitly allowed — they are the *_hash counterparts to the
// forbidden raw fields. We don't flag them.
const ALLOWED_HASH_SUFFIXES = ["_hash", "_sha256", "_digest"];

const DEFAULT_SCAN_DIRS = [
  "data",
  "data/sessions",
  "data/audit",
  "data/reports",
  "data/exams",
  "tools/simurgh-daemon-linux",
  "tests/fixtures/stage-2-8",
];

// Voting-pilot ballot-choice forbidden keys — exact key matching only.
// Scanned only against evidence exports; NOT against src/votingPilot source,
// which intentionally declares these as constant names (not persisted values).
const VOTING_PILOT_FORBIDDEN_KEYS = new Set([
  "choice",
  "selected_choice",
  "selected_option",
  "candidate",
  "candidate_id",
  "vote",
  "vote_choice",
  "ballot_choice",
  "ballot_content",
  "ballot_answer",
  "selected_candidate",
]);

const VOTING_PILOT_EVIDENCE_DIRS = ["docs/research/mq-voting-pilot/evidence"];

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const explicitTargets = args.filter((a) => !a.startsWith("--"));

const violations = [];
let filesScanned = 0;

function isAllowedHashField(field) {
  return ALLOWED_HASH_SUFFIXES.some((s) => field.endsWith(s));
}

function visit(value, path, file) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => visit(item, `${path}[${i}]`, file));
    return;
  }
  for (const [key, v] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (FORBIDDEN_FIELDS.has(key) && !isAllowedHashField(key)) {
      violations.push({ file, path: here, key });
    }
    visit(v, here, file);
  }
}

function scanFile(file) {
  let parsed;
  try {
    const raw = readFileSync(file, "utf8");
    parsed = JSON.parse(raw);
  } catch (e) {
    // Skip unparseable files but log in non-quiet mode
    if (!quiet) console.log(`  skip   ${file}  (${e.message})`);
    return;
  }
  filesScanned += 1;
  visit(parsed, "", file);
  if (!quiet) console.log(`  scan   ${file}`);
}

function walk(dir) {
  let stat;
  try {
    stat = statSync(dir);
  } catch {
    return;
  }
  if (stat.isFile()) {
    if (dir.endsWith(".json")) scanFile(dir);
    return;
  }
  if (!stat.isDirectory()) return;
  // Skip Rust build directories — they contain artifact JSONs that may
  // legitimately reference forbidden field names from crate source
  // comments. Same rationale for node_modules.
  const base = basename(dir);
  if (base === "target" || base === "node_modules") return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    walk(join(dir, entry));
  }
}

const cwd = process.cwd();
const targets =
  explicitTargets.length > 0
    ? explicitTargets.map((t) => resolve(cwd, t))
    : DEFAULT_SCAN_DIRS.map((d) => resolve(cwd, d));

if (!quiet) console.log("Simurgh privacy audit — scanning for forbidden fields");
for (const t of targets) walk(t);

// ── Voting-pilot ballot-choice forbidden key audit ────────────────────────────
// Uses the same visit() walker but with voting-pilot-specific forbidden keys.
// Scan targets: evidence exports only (NOT src/votingPilot source constants).
const vpViolations = [];
let vpFilesScanned = 0;

function visitVotingPilot(value, path, file) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => visitVotingPilot(item, `${path}[${i}]`, file));
    return;
  }
  for (const [key, v] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (VOTING_PILOT_FORBIDDEN_KEYS.has(key)) {
      vpViolations.push({ file, path: here, key });
    }
    visitVotingPilot(v, here, file);
  }
}

function scanFileVotingPilot(file) {
  let parsed;
  try {
    const raw = readFileSync(file, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  vpFilesScanned += 1;
  visitVotingPilot(parsed, "", file);
}

function walkVotingPilot(dir) {
  let stat;
  try {
    stat = statSync(dir);
  } catch {
    return;
  }
  if (stat.isFile()) {
    if (dir.endsWith(".json")) scanFileVotingPilot(dir);
    return;
  }
  if (!stat.isDirectory()) return;
  const base = basename(dir);
  if (base === "target" || base === "node_modules") return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    walkVotingPilot(join(dir, entry));
  }
}

if (!quiet)
  console.log("\n[voting-pilot] Scanning evidence exports for ballot-choice forbidden keys");
for (const d of VOTING_PILOT_EVIDENCE_DIRS) {
  walkVotingPilot(resolve(cwd, d));
}

if (vpViolations.length > 0) {
  console.error("[voting-pilot] ballot-choice privacy audit: FAIL");
  for (const v of vpViolations) {
    console.error(`  ${v.file}  →  ${v.path}  (key: ${v.key})`);
  }
} else {
  if (!quiet)
    console.log(
      `[voting-pilot] ballot-choice privacy audit: PASS (${vpFilesScanned} evidence file(s) scanned)`
    );
}

const totalViolations = violations.length + vpViolations.length;

if (totalViolations > 0) {
  if (violations.length > 0) {
    console.error("\n✖ Privacy audit FAILED — forbidden fields found:");
    for (const v of violations) {
      console.error(`  ${v.file}  →  ${v.path}  (field: ${v.key})`);
    }
    console.error(
      `\nTotal violations: ${violations.length}  (across ${filesScanned} files scanned)`
    );
  }
  process.exit(1);
}

console.log(
  `\n✓ Privacy audit PASSED — no forbidden fields found in ${filesScanned} scanned file(s).`
);
process.exit(0);
