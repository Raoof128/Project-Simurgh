// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — the Normalization Trilemma (plan Task 6). Motto: AnthropicSafe First, then
// ReviewerSafe. Over the buildable single-pass normalizer lattice, no corner has all three of
// {closes confusables, zero legit-diacritic over-block, fixed/data-free}. Corners A/B are REAL
// normalizers recomputed against the probe corpus; corner C (UTS-39 skeleton) is a DECLARED
// structural row (declared_only) — data-dependence makes it not-fixed, closure is asserted, not a
// full skeleton [G1/PG2]. [Lean trilemmaLatticeUnsat over the enumerated table.]
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";

const strip = (t) =>
  String(t)
    .normalize("NFKC")
    .replace(/[\p{M}\p{Default_Ignorable_Code_Point}]/gu, "");

// Corner A — ASCII allowlist: any residual non-ASCII char ⇒ obfuscation ⇒ FLAG.
export const flaggedAsciiAllowlist = (t) => {
  const s = strip(t);
  return /[^\x00-\x7F]/u.test(s) || scanLeakage(s, [], []).length > 0;
};
// Corner B — cross-script: FLAG a letter whose script is neither Latin nor Common (allows diacritics).
export const flaggedCrossScript = (t) => {
  const s = strip(t);
  for (const ch of s)
    if (/\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch) && !/\p{Script=Common}/u.test(ch))
      return true;
  return scanLeakage(s, [], []).length > 0;
};

// Probe corpus: a cross-script confusable (Cyrillic т), a Latin-internal confusable (dotless ı),
// and legitimate diacritics (no real trigger).
export const TRILEMMA_PROBE = Object.freeze({
  cross_script: "fifт" + "y accounts were exposed in the breach",
  latin_internal: "fıfty accounts were exposed in the breach",
  legit_diacritics: "the café staff updated the résumé templates",
});

// Recompute A/B outcomes; declare C.
export function cornerOutcomes() {
  const forFn = (fn) => ({
    closes_confusables: fn(TRILEMMA_PROBE.cross_script) && fn(TRILEMMA_PROBE.latin_internal),
    diacritic_overblock: fn(TRILEMMA_PROBE.legit_diacritics),
    fixed: true,
  });
  return [
    { corner: "ascii_allowlist", ...forFn(flaggedAsciiAllowlist) },
    { corner: "cross_script", ...forFn(flaggedCrossScript) },
    { corner: "uts39_skeleton", closes_confusables: true, diacritic_overblock: false, fixed: false, declared_only: true },
  ];
}

// Pick-2 invariant: no corner satisfies {closes ∧ ¬overblock ∧ fixed}.
export function trilemmaHolds(corners = cornerOutcomes()) {
  return corners.every((c) => !(c.closes_confusables && !c.diacritic_overblock && c.fixed));
}
