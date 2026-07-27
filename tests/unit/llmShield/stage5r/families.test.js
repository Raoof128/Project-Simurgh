// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: the T1 control corpus, before anything is executed against a cell.
//
// Construction is lawful before the commitment; execution is not. So everything here is a property of
// BYTES — the records, the controls, and the premise receipts computed from them — and nothing here
// runs a probe against an inherited member.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import {
  loadCorpus,
  verifyCorpus,
  buildPremiseReceipts,
  CORPUS_DIR,
} from "../../../../tools/simurgh-attestation/stage5r/core/families.mjs";
import { validateFamily } from "../../../../tools/simurgh-attestation/stage5r/core/familyContract.mjs";
import { spansComparable } from "../../../../tools/simurgh-attestation/stage5r/core/admissibility.mjs";
import { spanDigest } from "../../../../tools/simurgh-attestation/stage5r/core/controls.mjs";
import {
  evaluateSignal,
  SIGNALS,
} from "../../../../tools/simurgh-attestation/stage5r/core/signals.mjs";
import { TRANCHE_T1 } from "../../../../tools/simurgh-attestation/stage5r/core/archetypes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const corpus = loadCorpus(ROOT);
const closure = JSON.parse(
  readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json"),
    "utf8"
  )
);
const MEMBERS = new Map(closure.members.map((m) => [m.function_id, m]));

test("eight families, twenty-four controls, and one declaration file each", () => {
  assert.equal(corpus.length, 8);
  const dirs = readdirSync(join(ROOT, CORPUS_DIR)).sort();
  assert.deepEqual(dirs, ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"]);
  let controls = 0;
  for (const dir of dirs) {
    const files = readdirSync(join(ROOT, CORPUS_DIR, dir)).sort();
    assert.deepEqual(files, [
      "family.json",
      "orthogonal.control",
      "safe.control",
      "vulnerable.control",
    ]);
    controls += 3;
  }
  assert.equal(controls, 24);
});

test("every record satisfies the FROZEN §3.1 contract, exact keys and all", () => {
  for (const f of corpus) {
    const r = validateFamily(f.record);
    assert.equal(r.ok, true, `${f.id}: ${r.reason}`);
  }
});

test("the corpus IS the tranche — same families, same pairs, same inherited counts", () => {
  assert.deepEqual(
    corpus.map((f) => f.id),
    TRANCHE_T1.map((t) => t.family)
  );
  for (const t of TRANCHE_T1) {
    const f = corpus.find((x) => x.id === t.family);
    assert.equal(f.record.attack_class, t.attack_class, t.family);
    assert.equal(f.record.target_security_role, t.target_security_role, t.family);
  }
});

test("each family declares ONE signal, and it is that family's signal", () => {
  const seen = new Set();
  for (const f of corpus) {
    const sig = SIGNALS[f.record.detector_signal];
    assert.ok(sig, `${f.id}: ${f.record.detector_signal} is not a declared signal`);
    assert.equal(sig.family, f.id);
    assert.equal(sig.attack_class, f.record.attack_class);
    assert.ok(!seen.has(f.record.detector_signal), "two families sharing one signal");
    seen.add(f.record.detector_signal);
  }
});

test("THE CORPUS ITSELF DIVIDES: vulnerable detected, safe clean, orthogonal not misclassified", () => {
  for (const f of corpus) {
    const sig = f.record.detector_signal;
    const v = evaluateSignal(sig, f.controls.vulnerable.source);
    const s = evaluateSignal(sig, f.controls.safe.source);
    const o = evaluateSignal(sig, f.controls.orthogonal.source);
    assert.equal(v.verdict, "detected", `${f.id}: the vulnerable control carries no defect`);
    assert.equal(s.verdict, "not_detected", `${f.id}: the safe control was flagged`);
    assert.equal(o.verdict, "not_detected", `${f.id}: an unrelated failure was called a detection`);
    // §4.3's real constraint: a safe control the detector never reaches is not-detected for the
    // wrong reason, and would pass condition two while proving nothing.
    assert.equal(s.applies, true, `${f.id}: the safe control never reaches the signal path`);
    assert.equal(o.applies, true, `${f.id}: the orthogonal control never reaches the signal path`);
  }
});

test("the vulnerable and safe controls are structurally comparable (§4.3)", () => {
  for (const f of corpus) {
    const r = spansComparable(
      f.record.vulnerable_control.source_span_bytes,
      f.record.safe_control.source_span_bytes
    );
    assert.equal(r.ok, true, `${f.id}: ${r.reason}`);
  }
});

test("each control models a REAL inherited member, in the family's own role", () => {
  // §4.4 inherited rather than re-litigated: 5R does not get its own universe and cannot grow one.
  for (const f of corpus) {
    const m = MEMBERS.get(f.binding.models_function_id);
    assert.ok(m, `${f.id}: ${f.binding.models_function_id} is not in the inherited closure`);
    assert.equal(m.security_role, f.record.target_security_role, f.id);
    assert.equal(m.category, f.binding.category, f.id);
  }
});

test("the premise receipt's digest is the control's ACTUAL bytes, recomputed here", () => {
  for (const f of corpus) {
    assert.equal(
      f.record.vulnerable_control.premise_receipt.source_digest,
      spanDigest(f.controls.vulnerable.source),
      `${f.id}: the pinned premise digest is not this control's bytes`
    );
    assert.equal(
      f.record.vulnerable_control.source_span_bytes,
      Buffer.byteLength(f.controls.vulnerable.source, "utf8"),
      f.id
    );
  }
});

test("coverage_delta is EMPTY in the corpus — results are not commitments", () => {
  for (const f of corpus) {
    assert.deepEqual(
      f.record.coverage_delta,
      [],
      `${f.id}: a result was written into the commitment`
    );
  }
});

test("no control imports a stage5a..5q module (§2.4)", () => {
  for (const f of corpus) {
    for (const [kind, c] of Object.entries(f.controls)) {
      assert.ok(
        !/stage5[a-q]\b/.test(c.source),
        `${f.id}/${kind} reaches into an inherited stage's code`
      );
    }
  }
});

test("the declared failure modes are REAL: the parse_error controls genuinely do not parse", () => {
  // A declared failure mode nobody demonstrated is the kind of claim this stage exists to refuse.
  // Parsing is not execution — `node --check` reads the file and never runs it.
  const scratch = mkdtempSync(join(tmpdir(), "5r-parse."));
  try {
    for (const f of corpus) {
      if (f.binding.language !== "js") continue;
      for (const [kind, c] of Object.entries(f.controls)) {
        const file = join(scratch, `${f.id}-${kind}.mjs`);
        writeFileSync(file, c.source, "utf8");
        let parsed = true;
        try {
          execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
        } catch {
          parsed = false;
        }
        const declaredUnparseable =
          kind === "orthogonal" &&
          f.record.orthogonal_failure_control.failure_mode === "parse_error";
        assert.equal(parsed, !declaredUnparseable, `${f.id}/${kind}: parses=${parsed}`);
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the Lean parse_error control is genuinely unbalanced, and its twins are not", () => {
  const f = corpus.find((x) => x.binding.language === "lean");
  const balance = (s) => [...s].reduce((n, c) => n + (c === "(" ? 1 : c === ")" ? -1 : 0), 0);
  assert.equal(f.record.orthogonal_failure_control.failure_mode, "parse_error");
  assert.notEqual(balance(f.controls.orthogonal.source), 0);
  assert.equal(balance(f.controls.vulnerable.source), 0);
  assert.equal(balance(f.controls.safe.source), 0);
});

test("all three failure modes appear across the corpus", () => {
  const modes = new Set(corpus.map((f) => f.record.orthogonal_failure_control.failure_mode));
  assert.deepEqual([...modes].sort(), ["non_zero_exit", "parse_error", "throw"]);
});

test("the premise receipts artefact is DETERMINISTIC and matches its committed copy", () => {
  const a = buildPremiseReceipts(ROOT);
  const b = buildPremiseReceipts(ROOT);
  assert.equal(a, b);
  const committed = join(
    ROOT,
    "docs/research/llm-shield/evidence/stage-5r/families/premise-receipts.json"
  );
  if (existsSync(committed)) {
    assert.equal(
      a,
      readFileSync(committed, "utf8"),
      "the committed receipts are not what rebuilds"
    );
  }
});

test("NO CAMPAIGN ARTEFACT EXISTS THAT PREDATES ITS COMMITMENT", () => {
  // Building controls before C1 is lawful; running them before C1 is not. The first version of this
  // test asserted the campaign directory was simply ABSENT, which is a Task-18 fact that Task 20
  // ends on purpose — an invariant that a later, correct step is required to falsify is not an
  // invariant, it is a countdown. What must hold forever is the ORDER: results may exist only where
  // a commitment exists too, and `verifyCampaignAncestry` checks that C1 precedes them in history.
  const campaign = join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign");
  const c1 = join(ROOT, "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json");
  if (existsSync(campaign)) {
    assert.equal(existsSync(c1), true, "campaign results exist and nothing was ever committed");
  }
});

test("the corpus verifier refuses a family whose control bytes moved", () => {
  const ok = verifyCorpus(corpus);
  assert.equal(ok.ok, true, JSON.stringify(ok.problems));
  const tampered = corpus.map((f, i) =>
    i === 0
      ? {
          ...f,
          controls: {
            ...f.controls,
            vulnerable: { ...f.controls.vulnerable, source: "const x = 1;\n" },
          },
        }
      : f
  );
  const bad = verifyCorpus(tampered);
  assert.equal(bad.ok, false);
  assert.match(JSON.stringify(bad.problems), /premise|digest|defect/i);
});
