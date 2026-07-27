// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 20: reading an inherited member, read-only, and locating its symbol.
//
// 5R'S OWN COPY, NOT AN IMPORT. §2.4 forbids importing a stage5{a..q} module in the primary worktree,
// so the canonicalisation and digest below are reimplemented here against 5Q's published definition
// rather than borrowed from its code. The domain string is 5Q's on purpose: the point is to recompute
// the pin 5Q published, and a digest under a different domain would recompute nothing.
//
// READ-ONLY, ALWAYS. Ruling 5 and §2.3: the 5Q evidence tree and the stage5{a..q} sources are never
// written, not even temporarily. Nothing in this file opens a file for writing, and the probe it
// serves is static — it reads bytes and evaluates a predicate. It does not execute a member, and it
// could not: executing 5A–5Q code is exactly the thing §2.4 exists to prevent.
//
// SYMBOL LOCATION IS BEST-EFFORT AND SAYS SO. When the symbol cannot be located the cell is
// `unsupported_target_shape`, never "clean". A scan that cannot find what it was asked about must
// report that it could not, because "I did not find the defect" and "I could not look" are different
// facts and only one of them is evidence.

import { createHash } from "node:crypto";

/** 5Q's published domain. Recomputing 5Q's pin under any other domain recomputes nothing. */
export const INHERITED_SPAN_DOMAIN = "simurgh.vsr.source-span.v1";

/** Extension → the language its signals are written for. */
export const LANGUAGE_OF = Object.freeze({
  ".mjs": "js",
  ".js": "js",
  ".lean": "lean",
  ".py": "python",
  ".sh": "shell",
  ".yml": "yaml",
  ".yaml": "yaml",
});

/**
 * 5Q's canonical source bytes: BOM rejected rather than stripped, CRLF and lone CR normalised,
 * exactly one trailing newline, and no comment or whitespace removal of any kind.
 *
 * @param {Buffer|Uint8Array} input
 * @returns {Buffer}
 */
export function canonicalSourceBytes(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("member source: BOM present; canonical source bytes reject a BOM");
  }
  const text = bytes.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("member source: BOM present; canonical source bytes reject a BOM");
  }
  const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(lf.endsWith("\n") ? lf : `${lf}\n`, "utf8");
}

/**
 * The digest 5Q pinned for a member's file.
 *
 * @param {Buffer|Uint8Array} input
 * @returns {string}
 */
export function inheritedSourceDigest(input) {
  return createHash("sha256")
    .update(Buffer.from(INHERITED_SPAN_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(canonicalSourceBytes(input))
    .digest("hex");
}

/** Where a JS declaration of `symbol` might begin. */
function jsDeclarationIndex(text, symbol) {
  const patterns = [
    `function ${symbol}(`,
    `function ${symbol} (`,
    `const ${symbol} =`,
    `let ${symbol} =`,
    `var ${symbol} =`,
    `class ${symbol} `,
    `${symbol}(`,
  ];
  for (const p of patterns) {
    const at = text.indexOf(p);
    if (at !== -1) return at;
  }
  return -1;
}

/**
 * Extract the source span of one member from its file.
 *
 * JS: from the declaration to the close of its first balanced brace group, so the span is the
 * member's body rather than its file. A file-wide scan would let one defective line anywhere make
 * every member of that file look defective, which is how a per-cell result becomes a per-file rumour.
 *
 * Lean: from the declaration to the next top-level declaration.
 *
 * @param {{text: string, symbol: string, language: string}} input
 * @returns {{ok: boolean, span?: string, reason?: string}}
 */
export function extractMemberSpan({ text, symbol, language }) {
  if (language === "js") {
    const at = jsDeclarationIndex(text, symbol);
    if (at === -1) return { ok: false, reason: "symbol not located in its module" };
    const open = text.indexOf("{", at);
    if (open === -1) return { ok: false, reason: "no body to read" };
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) return { ok: true, span: text.slice(at, i + 1) };
      }
    }
    return { ok: false, reason: "unbalanced body — the span cannot be bounded" };
  }

  if (language === "lean") {
    const re = new RegExp(`^\\s*(?:@\\[[^\\]]*\\]\\s*)?(?:theorem|lemma|def)\\s+${symbol}\\b`, "m");
    const m = re.exec(text);
    if (!m) return { ok: false, reason: "symbol not located in its module" };
    const rest = text.slice(m.index + m[0].length);
    const next = /^\s*(?:@\[[^\]]*\]\s*)?(?:theorem|lemma|def|end|namespace)\s/m.exec(rest);
    return { ok: true, span: m[0] + (next ? rest.slice(0, next.index) : rest) };
  }

  return { ok: false, reason: `no span reader for ${language}` };
}
