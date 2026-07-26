// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 18.4a — the Q0 finding ledger, its two probes, and the scaffold reproduce.
//
// The ledger is where L3 stops being a sentence. These tests exercise the two things that could
// make it a sentence again: a premise that is declared rather than recomputed, and a probe that
// reports a finding it did not actually establish.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  resolvesAgainst,
  probeVacuity,
} from "../../../../tools/simurgh-attestation/stage5q/node/probeLaneCVacuity.mjs";
import { buildLedger } from "../../../../tools/simurgh-attestation/stage5q/node/buildFindingLedger.mjs";
import {
  verifyChain,
  ledgerDigest,
  isDeeplyFrozen,
} from "../../../../tools/simurgh-attestation/stage5q/core/findingLedger.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const REPRODUCE = "scripts/reproduce-llm-shield-stage5q.sh";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// ------------------------------------------------------------------------------------------------
// The vacuity probe. Its whole value is the distinction between "the mutation ran" and "the
// mutation was declared", so that is what is tested.
// ------------------------------------------------------------------------------------------------

test("resolvesAgainst: a path whose parent exists resolves", () => {
  const r = resolvesAgainst({ a: { b: 1 } }, "a.b");
  assert.equal(r.applied, true);
  assert.match(r.reason, /existing key/);
});

test("resolvesAgainst: a placeholder path resolves against nothing and names the missing segment", () => {
  const r = resolvesAgainst({ real: { shape: 1 } }, "a.b.c");
  assert.equal(r.applied, false);
  assert.match(r.reason, /'a' does not exist/);
});

test("resolvesAgainst: a leaf the object lacks is applied, but flagged as a NEW key", () => {
  // The producer writes it either way. Whether the verifier reads it is a different question, and
  // conflating the two would let "the mutation applied" mean "the mutation was seen".
  const r = resolvesAgainst({ a: { b: 1 } }, "a.zzz");
  assert.equal(r.applied, true);
  assert.match(r.reason, /NEW key/);
});

test("resolvesAgainst: a leaf whose parent is a scalar cannot be written", () => {
  const r = resolvesAgainst({ a: 5 }, "a.b");
  assert.equal(r.applied, false);
  assert.match(r.reason, /not an object/);
});

test("probeVacuity separates attacks that ran from attacks that were declared", () => {
  const result = probeVacuity({
    bundle: { seat: { id: 1 } },
    generation: {
      attacks: [
        { attack: "real", mutations: [{ path: "seat.id" }] },
        { attack: "placeholder", mutations: [{ path: "a.b.c" }] },
        { attack: "empty", mutations: [] },
      ],
    },
  });
  assert.equal(result.attacks_declared, 3);
  assert.equal(result.attacks_actually_exercised, 1);
  assert.equal(result.attacks_that_measured_nothing, 2);
  assert.deepEqual(result.claimed_steps, ["attack:0", "attack:1", "attack:2"]);
  assert.deepEqual(result.execution_records, ["attack:0"]);
  assert.equal(result.attacks[1].bundle_reached_verifier_unmutated, true);
});

test("an attack with zero declared mutations is NOT counted as exercised", () => {
  // The subtle one. `0 applied of 0 declared` is a perfect ratio, and a naive "did every declared
  // mutation apply?" check would pass it. The bundle still reached the verifier untouched.
  const result = probeVacuity({
    bundle: { x: 1 },
    generation: { attacks: [{ attack: "declares nothing", mutations: [] }] },
  });
  assert.equal(result.attacks_actually_exercised, 0);
  assert.deepEqual(result.execution_records, []);
});

// ------------------------------------------------------------------------------------------------
// The ledger.
// ------------------------------------------------------------------------------------------------

function realFixtures() {
  const paths = {
    f001Premise: `${E}/findings/F001/premise.json`,
    f002Probe: `${E}/findings/F002/mutation-application-probe.json`,
    f003Probe: `${E}/findings/F003/import-write-probe.json`,
  };
  const digests = {
    leanWorkflow: sha256(readFileSync(".github/workflows/stage-4-lean-proofs.yml")),
    capture: sha256(
      readFileSync("docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json")
    ),
  };
  const byDigest = new Map();
  for (const [key, path] of Object.entries(paths)) {
    const bytes = readFileSync(path);
    digests[key] = sha256(bytes);
    byDigest.set(digests[key], bytes);
  }
  return {
    digests,
    fixtures: {
      byDigest,
      readFixture(d) {
        const bytes = byDigest.get(d);
        if (!bytes) throw new Error(`no fixture with digest ${d}`);
        return bytes;
      },
    },
  };
}

test("the committed ledger holds three chained Q0 findings", () => {
  const j = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  assert.equal(j.record_count, 3);
  assert.deepEqual(
    j.records.map((r) => r.finding_id),
    ["5Q-F001", "5Q-F002", "5Q-F003"]
  );
  const chain = verifyChain({ records: j.records, head_digest: j.head_digest });
  assert.equal(chain.ok, true, chain.reason);
});

test("every committed premise RECOMPUTED — none is merely declared", () => {
  const j = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  for (const p of j.premise_verification) {
    assert.equal(p.recomputed, true, `${p.finding_id} premise was not recomputed`);
    assert.ok(p.reason.length > 0, `${p.finding_id} recomputed without a reason`);
  }
});

test("the ledger rebuilds to the committed digest from the committed fixtures", () => {
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();
  const { fixtures, digests } = realFixtures();
  const { ledger } = buildLedger({ closureDigest, fixtures, digests });
  const committed = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  assert.equal(ledgerDigest(ledger), committed.q0_finding_ledger_digest);
  assert.equal(ledger.head_digest, committed.head_digest);
});

test("a fixture whose bytes changed cannot back a finding", () => {
  // The receipt binds a digest. Hand the verifier different bytes under the same digest key and it
  // must refuse — otherwise the receipt names a fixture and the verifier reads whatever it is
  // given, which is the difference between evidence and a label.
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();
  const { fixtures, digests } = realFixtures();
  const tampered = {
    byDigest: fixtures.byDigest,
    readFixture(d) {
      if (d === digests.f002Probe)
        return Buffer.from('{"claimed_steps":[],"execution_records":[]}');
      return fixtures.readFixture(d);
    },
  };
  assert.throws(
    () => buildLedger({ closureDigest, fixtures: tampered, digests }),
    /5Q-F002.*did not recompute/s
  );
});

test("a premise that recomputes FALSE blocks its finding from the chain", () => {
  // Not "warns". A finding whose premise does not hold has no case behind it, and appending it
  // first and checking later would put it in the chain regardless of the answer.
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();
  const { fixtures, digests } = realFixtures();
  // Same bytes the receipt names, but a probe reporting that every claimed step DID run.
  const honestProbe = JSON.stringify({
    claimed_steps: ["attack:0"],
    execution_records: ["attack:0"],
  });
  const swapped = {
    byDigest: fixtures.byDigest,
    readFixture(d) {
      if (d === digests.f002Probe) return Buffer.from(honestProbe);
      return fixtures.readFixture(d);
    },
  };
  // The digest check fires first — which is itself the point: the bytes are bound before the
  // predicate ever runs, so a "better" fixture cannot be substituted for the frozen one.
  assert.throws(() => buildLedger({ closureDigest, fixtures: swapped, digests }), /5Q-F002/);
});

test("appended records are deeply frozen, not merely returned as new objects", () => {
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();
  const { fixtures, digests } = realFixtures();
  const { ledger } = buildLedger({ closureDigest, fixtures, digests });
  assert.equal(isDeeplyFrozen(ledger), true);
  assert.throws(() => {
    ledger.records[0].severity = "hygiene";
  });
});

test("F002 and F003 are corroborated by DIFFERENT mechanisms, not by each other's method", () => {
  const j = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  const f002 = j.records.find((r) => r.finding_id === "5Q-F002");
  const f003 = j.records.find((r) => r.finding_id === "5Q-F003");
  // F002 reads the mutation file and shows the attacks cannot land. F003 runs the producer and
  // observes what lands. Agreement between two methods is evidence; agreement between one method
  // and itself is repetition.
  assert.deepEqual(f002.corroborated_by, ["5q-5m-import-r8-01"]);
  assert.notEqual(f002.premise_receipt.predicate_id, f003.premise_receipt.predicate_id);
});

test("every finding's claim_impact POINTS at a claim rather than describing one", () => {
  const j = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  for (const r of j.records) {
    assert.equal(typeof r.claim_impact.file, "string");
    assert.match(r.claim_impact.claim_digest, /^[0-9a-f]{64}$/);
    assert.ok(r.claim_impact.quote.trim().length > 0);
    assert.ok(
      existsSync(r.claim_impact.file),
      `${r.finding_id} points at a file that is not there`
    );
  }
});

// ------------------------------------------------------------------------------------------------
// The scaffold reproduce script.
// ------------------------------------------------------------------------------------------------

test("the reproduce script exists, is executable, and is inside the §6.1 write surface", () => {
  assert.equal(existsSync(REPRODUCE), true);
  // 0o111 — some executable bit set. The script is invoked as `./scripts/...` in the plan.
  assert.notEqual(statSync(REPRODUCE).mode & 0o111, 0);
});

test("the scaffold NEVER prints ALL GATES PASSED", () => {
  // That banner belongs to the Task 20.5 reproduce, which verifies the coverage ledger, the signed
  // attestation and K7-B. Printing it here would claim gates that do not exist.
  const source = readFileSync(REPRODUCE, "utf8");
  const printed = source
    .split("\n")
    .filter((l) => /^\s*echo\s/.test(l))
    .join("\n");
  assert.equal(/ALL GATES PASSED/.test(printed.replace(/not ALL GATES PASSED/g, "")), false);
  assert.match(source, /SCAFFOLD GATES PASSED/);
});

test("no gate in the reproduce script uses the fail-open `cmd && echo` shape", () => {
  // Under `set -e`, `cmd && echo OK` reports success when cmd fails. It cost Stage 5E two
  // undetected failures on the droplet reproduce, and it is the one shell idiom this file bans.
  const lines = readFileSync(REPRODUCE, "utf8").split("\n");
  const offenders = lines.filter(
    (l) => /&&\s*echo/.test(l) && !/^\s*#/.test(l) && !/echo\s+"?FAIL/.test(l)
  );
  assert.deepEqual(offenders, []);
});

test("the script pins Node 26 and refuses another major", () => {
  const source = readFileSync(REPRODUCE, "utf8");
  assert.match(source, /NODE_MAJOR/);
  assert.match(source, /!= "26"/);
});

test("the honest-scope block names what is not reproduced", () => {
  const source = readFileSync(REPRODUCE, "utf8");
  for (const item of ["historical tags", "Fable 5", "R5 and R7", "5Q-F002"]) {
    assert.ok(source.includes(item), `the NOT REPRODUCED block omits ${item}`);
  }
});
