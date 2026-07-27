// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 24: the campaign attestation, its roots, and its envelope.
//
// TWO TIERS, BECAUSE TWO DIFFERENT PEOPLE DO TWO DIFFERENT THINGS. The producer builds the roots and
// signs once with a key that is not in this repository and never will be. The reviewer — and CI —
// rebuilds the roots, compares them to the signed envelope, and verifies with the PUBLIC key
// committed inside it. Someone who can do the second and not the first is exactly the reader this
// artefact is built for, and a verifier that required a producer's private key would not be a
// verifier.
//
// ROOTS ARE RECOMPUTED FROM THE EVIDENCE, NEVER COPIED FROM THE BUNDLE. A driver that read its roots
// out of the file it is verifying would verify that the file equals itself.
//
// THE ATTESTED BOUNDARY IS STATED, NOT IMPLIED. These roots cover CAMPAIGN evidence, all of which is
// complete: the inherited commitment, the universe, the 55-row result census, the control receipts,
// the delta ledger, the prior-family audit and the finding ledger. They deliberately do NOT cover the
// parity mirrors, the K7 output, the deferred red states or the closeout — none of which exist when
// this is signed. Those are release-gate evidence with their own signed root at Task 27. Without the
// split, signing here would leave substantial release evidence free to change afterwards underneath a
// signature that appears to cover it.

import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";

export const ROOT_DOMAIN = "simurgh.vpf.attestation-root.v1";
export const PUBLIC_SCHEMA = "simurgh.vpf.attestation-public.v1";
export const ENVELOPE_SCHEMA = "simurgh.vpf.attestation-envelope.v1";
export const SIGNER_ID = "stage5r-vpf-genesis";

/** §10.1's roots, in §10.1's order. The order is part of the contract. */
export const ROOT_NAMES = Object.freeze([
  "inherited_commitment_digest",
  "family_universe_root",
  "family_result_root",
  "control_receipt_root",
  "delta_ledger_digest",
  "prior_family_audit_digest",
  "vpf_finding_ledger_digest",
]);

/**
 * §10.1's three terminal states for a pair, and the campaign states that map onto them.
 *
 * The mapping is written down rather than assumed because the campaign runner and the spec chose
 * different words for the same fact, and a silent rename inside a signed root is how two artefacts
 * come to disagree about what was measured.
 */
export const RESULT_STATE_MAP = Object.freeze({
  admissible: "attempted_admissible",
  attempted_inadmissible: "attempted_inadmissible",
  not_attempted_in_this_tranche: "not_attempted",
});

export const sha256Hex = (input) =>
  createHash("sha256")
    .update(Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8"))
    .digest("hex");

/** A domain-separated root over any canonicalisable value. */
export function root(value) {
  return createHash("sha256")
    .update(Buffer.from(ROOT_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(canonicalJson(value), "utf8"))
    .digest("hex");
}

/**
 * The 55-row family result root, TOTAL by construction.
 *
 * Each pair carries exactly one of §10.1's three states, so an omitted pair is impossible rather
 * than merely discouraged: a missing row changes the row count, and the row count is committed.
 *
 * @param {Array<object>} pairs
 * @returns {{root: string, rows: Array<object>}}
 */
export function familyResultRoot(pairs) {
  if (pairs.length !== 55) {
    throw new Error(`family_result_root: ${pairs.length} rows; the universe has 55`);
  }
  const rows = pairs
    .map((p) => {
      const state = RESULT_STATE_MAP[p.terminal_state];
      if (!state) {
        throw new Error(
          `family_result_root: "${p.terminal_state}" is not one of §10.1's three terminal states`
        );
      }
      return {
        attack_class: p.attack_class,
        target_security_role: p.target_security_role,
        terminal_state: state,
        probe_family_id: p.probe_family_id,
      };
    })
    .sort((a, b) =>
      `${a.attack_class}|${a.target_security_role}` < `${b.attack_class}|${b.target_security_role}`
        ? -1
        : 1
    );
  return { root: root({ row_count: rows.length, rows }), rows };
}

/**
 * The control receipt root: three receipts per attempted family, restoration proofs included.
 *
 * @param {Array<object>} families campaign family results
 * @returns {string}
 */
export function controlReceiptRoot(families) {
  const receipts = families.flatMap((f) =>
    f.lane_b_receipts.map((r) => ({
      probe_family_id: f.probe_family_id,
      kind: r.kind,
      control_id: r.control_id,
      control_digest: r.control_digest,
      detector_digest: r.detector_digest,
      declared_signal: r.declared_signal,
      verdict: r.verdict,
      signal_evidence_digest: r.signal_evidence_digest,
      receipt_digest: r.receipt_digest,
    }))
  );
  const perFamily = new Map();
  for (const r of receipts)
    perFamily.set(r.probe_family_id, (perFamily.get(r.probe_family_id) ?? 0) + 1);
  for (const [id, n] of perFamily) {
    if (n !== 3)
      throw new Error(
        `control_receipt_root: ${id} has ${n} receipts; there is no optional control`
      );
  }
  return root({ receipt_count: receipts.length, receipts });
}

/**
 * Build the public bundle from already-computed roots.
 *
 * @param {{roots: Record<string,string>, counts: object}} input
 * @returns {object}
 */
export function buildPublicBundle({ roots, counts }) {
  const missing = ROOT_NAMES.filter((n) => typeof roots[n] !== "string");
  if (missing.length) throw new Error(`attestation: missing root(s) ${missing.join(", ")}`);
  const unknown = Object.keys(roots).filter((n) => !ROOT_NAMES.includes(n));
  if (unknown.length) throw new Error(`attestation: unknown root(s) ${unknown.join(", ")}`);

  return {
    schema: PUBLIC_SCHEMA,
    note:
      "Campaign evidence, and only campaign evidence. The parity mirrors, the K7 output, the two " +
      "deferred red states and the closeout are NOT covered here — they do not exist yet, and a " +
      "signature that appeared to cover them would be covering nothing. They have their own signed " +
      "release_surface_root, which chains back to this bundle's public digest.",
    attested_boundary: {
      covers: [
        "inherited commitment (the seven 5Q digests)",
        "family universe (55 pairs)",
        "family result census (total over 55)",
        "control receipts (three per attempted family)",
        "delta ledger",
        "prior-family audit",
        "5R finding ledger",
      ],
      does_not_cover: [
        "parity mirrors (Task 25)",
        "K7 all-functions output (Task 26)",
        "the deferred G8/G9 red states (Task 26)",
        "the closeout (Task 27)",
      ],
    },
    root_order_is_part_of_the_contract: ROOT_NAMES,
    roots: Object.fromEntries(ROOT_NAMES.map((n) => [n, roots[n]])),
    counts,
  };
}

/** The digest a reviewer quotes: over the public bundle's canonical bytes. */
export function publicDigest(bundle) {
  return sha256Hex(canonicalJson(bundle));
}

/**
 * Exactly what gets signed. Never the file, never a subset.
 *
 * The separator is a NUL, written as an ESCAPE rather than as a byte. A raw control character got
 * into this line once and was invisible in every diff and every editor — inside a signing input, of
 * all places. An escape says what it is, and domain separation is what the 0x00 is for everywhere
 * else in this stage.
 */
export function signingInput(bundle) {
  return Buffer.from(`${ENVELOPE_SCHEMA}\u0000${publicDigest(bundle)}`, "utf8");
}

/**
 * Verify an envelope: ROOTS FIRST, signature last.
 *
 * The order is the point. A mutated root must be refused before any signature is examined, because a
 * verifier that checks the signature first will happily report "signature valid" about a bundle whose
 * contents no longer describe the evidence.
 *
 * @param {{envelope: object, rebuiltRoots: Record<string,string>, verifySignature: Function}} input
 * @returns {{ok: boolean, stage: string, reason?: string}}
 */
export function verifyAttestation({ envelope, rebuiltRoots, verifySignature }) {
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, stage: "shape", reason: "envelope is not an object" };
  }
  if (envelope.schema !== ENVELOPE_SCHEMA) {
    return {
      ok: false,
      stage: "shape",
      reason: `schema ${envelope.schema} is not ${ENVELOPE_SCHEMA}`,
    };
  }
  const bundle = envelope.public_bundle;
  if (!bundle || bundle.schema !== PUBLIC_SCHEMA) {
    return { ok: false, stage: "shape", reason: "no public bundle of the expected schema" };
  }

  for (const name of ROOT_NAMES) {
    if (bundle.roots[name] !== rebuiltRoots[name]) {
      return {
        ok: false,
        stage: "roots",
        reason: `${name}: envelope ${bundle.roots[name]} != rebuilt ${rebuiltRoots[name]}`,
      };
    }
  }
  if (envelope.public_digest !== publicDigest(bundle)) {
    return { ok: false, stage: "digest", reason: "public_digest does not match the bundle" };
  }
  if (envelope.signer?.profile_id !== SIGNER_ID) {
    return {
      ok: false,
      stage: "signer",
      reason: `signer ${envelope.signer?.profile_id} is not ${SIGNER_ID}`,
    };
  }

  const sig = verifySignature({ input: signingInput(bundle), envelope });
  return sig.ok
    ? { ok: true, stage: "signature" }
    : { ok: false, stage: "signature", reason: sig.reason };
}
