// SPDX-License-Identifier: AGPL-3.0-or-later
// Which forbidden local-data field names appear in a generated value.
//
// The smokes used to test `JSON.stringify(value).includes(term)`. A random base64url challenge
// or signature that happened to spell a short term ("pid") then failed the gate about once in
// several hundred runs. A leak is a field NAME, so the term must stand as a word: in a key or
// in a string value, bounded on both sides by a non-alphanumeric character or the string's
// edge. "daemon_pid" and "saw pid 4" are found; "Qk9pidZ3" and "rapid" are not.

function standsAsWord(text, term) {
  let from = 0;
  for (;;) {
    const at = text.indexOf(term, from);
    if (at === -1) return false;
    const before = at === 0 ? "" : text[at - 1];
    const after = at + term.length >= text.length ? "" : text[at + term.length];
    if (!/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after)) return true;
    from = at + 1;
  }
}

function collectStrings(value, out) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      collectStrings(item, out);
    }
  }
  return out;
}

export function forbiddenFieldsIn(value, terms) {
  const strings = collectStrings(value, []);
  return terms.filter((term) => strings.some((text) => standsAsWord(text, term)));
}
