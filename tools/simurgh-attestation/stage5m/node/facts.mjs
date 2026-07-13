// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — build facts5M (the Rekor-seat + cross-seat facts the pure core decides over) from a v2 bundle
// + pinned inputs, using the real Node adapter. Expected evidence defects become typed facts (never a throw).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { ECOLOGY_CLASSES } from "../constants.mjs";
import { verifyInclusion, verifyCheckpoint, verifySet, verifySubmitter } from "./rekorAdapter.mjs";

const sha256hex = (buf) => createHash("sha256").update(buf).digest("hex");

// pinned: { rekorPubPem, expectedSubmitterPem, expected_submitter_fpr, canonicalAnchorBytes }
export function makeVtcQuorumFacts(bundle, pinned) {
  const commitmentHex = (bundle.commitment_session_id ?? "sha256:").slice("sha256:".length);
  const anchorBytes = pinned.canonicalAnchorBytes;
  const tsaAnchor = (bundle.anchors ?? []).find((a) => a.anchor_type === "rfc3161_tsa");
  const otsAnchor = (bundle.anchors ?? []).find((a) => a.anchor_type === "bitcoin_ots");
  const base = {
    commitment: commitmentHex,
    anchor_decoded: anchorBytes ? Buffer.from(anchorBytes.toString(), "hex").toString("hex") : null,
    anchor_sha256: anchorBytes ? sha256hex(anchorBytes) : null,
    tsa_imprint: tsaAnchor?.tsa_crypto_attestation?.messageImprintHex ?? null,
    ots_leaf: otsAnchor?.ots_leaf_hex ?? null,
    declared_externally_anchored: bundle.declared_externally_anchored === true,
  };
  const seat = bundle.transparency_log_seat;
  if (seat === undefined || seat === null) {
    return {
      ...base,
      seat_present: false,
      present_valid_ecology_classes: [ECOLOGY_CLASSES[0], ECOLOGY_CLASSES[1]],
    };
  }
  const inc = verifyInclusion(seat);
  const ck = verifyCheckpoint(seat, pinned.rekorPubPem);
  const setOk = verifySet(seat, pinned.rekorPubPem, canonicalJson);
  const sub = verifySubmitter(anchorBytes, seat, pinned.expectedSubmitterPem);
  const entryBody = JSON.parse(Buffer.from(seat.body, "base64").toString("utf8"));
  const seatValid = inc.ok && ck.ok && setOk && sub.ok && sub.fpr === pinned.expected_submitter_fpr;
  return {
    ...base,
    seat_present: true,
    rekor: { kind: entryBody.kind, artifact_hash: entryBody.spec?.data?.hash?.value },
    rekor_artifact_hash: entryBody.spec?.data?.hash?.value,
    inclusion_ok: inc.ok,
    inclusion_reason: inc.reason,
    checkpoint_ok: ck.ok,
    checkpoint_reason: ck.reason,
    set_ok: setOk,
    submitter_ok: sub.ok,
    submitter_reason: sub.reason,
    entry_submitter_fpr: sub.fpr,
    expected_submitter_fpr: pinned.expected_submitter_fpr,
    // three verifier-pinned ecologies present ONLY when the log seat validates (else 2)
    present_valid_ecology_classes: seatValid
      ? [...ECOLOGY_CLASSES]
      : [ECOLOGY_CLASSES[0], ECOLOGY_CLASSES[1]],
  };
}
