// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 15 — the finding ledger.
//
// THE PROBLEM THIS FILE IS ABOUT. Exit 0 is the stage's central success and also its blindest spot.
// Three very different runs all exit 0: one that found a fork, one that compared nothing, and one
// that found a fork and dropped the row. The ledger is what tells them apart afterwards, and these
// tests are what stop the ledger from becoming a third thing that can be believed on its own.
//
// THE LEDGER IS THE CLAIM; THE COMPARISON IS THE AUTHORITY. Every test below runs in that direction.
// The ledger cannot mint a finding the comparison did not make (C3), and it cannot retire one the
// comparison did make (C4). If it could do either it would be a second oracle, and a stage with two
// oracles has none.
//
// THE TWO CONTRADICTIONS THAT MATTER MOST are the ones a motivated producer would actually reach
// for. C4: the fork was real but the quorum was short, so delete the row and let the shortfall
// explain the silence. C8: the fork was real yesterday, today's run is clean, so ship today's
// ledger. Neither is visible from inside a single well-formed ledger, which is exactly why each gets
// its own mechanism rather than a note in a comment.

import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import test from "node:test";

import {
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import {
  FINDING_ID,
  artifactDigestOf,
  deriveEquivocationArtifact,
  keyDigestOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";
import {
  ENTRY_REQUIREMENTS,
  LEDGER_REFUSALS,
  LEDGER_SCHEMA,
  REQUIRED_ENTRY_FIELDS,
  canonicalLedger,
  deriveFindingEntry,
  findingEntryId,
  verifyFindingLedger,
  verifyLedgerSuccession,
} from "../../../../tools/simurgh-attestation/stage5s/core/findings.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import {
  DRIVER_EXIT,
  main,
  parseArgs,
} from "../../../../tools/simurgh-attestation/stage5s/node/buildFindingLedger.mjs";

// ------------------------------------------------------------------ fixture material

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PRODUCER_PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRODUCER_KEY_DIGEST = keyDigestOf(PRODUCER_PUB_PEM);

function checkpoint(over = {}) {
  const body = {
    scope_id: "scope-1",
    epoch: 7,
    history_root: "root-a",
    predecessor: "body-6",
    c1_commitment: "c1",
    protocol_version: "vwq.1",
    policy_digest: "pol-1",
    producer_identity: "producer-1",
    ...over,
  };
  return {
    ...body,
    producer_signature: edSign(
      null,
      Buffer.from(checkpointBodyDigest(body), "utf8"),
      privateKey
    ).toString("base64"),
    producer_signature_profile: "ed25519",
  };
}

const receipt = (id, envelopeDigest) => ({
  receiver_identity: id,
  receiver_key_digest: `rk-${id}`,
  checkpoint_envelope_digest: envelopeDigest,
  comparison_policy_digest: "cpd-1",
  receiver_sequence: 1,
});

const viewOf = (cp, ids) => ({
  checkpoint: cp,
  carried_by: ids.map((id) => receipt(id, checkpointEnvelopeDigest(cp))),
});

const comparisonPolicy = () => ({
  comparison_roster: [
    { receiver_identity: "r-a", key_digest: "rk-r-a" },
    { receiver_identity: "r-b", key_digest: "rk-r-b" },
  ],
  receiver_signature_profile: "ed25519",
  strong_tier_intake_rule: "every_roster_receiver_responds",
  comparison_policy_digest: "cpd-1",
});

const manifestFor = (...views) => ({
  comparison_scope: { scope_id: "scope-1" },
  comparison_policy_digest: "cpd-1",
  comparator_version: "vwq-comparator.1",
  input_envelope_digests: views.map((v) => checkpointEnvelopeDigest(v.checkpoint)).sort(),
});

/** One real fork: two producer-signed bodies at one coordinate. */
function fork(over = {}) {
  const viewA = viewOf(checkpoint({ history_root: "root-a" }), ["r-a"]);
  const viewB = viewOf(checkpoint({ history_root: "root-b" }), ["r-b"]);
  const manifest = manifestFor(viewA, viewB);
  const derived = deriveEquivocationArtifact({
    view_a: viewA,
    view_b: viewB,
    comparison_policy: comparisonPolicy(),
    comparison_manifest: manifest,
    producer_key_digest: PRODUCER_KEY_DIGEST,
    ...over,
  });
  assert.equal(derived.ok, true);
  assert.ok(derived.artifact, "the fixture must actually be a fork");
  return { artifact: derived.artifact, manifest, viewA, viewB };
}

const verificationInputs = (manifest) => ({
  producer_public_key_pem: PRODUCER_PUB_PEM,
  comparison_policy: comparisonPolicy(),
  comparison_manifest: manifest,
});

function ledgerOf(...entries) {
  return { schema: LEDGER_SCHEMA, entries };
}

/** A complete, honest run: one fork, one row, one committed artifact. */
function honestRun(quorum = ["witnessed_quorum", "witnessed_quorum"]) {
  const { artifact, manifest } = fork();
  const derived = deriveFindingEntry({
    comparison_status: "equivocation_detected",
    equivocation_artifact: artifact,
    quorum_status_a: quorum[0],
    quorum_status_b: quorum[1],
  });
  assert.equal(derived.ok, true, JSON.stringify(derived.refusals));
  return {
    artifact,
    manifest,
    entry: derived.entry,
    ledger: ledgerOf(derived.entry),
    inputs: {
      observed: [
        {
          comparison_manifest_digest: artifact.comparison_manifest_digest,
          comparison_status: "equivocation_detected",
          quorum_status_a: quorum[0],
          quorum_status_b: quorum[1],
        },
      ],
      committed_artifacts: [artifact],
      verification_inputs: verificationInputs(manifest),
    },
  };
}

const reasons = (r) => r.refusals.map((x) => x.reason);

// ------------------------------------------------------------------ the bindings

test("[5s-t15] a row binds exactly the fourteen fields, both digests for both views", () => {
  assert.equal(REQUIRED_ENTRY_FIELDS.length, 14);
  // Both, and not either: the body establishes incompatibility, the envelope establishes attribution
  // and receipt binding. A ledger carrying one reads as evidence for a claim it cannot support.
  for (const f of [
    "checkpoint_body_digest_a",
    "checkpoint_body_digest_b",
    "checkpoint_envelope_digest_a",
    "checkpoint_envelope_digest_b",
  ]) {
    assert.ok(REQUIRED_ENTRY_FIELDS.includes(f), `${f} is not bound`);
  }
  const { entry } = honestRun();
  for (const f of REQUIRED_ENTRY_FIELDS) {
    assert.ok(entry[f] !== undefined && entry[f] !== null, `derived row omits ${f}`);
  }
});

test("[5s-t15] an honest run verifies, and reports the row it verified", () => {
  const run = honestRun();
  const v = verifyFindingLedger(run.ledger, run.inputs);
  assert.equal(v.ok, true, JSON.stringify(v.refusals));
  assert.deepEqual(v.entry_ids, [run.entry.finding_entry_id]);
});

// ------------------------------------------------------------------ the identity

test("[5s-t15] the id is H(domain ‖ manifest ‖ artifact ‖ finding), and nothing positional", () => {
  const { entry } = honestRun();
  assert.equal(entry.finding_entry_id, findingEntryId(entry));
  // Each of the three facts moves the id. If one did not, two different findings could share an id.
  for (const field of [
    "comparison_manifest_digest",
    "equivocation_artifact_digest",
    "finding_id",
  ]) {
    assert.notEqual(
      findingEntryId({ ...entry, [field]: "different" }),
      entry.finding_entry_id,
      `${field} does not participate in the identity`
    );
  }
});

test("[5s-t15] field concatenation cannot impersonate another field", () => {
  // Unprefixed concatenation would make ("ab","c") and ("a","bc") the same id — the classic seam.
  const left = findingEntryId({
    comparison_manifest_digest: "ab",
    equivocation_artifact_digest: "c",
    finding_id: FINDING_ID,
  });
  const right = findingEntryId({
    comparison_manifest_digest: "a",
    equivocation_artifact_digest: "bc",
    finding_id: FINDING_ID,
  });
  assert.notEqual(left, right);
});

test("[5s-t15] shuffling rows cannot move their meaning", () => {
  const one = honestRun();
  const two = honestRun();
  // Distinct comparisons — and the id is RECOMPUTED, or the two rows would share an identity and the
  // property would hold for the wrong reason.
  const second = { ...two.entry, comparison_manifest_digest: "other" };
  second.finding_entry_id = findingEntryId(second);
  assert.notEqual(second.finding_entry_id, one.entry.finding_entry_id);

  const forward = ledgerOf(one.entry, second);
  const reversed = ledgerOf(second, one.entry);
  assert.equal(canonicalLedger(forward), canonicalLedger(reversed));
  assert.notEqual(canonicalLedger(forward), canonicalLedger(ledgerOf(one.entry)));
});

test("[5s-t15] a row whose stored id is not its derived id is refused", () => {
  const run = honestRun();
  const forged = { ...run.entry, finding_entry_id: findingEntryId({ finding_id: "something" }) };
  const v = verifyFindingLedger(ledgerOf(forged), run.inputs);
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ENTRY_ID_MISMATCH));
});

// ------------------------------------------------------------------ the five requirements

test("[5s-t15] the five requirements are each independently load-bearing", () => {
  const run = honestRun();
  assert.deepEqual(ENTRY_REQUIREMENTS, {
    finding_id: FINDING_ID,
    verifier_exit: 0,
    comparison_status: "equivocation_detected",
    equivocation_artifact_status: "present",
  });
  for (const [field, value] of Object.entries({
    finding_id: "SOMETHING_ELSE",
    verifier_exit: 1,
    comparison_status: "no_conflict_in_committed_comparison_set",
    equivocation_artifact_status: "absent_compatible",
  })) {
    const broken = { ...run.entry, [field]: value };
    broken.finding_entry_id = findingEntryId(broken);
    const v = verifyFindingLedger(ledgerOf(broken), run.inputs);
    assert.equal(v.ok, false, `${field}=${value} was accepted`);
  }
});

test("[5s-t15] requirement 5 — the artifact must survive verification on its own", () => {
  const run = honestRun();
  const strangerKey = generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" })
    .toString();
  const v = verifyFindingLedger(run.ledger, {
    ...run.inputs,
    verification_inputs: {
      ...run.inputs.verification_inputs,
      producer_public_key_pem: strangerKey,
    },
  });
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ARTIFACT_SELF_VERIFICATION_FAILED));
});

// ------------------------------------------------------------------ the eight contradictions

test("[5s-t15] C1 — a finding with no artifact behind it is an accusation with no exhibit", () => {
  const d = deriveFindingEntry({
    comparison_status: "equivocation_detected",
    equivocation_artifact: null,
    quorum_status_a: "witnessed_quorum",
    quorum_status_b: "witnessed_quorum",
  });
  assert.equal(d.ok, false);
  assert.deepEqual(reasons(d), [LEDGER_REFUSALS.FINDING_WITHOUT_ARTIFACT]);
});

test("[5s-t15] C2 — a committed artifact that no row accounts for is refused", () => {
  const run = honestRun();
  const v = verifyFindingLedger(ledgerOf(), run.inputs);
  assert.equal(v.ok, false);
  // Both halves fire, and they are different sentences: the fork is unrecorded AND the exhibit is
  // circulating outside the record.
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ARTIFACT_WITHOUT_FINDING));
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ENTRY_OMITTED));
});

test("[5s-t15] C3 — no finding may be minted over a comparison that reported no fork", () => {
  for (const clean of [
    "no_conflict_in_committed_comparison_set",
    "comparison_indeterminate",
    "comparison_unavailable",
  ]) {
    const run = honestRun();
    const v = verifyFindingLedger(run.ledger, {
      ...run.inputs,
      observed: [{ ...run.inputs.observed[0], comparison_status: clean }],
    });
    assert.equal(v.ok, false, `a finding survived over ${clean}`);
    assert.ok(
      reasons(v).includes(LEDGER_REFUSALS.FINDING_ON_CLEAN_RELATION),
      `${clean} produced ${reasons(v)}`
    );
  }
});

test("[5s-t15] C3 — `deriveFindingEntry` declines rather than minting over a clean relation", () => {
  const { artifact } = fork();
  for (const clean of ["no_conflict_in_committed_comparison_set", "comparison_indeterminate"]) {
    const d = deriveFindingEntry({
      comparison_status: clean,
      equivocation_artifact: artifact,
      quorum_status_a: "witnessed_quorum",
      quorum_status_b: "witnessed_quorum",
    });
    assert.equal(d.ok, true);
    assert.equal(d.entry, null, `${clean} minted a row`);
  }
});

test("[5s-t15] C4 — a quorum shortfall may not delete the row", () => {
  // The motive, stated plainly: the fork is real, the witness lane is short, and the shortfall would
  // make a convenient explanation for the silence. It does not get to be one.
  for (const quorum of [
    ["witnessed_quorum", "quorum_incomplete"],
    ["quorum_incomplete", "witnessed_quorum"],
    ["quorum_incomplete", "quorum_incomplete"],
  ]) {
    const run = honestRun(quorum);
    const suppressed = verifyFindingLedger(ledgerOf(), run.inputs);
    assert.equal(suppressed.ok, false, `${quorum} let the row vanish`);
    assert.ok(reasons(suppressed).includes(LEDGER_REFUSALS.ENTRY_OMITTED));

    // And the honest ledger for that same short-quorum run still verifies: the shortfall is
    // RECORDED, never consulted. Two producer signatures over incompatible bodies need no witness.
    const kept = verifyFindingLedger(run.ledger, run.inputs);
    assert.equal(kept.ok, true, `${quorum}: ${JSON.stringify(kept.refusals)}`);
    assert.equal(kept.entry_ids.length, 1);
  }
});

test("[5s-t15] C5 — envelope and body digests are not interchangeable", () => {
  const run = honestRun();
  const swaps = [
    { checkpoint_body_digest_a: run.entry.checkpoint_envelope_digest_a },
    { checkpoint_envelope_digest_b: run.entry.checkpoint_body_digest_b },
    { checkpoint_body_digest_a: run.entry.checkpoint_body_digest_b },
    { authenticated_receiver_provenance_root: "sha256:invented" },
  ];
  for (const swap of swaps) {
    const broken = { ...run.entry, ...swap };
    broken.finding_entry_id = findingEntryId(broken);
    const v = verifyFindingLedger(ledgerOf(broken), run.inputs);
    assert.equal(v.ok, false, `${JSON.stringify(swap)} was accepted`);
    assert.ok(
      reasons(v).includes(LEDGER_REFUSALS.DIGEST_SUBSTITUTION),
      `${JSON.stringify(swap)} produced ${reasons(v)}`
    );
  }
});

test("[5s-t15] C6 — a row naming an artifact outside the committed set is refused", () => {
  const run = honestRun();
  const v = verifyFindingLedger(run.ledger, { ...run.inputs, committed_artifacts: [] });
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ARTIFACT_NOT_IN_COMMITTED_SET));
});

test("[5s-t15] C6 — membership is by RECOMPUTED digest, not by the artifact's own claim", () => {
  // A substituted artifact carrying the honest artifact's `artifact_digest` must not answer for it.
  const run = honestRun();
  const impostor = {
    ...run.artifact,
    view_a: { ...run.artifact.view_a, checkpoint_body_digest: "sha256:elsewhere" },
  };
  assert.notEqual(artifactDigestOf(impostor), run.entry.equivocation_artifact_digest);
  const v = verifyFindingLedger(run.ledger, { ...run.inputs, committed_artifacts: [impostor] });
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.ARTIFACT_NOT_IN_COMMITTED_SET));
});

test("[5s-t15] C7 — two rows for one canonical comparison are refused", () => {
  const run = honestRun();
  const v = verifyFindingLedger(ledgerOf(run.entry, { ...run.entry }), run.inputs);
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(LEDGER_REFUSALS.DUPLICATE_ENTRY));
});

test("[5s-t15] C8 — a successor ledger may add and may never subtract", () => {
  const one = honestRun();
  const two = honestRun();
  const second = { ...two.entry, comparison_manifest_digest: "other-comparison" };
  second.finding_entry_id = findingEntryId(second);

  const grew = verifyLedgerSuccession(ledgerOf(one.entry), ledgerOf(one.entry, second));
  assert.equal(grew.ok, true);
  assert.deepEqual(grew.added, [second.finding_entry_id]);
  assert.deepEqual(grew.removed, []);

  const buried = verifyLedgerSuccession(ledgerOf(one.entry, second), ledgerOf(second));
  assert.equal(buried.ok, false);
  assert.deepEqual(reasons(buried), [LEDGER_REFUSALS.EQUIVOCATION_OVERWRITTEN]);
  assert.deepEqual(buried.removed, [one.entry.finding_entry_id]);
});

test("[5s-t15] C8 — a swap that keeps the COUNT identical is still a subtraction", () => {
  // Set-pinned, never counted (Q1-F002): one row out and one row in balances every tally and is
  // exactly the shape a laundered ledger takes.
  const one = honestRun();
  const two = honestRun();
  const replacement = { ...two.entry, comparison_manifest_digest: "other-comparison" };
  replacement.finding_entry_id = findingEntryId(replacement);

  const v = verifyLedgerSuccession(ledgerOf(one.entry), ledgerOf(replacement));
  assert.equal(v.ok, false);
  assert.equal(v.removed.length, 1);
  assert.equal(v.added.length, 1);
});

test("[5s-t15] an empty successor to an empty ledger is fine — and to a real one is not", () => {
  const run = honestRun();
  assert.equal(verifyLedgerSuccession(ledgerOf(), ledgerOf()).ok, true);
  assert.equal(verifyLedgerSuccession(ledgerOf(run.entry), ledgerOf()).ok, false);
  // Malformed successors fail closed rather than reading as "nothing was removed".
  for (const bad of [null, undefined, {}, { entries: "not an array" }]) {
    assert.equal(verifyLedgerSuccession(ledgerOf(run.entry), bad).ok, false, JSON.stringify(bad));
  }
});

// ------------------------------------------------------------------ the freeze, and fail-closed

test("[5s-t15] NO ledger refusal allocates a raw code — the §2 band stays closed at 512", () => {
  // The ledger is an evidence-pack layer, not the core verifier. A contradiction here is a build
  // failure, and giving it a code would either widen a frozen band or overload a code that already
  // means something else to every caller reading exit status.
  for (const reason of Object.values(LEDGER_REFUSALS)) {
    assert.equal(codeFor(reason), null, `${reason} allocates a raw code`);
  }
  assert.equal(codeFor(FINDING_ID), null, "the finding itself must never carry a raw code");
});

test("[5s-t15] malformed ledgers and rows fail CLOSED, never vacuously ok", () => {
  const run = honestRun();
  for (const bad of [null, undefined, {}, [], { entries: {} }, { schema: LEDGER_SCHEMA }]) {
    const v = verifyFindingLedger(bad, run.inputs);
    assert.equal(v.ok, false, `${JSON.stringify(bad)} verified`);
  }
  // A row missing any one of its fourteen bindings is not a row.
  for (const field of REQUIRED_ENTRY_FIELDS) {
    const broken = { ...run.entry };
    delete broken[field];
    const v = verifyFindingLedger(ledgerOf(broken), run.inputs);
    assert.equal(v.ok, false, `a row without ${field} verified`);
  }
});

test("[5s-t15] an empty ledger over an empty run verifies — and that is not vacuity", () => {
  // Nothing observed, nothing committed, nothing recorded. The anti-vacuity condition lives on the
  // observed side: a ledger is only allowed to be empty when the run found nothing.
  const v = verifyFindingLedger(ledgerOf(), { observed: [], committed_artifacts: [] });
  assert.equal(v.ok, true);
  assert.deepEqual(v.entry_ids, []);
  assert.equal(verifyFindingLedger(ledgerOf(), honestRun().inputs).ok, false);
});

// ------------------------------------------------------------------ the driver
//
// The driver gets its own exit-code discipline because 5S-F006 was exactly this: a gate that printed
// green because it could not run. Exit 1 is "the ledger contradicts the run". Exit 2 is "nobody
// checked". Collapsing the two is how a broken gate passes for months.

test("[5s-t15] the driver refuses unknown flags rather than ignoring them", () => {
  for (const argv of [
    ["--base", "origin/main"],
    ["--run", "r.json", "--outt", "l.json"],
    ["nonsense"],
  ]) {
    assert.ok(parseArgs(argv).error, `${argv.join(" ")} was accepted`);
  }
});

test("[5s-t15] the driver refuses `--key` BY NAME — it signs nothing", () => {
  assert.match(parseArgs(["--key", "/tmp/k.pem"]).error, /signs nothing/);
  assert.match(parseArgs(["--sign", "x"]).error, /signs nothing/);
});

test("[5s-t15] the driver requires a run, and one of build or verify", () => {
  assert.ok(parseArgs(["--out", "l.json"]).error, "a build with no run was accepted");
  assert.ok(parseArgs(["--run", "r.json"]).error, "neither out nor verify was accepted");
  assert.ok(
    parseArgs(["--run", "r.json", "--out", "a", "--verify", "b"]).error,
    "out and verify together were accepted"
  );
  assert.ok(
    parseArgs(["--run", "r.json", "--out", "a", "--against", "b"]).error,
    "--against without --verify was accepted"
  );
  assert.deepEqual(parseArgs(["--run=r.json", "--out=l.json"]), {
    run: "r.json",
    out: "l.json",
    verify: null,
    against: null,
  });
});

/** Drive `main` over in-memory files so the driver is tested without touching a disk. */
function drive(argv, files) {
  const written = new Map();
  const lines = [];
  const code = main(argv, {
    readFile: (p) => {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    writeFile: (p, text) => written.set(p, text),
    log: (l) => lines.push(l),
  });
  return { code, written, out: lines.join("\n") };
}

/** The committed shape of a run: comparisons plus the public inputs to verify their artifacts. */
function runFile(quorum = ["witnessed_quorum", "witnessed_quorum"]) {
  const { artifact, manifest } = fork();
  return {
    text: JSON.stringify({
      comparisons: [
        {
          comparison_status: "equivocation_detected",
          equivocation_artifact: artifact,
          quorum_status_a: quorum[0],
          quorum_status_b: quorum[1],
        },
      ],
      verification_inputs: verificationInputs(manifest),
    }),
    artifact,
  };
}

test("[5s-t15] the driver builds a ledger from a run, and the bytes are canonical", () => {
  const { text } = runFile();
  const first = drive(["--run", "r.json", "--out", "l.json"], { "r.json": text });
  assert.equal(first.code, DRIVER_EXIT.OK, first.out);
  const built = first.written.get("l.json");
  assert.match(first.out, /findings recorded: 1/);

  // Byte-identical on a second run — no clock, no ordering, no randomness in the output.
  const second = drive(["--run", "r.json", "--out", "l.json"], { "r.json": text });
  assert.equal(second.written.get("l.json"), built);
  assert.equal(JSON.parse(built).entries.length, 1);
});

test("[5s-t15] the driver exits REFUSED when the ledger contradicts the run", () => {
  const { text } = runFile();
  const empty = JSON.stringify({ schema: LEDGER_SCHEMA, entries: [] });
  const r = drive(["--run", "r.json", "--verify", "l.json"], { "r.json": text, "l.json": empty });
  assert.equal(r.code, DRIVER_EXIT.REFUSED);
  assert.match(r.out, /LEDGER_ENTRY_OMITTED/);
});

test("[5s-t15] the driver exits OPERATOR_ERROR when it could not check — never OK", () => {
  const { text } = runFile();
  const cases = [
    [["--run", "missing.json", "--out", "l.json"], {}],
    [["--run", "r.json", "--out", "l.json"], { "r.json": "{ not json" }],
    [["--run", "r.json", "--out", "l.json"], { "r.json": JSON.stringify({ nothing: true }) }],
    [["--run", "r.json", "--verify", "gone.json"], { "r.json": text }],
    [["--base", "x"], {}],
  ];
  for (const [argv, files] of cases) {
    const r = drive(argv, files);
    assert.equal(r.code, DRIVER_EXIT.OPERATOR_ERROR, `${argv.join(" ")} → ${r.code}\n${r.out}`);
    assert.match(r.out, /NOT RUN/);
    assert.equal(r.written.size, 0, "a driver that could not run must not write");
  }
});

test("[5s-t15] the driver checks succession when handed a predecessor", () => {
  const { text } = runFile();
  const built = drive(["--run", "r.json", "--out", "l.json"], { "r.json": text }).written.get(
    "l.json"
  );
  const empty = JSON.stringify({ schema: LEDGER_SCHEMA, entries: [] });

  const grew = drive(["--run", "r.json", "--verify", "l.json", "--against", "p.json"], {
    "r.json": text,
    "l.json": built,
    "p.json": empty,
  });
  assert.equal(grew.code, DRIVER_EXIT.OK, grew.out);
  assert.match(grew.out, /succession: \+1 \/ -0/);

  // The predecessor recorded a finding this ledger does not. That is the burial C8 exists for, and
  // the run itself is perfectly happy — only the predecessor knows.
  const buried = drive(["--run", "r.json", "--verify", "p.json", "--against", "l.json"], {
    "r.json": text,
    "l.json": built,
    "p.json": empty,
  });
  assert.equal(buried.code, DRIVER_EXIT.REFUSED);
  assert.match(buried.out, /LEDGER_EQUIVOCATION_OVERWRITTEN/);
});

test("[5s-t15] a short quorum does not change what the driver records", () => {
  const full = drive(["--run", "r.json", "--out", "l.json"], { "r.json": runFile().text });
  const short = drive(["--run", "r.json", "--out", "l.json"], {
    "r.json": runFile(["quorum_incomplete", "quorum_incomplete"]).text,
  });
  assert.equal(full.code, DRIVER_EXIT.OK);
  assert.equal(short.code, DRIVER_EXIT.OK, short.out);
  assert.equal(JSON.parse(short.written.get("l.json")).entries.length, 1);
  for (const q of ["quorum_status_a", "quorum_status_b"]) {
    assert.equal(JSON.parse(short.written.get("l.json")).entries[0][q], "quorum_incomplete");
  }
});
