// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 15 — the finding ledger. AnthropicSafe First, then ReviewerSafe.
//
// WHAT THIS FILE IS FOR. Every other refusal in this stage announces itself with a raw code, and a
// non-zero exit is self-auditing: something said no, and the code says what. The stage's CENTRAL
// SUCCESS does the opposite. A detected fork exits **0**, because a finding is a statement about a
// producer, not a failure of the verifier. Exit 0 is also what a run that compared nothing produces,
// and what a run that quietly dropped its finding produces. The ledger is what makes those three
// zeros distinguishable after the fact.
//
// AND WHAT IT IS NOT FOR. It is not a second verifier. It never decides whether a fork occurred —
// `core/equivocation.mjs` does that, and the ledger fails if it disagrees with what that module
// found. A ledger that could rule on findings would be an oracle, and a stage with two oracles has
// none: the reviewer would have to pick which to believe, which is the position this whole stage
// exists to spare them.
//
// NO RAW CODE CROSSES THE §2 FREEZE. The band is closed at 512 and a ledger contradiction is not a
// verifier refusal, so every reason below allocates nothing — machine-checked in the test, the same
// way Lane C's corroboration statuses are. A ledger refusal is an evidence-pack failure and exits
// through the driver, not through the verifier's code space.
//
// THE IDENTITY IS DERIVED, NEVER POSITIONAL:
//
//   finding_entry_id = H(domain ‖ comparison_manifest_digest ‖ artifact_digest ‖ finding_id)
//
// so shuffling ledger rows cannot move their meaning, and two orderings of one ledger are the same
// ledger. Row order is presentation; the id is the fact.
//
// EIGHT CONTRADICTIONS, EACH ITS OWN REASON. They are the ways a ledger can be internally tidy and
// still lie, and they earned their places by being the shapes a motivated producer would actually
// reach for — most of all C4, deleting the row whose quorum was short, and C8, letting a later clean
// run bury an earlier finding.

import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical.mjs";
import { FINDING_ID, artifactDigestOf, verifyEquivocationArtifact } from "./equivocation.mjs";

export const LEDGER_SCHEMA = "simurgh.vwq.finding-ledger.v1";
const ENTRY_DOMAIN = "simurgh.vwq.finding-entry.v1";

/** Re-exported so a ledger consumer never has to retype the finding's name. */
export { FINDING_ID };

export const LEDGER_REFUSALS = Object.freeze({
  /** The row is not a row: absent binding, wrong shape, unreadable field. */
  ENTRY_MALFORMED: "LEDGER_ENTRY_MALFORMED",
  /** C1 — a finding recorded with no artifact behind it. An accusation with no exhibit. */
  FINDING_WITHOUT_ARTIFACT: "LEDGER_FINDING_WITHOUT_ARTIFACT",
  /** C2 — an artifact in the committed set that no ledger row accounts for. */
  ARTIFACT_WITHOUT_FINDING: "LEDGER_ARTIFACT_WITHOUT_FINDING",
  /** C3 — a finding claimed over a relation the comparison called clean or short. */
  FINDING_ON_CLEAN_RELATION: "LEDGER_FINDING_ON_CLEAN_RELATION",
  /** C4 — an observed fork with no row. The suppression this stage exists to make visible. */
  ENTRY_OMITTED: "LEDGER_ENTRY_OMITTED",
  /** C5 — a body digest carried in an envelope field, or either substituted for the other. */
  DIGEST_SUBSTITUTION: "LEDGER_DIGEST_SUBSTITUTION",
  /** C6 — a row naming an artifact that is not in the committed set. */
  ARTIFACT_NOT_IN_COMMITTED_SET: "LEDGER_ARTIFACT_NOT_IN_COMMITTED_SET",
  /** C7 — two rows for one canonical comparison. */
  DUPLICATE_ENTRY: "LEDGER_DUPLICATE_ENTRY",
  /** C8 — a successor ledger that drops or weakens a finding its predecessor recorded. */
  EQUIVOCATION_OVERWRITTEN: "LEDGER_EQUIVOCATION_OVERWRITTEN",
  /** The row's own artifact does not survive `verifyEquivocationArtifact`. */
  ARTIFACT_SELF_VERIFICATION_FAILED: "LEDGER_ARTIFACT_SELF_VERIFICATION_FAILED",
  /** A stored `finding_entry_id` that is not the id its own bindings derive. */
  ENTRY_ID_MISMATCH: "LEDGER_ENTRY_ID_MISMATCH",
});

/**
 * The fourteen bindings a ledger row carries. Both digests for both views, on purpose: the body
 * establishes incompatibility and the envelope establishes attribution and receipt binding, so a
 * ledger holding one of the two can be read as evidence for a claim it cannot support.
 */
export const REQUIRED_ENTRY_FIELDS = Object.freeze([
  "finding_id",
  "comparison_status",
  "checkpoint_body_digest_a",
  "checkpoint_body_digest_b",
  "checkpoint_envelope_digest_a",
  "checkpoint_envelope_digest_b",
  "comparison_policy_digest",
  "comparison_manifest_digest",
  "authenticated_receiver_provenance_root",
  "quorum_status_a",
  "quorum_status_b",
  "equivocation_artifact_digest",
  "equivocation_artifact_status",
  "verifier_exit",
]);

/** The five conditions a row must satisfy to be a finding at all. */
export const ENTRY_REQUIREMENTS = Object.freeze({
  finding_id: FINDING_ID,
  verifier_exit: 0,
  comparison_status: "equivocation_detected",
  equivocation_artifact_status: "present",
});

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const refusal = (reason, detail, entry_id) => ({
  reason,
  detail,
  ...(entry_id ? { entry_id } : {}),
});

/**
 * The canonical identity of a finding. Three facts and a domain, in a fixed order: which comparison,
 * which artifact, which finding. Not the row's position, not its authoring time, and not a counter —
 * each of which would let one ledger disagree with a re-ordering of itself.
 *
 * @param {{comparison_manifest_digest: string, equivocation_artifact_digest: string,
 *          finding_id: string}} entry
 * @returns {string} hex digest
 */
export function findingEntryId(entry) {
  const parts = [
    ENTRY_DOMAIN,
    String(entry?.comparison_manifest_digest ?? ""),
    String(entry?.equivocation_artifact_digest ?? ""),
    String(entry?.finding_id ?? ""),
  ];
  // Length-prefixed, so no concatenation of two fields can impersonate a third.
  return sha256(parts.map((p) => `${p.length}:${p}`).join("\n"));
}

/**
 * Derive one ledger row from a verified comparison. Pure; never throws.
 *
 * Declining is a real outcome and is returned as such — a comparison that found no fork produces NO
 * row, because a ledger of findings that also records non-findings is a log, and a reader counting
 * its rows would count wrong.
 *
 * @returns {{ok: true, entry: object|null, reason?: string}
 *          |{ok: false, refusals: Array<object>}}
 */
export function deriveFindingEntry(input) {
  const {
    comparison_status,
    equivocation_artifact,
    quorum_status_a,
    quorum_status_b,
    comparison_policy_digest,
    verifier_exit = 0,
  } = input ?? {};

  if (comparison_status !== "equivocation_detected") {
    return { ok: true, entry: null, reason: `no finding: ${String(comparison_status)}` };
  }
  if (!isPlainObject(equivocation_artifact)) {
    return {
      ok: false,
      refusals: [
        refusal(
          LEDGER_REFUSALS.FINDING_WITHOUT_ARTIFACT,
          "the comparison reports a fork and carries no artifact to show for it"
        ),
      ],
    };
  }

  const a = equivocation_artifact.view_a;
  const b = equivocation_artifact.view_b;
  const entry = {
    finding_id: equivocation_artifact.finding_id,
    comparison_status,
    checkpoint_body_digest_a: a?.checkpoint_body_digest,
    checkpoint_body_digest_b: b?.checkpoint_body_digest,
    checkpoint_envelope_digest_a: a?.checkpoint_envelope_digest,
    checkpoint_envelope_digest_b: b?.checkpoint_envelope_digest,
    comparison_policy_digest:
      comparison_policy_digest ?? equivocation_artifact.comparison_policy_digest,
    comparison_manifest_digest: equivocation_artifact.comparison_manifest_digest,
    authenticated_receiver_provenance_root: equivocation_artifact.receiver_provenance_root,
    // Recorded, never consulted. A short quorum changes what the run may CLAIM; it changes nothing
    // about whether the producer signed two incompatible checkpoints.
    quorum_status_a,
    quorum_status_b,
    equivocation_artifact_digest: equivocation_artifact.artifact_digest,
    equivocation_artifact_status: "present",
    verifier_exit,
  };
  entry.finding_entry_id = findingEntryId(entry);
  return { ok: true, entry };
}

/** Every ledger row, keyed by the comparison it belongs to. */
const comparisonKeyOf = (entry) => String(entry?.comparison_manifest_digest ?? "");

function checkEntryShape(entry, refusals) {
  const id = entry?.finding_entry_id;
  if (!isPlainObject(entry)) {
    refusals.push(refusal(LEDGER_REFUSALS.ENTRY_MALFORMED, "the row is not an object"));
    return false;
  }
  for (const field of REQUIRED_ENTRY_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      refusals.push(refusal(LEDGER_REFUSALS.ENTRY_MALFORMED, `binding absent: ${field}`, id));
      return false;
    }
  }
  for (const [field, required] of Object.entries(ENTRY_REQUIREMENTS)) {
    if (entry[field] !== required) {
      refusals.push(
        refusal(
          field === "comparison_status"
            ? LEDGER_REFUSALS.FINDING_ON_CLEAN_RELATION
            : LEDGER_REFUSALS.ENTRY_MALFORMED,
          `${field} is ${JSON.stringify(entry[field])}, a finding requires ${JSON.stringify(required)}`,
          id
        )
      );
      return false;
    }
  }
  if (findingEntryId(entry) !== entry.finding_entry_id) {
    refusals.push(
      refusal(
        LEDGER_REFUSALS.ENTRY_ID_MISMATCH,
        "the stored id is not the id these bindings derive",
        id
      )
    );
    return false;
  }
  return true;
}

/**
 * Verify a finding ledger against the run it claims to record. Pure; never throws.
 *
 * The observed comparisons are the authority and the ledger is the claim, never the other way round.
 * That direction is what keeps this from being a second oracle: the ledger cannot make a finding
 * true, and it cannot make one go away.
 *
 * @param {unknown} ledger `{schema, entries: []}`
 * @param {{observed: Array<object>, committed_artifacts: Array<object>,
 *          verification_inputs?: object}} publicInputs
 * @returns {{ok: boolean, refusals: Array<object>, entry_ids: Array<string>}}
 */
export function verifyFindingLedger(ledger, publicInputs) {
  const refusals = [];
  const inputs = publicInputs ?? {};
  const observed = Array.isArray(inputs.observed) ? inputs.observed : [];
  const committed = Array.isArray(inputs.committed_artifacts) ? inputs.committed_artifacts : [];

  if (!isPlainObject(ledger) || !Array.isArray(ledger.entries)) {
    return {
      ok: false,
      refusals: [refusal(LEDGER_REFUSALS.ENTRY_MALFORMED, "the ledger carries no entry array")],
      entry_ids: [],
    };
  }
  if (ledger.schema !== LEDGER_SCHEMA) {
    refusals.push(refusal(LEDGER_REFUSALS.ENTRY_MALFORMED, `schema: ${String(ledger.schema)}`));
  }

  // The committed set, indexed by RECOMPUTED digest — a self-declared `artifact_digest` would let a
  // substituted artifact answer for the one the ledger names.
  const byDigest = new Map();
  for (const artifact of committed) {
    if (isPlainObject(artifact)) byDigest.set(artifactDigestOf(artifact), artifact);
  }

  const seenComparisons = new Map();
  const entryIds = [];

  for (const entry of ledger.entries) {
    if (!checkEntryShape(entry, refusals)) continue;
    const id = entry.finding_entry_id;
    entryIds.push(id);

    // C7 — one canonical comparison, one row.
    const key = comparisonKeyOf(entry);
    if (seenComparisons.has(key)) {
      refusals.push(
        refusal(
          LEDGER_REFUSALS.DUPLICATE_ENTRY,
          `a second row for comparison ${key}, first was ${seenComparisons.get(key)}`,
          id
        )
      );
      continue;
    }
    seenComparisons.set(key, id);

    // C6 — the exhibit must be in evidence.
    const artifact = byDigest.get(entry.equivocation_artifact_digest);
    if (!artifact) {
      refusals.push(
        refusal(
          LEDGER_REFUSALS.ARTIFACT_NOT_IN_COMMITTED_SET,
          `no committed artifact recomputes to ${entry.equivocation_artifact_digest}`,
          id
        )
      );
      continue;
    }

    // C5 — the two digests are not interchangeable. Body carries incompatibility; envelope carries
    // attribution. A ledger that swaps them reads as evidence for a claim it cannot support.
    const expected = {
      checkpoint_body_digest_a: artifact.view_a?.checkpoint_body_digest,
      checkpoint_body_digest_b: artifact.view_b?.checkpoint_body_digest,
      checkpoint_envelope_digest_a: artifact.view_a?.checkpoint_envelope_digest,
      checkpoint_envelope_digest_b: artifact.view_b?.checkpoint_envelope_digest,
      comparison_manifest_digest: artifact.comparison_manifest_digest,
      comparison_policy_digest: artifact.comparison_policy_digest,
      authenticated_receiver_provenance_root: artifact.receiver_provenance_root,
    };
    let substituted = false;
    for (const [field, value] of Object.entries(expected)) {
      if (entry[field] !== value) {
        refusals.push(
          refusal(
            LEDGER_REFUSALS.DIGEST_SUBSTITUTION,
            `${field}: the row carries ${entry[field]}, the artifact binds ${value}`,
            id
          )
        );
        substituted = true;
      }
    }
    if (substituted) continue;

    // The exhibit must survive on its own, from public inputs, with no help from us.
    if (isPlainObject(inputs.verification_inputs)) {
      const verdict = verifyEquivocationArtifact(artifact, inputs.verification_inputs);
      if (!verdict.ok) {
        refusals.push(
          refusal(
            LEDGER_REFUSALS.ARTIFACT_SELF_VERIFICATION_FAILED,
            `${verdict.refusal?.check}: ${verdict.refusal?.detail}`,
            id
          )
        );
        continue;
      }
    }

    // C3 — the observed comparison, not the row's own say-so, decides what happened.
    const run = observed.find((o) => comparisonKeyOf(o) === key);
    if (run && run.comparison_status !== "equivocation_detected") {
      refusals.push(
        refusal(
          LEDGER_REFUSALS.FINDING_ON_CLEAN_RELATION,
          `the comparison reports ${run.comparison_status}; a finding may not be minted over it`,
          id
        )
      );
    }
  }

  // C4 — every observed fork must appear. Checked LAST and over the observed side, because absence
  // is the one defect no amount of reading the ledger can reveal. The quorum statuses are reported
  // in the detail precisely because a shortfall is the motive a suppressor would have.
  for (const run of observed) {
    if (run?.comparison_status !== "equivocation_detected") continue;
    if (!seenComparisons.has(comparisonKeyOf(run))) {
      refusals.push(
        refusal(
          LEDGER_REFUSALS.ENTRY_OMITTED,
          `comparison ${comparisonKeyOf(run)} detected a fork and the ledger has no row for it ` +
            `(quorum a=${run.quorum_status_a}, b=${run.quorum_status_b})`
        )
      );
    }
  }

  // C2 — an artifact nobody accounts for. A minted accusation with no ledger row is evidence
  // circulating outside the record, which is how a finding gets quietly withdrawn.
  for (const [digest, artifact] of byDigest) {
    if (artifact.comparison_status !== "equivocation_detected") continue;
    if (![...ledger.entries].some((e) => e?.equivocation_artifact_digest === digest)) {
      refusals.push(
        refusal(
          LEDGER_REFUSALS.ARTIFACT_WITHOUT_FINDING,
          `committed artifact ${digest} is accounted for by no ledger row`
        )
      );
    }
  }

  return { ok: refusals.length === 0, refusals, entry_ids: entryIds };
}

/**
 * C8 — a successor ledger may add, and may never subtract. Pure; never throws.
 *
 * This is the check no single ledger can perform on itself. A later clean run producing a shorter
 * ledger looks perfectly well formed; only the predecessor knows a row is missing. Set-pinned by id,
 * never by count, so a successor that drops one row and adds another cannot balance the books
 * (Q1-F002).
 *
 * @returns {{ok: boolean, refusals: Array<object>, added: Array<string>, removed: Array<string>}}
 */
export function verifyLedgerSuccession(previous, next) {
  const idsOf = (l) =>
    new Set(
      (Array.isArray(l?.entries) ? l.entries : [])
        .map((e) => e?.finding_entry_id)
        .filter((v) => typeof v === "string" && v.length > 0)
    );
  const before = idsOf(previous);
  const after = idsOf(next);
  const removed = [...before].filter((id) => !after.has(id));
  const added = [...after].filter((id) => !before.has(id));

  const refusals = removed.map((id) =>
    refusal(
      LEDGER_REFUSALS.EQUIVOCATION_OVERWRITTEN,
      "a recorded finding is absent from the successor ledger",
      id
    )
  );
  return { ok: refusals.length === 0, refusals, added, removed };
}

/**
 * Canonical bytes of a ledger — set-canonical by entry id, so row order is presentation only.
 *
 * The sort is TOTAL, not keyed on the id alone. Two rows sharing an id is a malformed ledger and the
 * verifier refuses it, but canonicalisation runs on ledgers nobody has verified yet, and a partial
 * order would leave those two rows sitting in whatever sequence they arrived in — an ordering the
 * caller controls, inside the function whose whole purpose is that the caller cannot.
 */
export function canonicalLedger(ledger) {
  const keyed = (Array.isArray(ledger?.entries) ? ledger.entries : []).map((e) => ({
    entry: e,
    key: `${String(e?.finding_entry_id)} ${canonicalJson(e ?? null)}`,
  }));
  keyed.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return canonicalJson({ schema: ledger?.schema, entries: keyed.map((k) => k.entry) });
}
