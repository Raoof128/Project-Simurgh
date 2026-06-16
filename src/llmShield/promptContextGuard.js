// SPDX-License-Identifier: AGPL-3.0-or-later
// Framing-aware DETERMINISTIC guard (heuristics, NOT semantic understanding).
// Decides whether a block-worthy match sits inside quoted / educational framing,
// in which case the firewall de-escalates blocked -> warning. This is what keeps
// educational discussion of attack phrases out of the hard-block path.

const EDUCATIONAL_LEAD_IN =
  /\b(explain (why|how)|define|what (is|does)|is (it|asking)|always (malicious|legitimate)|harmless (one[- ]line )?example|for a slide|in a (security|safety) class|give an example)\b/;

// Extract the contents of every quote pair (straight or curly) holding 3+ chars.
function quotedSpans(text) {
  return [...text.matchAll(/['"‘’“”]([^'"‘’“”]{3,})['"‘’“”]/g)].map((m) => m[1].toLowerCase());
}

// De-escalate blocked -> warning ONLY when an actually-matched attack phrase is
// itself quoted, or the utterance carries an educational lead-in. A stray quoted
// word elsewhere must never soften a bare imperative attack.
export function deescalatesToWarning(canonical, matchedPhrases = []) {
  const text = String(canonical ?? "").toLowerCase();
  if (matchedPhrases.length === 0) return false;
  const spans = quotedSpans(text);
  const phraseQuoted = matchedPhrases.some((p) =>
    spans.some((span) => span.includes(String(p).toLowerCase()))
  );
  if (phraseQuoted) return true;
  return EDUCATIONAL_LEAD_IN.test(text);
}
