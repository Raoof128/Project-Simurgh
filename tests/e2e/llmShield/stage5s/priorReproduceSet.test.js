// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 36 — the prior-reproduce set, self-enumerating and self-excluding.
//
// "EVERY PRIOR REPRODUCE SCRIPT" MUST NOT BE A LIST SOMEBODY MAINTAINS (§13, E10). A hand-kept list
// is right on the day it is written and quietly wrong afterwards, and the failure is silent in the
// safe-looking direction: a script that stops being listed stops being run, and the sweep gets
// faster and greener.
//
// THREE CORRECTIONS REVISION 2 NEEDED, all from checking the directory rather than assuming it:
//
//   THE GLOB. `reproduce-llm-shield-stage*.sh`, not `reproduce-stage-*.sh` — the latter would have
//   matched 4 scripts and missed 43.
//
//   THE GLOB IS NOT THE CENSUS. Seven scripts sit outside that family, so the SET PIN is authority
//   and the glob is only how candidates are discovered.
//
//   THIS STAGE IS EXCLUDED BY NAME. Including `reproduce-llm-shield-stage5s.sh` would make this
//   task re-run Task 34 under the label "prior" — a count going up and no new evidence (§14, R5).

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const PIN_PATH = "docs/research/llm-shield/evidence/stage-5s/prior-reproduce-set.json";
const PIN = JSON.parse(readFileSync(PIN_PATH, "utf8"));
const SELF = "reproduce-llm-shield-stage5s.sh";

const discovered = () =>
  readdirSync("scripts")
    .filter((f) => /^reproduce-.*\.sh$/.test(f))
    .sort();

test("[5s-t36] the discovered set matches the pin, and drift is added/removed", () => {
  const found = discovered().filter((f) => f !== SELF);
  const pinned = new Set(PIN.scripts);
  const added = found.filter((f) => !pinned.has(f));
  const removed = PIN.scripts.filter((f) => !found.includes(f));
  assert.deepEqual(added, [], `scripts appeared without being pinned: ${added.join(", ")}`);
  assert.deepEqual(removed, [], `pinned scripts have vanished: ${removed.join(", ")}`);
});

test("[5s-t36] THIS stage's own script is excluded by name", () => {
  // Including it would re-run Task 34 under the label "prior": the count goes up and no new
  // evidence is produced.
  assert.ok(discovered().includes(SELF), "the 5S script does not exist");
  assert.ok(!PIN.scripts.includes(SELF), "the 5S script is in the PRIOR set");
  assert.deepEqual(PIN.excluded_by_name, [SELF]);
});

test("[5s-t36] the glob alone would NOT be a census — seven scripts sit outside the family", () => {
  // The correction that matters most. A glob-only sweep looks complete and silently skips seven.
  const outside = PIN.scripts.filter((f) => !/^reproduce-llm-shield-stage/.test(f));
  assert.equal(outside.length, 7, `expected 7 outside the family, found ${outside.length}`);
  for (const script of [
    "reproduce-stage4d.sh",
    "reproduce-stage4d-to-4f.sh",
    "reproduce-stage4e.sh",
    "reproduce-stage4f.sh",
    "reproduce-stage4g.sh",
    "reproduce-vca-chain.sh",
    "reproduce-on-droplet.sh",
  ]) {
    assert.ok(PIN.scripts.includes(script), `${script} is outside the family and not pinned`);
  }
});

test("[5s-t36] revision 2's glob would have missed 43 of them", () => {
  // Stated executably rather than as a note, because the near-miss is the lesson: a plausible glob
  // that matches four scripts looks like it is working.
  const wrongGlob = PIN.scripts.filter((f) => /^reproduce-stage-/.test(f));
  const rightGlob = PIN.scripts.filter((f) => /^reproduce-llm-shield-stage/.test(f));
  assert.equal(wrongGlob.length, 0, "the wrong glob matched something, which is worse");
  assert.equal(rightGlob.length, 43, `the family holds ${rightGlob.length} prior scripts`);
});

test("[5s-t36] the pin records the count as TELEMETRY, and pins the set", () => {
  // Q1-F002: a count is satisfied by one removal and one addition. The set is the pin.
  assert.equal(PIN.count_is_telemetry, PIN.scripts.length);
  assert.equal(new Set(PIN.scripts).size, PIN.scripts.length, "a script is pinned twice");
  assert.equal(PIN.scripts.length, 50);
});

test("[5s-t36] every pinned script exists and is executable shell", () => {
  for (const script of PIN.scripts) {
    const text = readFileSync(`scripts/${script}`, "utf8");
    assert.match(text.slice(0, 40), /^#!/, `${script} has no shebang`);
  }
});

test("[5s-t36] the runner refuses on drift rather than reporting a smaller sweep", () => {
  const runner = readFileSync("scripts/runAllPriorReproduce.sh", "utf8");
  assert.match(runner, /REFUSED — the prior set drifted from its pin/);
  assert.match(runner, /REFUSED — no prior script executed/);
  // And it excludes this stage by name rather than by position.
  assert.ok(runner.includes("SELF=reproduce-llm-shield-stage5s.sh"));
});
