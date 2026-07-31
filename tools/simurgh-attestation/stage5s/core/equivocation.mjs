// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the equivocation artifact, and its self-verification.
//
// THE ARTIFACT PROVES ONE NARROW SENTENCE:
//
//   Two producer-authenticated checkpoints occupy an incompatible relation under the committed
//   comparison authority.
//
// Not that the producer is dishonest, not that a fork reached any particular audience, and not that
// the witness quorum agreed — quorum is irrelevant to the finding, because two authenticated producer
// signatures over incompatible checkpoints prove the producer signed both without any witness at all.
//
// THE VERIFIER RECOMPUTES; IT DOES NOT READ. `same_scope: true`, `same_epoch: true` and
// `compatibility_verdict: "incompatible"` are stored inside the artifact as EVIDENCE CLAIMS TO CHECK,
// never as inputs to believe. An artifact that asserts its own conclusion and is believed is a press
// release with a digest on it.
//
// AND IT NEVER CALLS THE BUILDER. Comparing `deriveEquivocationArtifact` to itself would prove the
// builder is deterministic and prove nothing whatever about the artifact. It reuses only the frozen
// primitives — canonicalisation, the two digests, the compatibility relation, the ancestry prover —
// each of which is independently tested against the spec.
//
// TWO EXIT CODES, AND THE LINE BETWEEN THEM IS LOAD-BEARING:
//
//   509  the ANCESTRY PROOF is malformed or contradictory — a cycle, a false derivation. The chain
//        is the broken thing, and saying 510 here would tell a reviewer the artifact was forged.
//   510  the ARTIFACT fails to establish its own claim — a field omitted, swapped, or falsely
//        derived; a signature that does not verify; a fork asserted over a valid ancestry chain.
//
// 477/479 and their neighbours are NOT emitted here. Those belong to the ordered evaluator, which
// judges checkpoints as INPUTS long before any artifact exists. This verifier judges an artifact, so
// every way the artifact fails is 510 — with the precise failing check named in the refusal, so no
// diagnostic detail is lost to the coarser code.

import { createHash, createPublicKey, verify as edVerify } from "node:crypto";

import { ancestryOracle } from "./ancestry.mjs";
import { canonicalJson, checkpointBodyDigest, checkpointEnvelopeDigest } from "./canonical.mjs";
import { COMPATIBILITY_REFUSALS, compare } from "./compatibility.mjs";

export const ARTIFACT_SCHEMA = "simurgh.vwq.equivocation-artifact.v1";
export const FINDING_ID = "VWQ_EQUIVOCATION_DETECTED";

export const EQUIVOCATION_REFUSALS = Object.freeze({
  ANCESTRY_PROOF_INVALID: "ANCESTRY_PROOF_INVALID", // 509
  EQUIVOCATION_ARTIFACT_INVALID: "EQUIVOCATION_ARTIFACT_INVALID", // 510
});

const EXIT = Object.freeze({ FINDING: 0, ANCESTRY: 509, ARTIFACT: 510 });

/** Top-level bindings the ruling requires. Each is checked present, then checked TRUE. */
export const REQUIRED_ARTIFACT_BINDINGS = Object.freeze([
  "schema",
  "protocol_version",
  "fork_coordinate",
  "view_a",
  "view_b",
  "producer_key_digest",
  "comparison_policy_digest",
  "comparison_manifest_digest",
  "receiver_provenance_root",
  "derivation",
  "comparison_status",
  "finding_id",
  "artifact_digest",
]);

/** Provenance fields that travel into the root. Diagnostics are excluded; a root is not a log. */
const PROVENANCE_FIELDS = Object.freeze([
  "receiver_identity",
  "receiver_key_digest",
  "checkpoint_envelope_digest",
  "comparison_policy_digest",
  "receiver_sequence",
]);

const PROVENANCE_DOMAIN = "simurgh.vwq.receiver-provenance-root.v1";
const MANIFEST_DOMAIN = "simurgh.vwq.comparison-manifest.v1";
const ARTIFACT_DOMAIN = "simurgh.vwq.equivocation-artifact.v1";

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** `keyDigest(pem)` = `sha256:` + sha256 of the raw PEM string — the repo's settled convention. */
export function keyDigestOf(pem) {
  return `sha256:${sha256(String(pem))}`;
}

/** Set-canonical provenance for one view: sorted by authenticated identity, never by array order. */
function provenanceOf(carriedBy) {
  return [...(Array.isArray(carriedBy) ? carriedBy : [])]
    .map((r) => {
      const entry = {};
      for (const f of PROVENANCE_FIELDS) entry[f] = r?.[f];
      return entry;
    })
    .sort((x, y) => (canonicalJson(x) < canonicalJson(y) ? -1 : 1));
}

/**
 * The authenticated receiver provenance root over both views. Exported so a reviewer — or a hostile
 * test building a fully self-consistent forgery — can recompute it without the builder.
 */
export function receiverProvenanceRoot(carriedByA, carriedByB) {
  return sha256(
    `${PROVENANCE_DOMAIN}\n${canonicalJson({
      a: provenanceOf(carriedByA),
      b: provenanceOf(carriedByB),
    })}`
  );
}

/** The committed comparison manifest's digest. */
export function comparisonManifestDigest(manifest) {
  return sha256(`${MANIFEST_DOMAIN}\n${canonicalJson(manifest ?? {})}`);
}

/** The artifact's own digest, over every binding except itself. */
export function artifactDigestOf(artifact) {
  const body = {};
  for (const [k, v] of Object.entries(artifact ?? {})) {
    if (k !== "artifact_digest") body[k] = v;
  }
  return sha256(`${ARTIFACT_DOMAIN}\n${canonicalJson(body)}`);
}

/** A view as the compatibility relation wants it. Digests are RECOMPUTED, never copied from input. */
function relationView(checkpoint) {
  return {
    artifact_kind: "checkpoint",
    producer_identity: checkpoint?.producer_identity,
    scope_id: checkpoint?.scope_id,
    epoch: checkpoint?.epoch,
    checkpoint_body_digest: checkpointBodyDigest(checkpoint),
    checkpoint_envelope_digest: checkpointEnvelopeDigest(checkpoint),
    history_root: checkpoint?.history_root,
  };
}

/**
 * Build an equivocation artifact — or decline to, which is the more important half.
 *
 * Declining is not a failure: an indeterminate or compatible relation yields NO artifact, because a
 * minted artifact is an accusation and this stage does not make accusations it cannot recompute.
 *
 * @returns {{ok: true, artifact: object|null, comparison_status: string}
 *          |{ok: false, exit_code: number, refusal: object, comparison_status: string}}
 */
export function deriveEquivocationArtifact(input) {
  const {
    view_a,
    view_b,
    comparison_policy,
    comparison_manifest,
    producer_key_digest,
    committed_chain,
    committed_transition_policy,
  } = input ?? {};

  const cpA = view_a?.checkpoint;
  const cpB = view_b?.checkpoint;
  const relation = compare(relationView(cpA), relationView(cpB), {
    ancestry: ancestryOracle({
      chain: committed_chain ?? [],
      policy: committed_transition_policy ?? {},
    }),
  });

  if (!relation.ok) {
    if (relation.refusal.reason === COMPATIBILITY_REFUSALS.ANCESTRY_PROOF_INVALID) {
      return {
        ok: false,
        exit_code: EXIT.ANCESTRY,
        refusal: {
          reason: EQUIVOCATION_REFUSALS.ANCESTRY_PROOF_INVALID,
          check: "ancestry_proof",
          detail: relation.refusal.detail,
        },
        comparison_status: "comparison_indeterminate",
      };
    }
    return {
      ok: false,
      exit_code: EXIT.ARTIFACT,
      refusal: {
        reason: EQUIVOCATION_REFUSALS.EQUIVOCATION_ARTIFACT_INVALID,
        check: "comparability",
        detail: relation.refusal.detail,
      },
      comparison_status: "comparison_unavailable",
    };
  }

  if (relation.relation !== "incompatible") {
    // Clean or short. Either way there is nothing to accuse anybody of.
    return {
      ok: true,
      artifact: null,
      comparison_status:
        relation.relation === "indeterminate"
          ? "comparison_indeterminate"
          : "no_conflict_in_committed_comparison_set",
    };
  }

  const artifact = {
    schema: ARTIFACT_SCHEMA,
    protocol_version: cpA?.protocol_version,
    fork_coordinate: {
      producer_identity: cpA?.producer_identity,
      scope_id: cpA?.scope_id,
      // Both epochs travel: §2.4 reaches `incompatible` by two routes, and the cross-epoch route has
      // no single epoch to name. `same_epoch` in the derivation says which route this artifact took.
      epoch_a: cpA?.epoch,
      epoch_b: cpB?.epoch,
    },
    view_a: {
      checkpoint: cpA,
      checkpoint_body_digest: checkpointBodyDigest(cpA),
      checkpoint_envelope_digest: checkpointEnvelopeDigest(cpA),
      carried_by: provenanceOf(view_a?.carried_by),
    },
    view_b: {
      checkpoint: cpB,
      checkpoint_body_digest: checkpointBodyDigest(cpB),
      checkpoint_envelope_digest: checkpointEnvelopeDigest(cpB),
      carried_by: provenanceOf(view_b?.carried_by),
    },
    producer_key_digest,
    comparison_policy_digest: comparison_policy?.comparison_policy_digest,
    comparison_manifest_digest: comparisonManifestDigest(comparison_manifest),
    receiver_provenance_root: receiverProvenanceRoot(view_a?.carried_by, view_b?.carried_by),
    derivation: {
      same_producer: cpA?.producer_identity === cpB?.producer_identity,
      same_scope: cpA?.scope_id === cpB?.scope_id,
      same_epoch: cpA?.epoch === cpB?.epoch,
      body_digests_differ: checkpointBodyDigest(cpA) !== checkpointBodyDigest(cpB),
      ancestry_verdict: cpA?.epoch === cpB?.epoch ? "not_applicable" : "not_ancestor",
      compatibility_verdict: "incompatible",
    },
    comparison_status: "equivocation_detected",
    finding_id: FINDING_ID,
  };
  artifact.artifact_digest = artifactDigestOf(artifact);

  return { ok: true, artifact, comparison_status: "equivocation_detected" };
}

/**
 * Verify a stranger's artifact from public inputs only. Pure; never throws.
 *
 * The semantic checks run BEFORE the artifact digest on purpose. A competent forger recomputes the
 * digest over their forgery, so the digest catches only careless tampering — the semantic checks are
 * what catch a forgery that is internally consistent and simply untrue. Running them first also means
 * the reported `check` names the real defect rather than "the seal does not match".
 *
 * @param {unknown} artifact
 * @param {{producer_public_key_pem: string, comparison_policy: object,
 *          comparison_manifest: object, committed_chain?: Array<object>}} publicInputs
 * @returns {{ok: boolean, exit_code: number, comparison_status: string, refusal?: object}}
 */
export function verifyEquivocationArtifact(artifact, publicInputs) {
  const bad = (check, detail, status = "comparison_unavailable") => ({
    ok: false,
    exit_code: EXIT.ARTIFACT,
    comparison_status: status,
    refusal: {
      reason: EQUIVOCATION_REFUSALS.EQUIVOCATION_ARTIFACT_INVALID,
      check,
      detail,
    },
  });

  // ---- structure ---------------------------------------------------------------------------
  if (!isPlainObject(artifact)) return bad("structure", "the artifact is not an object");
  for (const field of REQUIRED_ARTIFACT_BINDINGS) {
    if (artifact[field] === undefined || artifact[field] === null || artifact[field] === "") {
      return bad("structure", `binding absent: ${field}`);
    }
  }
  if (artifact.schema !== ARTIFACT_SCHEMA) return bad("schema", String(artifact.schema));
  if (!isPlainObject(artifact.derivation)) return bad("structure", "derivation is not an object");
  if (!isPlainObject(artifact.fork_coordinate)) {
    return bad("structure", "fork_coordinate is not an object");
  }

  const inputs = publicInputs ?? {};
  const views = [
    ["view_a", artifact.view_a],
    ["view_b", artifact.view_b],
  ];
  for (const [name, view] of views) {
    if (!isPlainObject(view) || !isPlainObject(view.checkpoint)) {
      return bad("structure", `${name} carries no checkpoint`);
    }
  }

  // ---- the producer key the committed policy names ---------------------------------------
  let producerKey;
  try {
    producerKey = createPublicKey(String(inputs.producer_public_key_pem));
  } catch (error) {
    return bad("producer_key_commitment", `unreadable producer key: ${error.message}`);
  }
  if (keyDigestOf(inputs.producer_public_key_pem) !== artifact.producer_key_digest) {
    return bad(
      "producer_key_commitment",
      "the supplied producer key is not the one the artifact binds"
    );
  }

  // ---- per-view recomputation ---------------------------------------------------------------
  for (const [name, view] of views) {
    const cp = view.checkpoint;
    if (checkpointBodyDigest(cp) !== view.checkpoint_body_digest) {
      return bad(
        `${name}.checkpoint_body_digest`,
        "the stored body digest is not the body's digest"
      );
    }
    if (checkpointEnvelopeDigest(cp) !== view.checkpoint_envelope_digest) {
      return bad(
        `${name}.checkpoint_envelope_digest`,
        "the stored envelope digest is not the envelope's digest"
      );
    }
    let signatureOk = false;
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
    if (!signatureOk) {
      return bad(
        `${name}.producer_signature`,
        "the checkpoint is not authenticated by the committed producer key"
      );
    }
  }

  // ---- the fork coordinate ------------------------------------------------------------------
  const cpA = artifact.view_a.checkpoint;
  const cpB = artifact.view_b.checkpoint;
  const fc = artifact.fork_coordinate;
  if (cpA.producer_identity !== cpB.producer_identity) {
    return bad("fork_coordinate.producer_identity", "the two views name different producers");
  }
  if (cpA.scope_id !== cpB.scope_id) {
    return bad("fork_coordinate.scope_id", "the two views name different scopes");
  }
  if (
    fc.producer_identity !== cpA.producer_identity ||
    fc.scope_id !== cpA.scope_id ||
    fc.epoch_a !== cpA.epoch ||
    fc.epoch_b !== cpB.epoch
  ) {
    return bad("fork_coordinate", "the stored coordinate is not the coordinate of the two views");
  }

  // ---- body-digest inequality ----------------------------------------------------------------
  if (artifact.view_a.checkpoint_body_digest === artifact.view_b.checkpoint_body_digest) {
    return bad("body_digest_inequality", "the two views are the same checkpoint");
  }

  // ---- the committed comparison authority ---------------------------------------------------
  if (artifact.comparison_policy_digest !== inputs.comparison_policy?.comparison_policy_digest) {
    return bad(
      "comparison_policy_digest",
      `artifact binds ${artifact.comparison_policy_digest}, committed policy is ` +
        `${inputs.comparison_policy?.comparison_policy_digest}`
    );
  }
  if (
    comparisonManifestDigest(inputs.comparison_manifest) !== artifact.comparison_manifest_digest
  ) {
    return bad("comparison_manifest_digest", "the artifact does not bind the committed manifest");
  }
  const compared = new Set(inputs.comparison_manifest?.input_envelope_digests ?? []);
  for (const [name, view] of views) {
    if (!compared.has(view.checkpoint_envelope_digest)) {
      return bad(
        `${name}.comparison_manifest_membership`,
        "the view was never a member of the committed comparison set"
      );
    }
  }

  // ---- authenticated receiver provenance -----------------------------------------------------
  const seatOf = new Map(
    (inputs.comparison_policy?.comparison_roster ?? []).map((s) => [s.receiver_identity, s])
  );
  for (const [name, view] of views) {
    const carried = Array.isArray(view.carried_by) ? view.carried_by : [];
    if (carried.length === 0) {
      return bad(`${name}.receiver_provenance`, "no authenticated receiver carried this view");
    }
    for (const r of carried) {
      const seat = seatOf.get(r?.receiver_identity);
      if (!seat) {
        return bad(`${name}.receiver_provenance`, `${r?.receiver_identity} holds no roster seat`);
      }
      if (seat.key_digest !== r.receiver_key_digest) {
        return bad(
          `${name}.receiver_provenance`,
          `${r.receiver_identity} signed under a key its seat does not commit`
        );
      }
      if (r.checkpoint_envelope_digest !== view.checkpoint_envelope_digest) {
        return bad(
          `${name}.receiver_provenance`,
          `${r.receiver_identity} carried a different envelope than this view`
        );
      }
      if (r.comparison_policy_digest !== artifact.comparison_policy_digest) {
        return bad(
          `${name}.receiver_provenance`,
          `${r.receiver_identity} answered under a different comparison policy`
        );
      }
    }
  }
  if (
    receiverProvenanceRoot(artifact.view_a.carried_by, artifact.view_b.carried_by) !==
    artifact.receiver_provenance_root
  ) {
    return bad(
      "receiver_provenance_root",
      "the stored root is not the root of the stored receipts"
    );
  }

  // ---- the relation, recomputed from the checkpoints ------------------------------------------
  const relation = compare(relationView(cpA), relationView(cpB), {
    ancestry: ancestryOracle({
      chain: inputs.committed_chain ?? [],
      policy: inputs.committed_transition_policy ?? {},
    }),
  });
  if (!relation.ok) {
    if (relation.refusal.reason === COMPATIBILITY_REFUSALS.ANCESTRY_PROOF_INVALID) {
      return {
        ok: false,
        exit_code: EXIT.ANCESTRY,
        comparison_status: "comparison_indeterminate",
        refusal: {
          reason: EQUIVOCATION_REFUSALS.ANCESTRY_PROOF_INVALID,
          check: "ancestry_proof",
          detail: relation.refusal.detail,
        },
      };
    }
    return bad("comparability", relation.refusal.detail);
  }
  if (relation.relation !== "incompatible") {
    // THE ANTI-FALSE-ACCUSATION CONTROL. Everything above may be immaculate — valid signatures, real
    // receipts, a correct seal — and the accusation still fails, because the committed record says
    // these two checkpoints belong to one authorised history.
    return bad(
      "compatibility_verdict",
      `the committed record makes these views ${relation.relation}, not incompatible`,
      relation.relation === "indeterminate"
        ? "comparison_indeterminate"
        : "no_conflict_in_committed_comparison_set"
    );
  }

  // ---- the stored derivation, claim by claim --------------------------------------------------
  const recomputed = {
    same_producer: cpA.producer_identity === cpB.producer_identity,
    same_scope: cpA.scope_id === cpB.scope_id,
    same_epoch: cpA.epoch === cpB.epoch,
    body_digests_differ:
      artifact.view_a.checkpoint_body_digest !== artifact.view_b.checkpoint_body_digest,
    compatibility_verdict: relation.relation,
  };
  for (const [claim, value] of Object.entries(recomputed)) {
    if (artifact.derivation[claim] !== value) {
      return bad(
        `derivation.${claim}`,
        `the artifact claims ${JSON.stringify(artifact.derivation[claim])}, ` +
          `the record gives ${JSON.stringify(value)}`
      );
    }
  }

  // ---- the reported outcome --------------------------------------------------------------------
  if (artifact.comparison_status !== "equivocation_detected") {
    return bad("comparison_status", String(artifact.comparison_status));
  }
  if (artifact.finding_id !== FINDING_ID) return bad("finding_id", String(artifact.finding_id));

  // ---- the seal, last ---------------------------------------------------------------------------
  if (artifactDigestOf(artifact) !== artifact.artifact_digest) {
    return bad("artifact_digest", "the artifact digest does not cover the artifact");
  }

  return {
    ok: true,
    exit_code: EXIT.FINDING,
    comparison_status: "equivocation_detected",
    finding_id: FINDING_ID,
  };
}
