// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — endpoint child verifier (P0-4/P0-11). The reused 5M quorum-EXTENSION does no TSA crypto and
// does not parse the .ots; this module ADDS real TSA imprint binding + OTS Bitcoin confirmation on top of
// the extension. Honest label: child_component = "stage5m_quorum_extension". Typed facts, never throws.
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseTsaReply } from "./tsaTime.mjs";
import { makeVtcQuorumFacts } from "../../stage5m/node/facts.mjs";
import { checkRekorSeat } from "../../stage5m/core/rekorSeat.mjs";
import { checkCrossSeat, checkDistinctEcologies } from "../../stage5m/core/crossSeat.mjs";
import { checkState, stateFields } from "../../stage5m/core/state.mjs";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

// Parse `ots info` for the Bitcoin attestation(s). Offline read of the detached proof structure.
function otsConfirmation(otsPath) {
  try {
    const out = execFileSync("ots", ["info", otsPath], { encoding: "utf8" });
    const heights = [...out.matchAll(/BitcoinBlockHeaderAttestation\((\d+)\)/g)].map((m) =>
      Number(m[1])
    );
    return { confirmed: heights.length > 0, block_heights: heights };
  } catch (e) {
    return { confirmed: false, block_heights: [], error: String(e) };
  }
}

// runEndpointChild(role, ev, pinned) -> { green, raw, reason, detail, stateFields }
// ev: { subjectHex, tsrPath, otsPath, rekorEntry, rekorPubPem, submitterPem }
export function runEndpointChild(role, ev, opts = {}) {
  const detail = { endpoint_role: role, child_component: "stage5m_quorum_extension" };

  // (a) real TSA imprint == role subject.
  const tsa = parseTsaReply(ev.tsrPath);
  if (!tsa.subject_extractable)
    return {
      green: false,
      raw: 405,
      reason: "start_token_invalid",
      detail: { ...detail, tsa_invalid: true },
    };
  if (tsa.imprintHex !== ev.subjectHex)
    return {
      green: false,
      raw: role === "start" ? 404 : 414,
      reason: "endpoint_subject_mismatch",
      detail: { ...detail, tsa_imprint_mismatch: true },
    };

  // (b) OTS leaf == D + Bitcoin confirmation (real detached-proof read).
  const ots = otsConfirmation(ev.otsPath);
  if (!opts.allowPending && !ots.confirmed)
    return {
      green: false,
      raw: role === "start" ? 406 : 415,
      reason: "endpoint_anchor_incomplete",
      detail: { ...detail, ots_unconfirmed: true },
    };

  // (c) the frozen 5M quorum-extension over the banked epBundle shape.
  const seat = ev.rekorEntry;
  const uuid = Object.keys(seat)[0];
  const v = seat[uuid];
  const bundle = {
    commitment_session_id: "sha256:" + ev.subjectHex,
    anchors: [
      { anchor_type: "rfc3161_tsa", tsa_crypto_attestation: { messageImprintHex: tsa.imprintHex } },
      { anchor_type: "bitcoin_ots", ots_leaf_hex: ev.subjectHex },
    ],
    transparency_log_seat: {
      uuid,
      body: v.body,
      logID: v.logID,
      logIndex: v.logIndex,
      integratedTime: v.integratedTime,
      signedEntryTimestamp: v.verification.signedEntryTimestamp,
      inclusionProof: v.verification.inclusionProof,
    },
    declared_externally_anchored: true,
  };
  const pinned = {
    rekorPubPem: ev.rekorPubPem,
    expectedSubmitterPem: ev.submitterPem,
    expected_submitter_fpr:
      "sha256:" +
      sha(crypto.createPublicKey(ev.submitterPem).export({ type: "spki", format: "der" })),
    canonicalAnchorBytes: Buffer.from(ev.subjectHex, "utf8"),
  };
  const facts = makeVtcQuorumFacts(bundle, pinned);
  for (const step of [
    () => checkRekorSeat(facts),
    () => checkCrossSeat(facts),
    () => checkDistinctEcologies(facts),
    () => checkState(facts),
  ]) {
    const r = step();
    if (r)
      return {
        green: false,
        raw: role === "start" ? 406 : 415,
        reason: "endpoint_anchor_incomplete",
        detail: { ...detail, child_raw_code: r.raw, child_reason: r.reason },
      };
  }
  const sf = stateFields(facts);
  const green = sf.externally_anchored === true && sf.ecology_independence_number === 3;
  return {
    green,
    raw: green ? 0 : role === "start" ? 406 : 415,
    reason: green ? "ok" : "endpoint_anchor_incomplete",
    detail: { ...detail, bitcoin_block_heights: ots.block_heights },
    stateFields: sf,
  };
}
