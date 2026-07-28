// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The repaired Lean proof gate — Q1-F001.
//
// WHAT WENT WRONG. `stage-4-lean-proofs.yml` named its proof files. Names drift and directories
// grow: 27 named, 38 on disk, 11 never type-checked. The instruction that opened this repair was
// to fix the CAMERA and never the photograph — adding the eleven names was prohibited, because a
// list that fell eleven behind once will fall behind again.
//
// WHY DISCOVERY ALONE IS NOT THE FIX. A gate that discovers its inputs passes an empty directory
// with zero invocations and zero complaints. So discovery is paired with two guards that fail in
// opposite directions: a count floor (catches a deleted proof) and an independent directory walk
// (catches an enumeration that silently skips a whole stage). Neither subsumes the other.
//
// AND WHY TYPE-CHECKING IS NOT THE POINT. `lean` exits 0 on a file whose theorem is closed by
// `sorry` — it is a warning, not an error. Measured, not assumed: a seeded `sorry` passed the
// legacy gate in complete silence. The escape scan is the load-bearing check, and it runs over
// comment-stripped source, because a scan that reads prose reports findings about prose.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { posix } from "node:path";

/** Every way this gate is allowed to say no. Frozen: 5Q-F004..F012 were shallow-frozen exports. */
export const GATE_REASONS = Object.freeze({
  ENUMERATION_EMPTY: "lean_gate_enumeration_empty",
  BELOW_FLOOR: "lean_gate_below_floor",
  DIRECTORY_UNCOVERED: "lean_gate_directory_uncovered",
  UNTERMINATED_COMMENT: "lean_gate_unterminated_comment",
  UNTERMINATED_STRING: "lean_gate_unterminated_string",
  STRIPS_TO_NOTHING: "lean_gate_strips_to_nothing",
  NO_DECLARATION: "lean_gate_no_declaration",
  ESCAPE_HATCH: "lean_gate_escape_hatch",
  CORPUS_PROVES_NOTHING: "lean_gate_corpus_proves_nothing",
  TYPECHECK_FAILED: "lean_gate_typecheck_failed",
  MISSING_LEAN: "lean_gate_missing_lean_binary",
});

/**
 * An escape hatch is the formal analogue of a vacuous gate: it type-checks, it is green, and it
 * establishes nothing. `axiom` is here because a proof that assumes its conclusion is not one.
 */
const ESCAPES =
  /\bsorry\b|\badmit\b|\bnative_decide\b|^\s*axiom\s|\bunsafe\s|@\[implemented_by|\bpartial\s+def\b/m;

/** Any declaration form. A file of `#eval`s is not a proof file, whatever its extension says. */
const DECLARATION = /\b(theorem|lemma|example|def|abbrev|structure|inductive|class|instance)\b/;

/** The corpus as a whole must actually prove something, not merely define things. */
const PROVES = /\b(theorem|lemma)\b/;

const IDENT_CHAR = /[A-Za-z0-9_'!?]/;
/** `'a'` or `'\n'` — a char literal, as opposed to the prime in a Lean identifier like `h'`. */
const CHAR_LITERAL = /^'(?:\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)|[^'\\])'/;

/**
 * Strip Lean comments and string bodies, preserving line structure.
 *
 * Three vectors this closes, each of which reproduces in three lines against the stripper Stage 5R
 * shipped, and two of which are silent FALSE NEGATIVES rather than noisy failures:
 *
 *   1. nested `/- ... /- ... -/ ... -/` — closing at the first `-/` reads the outer tail as code
 *      (noisy: a legitimate proof fails);
 *   2. an unterminated `/-` swallowed the rest of the file, so a `sorry` below it was invisible
 *      and the file still stripped to plausible code, leaving the vacuity guard quiet (silent);
 *   3. `'` was treated as a string delimiter, but Lean identifiers legally carry it — so every
 *      character between `a'` and `b'`, `sorry` included, was dropped (silent).
 *
 * @returns {{ code: string, error: null | "unterminated_comment" | "unterminated_string" }}
 */
export function stripLeanComments(source) {
  const s = String(source);
  let out = "";
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];

    if (c === "-" && d === "-") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }

    if (c === "/" && d === "-") {
      let depth = 0;
      while (i < s.length) {
        if (s[i] === "/" && s[i + 1] === "-") {
          depth++;
          i += 2;
          continue;
        }
        if (s[i] === "-" && s[i + 1] === "/") {
          depth--;
          i += 2;
          if (depth === 0) break;
          continue;
        }
        if (s[i] === "\n") out += "\n";
        i++;
      }
      // EOF inside a block comment is a refusal, never a silent strip of everything below it.
      if (depth !== 0) return { code: out, error: "unterminated_comment" };
      continue;
    }

    if (c === '"') {
      out += '""';
      i++;
      let closed = false;
      while (i < s.length) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === '"') {
          i++;
          closed = true;
          break;
        }
        if (s[i] === "\n") out += "\n";
        i++;
      }
      if (!closed) return { code: out, error: "unterminated_string" };
      continue;
    }

    if (c === "'") {
      // A prime only opens a char literal when it does not continue an identifier.
      const prev = i > 0 ? s[i - 1] : "";
      if (!IDENT_CHAR.test(prev) && CHAR_LITERAL.test(s.slice(i))) {
        i += CHAR_LITERAL.exec(s.slice(i))[0].length;
        out += "''";
        continue;
      }
      out += c;
      i++;
      continue;
    }

    out += c;
    i++;
  }

  return { code: out, error: null };
}

/** Every `.lean` under `root`, deterministically ordered. Recursive descent. */
export function enumerateProofs(root) {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = posix.join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".lean")) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

/**
 * The second walk, deliberately implemented by a DIFFERENT mechanism than `enumerateProofs`.
 * Two implementations of the same question is the only way one of them checks the other; a
 * coverage guard that calls the enumerator it is auditing proves nothing at all.
 */
function directoryWalk(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".lean"))
    .map((e) =>
      posix.join(
        String(e.parentPath ?? e.path)
          .split("\\")
          .join("/"),
        e.name
      )
    )
    .sort();
}

/**
 * Audit a proof corpus. First-failure order is frozen: corpus shape, then per-file in enumeration
 * order, then the corpus-level proof obligation.
 *
 * @param {{root: string, floor?: number, typecheck?: boolean,
 *          enumerate?: (root: string) => string[],
 *          typecheckFile?: (path: string) => {ok: boolean, output: string}}} opts
 */
export function auditCorpus(opts) {
  const { root, floor = 0, typecheck = false, enumerate = enumerateProofs, typecheckFile } = opts;
  const files = enumerate(root);
  const fail = (reason, file, detail) => ({
    ok: false,
    count: files.length,
    failures: [{ reason, file, detail }],
  });

  if (files.length === 0) {
    return fail(
      GATE_REASONS.ENUMERATION_EMPTY,
      root,
      "zero proof files — a gate with nothing to check is a false green"
    );
  }
  if (files.length < floor) {
    return fail(GATE_REASONS.BELOW_FLOOR, root, `${files.length} < floor ${floor}`);
  }

  const seen = new Set(files);
  for (const path of directoryWalk(root)) {
    if (!seen.has(path)) {
      return fail(GATE_REASONS.DIRECTORY_UNCOVERED, path, "on disk, absent from the enumeration");
    }
  }

  let proves = false;
  for (const path of files) {
    const raw = readFileSync(path, "utf8");
    const { code, error } = stripLeanComments(raw);
    if (error === "unterminated_comment")
      return fail(GATE_REASONS.UNTERMINATED_COMMENT, path, error);
    if (error === "unterminated_string") return fail(GATE_REASONS.UNTERMINATED_STRING, path, error);
    if (raw.trim() !== "" && code.trim() === "") {
      return fail(
        GATE_REASONS.STRIPS_TO_NOTHING,
        path,
        "stripping left nothing — the scan would be vacuous"
      );
    }
    // The escape scan outranks the shape check. A file whose only content is `axiom cheat : False`
    // carries no declaration AND assumes its conclusion; reporting the shape would mask the graver
    // refusal behind the lesser one.
    const hatch = ESCAPES.exec(code);
    if (hatch) return fail(GATE_REASONS.ESCAPE_HATCH, path, hatch[0].trim());
    if (!DECLARATION.test(code)) {
      return fail(GATE_REASONS.NO_DECLARATION, path, "no declaration survived stripping");
    }
    if (PROVES.test(code)) proves = true;
  }

  if (!proves) {
    return fail(
      GATE_REASONS.CORPUS_PROVES_NOTHING,
      root,
      "no theorem or lemma in the whole corpus"
    );
  }

  if (typecheck) {
    for (const path of files) {
      const result = typecheckFile(path);
      if (!result.ok)
        return fail(result.reason ?? GATE_REASONS.TYPECHECK_FAILED, path, result.output);
    }
  }

  return { ok: true, count: files.length, failures: [] };
}
