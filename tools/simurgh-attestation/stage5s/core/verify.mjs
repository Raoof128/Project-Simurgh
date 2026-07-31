// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 16 — the ordered evaluator. AnthropicSafe First, then ReviewerSafe.
//
// THE ORDER IS THE PRODUCT. Any verifier can decide that a bundle is bad; this one has to decide it
// in a fixed, published sequence, because the code it returns is what a reviewer reads as the
// diagnosis. A verifier that reports whichever defect it happened to notice first is a verifier
// whose output changes when someone reorders a loop, and §2.8 exists so that never happens:
//
//   structural → checkpoint+producer → witness policy → witness identity → laundering → replay →
//   quorum  ⟂  comparison policy → receiver → comparison → claim gate → wrapper
//
// `⟂` IS NOT DECORATION. Comparison does not sit downstream of quorum. Both lanes are evaluated on
// every run, and the comparison lane reports what it found whether or not the witness lane reached
// its threshold — because two authenticated producer signatures over incompatible checkpoints prove
// the producer signed both, and no witness is needed to establish that.
//
// RULING 8 — A QUORUM SHORTFALL IS A STATUS; 496 IS FOR A QUORUM THAT WAS CLAIMED.
//
//   §2.5's own worked example returns `"ok": true` with `quorum_status: {a: witnessed_quorum,
//   b: quorum_incomplete}` and a detected fork, and says in the next sentence that "reaching
//   QUORUM_BELOW_POLICY first would have violated No Two Compared Histories inside the stage that
//   declares it". So a short witness set cannot be a refusal on its own. But §2.7 allocates 496 and
//   the closeout law requires every code to be reachable at its frozen position, so it must fire
//   somewhere real.
//
//   It fires on a CLAIM. A bundle that presents a quorum certificate asserting the committed
//   threshold is satisfied, over a tally that does not satisfy it, is a counterfeit quorum — family
//   5's exact adversary — and takes 496. A bundle that simply has fewer witnesses than the policy
//   asks for, and says so, is not lying about anything: it carries `quorum_incomplete` and the run
//   continues. Claims are checked, never believed; silence is not a claim.
//
//   This keeps the two lanes genuinely independent. The exit code never depends on what the
//   comparison lane found, and the comparison lane never depends on what the witness lane counted.
//
// WITHIN ONE CHECK, THE LOWEST ALLOCATED CODE WINS. A bundle can be defective several ways at one
// position, and "whichever the implementation noticed" would be the same non-determinism the check
// order exists to remove — one rung down.
//
// THE CLAIM GATE IS NOT SILENTLY GREEN. Code 511 belongs to Task 29 and is injected here. A bundle
// that declares no claim surface leaves the gate `evaluated: false` in the returned check list,
// because an unevaluated gate reported as a passing one is the vacuous-green species this repository
// has now met five times.
//
// AND THE WRAPPER CATCHES. Any throw anywhere becomes 512 VWQ_UNKNOWN — the honest code for
// "something we did not model" — rather than an exception escaping into a caller that will read the
// absence of a refusal as a pass.

import { createPublicKey, verify as edVerify } from "node:crypto";

import { validateArtifact } from "./artifacts.mjs";
import { checkpointBodyDigest, checkpointEnvelopeDigest } from "./canonical.mjs";
import { compare } from "./compatibility.mjs";
import { ancestryOracle } from "./ancestry.mjs";
import { deriveEquivocationArtifact } from "./equivocation.mjs";
import { validateWitnessQuorumPolicy } from "./policy.mjs";
import { tally } from "./quorum.mjs";
import { VWQ_CLOSED_BAND, codeFor } from "./rawCodeAllocator.mjs";
import { intake } from "./receivers.mjs";
import {
  comparisonStatusOf,
  equivocationArtifactStatusOf,
  externalCorroborationStatusOf,
  quorumStatusOf,
  witnessIndependenceStatusOf,
} from "./status.mjs";

/**
 * The frozen §2.8 sequence. Written out rather than derived, and then pinned in the test against BOTH
 * the allocator's first-appearance order and the spec's arrow diagram — two independent authorities,
 * so a silent edit here disagrees with one of them.
 */
export const CHECK_ORDER = Object.freeze([
  "structural",
  "checkpoint+produ.",
  "witness policy",
  "witness identity",
  "laundering",
  "replay",
  "quorum",
  "comparison policy",
  "receiver",
  "comparison",
  "claim gate",
  "wrapper",
]);

/** Which check owns which outcome, read off the frozen allocation rather than restated. */
const CHECK_OF_OUTCOME = new Map(VWQ_CLOSED_BAND.map((r) => [r.policy_outcome, r.check_id]));

const POSITION = new Map(CHECK_ORDER.map((id, i) => [id, i]));

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;

/** One failure, carrying everything a reviewer needs and nothing they have to take on trust. */
function failure(policy_outcome, detail) {
  const check_id = CHECK_OF_OUTCOME.get(policy_outcome) ?? "wrapper";
  return {
    check_id,
    policy_outcome,
    raw_code: codeFor(policy_outcome) ?? codeFor("VWQ_UNKNOWN"),
    detail,
  };
}

/**
 * The earliest failure in the frozen order; within one check, the lowest allocated code.
 * Returns null for a clean run — the caller must not read null as "no checks ran".
 */
export function firstFailure(failures) {
  let best = null;
  for (const f of failures) {
    if (best === null) {
      best = f;
      continue;
    }
    const here = POSITION.get(f.check_id) ?? Number.MAX_SAFE_INTEGER;
    const there = POSITION.get(best.check_id) ?? Number.MAX_SAFE_INTEGER;
    if (here < there || (here === there && f.raw_code < best.raw_code)) best = f;
  }
  return best;
}

// ---------------------------------------------------------------- individual checks

/** structural — 475/476. Every artifact the bundle presents must be the artifact it says it is. */
function checkStructural(bundle) {
  const failures = [];
  const present = [
    ["witness_policy", bundle.witness_policy],
    ["comparison_policy", bundle.comparison_policy],
    ["comparison_manifest", bundle.comparison_manifest],
  ];
  for (const [name, value] of present) {
    if (value === undefined || value === null) continue;
    for (const r of validateArtifact(name, value).refusals) {
      failures.push(failure(r.reason, `${name}.${r.field ?? r.detail ?? "?"}`));
    }
  }
  for (const [label, view] of viewsOf(bundle)) {
    if (!isPlainObject(view?.checkpoint)) {
      failures.push(failure("SCHEMA_UNSUPPORTED", `${label} carries no checkpoint`));
      continue;
    }
    for (const r of validateArtifact("checkpoint", view.checkpoint).refusals) {
      failures.push(failure(r.reason, `${label}.checkpoint.${r.field ?? r.detail ?? "?"}`));
    }
  }
  return failures;
}

/**
 * checkpoint + producer — 477-483.
 *
 * 479 asks whether the signature verifies under the key the bundle PRESENTS; 487, two checks later,
 * asks whether that key is the one the policy commits. Splitting them is what lets each code name a
 * real, distinct defect: a broken signature and a substituted signer are not the same accusation.
 */
function checkCheckpointAndProducer(bundle) {
  const failures = [];
  const committed = bundle.committed ?? {};
  let producerKey = null;
  try {
    producerKey = createPublicKey(String(committed.producer_public_key_pem));
  } catch {
    producerKey = null;
  }

  for (const [label, view] of viewsOf(bundle)) {
    const cp = view?.checkpoint;
    if (!isPlainObject(cp)) continue;

    if (!isNonEmptyString(cp.producer_identity)) {
      failures.push(failure("PRODUCER_IDENTITY_MALFORMED", `${label}: ${cp.producer_identity}`));
    }
    if (!Number.isInteger(cp.epoch) || cp.epoch < 0) {
      failures.push(failure("EPOCH_INVALID", `${label}: ${JSON.stringify(cp.epoch)}`));
    }
    if (!isNonEmptyString(cp.history_root)) {
      failures.push(failure("HISTORY_ROOT_MISMATCH", `${label}: history_root absent`));
    }
    if (
      isNonEmptyString(committed.protocol_version) &&
      cp.protocol_version !== committed.protocol_version
    ) {
      failures.push(
        failure(
          "PROTOCOL_VERSION_MISMATCH",
          `${label}: ${cp.protocol_version} against committed ${committed.protocol_version}`
        )
      );
    }
    // The C1 commitment is 5R's, inherited: a checkpoint that binds no committed C1 root is
    // unanchored to the run it claims to describe.
    const roots = Array.isArray(committed.c1_roots) ? committed.c1_roots : null;
    if (roots && !roots.includes(cp.c1_commitment)) {
      failures.push(failure("C1_COMMITMENT_UNBOUND", `${label}: ${cp.c1_commitment}`));
    }

    // Every digest anything binds must be the digest of the thing it binds. Recomputed, never read.
    const envelope = checkpointEnvelopeDigest(cp);
    const bound = [
      ...(Array.isArray(view.witness_statements) ? view.witness_statements : []),
      ...(Array.isArray(view.carried_by) ? view.carried_by : []),
    ];
    for (const b of bound) {
      if (
        isNonEmptyString(b?.checkpoint_envelope_digest) &&
        b.checkpoint_envelope_digest !== envelope
      ) {
        failures.push(
          failure(
            "CHECKPOINT_BINDING_MISMATCH",
            `${label}: a statement binds ${b.checkpoint_envelope_digest}, the checkpoint is ${envelope}`
          )
        );
      }
    }

    let signatureOk = false;
    if (producerKey) {
      try {
        signatureOk = edVerify(
          null,
          Buffer.from(checkpointBodyDigest(cp), "utf8"),
          producerKey,
          Buffer.from(String(cp.producer_signature), "base64")
        );
      } catch {
        signatureOk = false;
      }
    }
    if (!signatureOk) {
      failures.push(failure("PRODUCER_SIGNATURE_INVALID", `${label}: unauthenticated checkpoint`));
    }
  }
  return failures;
}

/** witness policy — 484-487. Nothing about a roster is decidable until the policy is. */
function checkWitnessPolicy(bundle) {
  const failures = [];
  const policy = bundle.witness_policy;
  const validated = validateWitnessQuorumPolicy(policy);
  for (const r of validated.refusals) failures.push(failure(r.reason, r.detail ?? r.field));
  if (!validated.ok) return failures;

  // 486 and 487 are decided against a checkpoint, not against the block — `core/policy.mjs` says so
  // in its own header and declines to guess, which is why they land here.
  for (const [label, view] of viewsOf(bundle)) {
    const cp = view?.checkpoint;
    if (isPlainObject(cp) && cp.policy_digest !== policy.policy_digest) {
      failures.push(
        failure(
          "POLICY_DIGEST_MISMATCH",
          `${label} binds ${cp.policy_digest}, the committed policy is ${policy.policy_digest}`
        )
      );
    }
  }
  const committed = bundle.committed ?? {};
  if (
    isNonEmptyString(committed.producer_key_digest) &&
    policy.producer_key_digest !== committed.producer_key_digest
  ) {
    failures.push(
      failure(
        "PRODUCER_KEY_NOT_COMMITTED",
        `the policy commits ${policy.producer_key_digest}, the run presents ${committed.producer_key_digest}`
      )
    );
  }
  return failures;
}

/**
 * The witness lane — 488-496, split across four checks by the allocator's own `check_id`.
 *
 * `tally` already runs producer exclusion before alias collapse and returns every refusal it found;
 * this function only routes them to their frozen positions.
 */
function checkWitnessLane(bundle) {
  const failures = [];
  const tallies = {};
  for (const [label, view] of viewsOf(bundle)) {
    const result = tally({
      checkpoint: view?.checkpoint,
      policy: bundle.witness_policy,
      statements: view?.witness_statements ?? [],
      producer_key_digest: bundle.committed?.producer_key_digest,
    });
    tallies[label] = result;
    for (const r of result.refusals) {
      // 496 is NOT emitted from a shortfall — see Ruling 8 in this file's header.
      if (r.reason === "QUORUM_BELOW_POLICY") continue;
      failures.push(failure(r.reason, `${label}: ${r.detail ?? r.identity ?? ""}`));
    }
    // The claim, checked. A certificate asserting the committed threshold over a tally that does not
    // meet it is a counterfeit quorum; a run that claims nothing is merely incomplete.
    if (view?.quorum_certificate?.claims_threshold_met === true && result.tally?.met !== true) {
      failures.push(
        failure(
          "QUORUM_BELOW_POLICY",
          `${label}: the certificate asserts the threshold is met; the tally counts ` +
            `${result.tally?.distinct_eligible_witnesses} of ${result.tally?.threshold_q}`
        )
      );
    }
  }
  return { failures, tallies };
}

/** The comparison lane — 497-510. Evaluated on every run, whatever the witness lane counted. */
function checkComparisonLane(bundle, { attributionFailed = false } = {}) {
  const failures = [];
  const views = viewsOf(bundle);
  const intakeResult = intake({
    policy: bundle.comparison_policy,
    receipts: views.flatMap(([, v]) => v?.carried_by ?? []),
    statuses: bundle.receiver_statuses ?? [],
  });
  for (const r of intakeResult.refusals) failures.push(failure(r.reason, r.detail ?? r.identity));

  // The manifest must be committed before anything may be said about what it contains.
  if (!isPlainObject(bundle.comparison_manifest)) {
    failures.push(failure("COMPARISON_MANIFEST_NOT_COMMITTED", "no comparison manifest"));
  }

  const relations = [];
  let artifact = null;
  let comparisonStatus = "comparison_unavailable";

  if (views.length >= 2 && !attributionFailed) {
    const oracle = ancestryOracle({
      chain: bundle.committed?.chain ?? [],
      policy: bundle.committed?.transition_policy ?? {},
    });
    const relationView = (cp) => ({
      artifact_kind: "checkpoint",
      producer_identity: cp?.producer_identity,
      scope_id: cp?.scope_id,
      epoch: cp?.epoch,
      checkpoint_body_digest: checkpointBodyDigest(cp),
      checkpoint_envelope_digest: checkpointEnvelopeDigest(cp),
      history_root: cp?.history_root,
    });
    const relation = compare(
      relationView(views[0][1]?.checkpoint),
      relationView(views[1][1]?.checkpoint),
      { ancestry: oracle }
    );
    if (relation.ok) {
      relations.push(relation.relation);
    } else {
      failures.push(failure(relation.refusal.reason, relation.refusal.detail));
    }

    const derived = deriveEquivocationArtifact({
      view_a: views[0][1],
      view_b: views[1][1],
      comparison_policy: bundle.comparison_policy,
      comparison_manifest: bundle.comparison_manifest,
      producer_key_digest: bundle.committed?.producer_key_digest,
      witness_policy: bundle.witness_policy,
      committed_chain: bundle.committed?.chain,
      committed_transition_policy: bundle.committed?.transition_policy,
    });
    if (derived.ok) {
      artifact = derived.artifact;
    } else if (derived.refusal) {
      failures.push(failure(derived.refusal.reason, derived.refusal.detail));
    }
  }

  comparisonStatus = comparisonStatusOf({ relations, intake: intakeResult.intake });
  return { failures, intakeResult, relations, artifact, comparisonStatus };
}

/** The two views, labelled. Order is positional and is the bundle's own; nothing here sorts them. */
function viewsOf(bundle) {
  const views = Array.isArray(bundle?.views) ? bundle.views : [];
  return views.map((v, i) => [`view_${String.fromCharCode(97 + i)}`, v]);
}

/**
 * Run the frozen order over one bundle. Never throws: anything unmodelled becomes 512.
 *
 * @returns {{ok: boolean, exit_code: number, first_failure: object|null, statuses: object,
 *            checks: Array<object>, relations: Array<string>, equivocation_artifact: object|null}}
 */
export function evaluate(bundle, deps = {}) {
  try {
    return evaluateInner(bundle ?? {}, deps);
  } catch (error) {
    const unknown = failure("VWQ_UNKNOWN", `unmodelled: ${error?.message ?? error}`);
    return {
      ok: false,
      exit_code: unknown.raw_code,
      first_failure: unknown,
      statuses: {
        quorum_status: { a: "quorum_incomplete", b: "quorum_incomplete" },
        comparison_status: "comparison_unavailable",
        witness_independence_status: "unproven",
        external_corroboration_status: "not_satisfied",
        equivocation_artifact_status: "absent_comparison_unavailable",
      },
      checks: CHECK_ORDER.map((check_id) => ({ check_id, evaluated: false })),
      // A crashed run knows of exactly one failure: that it crashed. Reporting the partial list it
      // had collected would invite a reader to believe a survey that never finished.
      failures: [unknown],
      relations: [],
      equivocation_artifact: null,
    };
  }
}

function evaluateInner(bundle, deps) {
  const evaluated = new Set();
  const failures = [];
  const record = (checkIds, found) => {
    for (const id of checkIds) evaluated.add(id);
    failures.push(...found);
  };

  record(["structural"], checkStructural(bundle));
  record(["checkpoint+produ."], checkCheckpointAndProducer(bundle));
  record(["witness policy"], checkWitnessPolicy(bundle));

  const witness = checkWitnessLane(bundle);
  record(["witness identity", "laundering", "replay", "quorum"], witness.failures);

  // ⟂ — the comparison lane runs regardless of anything above it. A structurally invalid bundle
  // still stops the run, but a short or laundered WITNESS SET never silences the producer's own
  // two signatures.
  // Whether the two checkpoints were ever established as attributable. Computed BEFORE the
  // comparison lane runs, because the relation must not be asked about views nobody authenticated:
  // `compare` answers a malformed view with its own SCHEMA_UNSUPPORTED, which is allocated to the
  // structural position and would shadow the precise diagnosis this check already produced. A
  // negative epoch reported as "schema unsupported" instead of EPOCH_INVALID is a worse answer to
  // the same question, and it made 482 unreachable until this line existed.
  const attributionFailed = failures.some(
    (f) => f.check_id === "structural" || f.check_id === "checkpoint+produ."
  );

  const comparison = checkComparisonLane(bundle, { attributionFailed });
  record(["comparison policy", "receiver", "comparison"], comparison.failures);

  // THE LINE THE ⟂ DOES NOT CROSS. An accusation requires two PRODUCER-AUTHENTICATED checkpoints —
  // that is the artifact's whole narrow sentence. A witness-lane refusal leaves that sentence
  // untouched and the finding stands. A structural or checkpoint+producer refusal does not: an
  // unsigned checkpoint, a stranger's signature, an unbound C1 root or a foreign protocol version
  // all mean we never established what we would be accusing anybody of, and minting an artifact over
  // them would be a false accusation dressed as a lane split.
  //
  // The first draft of this file did exactly that, and the AUTHORED acceptance columns caught it —
  // eleven cases where a refused bundle still carried a finding. A computed matrix would have agreed
  // with the bug.
  if (comparison.comparisonStatus !== "equivocation_detected") {
    // No fork, or nothing comparable. Either way there is nothing to mint.
    comparison.artifact = null;
  }

  // The claim gate is Task 29's. Unevaluated is reported as unevaluated, never as clean.
  let claimGateEvaluated = false;
  if (typeof deps.claimGate === "function" && bundle.claim_surfaces !== undefined) {
    claimGateEvaluated = true;
    for (const r of deps.claimGate(bundle.claim_surfaces) ?? []) {
      failures.push(failure(r.reason ?? "NONEQUIVOCATION_OVERCLAIM", r.detail));
    }
  }
  if (claimGateEvaluated) evaluated.add("claim gate");

  const first = firstFailure(failures);
  // A threshold committed by an INVALID policy is not a threshold anybody met. `tally` answers the
  // arithmetic it was asked and cannot know its policy was refused two checks earlier, so the join
  // happens here — fail-closed, the same direction as a refused tally never reading as witnessed.
  const policyValid = !failures.some((f) => f.check_id === "witness policy");
  const quorumOf = (t) => (policyValid ? quorumStatusOf(t) : "quorum_incomplete");
  const statuses = {
    quorum_status: {
      a: quorumOf(witness.tallies.view_a),
      b: quorumOf(witness.tallies.view_b),
    },
    comparison_status: comparison.comparisonStatus,
    witness_independence_status: witnessIndependenceStatusOf(bundle),
    external_corroboration_status: externalCorroborationStatusOf({
      policy: bundle.external_corroboration_policy,
      anchors: bundle.external_anchors,
    }),
    equivocation_artifact_status: equivocationArtifactStatusOf({
      comparison_status: comparison.comparisonStatus,
      relations: comparison.relations,
    }),
  };

  // Every failure, in frozen order. The adjacent-pair net of Task 19 needs this: a double-defect
  // bundle that reports the earlier code proves nothing unless the LATER defect is also known to be
  // present, and a composition where the second damage silently failed to apply would otherwise pass
  // for the best-looking wrong reason.
  const ordered = [...failures].sort((x, y) => {
    const px = POSITION.get(x.check_id) ?? Number.MAX_SAFE_INTEGER;
    const py = POSITION.get(y.check_id) ?? Number.MAX_SAFE_INTEGER;
    return px === py ? x.raw_code - y.raw_code : px - py;
  });

  return {
    ok: first === null,
    exit_code: first === null ? 0 : first.raw_code,
    first_failure: first,
    failures: ordered,
    statuses,
    checks: CHECK_ORDER.map((check_id) => ({
      check_id,
      evaluated: evaluated.has(check_id),
    })),
    relations: comparison.relations,
    intake_complete: comparison.intakeResult.intake?.intake_complete === true,
    // The artifact survives a non-zero exit on purpose: a witness-lane refusal is not a reason to
    // withdraw evidence the producer signed.
    equivocation_artifact: comparison.artifact,
  };
}
