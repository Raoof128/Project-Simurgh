// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Tasks 17-18 — the Lane A corpus, and the acceptance columns AUTHORED beside it.
//
// RULING 4 LIVES HERE. Every `expect` block below was written by a person reading §5.5 and §2.7, not
// produced by running the verifier. That is uncomfortable — a wrong authored answer is a red test
// rather than a silent agreement — and it is the entire value: a matrix computed from the thing it
// grades cannot fail, and a matrix that cannot fail is decoration.
//
// EVERY CASE NAMES THE ADVERSARY WIN IT DENIES. §5.3 gives the failure vocabulary and §5.5 attaches
// one to each family. A case that denies nothing is a case nobody can explain the purpose of, and the
// builder refuses to emit one.
//
// NO SINGLE EXPECTED-RESULT COLUMN. §5.4 is explicit: each independent dimension is pinned
// independently, because a collapsed column lets a case pass for the wrong reason — the quorum
// cross-product is the obvious example, where four cases share one `comparison_status` and differ in
// everything else.

import { checkpointBodyDigest } from "../core/canonical.mjs";
import {
  COMPARISON_POLICY_DIGEST,
  RECEIVER_KEYS,
  WITNESS_KEYS,
  baseBundle,
  checkpoint,
  cleanBundle,
  comparisonManifest,
  view,
  comparisonPolicy,
  viewReceipt,
  witnessPolicy,
  witnessStatement,
} from "./bundle.mjs";

/** The §5.3 failure vocabulary. A case must deny one of these by name. */
export const ADVERSARY_WINS = Object.freeze([
  "false_clean",
  "false_equivocation",
  "attribution_laundering",
  "counterfeit_quorum",
  "intake_laundering",
  "claim_laundering",
]);

/** The eleven acceptance columns of §5.4, in order. */
export const ACCEPTANCE_COLUMNS = Object.freeze([
  "case_id",
  "verifier_exit",
  "quorum_status_a",
  "quorum_status_b",
  "comparison_status",
  "equivocation_artifact_status",
  "finding_codes",
  "intake_complete",
  "witness_independence_status",
  "external_corroboration_status",
  "first_failure_code",
]);

const bodyDigestOf = (cp) => checkpointBodyDigest(cp);

const WITNESSED = "witnessed_quorum";
const INCOMPLETE = "quorum_incomplete";

/** The columns every honest, fully witnessed fork shares. Spread, then overridden per case. */
const forkColumns = {
  verifier_exit: 0,
  quorum_status_a: WITNESSED,
  quorum_status_b: WITNESSED,
  comparison_status: "equivocation_detected",
  equivocation_artifact_status: "present",
  finding_codes: ["VWQ_EQUIVOCATION_DETECTED"],
  intake_complete: true,
  witness_independence_status: "unproven",
  external_corroboration_status: "not_satisfied",
  first_failure_code: null,
};

/** A refused bundle: no finding, and every status at its least-claiming value it can honestly hold. */
const refusedColumns = (code, over = {}) => ({
  ...forkColumns,
  verifier_exit: code,
  finding_codes: [],
  first_failure_code: code,
  ...over,
});

/** One statement only, against a threshold of two. */
const shortWitness = (b, i) => {
  b.views[i].witness_statements = [witnessStatement("w-a", b.views[i].checkpoint)];
  return b;
};

/** Seat the producer on the roster and let it witness itself — 491. */
function seatProducer(b, i) {
  b.witness_policy = witnessPolicy({
    witness_roster: witnessPolicy().witness_roster.concat({
      witness_identity: "producer-1",
      key_digest: "sha256:vwq-witness-key-producer",
      witness_operator_class: "same_operator_distinct_key",
    }),
  });
  const cp = b.views[i].checkpoint;
  b.views[i].witness_statements = [
    witnessStatement("producer-1", cp, { key_digest: "sha256:vwq-witness-key-producer" }),
    witnessStatement("w-b", cp),
  ];
  return b;
}

/**
 * The corpus. `build` returns a bundle; `expect` says what the verifier must make of it; `denies`
 * names the §5.3 win the case takes away.
 */
export const CASES = Object.freeze([
  // ---- family 1 — clean mechanics ------------------------------------------------------------
  {
    case_id: "5S-A-F1-CLEAN-SAME-CHECKPOINT",
    family: "1 clean mechanics",
    denies: "false_equivocation",
    build: () => cleanBundle(),
    expect: {
      ...forkColumns,
      comparison_status: "no_conflict_in_committed_comparison_set",
      equivocation_artifact_status: "absent_same_checkpoint",
      finding_codes: [],
    },
  },
  {
    case_id: "5S-A-F1-CLEAN-COMPATIBLE-ANCESTRY",
    family: "1 clean mechanics",
    denies: "false_equivocation",
    build: () => {
      // A normal epoch advance with the committed ancestry link present. Two different signed
      // checkpoints, one authorised history — the case that makes "two signatures means fork" false.
      const cpA = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" });
      const b = baseBundle();
      const cpB = checkpoint({
        epoch: 8,
        history_root: "root-8",
        predecessor: bodyDigestOf(cpA),
      });
      b.views = [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])];
      b.comparison_manifest = comparisonManifest([cpA, cpB]);
      b.committed.chain = [cpA, cpB].map((cp) => ({
        body_digest: bodyDigestOf(cp),
        predecessor: cp.predecessor,
        epoch: cp.epoch,
        policy_digest: cp.policy_digest,
        protocol_version: cp.protocol_version,
      }));
      return b;
    },
    expect: {
      ...forkColumns,
      comparison_status: "no_conflict_in_committed_comparison_set",
      equivocation_artifact_status: "absent_compatible",
      finding_codes: [],
    },
  },

  // ---- family 2 — equivocation, and the quorum cross-product -----------------------------------
  {
    case_id: "5S-A-F2-FORK-SAME-EPOCH",
    family: "2 equivocation",
    denies: "false_clean",
    build: () => baseBundle(),
    expect: { ...forkColumns },
  },
  {
    case_id: "5S-A-F2-FORK-NO-ANCESTRY",
    family: "2 equivocation",
    denies: "false_clean",
    build: () => {
      // Different epochs, and neither is an ancestor of the other. The second route to
      // `incompatible`, and the one with no single epoch to name — which is why the artifact carries
      // a coordinate PAIR rather than a widened triple.
      const b = baseBundle();
      const cpA = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" });
      const cpB = checkpoint({ epoch: 9, history_root: "root-9", predecessor: "body-elsewhere" });
      b.views = [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])];
      b.comparison_manifest = comparisonManifest([cpA, cpB]);
      b.committed.chain = [
        { body_digest: bodyDigestOf(cpA), predecessor: "body-6", epoch: 7 },
        { body_digest: bodyDigestOf(cpB), predecessor: "body-elsewhere", epoch: 9 },
        { body_digest: "body-elsewhere", predecessor: null, epoch: 8 },
      ];
      return b;
    },
    expect: { ...forkColumns },
  },
  {
    case_id: "5S-XP-MET-MET",
    family: "2 equivocation — quorum cross-product",
    denies: "false_clean",
    build: () => baseBundle(),
    expect: { ...forkColumns },
  },
  {
    case_id: "5S-XP-MET-INCOMPLETE",
    family: "2 equivocation — quorum cross-product",
    denies: "false_clean",
    build: () => shortWitness(baseBundle(), 1),
    expect: { ...forkColumns, quorum_status_b: INCOMPLETE },
  },
  {
    case_id: "5S-XP-INCOMPLETE-MET",
    family: "2 equivocation — quorum cross-product",
    denies: "false_clean",
    build: () => shortWitness(baseBundle(), 0),
    expect: { ...forkColumns, quorum_status_a: INCOMPLETE },
  },
  {
    case_id: "5S-XP-INCOMPLETE-INCOMPLETE",
    family: "2 equivocation — quorum cross-product",
    denies: "false_clean",
    build: () => shortWitness(shortWitness(baseBundle(), 0), 1),
    expect: { ...forkColumns, quorum_status_a: INCOMPLETE, quorum_status_b: INCOMPLETE },
  },

  // ---- family 3 — indeterminate ---------------------------------------------------------------
  {
    case_id: "5S-A-F3-ANCESTRY-UNPROVABLE",
    family: "3 indeterminate",
    denies: "false_equivocation",
    build: () => {
      // Different epochs and NO committed link either way. Neither a finding nor a clean result: the
      // one case that denies both adversary wins at once.
      const b = baseBundle();
      const cpA = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" });
      const cpB = checkpoint({ epoch: 9, history_root: "root-9", predecessor: "body-8" });
      b.views = [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])];
      b.comparison_manifest = comparisonManifest([cpA, cpB]);
      b.committed.chain = [];
      return b;
    },
    expect: {
      ...forkColumns,
      comparison_status: "comparison_indeterminate",
      equivocation_artifact_status: "absent_comparison_indeterminate",
      finding_codes: [],
    },
  },

  // ---- family 4 — attribution -----------------------------------------------------------------
  {
    case_id: "5S-A-F4-WRONG-PRODUCER-KEY",
    family: "4 attribution",
    denies: "attribution_laundering",
    build: () => {
      const b = baseBundle();
      b.views[0] = view(
        checkpoint({ history_root: "root-a" }, "stranger"),
        ["w-a", "w-b"],
        ["r-a"]
      );
      b.comparison_manifest = comparisonManifest([b.views[0].checkpoint, b.views[1].checkpoint]);
      return b;
    },
    expect: refusedColumns(479, {
      // A stranger's signature means we never established two producer-authenticated checkpoints,
      // and an accusation requires exactly that. No artifact is minted.
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
    }),
  },
  {
    case_id: "5S-A-F4-UNSIGNED-CHECKPOINT",
    family: "4 attribution",
    denies: "attribution_laundering",
    build: () => {
      const b = baseBundle();
      // DELETED, not emptied. An empty string is a present field and slips past the structural
      // check into 477; "unsigned" means the binding is absent.
      const damaged = { ...b.views[0].checkpoint };
      delete damaged.producer_signature;
      b.views[0].checkpoint = damaged;
      return b;
    },
    expect: refusedColumns(475, {
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
    }),
  },

  // ---- family 5 — quorum laundering -----------------------------------------------------------
  {
    case_id: "5S-A-F5-PRODUCER-SELF-WITNESS",
    family: "5 quorum laundering",
    denies: "counterfeit_quorum",
    build: () => seatProducer(baseBundle(), 0),
    expect: refusedColumns(491, {
      // The refusal is in the WITNESS lane, and the fork survives it. That is the lane split doing
      // the one job it exists for — so the finding is recorded even though the run exits non-zero.
      comparison_status: "equivocation_detected",
      equivocation_artifact_status: "present",
      finding_codes: ["VWQ_EQUIVOCATION_DETECTED"],
      quorum_status_a: INCOMPLETE,
    }),
  },
  {
    case_id: "5S-A-F5-COUNTERFEIT-QUORUM-CLAIM",
    family: "5 quorum laundering",
    denies: "counterfeit_quorum",
    build: () => {
      const b = shortWitness(baseBundle(), 0);
      b.views[0].quorum_certificate = { claims_threshold_met: true };
      return b;
    },
    expect: refusedColumns(496, {
      comparison_status: "equivocation_detected",
      equivocation_artifact_status: "present",
      finding_codes: ["VWQ_EQUIVOCATION_DETECTED"],
      quorum_status_a: INCOMPLETE,
    }),
  },
  {
    case_id: "5S-A-F5-ANCHOR-IN-WITNESS-ROSTER",
    family: "5 quorum laundering",
    denies: "counterfeit_quorum",
    build: () => {
      // §3.1, executable: an external anchor fed into the witness roster is a taxonomy crossing and
      // the policy refuses it. An anchor observes a digest; it reads nothing and witnesses nothing.
      const b = baseBundle();
      b.witness_policy = witnessPolicy({
        witness_roster: witnessPolicy().witness_roster.concat({
          witness_identity: "tsa-1",
          key_digest: "sha256:vwq-anchor-key",
          witness_operator_class: "rfc3161",
        }),
      });
      return b;
    },
    expect: refusedColumns(485, {
      comparison_status: "equivocation_detected",
      equivocation_artifact_status: "present",
      finding_codes: ["VWQ_EQUIVOCATION_DETECTED"],
      // A threshold committed by a REFUSED policy is not a threshold anybody met, however many
      // statements arrived. The first draft of the evaluator reported `witnessed_quorum` here.
      quorum_status_a: INCOMPLETE,
      quorum_status_b: INCOMPLETE,
    }),
  },

  // ---- family 6 — receiver laundering ---------------------------------------------------------
  {
    case_id: "5S-A-F6-INVENTED-RECEIVER",
    family: "6 receiver laundering",
    denies: "counterfeit_quorum",
    build: () => {
      const b = baseBundle();
      b.views[0].carried_by = [
        viewReceipt("r-invented", b.views[0].checkpoint, {
          receiver_key_digest: "sha256:vwq-receiver-key-invented",
        }),
      ];
      return b;
    },
    expect: refusedColumns(501, {
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
      // A roster seat that never answered leaves intake incomplete, whatever else arrived.
      intake_complete: false,
    }),
  },
  {
    case_id: "5S-A-F6-RECEIPT-UNDER-WRONG-POLICY",
    family: "6 receiver laundering",
    denies: "counterfeit_quorum",
    build: () => {
      const b = baseBundle();
      b.views[0].carried_by = [
        viewReceipt("r-a", b.views[0].checkpoint, {
          comparison_policy_digest: "sha256:some-other-comparison-policy",
        }),
      ];
      return b;
    },
    expect: refusedColumns(499, {
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
      // A roster seat that never answered leaves intake incomplete, whatever else arrived.
      intake_complete: false,
    }),
  },

  // ---- family 7 — intake tiers ----------------------------------------------------------------
  {
    case_id: "5S-A-F7-SIGNED-UNAVAILABLE-STILL-COMPLETE",
    family: "7 intake tiers",
    denies: "intake_laundering",
    build: () => {
      // An authenticated statement of absence completes intake and contributes NOTHING else: no
      // view, no quorum weight, no corroboration. An attendance record does not get to vote.
      const b = baseBundle();
      b.views[1].carried_by = [];
      b.receiver_statuses = [
        {
          receiver_identity: "r-b",
          receiver_key_digest: RECEIVER_KEYS["r-b"],
          expected_coordinate: { scope_id: "scope-1", epoch: 7 },
          receiver_sequence: 1,
          reason_code: "no_view_received",
          comparison_policy_digest: COMPARISON_POLICY_DIGEST,
          signature_profile: "ed25519",
          signature: "status-signature",
          signature_verified: true,
        },
      ];
      return b;
    },
    expect: {
      ...forkColumns,
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
      finding_codes: [],
      intake_complete: true,
    },
  },
  {
    case_id: "5S-A-F7-SILENT-RECEIVER-INCOMPLETE",
    family: "7 intake tiers",
    denies: "intake_laundering",
    build: () => {
      const b = baseBundle();
      b.views[1].carried_by = [];
      return b;
    },
    expect: {
      ...forkColumns,
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
      finding_codes: [],
      intake_complete: false,
    },
  },

  // ---- family 8 — honesty ---------------------------------------------------------------------
  {
    case_id: "5S-A-F8-EMPTY-COMPARISON-CANNOT-REACH-GREEN",
    family: "8 honesty",
    denies: "claim_laundering",
    build: () => {
      // Sufficiency before cleanliness. One view is one observation, and one observation can never
      // be this stage's strongest green — the blade's own anti-vacuity condition.
      const b = baseBundle();
      b.views = [b.views[0]];
      b.comparison_manifest = comparisonManifest([b.views[0].checkpoint]);
      return b;
    },
    expect: {
      ...forkColumns,
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
      finding_codes: [],
      quorum_status_b: INCOMPLETE,
      intake_complete: false,
    },
  },

  // ---- §7.3 — the two additive cases ----------------------------------------------------------
  {
    case_id: "5S-A-X1-PROTOCOL-VERSION-DIVERGENCE",
    family: "§7.3 additive — the two-version problem",
    denies: "false_clean",
    build: () => {
      const b = baseBundle();
      const cpB = checkpoint({ history_root: "root-b", protocol_version: "vwq.2" });
      b.views[1] = view(cpB, ["w-a", "w-b"], ["r-b"]);
      b.comparison_manifest = comparisonManifest([b.views[0].checkpoint, cpB]);
      return b;
    },
    expect: refusedColumns(481, {
      // A foreign protocol version means we never established two producer-authenticated
      // checkpoints, and an accusation requires exactly that. The comparison is unavailable and no
      // artifact is minted — this is the anti-false-accusation line, at the bundle level.
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
    }),
  },
  {
    case_id: "5S-A-X2-C1-COMMITMENT-UNBOUND",
    family: "§7.3 additive — the two-version problem",
    denies: "attribution_laundering",
    build: () => {
      const b = baseBundle();
      const cpB = checkpoint({ history_root: "root-b", c1_commitment: "sha256:not-a-committed-root" });
      b.views[1] = view(cpB, ["w-a", "w-b"], ["r-b"]);
      b.comparison_manifest = comparisonManifest([b.views[0].checkpoint, cpB]);
      return b;
    },
    expect: refusedColumns(480, {
      // An unbound c1 root means we never established two producer-authenticated
      // checkpoints, and an accusation requires exactly that. The comparison is unavailable and no
      // artifact is minted — this is the anti-false-accusation line, at the bundle level.
      comparison_status: "comparison_unavailable",
      equivocation_artifact_status: "absent_comparison_unavailable",
    }),
  },
]);

export const CASE_IDS = Object.freeze(CASES.map((c) => c.case_id));

// ------------------------------------------------------------------ the all-codes sweep
//
// One probe per raw code: a bundle whose FIRST failure is that code and no earlier one. Reachability
// is a weaker claim than the order net of Task 19 — a code being reachable says nothing about where —
// but it is the claim §5.6 makes ("every raw code is reached at its frozen first-failure position"),
// and a code nobody can reach is a code that means nothing.
//
// Two probes are declared unreachable rather than faked, because a fixture that pretended otherwise
// would be a test agreeing with a bug:
//
//   510 EQUIVOCATION_ARTIFACT_INVALID — reachable from `verifyEquivocationArtifact`, where a
//       stranger's forged artifact takes it (Task 14 proves this with twelve attacks). It is not
//       reachable from the ordered evaluator, which builds artifacts rather than judging submitted
//       ones. The code is live; this sweep is simply the wrong instrument for it.

/** Codes with no first-failure probe, each with the reason recorded rather than a fixture faked. */
export const UNREACHABLE_FROM_EVALUATOR = Object.freeze({
  510: "reached through verifyEquivocationArtifact, not through the evaluator — Task 14 covers it",
});

const rebuild = (b, i, cp) => {
  b.views[i] = view(cp, ["w-a", "w-b"], [i === 0 ? "r-a" : "r-b"]);
  b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
  return b;
};

export const CODE_PROBES = Object.freeze([
  [475, "a required binding is absent", (b) => { delete b.witness_policy.policy_id; return b; }],
  [476, "an unimplemented canonicalisation profile", (b) => { b.witness_policy.canonicalisation = "made-up"; return b; }],
  [477, "a statement binds an envelope that is not this checkpoint's", (b) => { b.views[0].witness_statements[0].checkpoint_envelope_digest = "sha256:elsewhere"; return b; }],
  [478, "no producer identity to attribute to", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a", producer_identity: "" }))],
  [479, "signed by a stranger", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a" }, "stranger"))],
  [480, "a C1 commitment the run never committed", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a", c1_commitment: "sha256:not-committed" }))],
  [481, "a protocol version the run does not verify", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a", protocol_version: "vwq.2" }))],
  [482, "an epoch that is not a coordinate", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a", epoch: -1 }))],
  [483, "no history root to compare", (b) => rebuild(b, 0, checkpoint({ history_root: "", epoch: 7 }))],
  [484, "no committed witness policy", (b) => { b.witness_policy = undefined; return b; }],
  [485, "an external anchor seated on the witness roster", (b) => { b.witness_policy = witnessPolicy({ witness_roster: witnessPolicy().witness_roster.concat({ witness_identity: "tsa-1", key_digest: "sha256:anchor", witness_operator_class: "rfc3161" }) }); return b; }],
  [486, "a checkpoint bound to a different policy than the committed one", (b) => rebuild(b, 0, checkpoint({ history_root: "root-a", policy_digest: "sha256:another-policy" }))],
  [487, "a policy committing a producer key the run does not present", (b) => { b.witness_policy = witnessPolicy({ producer_key_digest: "sha256:some-other-producer" }); return b; }],
  [488, "a witness statement with no identity", (b) => { b.views[0].witness_statements[0].witness_identity = ""; return b; }],
  [489, "a witness holding no roster seat", (b) => { b.views[0].witness_statements[0].witness_identity = "w-stranger"; return b; }],
  [490, "an unverified witness signature", (b) => { b.views[0].witness_statements[0].signature_verified = false; return b; }],
  [491, "the producer witnessing itself", (b) => seatProducer(b, 0)],
  [492, "a roster identity wearing another roster identity's key", (b) => { b.views[0].witness_statements = [witnessStatement("w-a", b.views[0].checkpoint, { key_digest: WITNESS_KEYS["w-b"] }), witnessStatement("w-c", b.views[0].checkpoint)]; return b; }],
  [493, "one witness voting twice", (b) => { b.views[0].witness_statements = [witnessStatement("w-a", b.views[0].checkpoint), witnessStatement("w-a", b.views[0].checkpoint)]; return b; }],
  [494, "a statement replayed from another epoch", (b) => { b.views[0].witness_statements[0].epoch = 6; return b; }],
  [495, "a statement replayed from another scope", (b) => { b.views[0].witness_statements[0].scope_id = "scope-2"; return b; }],
  [496, "a certificate claiming a threshold the tally does not meet", (b) => { const s = shortWitness(b, 0); s.views[0].quorum_certificate = { claims_threshold_met: true }; return s; }],
  [497, "no committed comparison policy", (b) => { b.comparison_policy = undefined; return b; }],
  [498, "a comparison roster with no seats", (b) => { b.comparison_policy.comparison_roster = []; return b; }],
  [499, "a receipt issued under a different comparison policy", (b) => { b.views[0].carried_by[0].comparison_policy_digest = "sha256:another-comparison-policy"; return b; }],
  [500, "a receipt with no receiver identity", (b) => { b.views[0].carried_by[0].receiver_identity = ""; return b; }],
  [501, "an invented receiver", (b) => { b.views[0].carried_by = [viewReceipt("r-invented", b.views[0].checkpoint, { receiver_key_digest: "sha256:invented" })]; return b; }],
  [502, "an unverified receipt signature", (b) => { b.views[0].carried_by[0].signature_verified = false; return b; }],
  [503, "two receiver identities behind one key", (b) => { b.comparison_policy = comparisonPolicy({ comparison_roster: [{ receiver_identity: "r-a", key_digest: "sha256:shared" }, { receiver_identity: "r-b", key_digest: "sha256:shared" }] }); b.views[0].carried_by = [viewReceipt("r-a", b.views[0].checkpoint, { receiver_key_digest: "sha256:shared" })]; b.views[1].carried_by = [viewReceipt("r-b", b.views[1].checkpoint, { receiver_key_digest: "sha256:shared" })]; return b; }],
  [504, "one receiver reporting twice", (b) => { b.views[0].carried_by = [viewReceipt("r-a", b.views[0].checkpoint), viewReceipt("r-a", b.views[0].checkpoint)]; return b; }],
  [505, "a statement of absence that says nothing", (b) => { b.views[1].carried_by = []; b.receiver_statuses = [{ receiver_identity: "r-b", receiver_key_digest: RECEIVER_KEYS["r-b"], comparison_policy_digest: COMPARISON_POLICY_DIGEST, signature_verified: true }]; return b; }],
  [506, "an unverified statement of absence", (b) => { b.views[1].carried_by = []; b.receiver_statuses = [{ receiver_identity: "r-b", receiver_key_digest: RECEIVER_KEYS["r-b"], expected_coordinate: { scope_id: "scope-1", epoch: 7 }, receiver_sequence: 1, reason_code: "no_view_received", comparison_policy_digest: COMPARISON_POLICY_DIGEST, signature_profile: "ed25519", signature: "s", signature_verified: false }]; return b; }],
  [507, "no committed comparison manifest", (b) => { b.comparison_manifest = undefined; return b; }],
  [508, "two views that are not the same object of comparison", (b) => rebuild(b, 1, checkpoint({ history_root: "root-b", scope_id: "scope-elsewhere" }))],
  [509, "an ancestry chain that contradicts itself", (b) => { const cpA = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" }); const cpB = checkpoint({ epoch: 8, history_root: "root-8", predecessor: "body-x" }); b.views = [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])]; b.comparison_manifest = comparisonManifest([cpA, cpB]); b.committed.chain = [ { body_digest: bodyDigestOf(cpB), predecessor: "body-x", epoch: 8 }, { body_digest: "body-x", predecessor: "body-y", epoch: 7 }, { body_digest: "body-y", predecessor: "body-x", epoch: 6 } ]; return b; }],
]);

// ------------------------------------------------------------------ Task 19 — adjacent double defects
//
// REACHABILITY IS NOT AN ORDER. Task 18 proves every code means something; it passes unchanged if two
// untested checks swap places, because each code is still reachable from somewhere. The order is a
// separate claim, and this is its evidence: for each adjacent pair in the frozen band, a bundle
// defective at BOTH must report the earlier one.
//
// TWO THINGS MADE THE OBVIOUS CONSTRUCTION WRONG, and both were found by running it.
//
//   COLLISION. Composing two probe damages usually destroys one of them — most target `view_a`, and
//   the second rebuild overwrites the first. The composed bundle then has ONE defect and reports it
//   correctly, which looks like a pass and proves nothing. So the damages below are view-targeted:
//   the earlier defect goes on view A, the later on view B, and both survive.
//
//   SHADOWING. Where both codes live in one short-circuiting module, the later defect is real but
//   never evaluated — `tally` stops at the first group that refuses. The pair is still a valid
//   ordering witness, but "both codes appear in the failure list" is the wrong way to show it. Each
//   pair therefore carries a SOLO check on the later damage: applied alone it must reach the later
//   code. That is what makes the composed bundle's silence about it meaningful.

/** Rebuild one view around a new checkpoint, keeping the manifest honest about what is compared. */
const rebuildAt = (b, i, cp) => {
  b.views[i] = view(cp, ["w-a", "w-b"], [i === 0 ? "r-a" : "r-b"]);
  b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
  return b;
};

/** Distinct history roots, so damaging a view never accidentally dissolves the fork. */
const rootAt = (i) => (i === 0 ? "root-a" : "root-b");

/**
 * Damage targeting ONE view. Every entry leaves the other view untouched, which is what lets two
 * same-module defects coexist without one overwriting the other.
 */
const VIEW_DAMAGE = Object.freeze({
  477: (b, i) => {
    b.views[i].witness_statements[0].checkpoint_envelope_digest = "sha256:elsewhere";
    return b;
  },
  478: (b, i) => rebuildAt(b, i, checkpoint({ history_root: rootAt(i), producer_identity: "" })),
  479: (b, i) => rebuildAt(b, i, checkpoint({ history_root: rootAt(i) }, "stranger")),
  480: (b, i) =>
    rebuildAt(b, i, checkpoint({ history_root: rootAt(i), c1_commitment: "sha256:not-committed" })),
  481: (b, i) =>
    rebuildAt(b, i, checkpoint({ history_root: rootAt(i), protocol_version: "vwq.2" })),
  482: (b, i) => rebuildAt(b, i, checkpoint({ history_root: rootAt(i), epoch: -1 })),
  483: (b, i) => rebuildAt(b, i, checkpoint({ history_root: "", epoch: 7 + i })),
  486: (b, i) =>
    rebuildAt(b, i, checkpoint({ history_root: rootAt(i), policy_digest: "sha256:another-policy" })),
  488: (b, i) => {
    b.views[i].witness_statements[0].witness_identity = "";
    return b;
  },
  489: (b, i) => {
    b.views[i].witness_statements[0].witness_identity = "w-stranger";
    return b;
  },
  490: (b, i) => {
    b.views[i].witness_statements[0].signature_verified = false;
    return b;
  },
  491: (b, i) => seatProducer(b, i),
  492: (b, i) => {
    b.views[i].witness_statements = [
      witnessStatement("w-a", b.views[i].checkpoint, { key_digest: WITNESS_KEYS["w-b"] }),
      witnessStatement("w-c", b.views[i].checkpoint),
    ];
    return b;
  },
  493: (b, i) => {
    const cp = b.views[i].checkpoint;
    b.views[i].witness_statements = [witnessStatement("w-a", cp), witnessStatement("w-a", cp)];
    return b;
  },
  494: (b, i) => {
    b.views[i].witness_statements[0].epoch = 6;
    return b;
  },
  495: (b, i) => {
    b.views[i].witness_statements[0].scope_id = "scope-2";
    return b;
  },
  496: (b, i) => {
    const s = shortWitness(b, i);
    s.views[i].quorum_certificate = { claims_threshold_met: true };
    return s;
  },
  499: (b, i) => {
    b.views[i].carried_by[0].comparison_policy_digest = "sha256:another-comparison-policy";
    return b;
  },
  500: (b, i) => {
    b.views[i].carried_by[0].receiver_identity = "";
    return b;
  },
  501: (b, i) => {
    b.views[i].carried_by = [
      viewReceipt("r-invented", b.views[i].checkpoint, {
        receiver_key_digest: "sha256:invented",
      }),
    ];
    return b;
  },
  502: (b, i) => {
    b.views[i].carried_by[0].signature_verified = false;
    return b;
  },
  504: (b, i) => {
    const cp = b.views[i].checkpoint;
    const id = i === 0 ? "r-a" : "r-b";
    b.views[i].carried_by = [viewReceipt(id, cp), viewReceipt(id, cp)];
    return b;
  },
});

/** Bundle-level damage, for codes that are properties of the run rather than of a view. */
const BUNDLE_DAMAGE = Object.freeze({
  475: (b) => {
    delete b.witness_policy.policy_id;
    return b;
  },
  476: (b) => {
    b.witness_policy.canonicalisation = "made-up";
    return b;
  },
  // The three "absent artifact" damages. An absent binding is a different event from a malformed
  // one, which is exactly why 484/485 and 497/498 are declared non-co-instantiable below.
  484: (b) => {
    b.witness_policy = undefined;
    return b;
  },
  497: (b) => {
    b.comparison_policy = undefined;
    return b;
  },
  507: (b) => {
    b.comparison_manifest = undefined;
    return b;
  },
  485: (b) => {
    b.witness_policy = witnessPolicy({
      witness_roster: witnessPolicy().witness_roster.concat({
        witness_identity: "tsa-1",
        key_digest: "sha256:anchor",
        witness_operator_class: "rfc3161",
      }),
    });
    return b;
  },
  487: (b) => {
    b.witness_policy = witnessPolicy({ producer_key_digest: "sha256:some-other-producer" });
    return b;
  },
  498: (b) => {
    b.comparison_policy.comparison_roster = [];
    return b;
  },
  503: (b) => {
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
  505: (b) => {
    b.views[1].carried_by = [];
    b.receiver_statuses = [
      {
        receiver_identity: "r-b",
        receiver_key_digest: RECEIVER_KEYS["r-b"],
        comparison_policy_digest: COMPARISON_POLICY_DIGEST,
        signature_verified: true,
      },
    ];
    return b;
  },
  506: (b) => {
    b.views[1].carried_by = [];
    b.receiver_statuses = [
      {
        receiver_identity: "r-b",
        receiver_key_digest: RECEIVER_KEYS["r-b"],
        expected_coordinate: { scope_id: "scope-1", epoch: 7 },
        receiver_sequence: 1,
        reason_code: "no_view_received",
        comparison_policy_digest: COMPARISON_POLICY_DIGEST,
        signature_profile: "ed25519",
        signature: "s",
        signature_verified: false,
      },
    ];
    return b;
  },
  508: (b) => rebuildAt(b, 1, checkpoint({ history_root: "root-b", scope_id: "scope-elsewhere" })),
  509: (b) => {
    const cpA = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" });
    const cpB = checkpoint({ epoch: 8, history_root: "root-8", predecessor: "body-x" });
    b.views = [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])];
    b.comparison_manifest = comparisonManifest([cpA, cpB]);
    b.committed.chain = [
      { body_digest: bodyDigestOf(cpB), predecessor: "body-x", epoch: 8 },
      { body_digest: "body-x", predecessor: "body-y", epoch: 7 },
      { body_digest: "body-y", predecessor: "body-x", epoch: 6 },
    ];
    return b;
  },
});

/** One damage for a code, placed on a given view where the code is a property of a view. */
export function damageFor(code, viewIndex) {
  const perView = VIEW_DAMAGE[code];
  if (perView) return (b) => perView(b, viewIndex);
  const perBundle = BUNDLE_DAMAGE[code];
  if (perBundle) return perBundle;
  return null;
}

/**
 * Pairs that cannot be co-instantiated, with the reason. Each is a real property of the system, not
 * a gap in the fixtures — and every one of them is a place where a faked bundle would have been
 * easier to write than this sentence.
 */
export const NON_COINSTANTIABLE_PAIRS = Object.freeze({
  "484/485":
    "mutually exclusive by construction: 484 is a witness policy that is ABSENT and 485 is one that " +
    "is present and malformed. A bundle cannot be both, and a fixture claiming to be would be lying " +
    "about which one it was",
  "497/498":
    "mutually exclusive by construction, the same exclusion one lane over: 497 is a comparison " +
    "policy that is ABSENT and 498 is one that is present and malformed",
  "509/510":
    "510 is not reachable from the ordered evaluator, which builds artifacts rather than judging " +
    "submitted ones; Task 14 covers it with twelve attacks against verifyEquivocationArtifact",
  "510/511":
    "510 is not reachable from the ordered evaluator, so there is no evaluator-side instance of it " +
    "to pair with anything",
  "511/512":
    "the wrapper is not an ordered check, it is the absence of one. A bundle that throws preempts " +
    "every check including the claim gate, so 512 is correctly reported even though a 511 defect " +
    "also exists. Ordering does not apply to the catch-all, and pretending it did would be the one " +
    "place in this net where the order claim is false",
});
