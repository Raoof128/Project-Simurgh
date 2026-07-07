// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC tiered views — No Two Stories (spec §6.1). Motto: AnthropicSafe First, then ReviewerSafe.
//
// One capsule, N audience views. A view may REDACT, never CONTRADICT, and every
// redaction is ledgered. Salted per-section commitments bind the capsule root.
//   148 view_inconsistent_with_capsule  disclosed value fails its commitment / wrong root
//   149 redaction_undeclared            undeclared omission, count mismatch, or fabricated redaction commitment
import {
  recordDigest,
  sha256Hex,
  canonicalJson,
  merkleRootSorted,
} from "../../stage4m/core/canonical.mjs";
import { VIC_VIEW_SCHEMA } from "../constants.mjs";
import { setEqual } from "./templateMap.mjs";

export const sectionKey = (s) => `${s.regime}/${s.section_id}`;
export const sectionCommitment = (section, saltHex) => recordDigest({ salt: saltHex, section });

// Deterministic Lane A salt (Lane B overrides with random bytes).
export const deterministicSalt = (key) =>
  sha256Hex(canonicalJson({ seed: "stage4t-vic-salt-v1", key }));

// The capsule's full public commitment list: one { key, commitment } per projected section.
export function deriveCommitments(capsule, salts) {
  return (capsule.projected_sections ?? []).map((s) => {
    const key = sectionKey(s);
    return { key, commitment: sectionCommitment(s, salts[key]) };
  });
}

export function capsuleRoot(capsule, salts) {
  return merkleRootSorted(deriveCommitments(capsule, salts).map((c) => c.commitment));
}

export function buildView(capsule, tier, redactKeys, salts) {
  const redset = new Set(redactKeys);
  const disclosed = [];
  const redactions = { count: 0, keys: [], commitments: [] };
  for (const s of capsule.projected_sections ?? []) {
    const key = sectionKey(s);
    if (redset.has(key)) {
      redactions.keys.push(key);
      redactions.commitments.push(sectionCommitment(s, salts[key]));
    } else {
      disclosed.push({ key, section: s, salt: salts[key] });
    }
  }
  redactions.count = redactions.keys.length;
  return {
    schema: VIC_VIEW_SCHEMA,
    tier,
    capsule_root: capsuleRoot(capsule, salts),
    disclosed,
    redactions,
  };
}

// Primary verifier — needs only the view + the capsule's public commitment list
// (public-input verification; the browser verifier uses this exact form).
export function verifyViewAgainstCommitments(view, commitments) {
  const commitmentByKey = new Map(commitments.map((c) => [c.key, c.commitment]));

  // 148: the view's root must equal the Merkle root over all capsule commitments.
  if (view.capsule_root !== merkleRootSorted(commitments.map((c) => c.commitment)))
    return { raw: 148, reason: "view_inconsistent_with_capsule", detail: { part: "root" } };

  // 148: every disclosed section must recompute to the capsule's commitment for its key.
  for (const d of view.disclosed) {
    const expected = commitmentByKey.get(d.key);
    if (expected === undefined || sectionCommitment(d.section, d.salt) !== expected)
      return { raw: 148, reason: "view_inconsistent_with_capsule", detail: { key: d.key } };
  }

  // 149: disclosed ∪ redacted must exactly cover the capsule's section key set.
  const disclosedKeys = view.disclosed.map((d) => d.key);
  const covered = new Set([...disclosedKeys, ...view.redactions.keys]);
  if (!setEqual(covered, new Set(commitmentByKey.keys())))
    return { raw: 149, reason: "redaction_undeclared", detail: { part: "coverage" } };

  // 149: the redaction ledger must be internally honest and match capsule commitments.
  if (view.redactions.count !== view.redactions.keys.length)
    return { raw: 149, reason: "redaction_undeclared", detail: { part: "count" } };
  for (const [i, key] of view.redactions.keys.entries()) {
    const expected = commitmentByKey.get(key);
    if (expected === undefined || view.redactions.commitments[i] !== expected)
      return { raw: 149, reason: "redaction_undeclared", detail: { key } };
  }
  return null;
}

export function verifyView(view, capsule, salts) {
  return verifyViewAgainstCommitments(view, deriveCommitments(capsule, salts));
}
