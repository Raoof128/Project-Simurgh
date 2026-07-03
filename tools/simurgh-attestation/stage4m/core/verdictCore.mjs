// SPDX-License-Identifier: AGPL-3.0-or-later
// Tier-aware verifier core (spec §4.0, §4.6). IO-free: takes an already-loaded bundle and an
// injected async signature-verify callback, so the SAME function runs in Node and the browser
// (parity by construction, V16). Manifest signature is verified by the adapter and passed in as
// `manifestCheck` — this keeps PEM/DER handling out of core while the verdict stays identical.
import { canonicalJson, merkleRootSorted, recordDigest } from "./canonical.mjs";
import { validateMergeChain, validateWindowCommitment } from "./mergeLatticeCore.mjs";
import { rescoreAll, verifyRescoreRecord } from "./retroScoreCore.mjs";
import { chainDigest, verifyDisclosure } from "./disclosureCore.mjs";
import { validateAcknowledgement, validateContest } from "./respondentCore.mjs";
import { VXD_VERDICT_SCHEMA } from "../constants.mjs";

const LEDGER_CHECKS = [
  "windows_valid",
  "merge_chain_valid",
  "rescore_recompute",
  "monotonicity",
  "attestation_roots",
];

export async function verifyBundleCore({
  bundle,
  tier,
  verifySig,
  providerPublicKeySpkiB64,
  manifestCheck,
}) {
  const checks = [];
  const mark = (name, status) => checks.push({ name, status });
  const skipLedger = tier === "p";
  let newlyRevealed = [];
  let findings = [];

  const verdict = (rawCode, reason) => ({
    schema: VXD_VERDICT_SCHEMA,
    tier,
    rawCode,
    reason,
    checks,
    newly_revealed: newlyRevealed,
    findings,
  });
  const failCheck = (name, rawCode, reason) => {
    mark(name, "failed");
    return verdict(rawCode, reason);
  };

  const { windows, mergeEvents, rescoreRecords, disclosure, chain, contests, acks, attestation } =
    bundle;

  // 1. windows_valid (Tier A)
  if (skipLedger) mark("windows_valid", "not_in_tier");
  else {
    for (const w of windows) {
      const r = validateWindowCommitment(w);
      if (!r.ok) return failCheck("windows_valid", r.rawCode, r.reason);
    }
    mark("windows_valid", "ok");
  }

  // 2. merge_chain_valid (Tier A)
  let epochs = [];
  if (skipLedger) mark("merge_chain_valid", "not_in_tier");
  else {
    const genesis = {
      graphVersionDigest: windows[0]?.graph_version_digest,
      clusters: (windows[0]?.clusters ?? []).map((c) => c.cluster_commitment),
      budgets: Object.fromEntries(
        (windows[0]?.clusters ?? []).map((c) => [c.cluster_commitment, c.budget])
      ),
    };
    const chk = validateMergeChain(mergeEvents, genesis);
    if (!chk.ok) return failCheck("merge_chain_valid", chk.rawCode, chk.reason);
    epochs = chk.epochs;
    mark("merge_chain_valid", "ok");
  }

  // 3+4. rescore_recompute + monotonicity (Tier A). Recompute from windows+epochs; compare to
  // committed. Monotonicity violation -> 44 (checked FIRST); any other drift -> 22.
  if (skipLedger) {
    mark("rescore_recompute", "not_in_tier");
    mark("monotonicity", "not_in_tier");
  } else {
    const recomputed = rescoreAll({ windows, epochs }).records;
    // monotonicity: per committed record against its recomputed sibling by index
    for (let i = 0; i < rescoreRecords.length; i++) {
      const rec = recomputed[i];
      const epoch = epochs[i % Math.max(epochs.length, 1)];
      if (rec && epoch) {
        const mv = verifyRescoreRecord({ committed: rescoreRecords[i], recomputed: rec, epoch });
        if (!mv.ok) return failCheck("monotonicity", mv.rawCode, mv.reason);
      }
    }
    mark("monotonicity", "ok");
    // remaining drift (counts, newly_revealed, etc.) -> 22 digest-lineage
    if (canonicalJson(rescoreRecords) !== canonicalJson(recomputed)) {
      return failCheck("rescore_recompute", 22, "rescore_digest_mismatch");
    }
    mark("rescore_recompute", "ok");
    newlyRevealed = [...new Set(recomputed.flatMap((r) => r.newly_revealed))].sort();
    findings = [...new Set(recomputed.flatMap((r) => r.findings))].sort();
  }

  // 5. disclosure_binding (both tiers)
  if (disclosure) {
    const recordsByDigest = new Map();
    for (const w of windows) recordsByDigest.set(recordDigest(w), w);
    for (const r of rescoreRecords) recordsByDigest.set(recordDigest(r), r);
    const dr = verifyDisclosure({ disclosure, chain, recordsByDigest, tier });
    if (!dr.ok) return failCheck("disclosure_binding", dr.rawCode, dr.reason);
    mark("disclosure_binding", "ok");
  } else mark("disclosure_binding", "not_in_tier");

  // 6. contests_valid (both tiers)
  if (contests.length || acks.length) {
    const recordsByDigest = new Map();
    for (const r of rescoreRecords) recordsByDigest.set(recordDigest(r), r);
    for (const w of windows) recordsByDigest.set(recordDigest(w), w);
    for (const contest of contests) {
      const cr = await validateContest({ contest, recordsByDigest, verifySig });
      if (!cr.ok) return failCheck("contests_valid", cr.rawCode, cr.reason);
    }
    const contestDigests = new Set(contests.map(recordDigest));
    for (const ack of acks) {
      const ar = await validateAcknowledgement({
        ack,
        contestDigests,
        verifySig,
        providerPublicKeySpkiB64,
      });
      if (!ar.ok) return failCheck("contests_valid", ar.rawCode, ar.reason);
    }
    mark("contests_valid", "ok");
  } else mark("contests_valid", "not_in_tier");

  // 7. attestation_roots (Tier A): the signed roots must recompute from the ledger records
  // (V20: a tampered ledger cannot hide behind a public root).
  if (skipLedger) mark("attestation_roots", "not_in_tier");
  else if (attestation) {
    const roots = {
      windows_root: merkleRootSorted(windows.map(recordDigest)),
      merge_chain_root: merkleRootSorted(mergeEvents.map(recordDigest)),
      rescore_root: merkleRootSorted(rescoreRecords.map(recordDigest)),
      disclosure_root: merkleRootSorted(disclosure ? [recordDigest(disclosure)] : []),
      contest_root: merkleRootSorted([...contests, ...acks].map(recordDigest)),
      chain_digest: chain ? chainDigest(chain) : merkleRootSorted([]),
    };
    for (const [k, v] of Object.entries(roots)) {
      if (attestation[k] !== v)
        return failCheck("attestation_roots", 22, "attestation_chain_mismatch");
    }
    mark("attestation_roots", "ok");
  } else mark("attestation_roots", "not_in_tier");

  // 8. manifest_signature (both tiers): adapter-supplied result, mapped to raw 25 on failure.
  if (manifestCheck && manifestCheck.ok) mark("manifest_signature", "ok");
  else
    return failCheck(
      "manifest_signature",
      25,
      manifestCheck ? manifestCheck.reason : "manifest_absent"
    );

  return verdict(0, null);
}

export { LEDGER_CHECKS };
