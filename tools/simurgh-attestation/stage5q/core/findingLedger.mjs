// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the append-only, hash-chained finding ledger (spec §5). L3 MADE MECHANICAL.
//
// L3 is "No Erased Finding". A law written in prose is a promise; a law written here is a throw.
// Three things this file refuses, and why each is refused rather than warned about:
//
//   EDITING AN APPENDED RECORD. Append-only is enforced, not documented. There is no update path,
//   no upsert, no "correct a typo" affordance — because every one of those is also a way to make a
//   finding say something else after it was frozen.
//
//   CHANGING SEVERITY (spec §5.3). Escalation MINTS A NEW FINDING. Upgrading F001 in place would
//   destroy the distinction between "the camera was pointed away" and "the photograph shows a
//   crime" — different defect, different claim impact, different receipt. It would also silently
//   rewrite a frozen record, which L3 forbids outright.
//
//   MUTATION THROUGH A RETAINED REFERENCE (gauntlet P1-21). Returning a new TOP-LEVEL object is not
//   enough: a caller who keeps a reference to the object it passed in can reach into a nested field
//   and change an already-appended record. Records are DEEP-CLONED on the way in and DEEP-FROZEN on
//   the way out. 5P got this right by accident; here it is designed.
//
// `discovered_by` AND `corroborated_by` ARE DISTINCT ON PURPOSE (spec §5.1). A finding surfaced by
// human design review and later reproduced by the harness is CORROBORATED, not DISCOVERED, by the
// harness. Collapsing them would let 5Q claim its machinery found defects a person found by reading
// — the reporting analogue of R15, fabricated execution reality, committed against ourselves.

import { createHash } from "node:crypto";
import { SEVERITIES, DISCOVERED_BY, ATTACK_CLASSES } from "./constants.mjs";

export const LEDGER_DOMAIN = "simurgh.vsr.finding-ledger.v1";
export const RECORD_DOMAIN = "simurgh.vsr.finding-record.v1";

/** The §5.1 Q0 record. Every field required — an optional field in a frozen schema is a hope. */
export const Q0_FIELDS = Object.freeze([
  "finding_id",
  "affected_stage",
  "affected_function_id",
  "affected_tags",
  "attack_class",
  "premise_receipt",
  "expected_result",
  "observed_result",
  "exploit_fixture_digest",
  "severity",
  "claim_impact",
  "scope",
  "discovered_at_commit",
  "discovered_by",
  "corroborated_by",
]);

/** The §5.2 Q1 record — APPENDED, never merged into Q0. */
export const Q1_FIELDS = Object.freeze([
  "finding_id",
  "fixed_at_commit",
  "regression_fixture",
  "post_fix_result",
  "remaining_scope",
  "historical_tags_still_affected",
]);

export const SCOPES = Object.freeze(["head", "tags", "both"]);
export const RECORD_KINDS = Object.freeze(["q0", "q1"]);

/** Bounded so a quote is a citation, not a copy of the document it came from. */
const MAX_QUOTE = 300;

const FINDING_ID = /^5Q-F(\d{3,})$/;

const digest = (domain, value) =>
  createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(JSON.stringify(value), "utf8"))
    .digest("hex");

/** Deep clone then deep freeze. Both halves matter; either alone leaves a mutation path open. */
function frozenClone(value) {
  const clone = structuredClone(value);
  const seen = new Set();
  const freeze = (v) => {
    if (v === null || typeof v !== "object" || seen.has(v)) return v;
    seen.add(v);
    for (const key of Object.keys(v)) freeze(v[key]);
    return Object.freeze(v);
  };
  return freeze(clone);
}

/** Walks every reachable object. Exported so a test checks the whole graph, not the top level. */
export function isDeeplyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every((v) => isDeeplyFrozen(v, seen));
}

export function emptyLedger() {
  return frozenClone({ records: [], head_digest: null });
}

/**
 * The next finding id, READ FROM THE CHAIN.
 *
 * Never `records.length + 1`. Length is a property of an array; identity is a property of a ledger,
 * and the two diverge the moment anything is filtered, superseded or projected — after which two
 * different findings can be handed the same id, and the older one stops being citable.
 */
export function allocateFindingId(ledger) {
  let max = 0;
  for (const record of ledger.records) {
    const m = FINDING_ID.exec(record.finding_id ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `5Q-F${String(max + 1).padStart(3, "0")}`;
}

/** `claim_impact` must POINT somewhere (spec §5.4). "Weakens confidence" is not a claim impact. */
function validateClaimImpact(claim_impact, problems) {
  if (typeof claim_impact === "string" || claim_impact === null || claim_impact === undefined) {
    problems.push(
      "claim_impact must name the claim it touches: { file, claim_digest, quote }. Prose alone is " +
        "rejected, because a claim pointed at vaguely can move afterwards and nobody can tell."
    );
    return;
  }
  const { file, claim_digest, quote } = claim_impact;
  if (typeof file !== "string" || file.length === 0) problems.push("claim_impact.file is required");
  if (!/^[0-9a-f]{64}$/.test(claim_digest ?? "")) {
    problems.push("claim_impact.claim_digest must be 64 hex — it pins the claim's bytes");
  }
  if (typeof quote !== "string" || quote.trim().length === 0) {
    problems.push("claim_impact.quote is required — the reader must see the sentence at issue");
  } else if (quote.length > MAX_QUOTE) {
    problems.push(
      `claim_impact.quote exceeds ${MAX_QUOTE} chars; a quote is a citation, not a copy`
    );
  }
}

/** Validate a record before it can ever reach the chain. */
export function validateRecord(record, kind, ledger) {
  const problems = [];
  const fields = kind === "q1" ? Q1_FIELDS : Q0_FIELDS;

  for (const field of fields) {
    if (record?.[field] === undefined || record[field] === null) {
      problems.push(`missing required field: ${field}`);
    }
  }
  for (const key of Object.keys(record ?? {})) {
    if (!fields.includes(key)) problems.push(`field not permitted in a ${kind} record: ${key}`);
  }
  if (!FINDING_ID.test(record?.finding_id ?? "")) {
    problems.push("finding_id must match 5Q-F### — it is cited in findings forever");
  }

  if (kind === "q0") {
    if (!SEVERITIES.includes(record?.severity)) {
      problems.push(`severity must be one of the frozen four (spec §5.3), saw ${record?.severity}`);
    }
    if (!DISCOVERED_BY.includes(record?.discovered_by)) {
      problems.push(
        `discovered_by must be one of the frozen three (spec §5.1), saw ${record?.discovered_by}. ` +
          `A finding a person found by reading was not found by the harness.`
      );
    }
    if (!ATTACK_CLASSES.includes(record?.attack_class)) {
      problems.push(`attack_class must be a frozen class, saw ${record?.attack_class}`);
    }
    if (!SCOPES.includes(record?.scope)) {
      problems.push(`scope must be head | tags | both, saw ${record?.scope}`);
    }
    if (record?.corroborated_by !== undefined && !Array.isArray(record.corroborated_by)) {
      problems.push("corroborated_by is a list of packs that independently reproduced the finding");
    }
    validateClaimImpact(record?.claim_impact, problems);
  } else {
    // A Q1 record without a failing-before witness is an assertion that a bug existed (spec §5.2).
    if (record?.regression_fixture !== undefined && record.regression_fixture !== null) {
      const rf = record.regression_fixture;
      if (typeof rf !== "object" || !/^[0-9a-f]{64}$/.test(rf.fixture_digest ?? "")) {
        problems.push("regression_fixture must carry a 64-hex fixture_digest");
      }
      if (rf?.fails_before !== true || rf?.passes_after !== true) {
        problems.push(
          "regression_fixture must record fails_before AND passes_after. A fix with no " +
            "failing-before witness is an assertion that a bug existed."
        );
      }
    }
    const target = ledger.records.find(
      (r) => r.finding_id === record?.finding_id && r.record_kind === "q0"
    );
    if (!target) {
      problems.push(
        `Q1 record references ${record?.finding_id}, which is not a Q0 finding in this ledger`
      );
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Append a record. Returns a NEW ledger; the input is never touched.
 *
 * @param {object} ledger
 * @param {object} record
 * @param {{kind?: "q0"|"q1"}} options
 */
export function appendFinding(ledger, record, { kind = "q0" } = {}) {
  if (!RECORD_KINDS.includes(kind)) throw new Error(`unknown record kind ${kind}`);

  const existing = ledger.records.find(
    (r) => r.finding_id === record?.finding_id && r.record_kind === "q0"
  );
  if (kind === "q0" && existing) {
    // §5.3: escalation mints a NEW finding. The severity-specific message exists because that is
    // the mistake a well-meaning author actually makes.
    if (existing.severity !== record.severity) {
      throw new Error(
        `refusing to change the severity of ${record.finding_id} from ${existing.severity} to ` +
          `${record.severity}. Severity is never rewritten — escalation MINTS A NEW FINDING with ` +
          `its own finding_id, premise receipt and claim impact (spec §5.3). Rewriting in place ` +
          `would destroy the distinction between "the camera was pointed away" and "the photograph ` +
          `shows a crime", and would silently alter a frozen record, which L3 forbids.`
      );
    }
    throw new Error(
      `${record.finding_id} is already in the ledger. Ids are never reused, and an appended record ` +
        `is never edited (L3). Use allocateFindingId() for the next one.`
    );
  }

  const validation = validateRecord(record, kind, ledger);
  if (!validation.ok) {
    throw new Error(
      `refusing to append ${record?.finding_id ?? "<no id>"}:\n  - ${validation.problems.join("\n  - ")}`
    );
  }

  const prev_digest = ledger.head_digest;
  // The clone happens HERE, before the digest, so the chain commits to the bytes the ledger holds
  // and not to an object the caller can still reach.
  const body = frozenClone({ ...record, record_kind: kind });
  const record_digest = digest(RECORD_DOMAIN, { prev_digest, body });

  return frozenClone({
    records: [...ledger.records, { ...body, prev_digest, record_digest }],
    head_digest: record_digest,
  });
}

/**
 * Recompute the chain.
 *
 * Reports the INDEX of the first record that does not commit to what precedes it. "The chain is
 * broken" is not actionable; "record 3 is not what record 4 committed to" is.
 */
export function verifyChain(ledger) {
  let prev = null;
  for (let i = 0; i < ledger.records.length; i += 1) {
    const { prev_digest, record_digest, ...body } = ledger.records[i];
    if (prev_digest !== prev) {
      return {
        ok: false,
        brokenAt: i,
        reason: `record ${i} claims predecessor ${prev_digest}, but ${prev} precedes it`,
      };
    }
    const recomputed = digest(RECORD_DOMAIN, { prev_digest, body });
    if (recomputed !== record_digest) {
      return {
        ok: false,
        brokenAt: i,
        reason:
          `record ${i} hashes to ${recomputed}, not the ${record_digest} it carries — its ` +
          `contents changed after it was appended`,
      };
    }
    prev = record_digest;
  }
  if (ledger.head_digest !== prev) {
    return {
      ok: false,
      brokenAt: ledger.records.length,
      reason: "head_digest does not match the tail",
    };
  }
  return { ok: true, brokenAt: null };
}

/** The ledger's identity: the chain head plus its length, domain-separated. */
export function ledgerDigest(ledger) {
  return digest(LEDGER_DOMAIN, {
    head_digest: ledger.head_digest,
    record_count: ledger.records.length,
  });
}
