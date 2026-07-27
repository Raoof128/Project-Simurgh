// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: the T1 control corpus, loaded and verified as BYTES.
//
// A family file carries two things that must not be confused. `record` is the frozen §3.1 shape,
// whose key set is exact by contract — an unknown field is refused rather than ignored, because a
// record format that accepts extra keys is one where a later stage smuggles a second signal in beside
// the declared one. `binding` is everything the corpus needs and the frozen record cannot hold: which
// inherited member each control MODELS, which file carries its bytes, which language it is written
// in. Keeping it outside the record is the honest arrangement; widening the record would have been
// the dishonest one.
//
// A CONTROL MODELS A MEMBER, IT IS NOT A COPY OF ONE. 5R never writes to an inherited tree (Ruling 5),
// so it cannot seed a defect into the member it names. The specimen is hand-authored in the member's
// role, category and shape, and `models_function_id` is what binds the family to 5Q's universe under
// §4.4. What the campaign later probes is the member itself, read-only; what the triad proves is that
// the instrument can divide one committed example. Those are different claims and the ledger keeps
// them apart.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spanDigest } from "./controls.mjs";
import { validateFamily } from "./familyContract.mjs";
import { evaluateSignal, SIGNALS } from "./signals.mjs";
import { spansComparable } from "./admissibility.mjs";
import { canonicalJson } from "../../canonicalise.mjs";

/** Where the corpus lives, relative to the repository root. */
export const CORPUS_DIR = "tools/simurgh-attestation/stage5r/families";

/** Where the deterministic premise-receipt artefact is written. */
export const RECEIPTS_PATH =
  "docs/research/llm-shield/evidence/stage-5r/families/premise-receipts.json";

const KINDS = Object.freeze(["vulnerable", "safe", "orthogonal"]);

/**
 * Load every family file and its three controls, in family order.
 *
 * @param {string} root repository root
 * @returns {Array<object>}
 */
export function loadCorpus(root) {
  const dir = join(root, CORPUS_DIR);
  const ids = readdirSync(dir)
    .filter((n) => /^F\d+$/.test(n))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return ids.map((id) => {
    const file = JSON.parse(readFileSync(join(dir, id, "family.json"), "utf8"));
    const controls = {};
    for (const kind of KINDS) {
      const entry = file.binding.controls[kind];
      if (!entry)
        throw new Error(`${id}: no ${kind} control — there is no optional control (§3.1)`);
      const source = readFileSync(join(dir, id, entry.path), "utf8");
      controls[kind] = { ...entry, source, span_digest: spanDigest(source) };
    }
    return { id, record: file.record, binding: file.binding, controls };
  });
}

/**
 * Verify the corpus against everything checkable without running anything.
 *
 * @param {Array<object>} corpus
 * @returns {{ok: boolean, problems: Array<{family: string, problem: string}>}}
 */
export function verifyCorpus(corpus) {
  const problems = [];
  const add = (family, problem) => problems.push({ family, problem });
  const signalsSeen = new Set();

  for (const f of corpus) {
    const shape = validateFamily(f.record);
    if (!shape.ok) add(f.id, `record: ${shape.reason}`);

    const signalId = f.record.detector_signal;
    const signal = SIGNALS[signalId];
    if (!signal) {
      add(f.id, `detector_signal "${signalId}" is not a declared signal of this stage`);
      continue;
    }
    if (signal.family !== f.id)
      add(f.id, `declares ${signalId}, which belongs to ${signal.family}`);
    if (signalsSeen.has(signalId)) add(f.id, `signal ${signalId} is claimed by two families`);
    signalsSeen.add(signalId);

    // The premise, recomputed rather than remembered: a vulnerable control whose premise no longer
    // holds is not a passing control, it is a broken one (§3.2).
    const pinned = f.record.vulnerable_control.premise_receipt.source_digest;
    if (pinned !== f.controls.vulnerable.span_digest) {
      add(f.id, `premise digest ${pinned} is not this vulnerable control's bytes`);
    }

    const verdicts = {};
    for (const kind of KINDS) {
      verdicts[kind] = evaluateSignal(signalId, f.controls[kind].source);
    }
    if (verdicts.vulnerable.verdict !== "detected") {
      add(f.id, "the vulnerable control does not carry the defect its own signal names");
    }
    if (verdicts.safe.verdict !== "not_detected") add(f.id, "the safe control is flagged");
    if (verdicts.orthogonal.verdict !== "not_detected") {
      add(f.id, "an unrelated failure is being called a detection");
    }
    if (!verdicts.safe.applies) {
      add(f.id, "the safe control never reaches the signal path — a stub is not a control (§4.3)");
    }
    if (!verdicts.orthogonal.applies) {
      add(f.id, "the orthogonal control never reaches the signal path");
    }

    const spans = spansComparable(
      f.record.vulnerable_control.source_span_bytes,
      f.record.safe_control.source_span_bytes
    );
    if (!spans.ok) add(f.id, `§4.3 comparability: ${spans.reason}`);

    for (const kind of KINDS) {
      const declared =
        f.record[kind === "orthogonal" ? "orthogonal_failure_control" : `${kind}_control`]
          .source_span_bytes;
      const actual = Buffer.byteLength(f.controls[kind].source, "utf8");
      if (declared !== actual) add(f.id, `${kind}: declared ${declared} bytes, file is ${actual}`);
      if (/stage5[a-q]\b/.test(f.controls[kind].source)) {
        add(f.id, `${kind}: reaches into an inherited stage's code (§2.4)`);
      }
    }

    if (!Array.isArray(f.record.coverage_delta) || f.record.coverage_delta.length !== 0) {
      add(f.id, "coverage_delta is not empty — a result has been written into a commitment");
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Build the deterministic premise-receipt artefact.
 *
 * Deterministic means what it says: no clock, no path outside the corpus, no ordering that depends on
 * a directory listing's whim. It is generated twice into separate paths and compared byte-for-byte,
 * then compared against the committed copy.
 *
 * @param {string} root
 * @returns {string} the artefact's exact bytes, newline-terminated
 */
export function buildPremiseReceipts(root) {
  const corpus = loadCorpus(root);
  const families = corpus.map((f) => ({
    probe_family_id: f.id,
    attack_class: f.record.attack_class,
    target_security_role: f.record.target_security_role,
    detector_signal: f.record.detector_signal,
    models_function_id: f.binding.models_function_id,
    category: f.binding.category,
    language: f.binding.language,
    orthogonal_failure_mode: f.record.orthogonal_failure_control.failure_mode,
    controls: KINDS.map((kind) => ({
      kind,
      control_id: f.controls[kind].control_id,
      path: `${CORPUS_DIR}/${f.id}/${f.controls[kind].path}`,
      span_digest: f.controls[kind].span_digest,
      span_bytes: Buffer.byteLength(f.controls[kind].source, "utf8"),
      signal_verdict: evaluateSignal(f.record.detector_signal, f.controls[kind].source).verdict,
      signal_applies: evaluateSignal(f.record.detector_signal, f.controls[kind].source).applies,
    })),
    premise: {
      predicate: f.record.vulnerable_control.premise_receipt.predicate,
      source_digest: f.record.vulnerable_control.premise_receipt.source_digest,
      recomputed_now:
        f.record.vulnerable_control.premise_receipt.source_digest ===
        f.controls.vulnerable.span_digest,
    },
  }));

  const verification = verifyCorpus(corpus);
  const artefact = {
    schema: "simurgh.vpf.premise-receipts.v1",
    note:
      "Task 18. The T1 corpus as bytes: every control's span digest, every family's recomputed " +
      "premise, and the verdict each control draws from its own declared signal. NOTHING HERE WAS " +
      "RUN AGAINST AN INHERITED MEMBER — construction is lawful before the campaign commitment, " +
      "execution is not.",
    family_count: families.length,
    control_count: families.length * KINDS.length,
    corpus_verified: verification.ok,
    problems: verification.problems,
    families,
  };
  return `${canonicalJson(artefact)}\n`;
}
