// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — verifyVtcQuorum: the whole offline verifier. Wraps projection + both adapters + dispatch in one
// outer fail-closed boundary (395). facts5L reuses the frozen 5L adapter; facts5M is the Rekor extension.
// An injectable _factsAdapter lets the K7 net reach 395 via a throwing dep (never a bundle field).
import { R } from "../core/result.mjs";
import { projectToFiveL, dispatchVtcQuorum } from "../core/dispatch.mjs";
import { makeVtcqFacts } from "../../stage5l/node/adapter.mjs";
import { vtcqVerify } from "../../stage5l/core/vtcqCore.mjs";
import { makeVtcQuorumFacts } from "./facts.mjs";

export function cfg5LFor(bundle, pinned) {
  return {
    schema_version: "simurgh.vtcq.config.v1",
    profile: "vtc_quorum",
    policy_digest: pinned?.vtcq_policy_digest ?? "sha256:vtcq-policy",
    accuracy_policy_s: pinned?.accuracy_policy_s ?? 2,
    tsa_verifier_public_key_fingerprint: pinned?.tsa_verifier_pubkey_fpr,
  };
}

export function verifyVtcQuorum(
  bundle,
  pinned,
  keys,
  { tier = "public", _factsAdapter = makeVtcQuorumFacts } = {}
) {
  try {
    const cfg5L = cfg5LFor(bundle, pinned);
    const facts5L = makeVtcqFacts(projectToFiveL(bundle), cfg5L, keys);
    const facts5M = _factsAdapter(bundle, pinned);
    return dispatchVtcQuorum(bundle, { facts5L, facts5M, cfg5L, tier, run5L: vtcqVerify });
  } catch (e) {
    return R(395, "internal_or_env_unavailable", { error: String(e) });
  }
}
