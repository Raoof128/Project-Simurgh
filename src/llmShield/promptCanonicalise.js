// SPDX-License-Identifier: AGPL-3.0-or-later
// Attack-aware canonical forms for classification. Pure, deterministic, no network.
// Built on top of normalisePrompt (NFKC + zero-width/control strip). Produces:
//   canonical: homoglyph- and leet-folded, lowercased, spacing preserved
//   compact:   canonical with all non-alphanumerics removed (defeats split/symbol)
//   signals:   transformations actually applied (enum codes only — never raw text)
// Base64 blobs are DECODED FOR INSPECTION ONLY and appended to the scan view.

// Curated confusables (look-alike -> ASCII). Intentionally small and auditable.
const HOMOGLYPHS = Object.freeze({
  // Cyrillic
  А: "a", а: "a", Е: "e", е: "e",
  О: "o", о: "o", Р: "p", р: "p",
  С: "c", с: "c", Х: "x", х: "x",
  І: "i", і: "i", Һ: "h", ԁ: "d",
  // Greek
  Α: "a", α: "a", Ο: "o", ο: "o",
  Ε: "e", ε: "e", Ρ: "p", ρ: "p",
});

// Leetspeak / symbol substitutions applied only when adjacent to letters (word
// context). General mappings — NOT corpus-specific. '1'->i and '!','|'->i because
// the attack vocabulary (ignore/instructions) favours 'i'; digits with no letter
// neighbour (e.g. years like 2026) are left untouched.
const LEET = Object.freeze({
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "!": "i", "|": "i",
});

function foldHomoglyphs(s) {
  let changed = false;
  let out = "";
  for (const ch of s) {
    const mapped = HOMOGLYPHS[ch];
    if (mapped) {
      out += mapped;
      changed = true;
    } else {
      out += ch;
    }
  }
  return { out, changed };
}

function foldLeet(s) {
  // Replace a leet char only if it has a letter neighbour (so "2026" stays numeric).
  let changed = false;
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const sub = LEET[chars[i]];
    if (!sub) continue;
    const prev = chars[i - 1] ?? "";
    const next = chars[i + 1] ?? "";
    if (/[a-z]/i.test(prev) || /[a-z]/i.test(next)) {
      chars[i] = sub;
      changed = true;
    }
  }
  return { out: chars.join(""), changed };
}

// No trailing \b (it would not match after '=' padding). Candidate blobs only.
const BASE64_RE = /[A-Za-z0-9+/]{16,}={0,2}/g;

function decodeBase64Blobs(s) {
  let decodedAny = false;
  let appended = "";
  for (const m of s.matchAll(BASE64_RE)) {
    const blob = m[0];
    if (blob.length % 4 !== 0) continue;
    try {
      const decoded = Buffer.from(blob, "base64").toString("utf8");
      // Accept only printable ASCII decodings — treat as inspectable text, never execute.
      if (decoded.length >= 4 && /^[\x20-\x7E]+$/.test(decoded)) {
        appended += " " + decoded;
        decodedAny = true;
      }
    } catch {
      /* ignore non-decodable blobs */
    }
  }
  return { appended, decodedAny };
}

export function canonicalisePrompt(normalisedInput) {
  const signals = [];
  const base = String(normalisedInput ?? "");

  // 1. Decode base64 FIRST, from the original-case string, before any folding —
  //    base64 is case-sensitive and leet-folding would corrupt blob digits.
  const b64 = decodeBase64Blobs(base);
  if (b64.decodedAny) signals.push("base64_decoded");
  const combined = base + b64.appended; // decoded plaintext appended for inspection

  // 2. Fold look-alikes and leet/symbols over the combined text, then lowercase.
  const homo = foldHomoglyphs(combined);
  if (homo.changed) signals.push("homoglyph_fold");

  const leet = foldLeet(homo.out);
  if (leet.changed) signals.push("leet_fold");

  const canonical = leet.out.toLowerCase();
  const compact = canonical.replace(/[^a-z0-9]/g, "");
  return { canonical, compact, signals };
}
