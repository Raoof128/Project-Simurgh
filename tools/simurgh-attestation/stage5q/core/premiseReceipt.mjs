// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the premise gate (spec §4.4), inherited from 5P and not relaxed for volume.
//
// WHAT 5P PAID FOR. A negative fixture claimed "contradictory assertions" while its two vectors
// merely DIFFERED — which made contradiction geometrically impossible. The fixture tested an easier
// rule than it claimed, and it passed, and the pass meant nothing.
//
// So: every negative attack fixture must first prove it generated a genuine negative case. A pack
// that cannot produce its premise receipt is vacuous and its passes are INADMISSIBLE.
//
// THE RECEIPT BINDS BYTES, NOT CLAIMS (gauntlet P1-20). An earlier design had `generatedCase` and
// `assertion` with no schema, and the receipt bound nothing — a producer-supplied `assertion: true`
// would have satisfied the gate completely. Here:
//
//   * the receipt names a predicate from a CLOSED registry, plus its arguments and a fixture digest;
//   * `verifyPremise` re-reads the fixture bytes, re-checks the digest, and RECOMPUTES the predicate;
//   * `ok` requires `recomputed === true`. A declaration that disagrees with the recomputation is a
//     defect in itself, and a declaration that agrees adds nothing — the recomputation is the answer.
//
// THE REGISTRY IS CLOSED. Adding a predicate is an annex, never an inline addition: an open registry
// is not a registry, it is a suggestion. It carries fifteen entries because six could not express
// the premises the sixteen trays and three campaigns actually require (second gauntlet B8), and a
// pack with no way to state its premise has no way to prove it either.

import { createHash } from "node:crypto";
import { PREDICATE_REGISTRY } from "./constants.mjs";

export const PREMISE_DOMAIN = "simurgh.vsr.premise-receipt.v1";

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** A predicate that cannot be evaluated has NOT been satisfied. Missing shape throws. */
function need(fixture, ...fields) {
  for (const f of fields) {
    if (fixture?.[f] === undefined) {
      throw new Error(
        `fixture is missing '${f}', so the premise cannot be evaluated. An unevaluable premise is ` +
          `not a satisfied premise.`
      );
    }
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Do two assertions about the SAME subject assign different values to a SHARED key?
 *
 * This is the 5P defect made mechanical. Two vectors that merely differ — different subjects, or
 * differing in keys they do not share — cannot contradict each other, and calling that a
 * contradiction is exactly the fixture testing an easier rule than it claims.
 */
function contradictoryPair(a, b) {
  if (!same(a?.subject, b?.subject)) {
    return {
      holds: false,
      reason: "the two vectors describe different subjects, so they cannot contradict",
    };
  }
  const aKeys = Object.keys(a).filter((k) => k !== "subject");
  const shared = aKeys.filter((k) => Object.hasOwn(b, k));
  if (shared.length === 0) {
    return {
      holds: false,
      reason:
        "the two vectors share no assigned key, so they merely DIFFER — this is the 5P defect",
    };
  }
  const conflicting = shared.filter((k) => !same(a[k], b[k]));
  if (conflicting.length === 0) {
    return { holds: false, reason: "every shared key agrees; there is nothing contradictory here" };
  }
  return {
    holds: true,
    reason: `same subject, conflicting assignment of ${conflicting.join(", ")}`,
  };
}

/**
 * The closed predicate registry. Each entry is a PURE function of (fixture, args).
 *
 * Every one returns `{ holds, reason }`. The reason is not decoration: a premise that holds for a
 * reason the reviewer disagrees with is a premise worth arguing about, and a bare `true` cannot be
 * argued with.
 */
export const PREDICATES = Object.freeze({
  contradicts(fixture) {
    need(fixture, "vectors");
    const [a, b] = fixture.vectors;
    if (!a || !b) throw new Error("contradicts requires exactly two vectors");
    return contradictoryPair(a, b);
  },

  violatesGrammar(fixture) {
    need(fixture, "schema", "object");
    const { required = [], allowed = null, types = {} } = fixture.schema;
    const keys = Object.keys(fixture.object);
    const missing = required.filter((r) => !keys.includes(r));
    const extra = allowed ? keys.filter((k) => !allowed.includes(k)) : [];
    const wrongType = Object.entries(types).filter(
      ([k, t]) => Object.hasOwn(fixture.object, k) && typeof fixture.object[k] !== t
    );
    const holds = missing.length > 0 || extra.length > 0 || wrongType.length > 0;
    return {
      holds,
      reason: holds
        ? `missing=[${missing}] extra=[${extra}] wrongType=[${wrongType.map(([k]) => k)}]`
        : "the object satisfies the grammar, so nothing was violated",
    };
  },

  exceedsCeiling(fixture) {
    need(fixture, "ceiling", "observed");
    const holds = fixture.observed > fixture.ceiling;
    return {
      holds,
      reason: holds
        ? `observed ${fixture.observed} exceeds ceiling ${fixture.ceiling}`
        : `observed ${fixture.observed} is within ceiling ${fixture.ceiling}`,
    };
  },

  replaysAcross(fixture) {
    need(fixture, "artifact_digest", "accepted_in");
    const scopes = [...new Set(fixture.accepted_in)];
    const holds = scopes.length >= 2;
    return {
      holds,
      reason: holds
        ? `one artifact accepted in ${scopes.length} distinct scopes: ${scopes.join(", ")}`
        : "accepted in at most one scope, which is not a replay",
    };
  },

  omitsMember(fixture) {
    need(fixture, "universe", "produced");
    const produced = new Set(fixture.produced);
    const missing = fixture.universe.filter((m) => !produced.has(m));
    return {
      holds: missing.length > 0,
      reason: missing.length
        ? `${missing.length} committed member(s) absent from the produced set: ${missing.slice(0, 3).join(", ")}`
        : "the produced set covers the universe",
    };
  },

  divergesAcrossRuntimes(fixture) {
    need(fixture, "results");
    const values = Object.values(fixture.results).map((v) => JSON.stringify(v));
    const distinct = [...new Set(values)];
    if (values.length < 2) {
      throw new Error("divergesAcrossRuntimes needs at least two runtimes to compare");
    }
    return {
      holds: distinct.length > 1,
      reason:
        distinct.length > 1
          ? `${Object.keys(fixture.results).length} runtimes produced ${distinct.length} distinct results`
          : "every runtime agreed, so there is no divergence",
    };
  },

  signatureValidWrongObject(fixture) {
    need(fixture, "signature_valid", "signed_object_digest", "presented_object_digest");
    const holds =
      fixture.signature_valid === true &&
      fixture.signed_object_digest !== fixture.presented_object_digest;
    return {
      holds,
      reason: holds
        ? "an authentic signature covers a different object than the one presented"
        : "either the signature is invalid or it covers exactly the presented object",
    };
  },

  trustRootSubstituted(fixture) {
    need(fixture, "declared_root", "verifying_root", "verified");
    const holds = fixture.verified === true && fixture.declared_root !== fixture.verifying_root;
    return {
      holds,
      reason: holds
        ? "verification succeeded under a root other than the declared one"
        : "verification used the declared root, or did not succeed",
    };
  },

  firstFailureInverted(fixture) {
    need(fixture, "check_order", "reported_first");
    const firstFailing = fixture.check_order.find((c) => c.failed);
    if (!firstFailing) {
      return {
        holds: false,
        reason: "no check failed, so no failure could be reported out of order",
      };
    }
    const holds = firstFailing.check_id !== fixture.reported_first;
    return {
      holds,
      reason: holds
        ? `${firstFailing.check_id} failed first but ${fixture.reported_first} was reported`
        : "the earliest failing check is the one reported",
    };
  },

  executionFabricated(fixture) {
    need(fixture, "claimed_steps", "execution_records");
    const recorded = new Set(fixture.execution_records);
    const unbacked = fixture.claimed_steps.filter((s) => !recorded.has(s));
    return {
      holds: unbacked.length > 0,
      reason: unbacked.length
        ? `${unbacked.length} claimed step(s) have no execution record: ${unbacked.slice(0, 3).join(", ")}`
        : "every claimed step has a backing execution record",
    };
  },

  quorumNotDistinct(fixture) {
    need(fixture, "participants");
    const ids = fixture.participants.map((p) => (typeof p === "string" ? p : p.identity));
    const holds = new Set(ids).size < ids.length;
    return {
      holds,
      reason: holds
        ? `${ids.length} participants resolve to ${new Set(ids).size} distinct identities`
        : "every participant is distinct",
    };
  },

  appendOrderViolated(fixture) {
    need(fixture, "chain", "accepted");
    const last = fixture.chain.length ? fixture.chain[fixture.chain.length - 1].seq : -Infinity;
    const holds = fixture.accepted.seq <= last;
    return {
      holds,
      reason: holds
        ? `an event at seq ${fixture.accepted.seq} was accepted after seq ${last}`
        : `seq ${fixture.accepted.seq} follows ${last} in order`,
    };
  },

  authorityFromUntrusted(fixture) {
    need(fixture, "authority_source", "trusted_sources");
    const holds = !fixture.trusted_sources.includes(fixture.authority_source);
    return {
      holds,
      reason: holds
        ? `authority derived from '${fixture.authority_source}', which is not a trusted source`
        : "authority came from a trusted source",
    };
  },

  temporalWindowMismatch(fixture) {
    need(fixture, "window", "receipt_at");
    const { not_before, not_after } = fixture.window;
    const holds = fixture.receipt_at < not_before || fixture.receipt_at > not_after;
    return {
      holds,
      reason: holds
        ? `${fixture.receipt_at} falls outside [${not_before}, ${not_after}]`
        : `${fixture.receipt_at} is inside its committed window`,
    };
  },

  mutuallyExclusive(fixture) {
    need(fixture, "artifacts");
    const verifying = fixture.artifacts.filter((a) => a.verifies === true);
    if (verifying.length < 2) {
      return {
        holds: false,
        reason: "fewer than two artifacts verify, so they cannot both be true",
      };
    }
    // Reuses the contradiction test: two artifacts that both verify are only mutually exclusive if
    // their claims actually conflict, not merely differ.
    for (let i = 0; i < verifying.length; i += 1) {
      for (let j = i + 1; j < verifying.length; j += 1) {
        const r = contradictoryPair(verifying[i].claim, verifying[j].claim);
        if (r.holds) return { holds: true, reason: `artifacts ${i} and ${j}: ${r.reason}` };
      }
    }
    return { holds: false, reason: "every verifying artifact's claim can co-hold with the others" };
  },
});

/** The registry and the implementations must agree, or a named predicate has no code behind it. */
export function registryIsTotal() {
  const implemented = Object.keys(PREDICATES).sort();
  const named = [...PREDICATE_REGISTRY].sort();
  return {
    ok: JSON.stringify(implemented) === JSON.stringify(named),
    implemented,
    named,
    missing: named.filter((n) => !implemented.includes(n)),
    extra: implemented.filter((n) => !named.includes(n)),
  };
}

/**
 * Build a premise receipt.
 *
 * Note what is NOT here: any field in which the producer asserts the premise holds. The receipt
 * states what was checked and over which bytes; whether it holds is recomputed.
 */
export function makePremiseReceipt({
  pack_id,
  closure_digest,
  target_function_id,
  fixture_digest,
  predicate_id,
  predicate_args = {},
}) {
  if (!PREDICATE_REGISTRY.includes(predicate_id)) {
    throw new Error(
      `unknown predicate ${JSON.stringify(predicate_id)} — the registry is CLOSED (spec §4.4). ` +
        `Adding one is an annex, never an inline addition: an open registry is not a registry.`
    );
  }
  for (const [k, v] of Object.entries({
    pack_id,
    closure_digest,
    target_function_id,
    fixture_digest,
  })) {
    if (typeof v !== "string" || v.length === 0) {
      throw new Error(`premise receipt requires ${k}`);
    }
  }
  if (!/^[0-9a-f]{64}$/.test(fixture_digest)) {
    throw new Error("fixture_digest must be 64 lowercase hex — the receipt binds BYTES");
  }
  const body = {
    pack_id,
    closure_digest,
    target_function_id,
    fixture_digest,
    predicate_id,
    predicate_args,
  };
  return Object.freeze({
    ...body,
    receipt_digest: createHash("sha256")
      .update(Buffer.from(PREMISE_DOMAIN, "utf8"))
      .update(Buffer.from([0x00]))
      .update(Buffer.from(JSON.stringify(body), "utf8"))
      .digest("hex"),
  });
}

/**
 * Verify a premise by RECOMPUTING it from the frozen fixture bytes.
 *
 * @param {object} receipt
 * @param {{ readFixture: (digest: string) => Buffer }} io
 */
export function verifyPremise(receipt, { readFixture }) {
  const problems = [];
  let recomputed = false;
  let reason = null;

  if (!PREDICATE_REGISTRY.includes(receipt?.predicate_id)) {
    return {
      ok: false,
      recomputed: false,
      declared: true,
      reason: "predicate is not in the closed registry",
      problems: [{ kind: "unknown_predicate", predicate_id: receipt?.predicate_id }],
    };
  }

  let bytes;
  try {
    bytes = readFixture(receipt.fixture_digest);
  } catch (error) {
    return {
      ok: false,
      recomputed: false,
      declared: true,
      reason: `fixture unreadable: ${error.message}`,
      problems: [{ kind: "fixture_unreadable" }],
    };
  }

  // THE DIGEST BINDS THE BYTES. Without this the receipt names a fixture and the verifier reads
  // whatever it was handed, which is the difference between evidence and a label.
  const actual = sha256Hex(bytes);
  if (actual !== receipt.fixture_digest) {
    return {
      ok: false,
      recomputed: false,
      declared: true,
      reason: `fixture digest mismatch: receipt says ${receipt.fixture_digest}, bytes hash to ${actual}`,
      problems: [{ kind: "fixture_digest_mismatch", expected: receipt.fixture_digest, actual }],
    };
  }

  try {
    const fixture = JSON.parse(bytes.toString("utf8"));
    const result = PREDICATES[receipt.predicate_id](fixture, receipt.predicate_args ?? {});
    recomputed = result.holds === true;
    reason = result.reason;
  } catch (error) {
    return {
      ok: false,
      recomputed: false,
      declared: true,
      reason: `predicate could not be evaluated: ${error.message}`,
      problems: [{ kind: "predicate_unevaluable", detail: error.message }],
    };
  }

  if (!recomputed) {
    problems.push({
      kind: "premise_does_not_hold",
      reason:
        "the predicate recomputed FALSE over the frozen fixture bytes. The pack is vacuous and its " +
        "passes are inadmissible (spec §4.4) — it tested an easier rule than it claimed.",
    });
  }

  // `declared` is reported for symmetry with the interface, but `ok` never depends on it: a
  // producer-supplied assertion is exactly what this gate exists to stop counting.
  return { ok: recomputed, recomputed, declared: true, reason, problems };
}
