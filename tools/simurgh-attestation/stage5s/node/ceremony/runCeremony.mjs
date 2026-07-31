#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 22 — the Lane B ceremony: four roles, four processes, one parent.
//
//   node runCeremony.mjs --case <id> --out <dir>
//
// WHAT THE PARENT ASSERTS, and each is a narrow statement:
//
//   DISTINCT PIDS          four processes really ran, rather than four function calls wearing role
//                          names inside one process.
//   ONE KEY PATH EACH      every role was PASSED only its own declared key path. Not "could not
//                          read another's" — separate directories do not prove that, and this lane
//                          does not claim it (§3.8).
//   MANIFEST EQUALITY      what each role reports consuming matches its declared protocol inputs.
//   INDEPENDENCE UNPROVEN  carried in the output, because every Lane B witness is one operator
//                          holding several keys (§5.1). Multi-process is not multi-party.
//   BYTE-IDENTICAL         two complete runs of one case produce the same bytes. Deterministic keys
//                          make that possible; pids live in sidecars so they cannot spoil it.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalJson, checkpointEnvelopeDigest } from "../../core/canonical.mjs";
import { DECLARED_INPUTS, ROLES, ceremonyKey, ceremonyKeyPath } from "./roles.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROLE_RUNNER = join(HERE, "runRole.mjs");

export const CEREMONY_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

export function parseArgs(argv) {
  const opts = { case: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, null];
    const name = flag.startsWith("--") ? flag.slice(2) : null;
    if (name === null || !(name in opts)) return { error: `unrecognised argument: ${arg}` };
    const value = inline ?? argv[(i += 1)];
    if (!value) return { error: `${flag} requires a value` };
    opts[name] = value;
  }
  if (!opts.case) return { error: "--case is required" };
  if (!opts.out) return { error: "--out <dir> is required" };
  return opts;
}

/** Run one role in its own process and return its output, manifest and pid. */
function spawnRole(role, caseId, dir, input, deps) {
  const runner =
    deps.runner ?? ((args) => execFileSync(process.execPath, args, { encoding: "utf8" }));
  const inPath = join(dir, `${role}.in.json`);
  const outPath = join(dir, `${role}.out.json`);
  const keyPath = ceremonyKeyPath(dir, role, caseId);
  writeFileSync(inPath, `${canonicalJson(input)}\n`);
  // The key material is written where the role will be told to look, and nowhere else.
  writeFileSync(keyPath, `${ceremonyKey(role, caseId).pem}`);

  runner([
    ROLE_RUNNER,
    "--role",
    role,
    "--case",
    caseId,
    "--key",
    keyPath,
    "--in",
    inPath,
    "--out",
    outPath,
  ]);
  return {
    ...JSON.parse(readFileSync(outPath, "utf8")),
    pid: Number(readFileSync(`${outPath}.pid`, "utf8").trim()),
    key_path: keyPath,
  };
}

/**
 * Run the whole ceremony. Returns the transcript; the caller decides what to assert.
 */
export function runCeremony({ caseId, dir, deps = {} }) {
  mkdirSync(dir, { recursive: true });
  const scope = { scope_id: "scope-1", epoch: 7, policy_digest: "sha256:lane-b-policy" };

  const producer = spawnRole(
    "producer",
    caseId,
    dir,
    {
      ...scope,
      history_root: `root-${caseId}`,
      predecessor: "body-6",
      c1_commitment: "sha256:lane-b-c1",
      protocol_version: "vwq.1",
      producer_identity: "producer-1",
    },
    deps
  );

  const envelope = checkpointEnvelopeDigest(producer.output.checkpoint);

  const witness = spawnRole(
    "witness",
    caseId,
    dir,
    { ...scope, checkpoint_envelope_digest: envelope, witness_identity: "w-a" },
    deps
  );

  const receiver = spawnRole(
    "receiver",
    caseId,
    dir,
    {
      checkpoint_envelope_digest: envelope,
      comparison_policy_digest: "sha256:lane-b-comparison-policy",
      receiver_identity: "r-a",
      receiver_sequence: 1,
    },
    deps
  );

  const comparator = spawnRole(
    "comparator",
    caseId,
    dir,
    {
      view_envelope_digests: [envelope],
      comparison_policy_digest: "sha256:lane-b-comparison-policy",
      intake_complete: true,
      comparison_roster_digest: "sha256:lane-b-roster",
    },
    deps
  );

  const roles = { producer, witness, receiver, comparator };
  const transcript = {
    schema: "simurgh.vwq.lane-b-transcript.v1",
    case_id: caseId,
    // The honest status, carried in the output rather than argued for in prose.
    independence_unproven: true,
    witness_independence_status: "unproven",
    lane_claim: "multi_process_not_multi_party",
    roles: Object.fromEntries(
      ROLES.map((role) => [role, { manifest: roles[role].manifest, output: roles[role].output }])
    ),
  };
  return { transcript, pids: Object.fromEntries(ROLES.map((r) => [r, roles[r].pid])), roles };
}

/** Check a transcript against the declared protocol inputs. Pure. */
export function checkManifests(transcript) {
  const refusals = [];
  for (const role of ROLES) {
    const manifest = transcript?.roles?.[role]?.manifest;
    if (!manifest) {
      refusals.push({ reason: "ROLE_ABSENT", detail: role });
      continue;
    }
    const declared = [...DECLARED_INPUTS[role]].sort();
    if (JSON.stringify([...manifest.declared_inputs].sort()) !== JSON.stringify(declared)) {
      refusals.push({
        reason: "DECLARED_INPUTS_MISMATCH",
        detail: `${role}: ${manifest.declared_inputs} vs ${declared}`,
      });
    }
    for (const consumed of Object.keys(manifest.consumed_input_digests ?? {})) {
      if (!DECLARED_INPUTS[role].includes(consumed)) {
        refusals.push({
          reason: "UNDECLARED_INPUT_CONSUMED",
          detail: `${role} consumed ${consumed}`,
        });
      }
    }
  }
  return { ok: refusals.length === 0, refusals };
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`stage5s lane B — NOT RUN: ${parsed.error}`);
    return CEREMONY_EXIT.OPERATOR_ERROR;
  }
  let run;
  try {
    run = runCeremony({ caseId: parsed.case, dir: parsed.out, deps });
  } catch (error) {
    log(`stage5s lane B — NOT RUN: ${error.message}`);
    return CEREMONY_EXIT.OPERATOR_ERROR;
  }
  const manifests = checkManifests(run.transcript);
  writeFileSync(join(parsed.out, "transcript.json"), `${canonicalJson(run.transcript)}\n`);
  log(`stage5s lane B — pids ${ROLES.map((r) => run.pids[r]).join(",")}`);
  if (!manifests.ok) {
    for (const r of manifests.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
    return CEREMONY_EXIT.REFUSED;
  }
  log("  OK — four processes, declared inputs only, independence unproven");
  return CEREMONY_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
