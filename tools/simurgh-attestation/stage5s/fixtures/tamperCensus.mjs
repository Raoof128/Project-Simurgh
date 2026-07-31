// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 21 — the tamper census, set-pinned. AnthropicSafe First, then ReviewerSafe.
//
// EVERY ARTIFACT × FIELD CLASS, PINNED AS A SET OF PAIRS. A tamper suite that just runs whatever
// cases exist cannot tell a deleted case from a case that was never written, so the census is the
// pin: `{artifact, field_class}` with a required first-failure code each, and a dropped case is a
// refusal rather than a smaller green run (§13, E8).
//
// EVERY MUTATION IS PROVEN TO HAVE MUTATED. This is 5S-F014, and it was found in this repository
// during this stage: `"00" + signature.slice(2)` is a NO-OP whenever the signature already begins
// `00`, which for a freshly signed Ed25519 value is 1 run in 256 — measured at 75 of 20,001. The
// "tampered" bundle is then a valid one, the verifier correctly returns 0, and the test fails for
// the one reason nobody suspects. Worse, when the value is a committed fixture the same accident is
// PERMANENT: a tamper test that never tampers, green forever.
//
// So no mutation here replaces a prefix with a constant. Each one is guaranteed to change its
// target, and the test asserts the value actually changed BEFORE asserting the code — because a
// tamper case that silently tampers with nothing is testing the verifier's willingness to accept
// good evidence, which is not what it claims to be testing.

import { checkpointEnvelopeDigest } from "../core/canonical.mjs";
import {
  RECEIVER_KEYS,
  WITNESS_KEYS,
  baseBundle,
  checkpoint,
  comparisonManifest,
  comparisonPolicy,
  view,
  viewReceipt,
  witnessPolicy,
  witnessStatement,
} from "./bundle.mjs";

/**
 * Flip the first character to something it is not. Guaranteed to change the value — the whole point
 * of 5S-F014 — and it keeps the string's shape, so the tamper exercises the check it targets rather
 * than tripping a length or format guard on the way.
 */
export function flipFirst(value) {
  const s = String(value ?? "");
  if (s.length === 0) return "x";
  // Hex-safe: the replacement is always a different character in the same alphabet.
  const first = s[0] === "a" ? "b" : "a";
  return first + s.slice(1);
}

/** The five field classes of the plan, named so a census row says what KIND of lie it tells. */
export const FIELD_CLASSES = Object.freeze([
  "digest_swap",
  "signature_swap",
  "roster_swap",
  "coordinate_swap",
  "projection_in_checkpoint_slot",
]);

/**
 * The census. Each row: which artifact, which class of field, the mutation, and the first-failure
 * code it must produce. `reads` names the field the mutation touches so the test can prove the value
 * changed without knowing anything about the mutation itself.
 */
export const TAMPER_CENSUS = Object.freeze([
  // ---- checkpoint ----------------------------------------------------------------------------
  {
    artifact: "checkpoint",
    field_class: "signature_swap",
    raw_code: 479,
    reads: (b) => b.views[0].checkpoint.producer_signature,
    tamper: (b) => {
      // The statements are REBUILT over the tampered checkpoint. Flipping a signature moves the
      // envelope digest, so leaving the old statements in place would trip 477 first — a correct
      // refusal for the wrong reason, and a census row that silently tests its neighbour.
      const cp = {
        ...b.views[0].checkpoint,
        producer_signature: flipFirst(b.views[0].checkpoint.producer_signature),
      };
      b.views[0] = view(cp, ["w-a", "w-b"], ["r-a"]);
      b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
      return b;
    },
  },
  {
    artifact: "checkpoint",
    field_class: "coordinate_swap",
    raw_code: 508,
    reads: (b) => b.views[1].checkpoint.scope_id,
    tamper: (b) => {
      // A different scope is a different object of comparison, never a fork at one coordinate.
      const cp = checkpoint({ history_root: "root-b", scope_id: "scope-elsewhere" });
      b.views[1] = view(cp, ["w-a", "w-b"], ["r-b"]);
      b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
      return b;
    },
  },
  {
    artifact: "checkpoint",
    field_class: "digest_swap",
    raw_code: 480,
    reads: (b) => b.views[0].checkpoint.c1_commitment,
    tamper: (b) => {
      const cp = checkpoint({
        history_root: "root-a",
        c1_commitment: flipFirst(b.views[0].checkpoint.c1_commitment),
      });
      b.views[0] = view(cp, ["w-a", "w-b"], ["r-a"]);
      b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
      return b;
    },
  },
  {
    artifact: "checkpoint",
    field_class: "projection_in_checkpoint_slot",
    raw_code: 475,
    reads: (b) => b.views[0].checkpoint.producer_signature,
    tamper: (b) => {
      // A LEDGER PROJECTION where a checkpoint belongs. It carries digests and looks evidential, and
      // it is not a checkpoint: no producer signature, so nothing attributes it to anybody.
      b.views[0] = {
        ...b.views[0],
        checkpoint: {
          schema: "simurgh.vwq.ledger-projection.v1",
          scope_id: "scope-1",
          epoch: 7,
          checkpoint_body_digest: "sha256:looks-evidential",
        },
      };
      return b;
    },
  },

  // ---- witness_policy ------------------------------------------------------------------------
  {
    artifact: "witness_policy",
    field_class: "roster_swap",
    raw_code: 489,
    reads: (b) => b.witness_policy.witness_roster[0].witness_identity,
    tamper: (b) => {
      // The roster is replaced with a different cast. The statements name witnesses that no longer
      // hold seats — a roster swap, not a key swap.
      b.witness_policy = witnessPolicy({
        witness_roster: [
          { witness_identity: "x-a", key_digest: "sha256:xk-a", witness_operator_class: "unresolved" },
          { witness_identity: "x-b", key_digest: "sha256:xk-b", witness_operator_class: "unresolved" },
        ],
      });
      return b;
    },
  },
  {
    artifact: "witness_policy",
    field_class: "digest_swap",
    raw_code: 486,
    reads: (b) => b.witness_policy.policy_digest,
    tamper: (b) => {
      b.witness_policy = witnessPolicy({
        policy_digest: flipFirst(b.witness_policy.policy_digest),
      });
      return b;
    },
  },
  {
    artifact: "witness_policy",
    field_class: "signature_swap",
    raw_code: 487,
    reads: (b) => b.witness_policy.producer_key_digest,
    tamper: (b) => {
      // The policy commits a producer key that is not the one the run presents. The signature the
      // checkpoint carries is untouched and valid — this is a swap of WHOSE key is authorised.
      b.witness_policy = witnessPolicy({
        producer_key_digest: flipFirst(b.witness_policy.producer_key_digest),
      });
      return b;
    },
  },

  // ---- witness_statement ---------------------------------------------------------------------
  {
    artifact: "witness_statement",
    field_class: "digest_swap",
    raw_code: 477,
    reads: (b) => b.views[0].witness_statements[0].checkpoint_envelope_digest,
    tamper: (b) => {
      b.views[0].witness_statements[0].checkpoint_envelope_digest = flipFirst(
        b.views[0].witness_statements[0].checkpoint_envelope_digest
      );
      return b;
    },
  },
  {
    artifact: "witness_statement",
    field_class: "signature_swap",
    raw_code: 490,
    reads: (b) => String(b.views[0].witness_statements[0].signature_verified),
    tamper: (b) => {
      b.views[0].witness_statements[0].signature_verified = false;
      return b;
    },
  },
  {
    artifact: "witness_statement",
    field_class: "roster_swap",
    raw_code: 492,
    reads: (b) => b.views[0].witness_statements[0].key_digest,
    tamper: (b) => {
      // One roster identity wearing another roster identity's key — the 5S-F010 alias, and the only
      // route to 492 as a first failure.
      b.views[0].witness_statements = [
        witnessStatement("w-a", b.views[0].checkpoint, { key_digest: WITNESS_KEYS["w-b"] }),
        witnessStatement("w-c", b.views[0].checkpoint),
      ];
      return b;
    },
  },
  {
    artifact: "witness_statement",
    field_class: "coordinate_swap",
    raw_code: 494,
    reads: (b) => String(b.views[0].witness_statements[0].epoch),
    tamper: (b) => {
      b.views[0].witness_statements[0].epoch = 6;
      return b;
    },
  },

  // ---- comparison_policy ---------------------------------------------------------------------
  {
    artifact: "comparison_policy",
    field_class: "roster_swap",
    raw_code: 501,
    reads: (b) => b.comparison_policy.comparison_roster[0].receiver_identity,
    tamper: (b) => {
      b.comparison_policy = comparisonPolicy({
        comparison_roster: [
          { receiver_identity: "x-a", key_digest: "sha256:xrk-a" },
          { receiver_identity: "x-b", key_digest: "sha256:xrk-b" },
        ],
      });
      return b;
    },
  },
  {
    artifact: "comparison_policy",
    field_class: "digest_swap",
    raw_code: 499,
    reads: (b) => b.views[0].carried_by[0].comparison_policy_digest,
    tamper: (b) => {
      b.views[0].carried_by[0].comparison_policy_digest = flipFirst(
        b.views[0].carried_by[0].comparison_policy_digest
      );
      return b;
    },
  },

  // ---- view_receipt --------------------------------------------------------------------------
  {
    artifact: "view_receipt",
    field_class: "signature_swap",
    raw_code: 502,
    reads: (b) => String(b.views[0].carried_by[0].signature_verified),
    tamper: (b) => {
      b.views[0].carried_by[0].signature_verified = false;
      return b;
    },
  },
  {
    artifact: "view_receipt",
    field_class: "roster_swap",
    raw_code: 503,
    reads: (b) => b.views[0].carried_by[0].receiver_key_digest,
    tamper: (b) => {
      b.comparison_policy = comparisonPolicy({
        comparison_roster: [
          { receiver_identity: "r-a", key_digest: "sha256:shared" },
          { receiver_identity: "r-b", key_digest: "sha256:shared" },
        ],
      });
      b.views[0].carried_by = [
        viewReceipt("r-a", b.views[0].checkpoint, { receiver_key_digest: "sha256:shared" }),
      ];
      b.views[1].carried_by = [
        viewReceipt("r-b", b.views[1].checkpoint, { receiver_key_digest: "sha256:shared" }),
      ];
      return b;
    },
  },
  {
    artifact: "view_receipt",
    field_class: "digest_swap",
    raw_code: 477,
    reads: (b) => b.views[0].carried_by[0].checkpoint_envelope_digest,
    tamper: (b) => {
      // A receipt claiming an envelope that is not this checkpoint's. The first draft expected 507
      // and paired this with a withdrawn manifest; 477 fires first and it fires CORRECTLY — a
      // receipt bound to the wrong envelope is a binding mismatch, whatever else is missing. The
      // census records the code the system actually owns rather than the one the author expected,
      // and 507 keeps its own row under comparison_manifest.
      b.views[0].carried_by[0].checkpoint_envelope_digest = flipFirst(
        checkpointEnvelopeDigest(b.views[0].checkpoint)
      );
      return b;
    },
  },
  {
    artifact: "view_receipt",
    field_class: "coordinate_swap",
    raw_code: 504,
    reads: (b) => String(b.views[0].carried_by.length),
    tamper: (b) => {
      const cp = b.views[0].checkpoint;
      b.views[0].carried_by = [viewReceipt("r-a", cp), viewReceipt("r-a", cp)];
      return b;
    },
  },

  // ---- receiver_unavailable_status -----------------------------------------------------------
  {
    artifact: "receiver_unavailable_status",
    field_class: "signature_swap",
    raw_code: 506,
    reads: (b) => String(b.receiver_statuses.length),
    tamper: (b) => {
      b.views[1].carried_by = [];
      b.receiver_statuses = [
        {
          receiver_identity: "r-b",
          receiver_key_digest: RECEIVER_KEYS["r-b"],
          expected_coordinate: { scope_id: "scope-1", epoch: 7 },
          receiver_sequence: 1,
          reason_code: "no_view_received",
          comparison_policy_digest: b.comparison_policy.comparison_policy_digest,
          signature_profile: "ed25519",
          signature: "s",
          signature_verified: false,
        },
      ];
      return b;
    },
  },

  // ---- comparison_manifest -------------------------------------------------------------------
  {
    artifact: "comparison_manifest",
    field_class: "digest_swap",
    raw_code: 507,
    reads: (b) => String(b.comparison_manifest?.comparison_policy_digest),
    tamper: (b) => {
      b.comparison_manifest = undefined;
      return b;
    },
  },
]);

/** The census pin: the exact set of `{artifact, field_class}` pairs, code-unit sorted. */
export const CENSUS_PAIRS = Object.freeze(
  TAMPER_CENSUS.map((r) => `${r.artifact}/${r.field_class}`).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  )
);

/** A fresh honest bundle for a tamper case to damage. */
export const honestBundle = () => baseBundle();
