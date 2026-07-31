// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 22 — Lane B: four roles, four processes, deterministic keys.
//
// REVISION 1 CALLED THIS DETERMINISTIC WHILE GENERATING RANDOM KEYS (§13, B7). No two runs could
// match, so "byte-identical" was unfalsifiable — a claim with no possible counterexample, which is
// the same thing as no claim. Keys now come from committed seeds, domain-separated by role and case,
// and the byte-identity assertion below can actually fail.
//
// THE CLAIM IS NARROW AND IT IS NAMED. This lane demonstrates MULTI-PROCESS, not MULTI-PARTY:
//
//   asserted      four distinct pids; each role PASSED only its own declared key path; each role's
//                 manifest matches its declared protocol inputs; two runs byte-identical
//   not asserted  that a process COULD NOT read another's key. Separate directories do not prove
//                 that, and nothing here tries to. Covert-channel freedom is out of scope (§3.8)
//   and so       `witness_independence_status` stays `unproven` — by construction, since every Lane
//                 B witness is one operator holding several keys (§5.1), not by measurement
//
// The distinction matters because the overstatement is one word away. "Four independent witnesses"
// would be false; "four processes, independence unproven" is what the evidence supports.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CEREMONY_ROOT_SEED,
  DECLARED_INPUTS,
  FIXTURE_ONLY_MARKER,
  ROLES,
  ceremonyKey,
  ceremonyKeyPath,
} from "../../../../tools/simurgh-attestation/stage5s/node/ceremony/roles.mjs";
import {
  checkManifests,
  runCeremony,
} from "../../../../tools/simurgh-attestation/stage5s/node/ceremony/runCeremony.mjs";
import { parseArgs } from "../../../../tools/simurgh-attestation/stage5s/node/ceremony/runRole.mjs";

const withDir = (t) => {
  const dir = mkdtempSync(join(tmpdir(), "vwq-laneb-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

// ------------------------------------------------------------------ deterministic keys

test("[5s-t22] a role's key is derived from a committed seed, not generated", () => {
  assert.equal(ceremonyKey("producer", "case-1").pem, ceremonyKey("producer", "case-1").pem);
  assert.match(CEREMONY_ROOT_SEED, /^[0-9a-f]{64}$/);
});

test("[5s-t22] keys are domain-separated on BOTH axes — role and case", () => {
  // Either collision would let a run appear to have arranged a separation it had not arranged.
  const byRole = ROLES.map((r) => ceremonyKey(r, "case-1").pem);
  assert.equal(new Set(byRole).size, ROLES.length, "two roles share a key");

  const byCase = ["case-1", "case-2", "case-3"].map((c) => ceremonyKey("witness", c).pem);
  assert.equal(new Set(byCase).size, 3, "two cases share a witness key");

  // And an index axis, so one role can hold several keys without reusing one.
  assert.notEqual(ceremonyKey("witness", "case-1", 0).pem, ceremonyKey("witness", "case-1", 1).pem);
});

test("[5s-t22] every ceremony key path carries the fixture-only marker", () => {
  for (const role of ROLES) {
    assert.ok(
      ceremonyKeyPath("/tmp/x", role, "case-1").includes(FIXTURE_ONLY_MARKER),
      `${role}'s key path is not marked fixture-only`
    );
  }
});

test("[5s-t22] a role REFUSES a key path without the marker", () => {
  // Enforced where the key is used, not only where it is written. A ceremony role handed a real key
  // must refuse rather than quietly sign with it.
  const bad = parseArgs([
    "--role",
    "producer",
    "--case",
    "c",
    "--key",
    "/etc/real.key",
    "--out",
    "o",
  ]);
  assert.ok(bad.error, "a real key path was accepted");
  assert.match(bad.error, new RegExp(FIXTURE_ONLY_MARKER));

  const good = parseArgs([
    "--role",
    "producer",
    "--case",
    "c",
    "--key",
    `/tmp/${FIXTURE_ONLY_MARKER}_producer_c_0.key`,
    "--out",
    "o",
  ]);
  assert.equal(good.error, undefined);
});

// ------------------------------------------------------------------ the ceremony

test("[5s-t22] four roles run as four DISTINCT processes", (t) => {
  const run = runCeremony({ caseId: "pids", dir: withDir(t) });
  const pids = ROLES.map((r) => run.pids[r]);
  assert.equal(pids.length, 4);
  for (const pid of pids) assert.ok(Number.isInteger(pid) && pid > 0, `bad pid ${pid}`);
  assert.equal(new Set(pids).size, 4, `four roles reported ${new Set(pids).size} processes`);
  assert.ok(!pids.includes(process.pid), "a role ran inside the parent");
});

test("[5s-t22] each role is PASSED only its own declared key path", (t) => {
  const dir = withDir(t);
  const run = runCeremony({ caseId: "keys", dir });
  for (const role of ROLES) {
    const expected = ceremonyKeyPath(dir, role, "keys");
    assert.equal(run.roles[role].key_path, expected, `${role} was handed a foreign key path`);
  }
  // Distinct paths, one per role — and this is the LIMIT of the claim. The keys sit in one
  // directory; nothing here shows a process could not have opened its neighbour's, and §3.8 keeps
  // that out of scope rather than pretending it was checked.
  const paths = ROLES.map((r) => run.roles[r].key_path);
  assert.equal(new Set(paths).size, 4);
});

test("[5s-t22] every role's manifest matches its declared protocol inputs", (t) => {
  const run = runCeremony({ caseId: "manifests", dir: withDir(t) });
  const result = checkManifests(run.transcript);
  assert.equal(result.ok, true, JSON.stringify(result.refusals));

  for (const role of ROLES) {
    const manifest = run.transcript.roles[role].manifest;
    assert.deepEqual([...manifest.declared_inputs].sort(), [...DECLARED_INPUTS[role]].sort());
    // Anti-vacuity: a role that consumed nothing would satisfy "consumed only declared inputs".
    assert.ok(
      Object.keys(manifest.consumed_input_digests).length > 0,
      `${role} consumed nothing, so its manifest asserts nothing`
    );
  }
});

test("[5s-t22] a manifest naming an UNDECLARED input is refused", (t) => {
  const run = runCeremony({ caseId: "undeclared", dir: withDir(t) });
  const tampered = JSON.parse(JSON.stringify(run.transcript));
  tampered.roles.witness.manifest.consumed_input_digests.producer_private_key = "sha256:whatever";
  const result = checkManifests(tampered);
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].reason, "UNDECLARED_INPUT_CONSUMED");
  assert.match(result.refusals[0].detail, /witness consumed producer_private_key/);
});

test("[5s-t22] a missing role is refused, never read as a shorter ceremony", (t) => {
  const run = runCeremony({ caseId: "missing", dir: withDir(t) });
  const tampered = JSON.parse(JSON.stringify(run.transcript));
  delete tampered.roles.comparator;
  const result = checkManifests(tampered);
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === "ROLE_ABSENT"));
});

// ------------------------------------------------------------------ determinism

test("[5s-t22] two complete runs of one case are BYTE-IDENTICAL", (t) => {
  const a = runCeremony({ caseId: "repeat", dir: withDir(t) });
  const b = runCeremony({ caseId: "repeat", dir: withDir(t) });
  assert.equal(JSON.stringify(a.transcript), JSON.stringify(b.transcript));
  // And the runs really were separate: same bytes, different processes.
  assert.notDeepEqual(a.pids, b.pids, "the second run reused the first run's processes");
});

test("[5s-t22] the pid lives in a SIDECAR, never in the deterministic output", (t) => {
  // A pid inside the transcript would make byte-identity impossible while looking like evidence of
  // separation — the most flattering way to break the only falsifiable claim in this lane.
  const dir = withDir(t);
  runCeremony({ caseId: "sidecar", dir });
  const transcript = readFileSync(join(dir, "producer.out.json"), "utf8");
  assert.ok(!/"pid"/.test(transcript), "the pid leaked into the deterministic output");
  assert.ok(
    readdirSync(dir).some((f) => f.endsWith(".pid")),
    "no pid sidecar was written"
  );
});

test("[5s-t22] two different cases produce DIFFERENT transcripts", (t) => {
  // Otherwise byte-identity would be satisfied by a ceremony that ignores its inputs.
  const a = runCeremony({ caseId: "case-a", dir: withDir(t) });
  const b = runCeremony({ caseId: "case-b", dir: withDir(t) });
  assert.notEqual(JSON.stringify(a.transcript), JSON.stringify(b.transcript));
});

// ------------------------------------------------------------------ the honest status

test("[5s-t22] the transcript carries independence UNPROVEN, and says what it is", (t) => {
  const run = runCeremony({ caseId: "honesty", dir: withDir(t) });
  assert.equal(run.transcript.independence_unproven, true);
  assert.equal(run.transcript.witness_independence_status, "unproven");
  assert.equal(run.transcript.lane_claim, "multi_process_not_multi_party");
});

test("[5s-t22] the comparator names no verdict — the evaluator owns that", (t) => {
  // A comparator that ruled would be a second oracle inside the ceremony, and the stage would then
  // have two authorities on the one question it exists to answer.
  const run = runCeremony({ caseId: "no-verdict", dir: withDir(t) });
  const output = run.transcript.roles.comparator.output;
  const text = JSON.stringify(output);
  for (const verdict of [
    "equivocation_detected",
    "no_conflict",
    "comparison_indeterminate",
    "incompatible",
    "compatible",
  ]) {
    assert.ok(!text.includes(verdict), `the comparator emitted a verdict: ${verdict}`);
  }
  assert.ok(output.comparison_manifest, "the comparator emitted no manifest either");
});
