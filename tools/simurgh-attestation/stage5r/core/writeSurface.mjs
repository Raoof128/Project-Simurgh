// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 1: the write-surface verifier.
//
// Frozen §2.3 declares the 5R write surface EXHAUSTIVE, in two parts:
//
//   STAGE-OWNED  paths where any write is permitted;
//   SHARED       six files where the FILE is permitted but the EDIT is not.
//
// The second part is the one that matters. 5Q shipped a single unrepaired write-surface violation of
// exactly this shape — a prior stage's test widened first and named afterwards — and the reason a
// path-based check cannot catch it is that the path was always allowed. So every shared entry is
// checked by PARSED BEFORE/AFTER STRUCTURE: "I only touched package.json" must not cover swapping a
// crypto library, and "I only touched check-e2e.sh" must not cover editing a prior stage's reproduce
// invocation.
//
// Everything here fails closed. A shared file whose content the caller could not supply is refused
// rather than waved through, because a checker that green-lights a shared path when it cannot see the
// diff has quietly turned back into a path check.

/** The exact `.prettierignore` line 5R is permitted to add — one line, named in advance. */
export const EVIDENCE_IGNORE_LINE = "docs/research/llm-shield/evidence/stage-5r/";

/** Stage-owned roots. Anchored at the start so `stage5rx` is not mistaken for `stage5r`. */
export const STAGE_OWNED_PATTERNS = Object.freeze([
  /^tools\/simurgh-attestation\/stage5r\//,
  /^tests\/(unit|e2e|fixtures)\/llmShield\/stage5r\//,
  /^proofs\/stage5r\//,
  /^docs\/research\/llm-shield\/evidence\/stage-5r\//,
  /^docs\/research\/llm-shield\/STAGE_5R_CLOSEOUT\.md$/,
  /^docs\/superpowers\/specs\/2026-07-27-stage-5r-vpf-verifiable-probe-families-design\.md$/,
  /^docs\/superpowers\/plans\/2026-07-27-stage-5r-vpf-implementation-plan\.md$/,
  /^scripts\/check-stage5r-proofs\.sh$/,
  /^scripts\/reproduce-llm-shield-stage5r\.sh$/,
  /^\.github\/workflows\/stage-5r-checks\.yml$/,
]);

/** The six shared files, each mapped to the rule that governs its permitted mutation. */
export const SHARED_FILES = Object.freeze({
  "package.json": "scripts_key_only",
  ".prettierignore": "one_evidence_line",
  "scripts/check-e2e.sh": "one_reproduce_entry",
  "scripts/security-audit-llm-shield-stage3m.sh": "one_allowlist_line",
  "scripts/security-audit-llm-shield-stage3o.sh": "one_allowlist_line",
  "README.md": "release_banner_only",
});

/**
 * @param {string} path repository-relative path
 * @returns {"stage_owned"|"shared"|"outside"}
 */
export function classifyPath(path) {
  if (typeof path !== "string" || path.length === 0) return "outside";
  if (Object.prototype.hasOwnProperty.call(SHARED_FILES, path)) return "shared";
  return STAGE_OWNED_PATTERNS.some((re) => re.test(path)) ? "stage_owned" : "outside";
}

const lines = (text) => String(text ?? "").split("\n");

/**
 * Multiset line diff. Sufficient here because every shared rule is expressed as "exactly N lines
 * added, zero removed" — none of them needs to know WHERE a line moved, only whether the set changed.
 *
 * @param {string} before
 * @param {string} after
 * @returns {{ added: string[], removed: string[] }}
 */
function lineDelta(before, after) {
  const count = (arr) => {
    const m = new Map();
    for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  };
  const b = count(lines(before));
  const a = count(lines(after));
  const added = [];
  const removed = [];
  for (const [line, n] of a) {
    const extra = n - (b.get(line) ?? 0);
    for (let i = 0; i < extra; i += 1) added.push(line);
  }
  for (const [line, n] of b) {
    const gone = n - (a.get(line) ?? 0);
    for (let i = 0; i < gone; i += 1) removed.push(line);
  }
  return { added, removed };
}

const content = (arr) => arr.filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));

const ok = (rule) => ({ ok: true, rule });
const no = (rule, reason) => ({ ok: false, rule, reason });

/**
 * package.json: the `scripts` key may change; nothing else may.
 */
function scriptsKeyOnly(before, after) {
  let b;
  let a;
  try {
    b = JSON.parse(before);
    a = JSON.parse(after);
  } catch (err) {
    return no("scripts_key_only", `package.json did not parse: ${err.message}`);
  }
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changed = [];
  for (const k of keys) {
    if (k === "scripts") continue;
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) changed.push(k);
  }
  return changed.length === 0
    ? ok("scripts_key_only")
    : no(
        "scripts_key_only",
        `package.json: only the scripts key may change; these also changed: ${changed.sort().join(", ")}`
      );
}

/**
 * .prettierignore: exactly one added CONTENT line, which must be the 5R evidence directory. Comment
 * and blank lines are permitted alongside it — the repository's own convention is a comment above the
 * path — but they cannot be used to smuggle a second ignore rule, because they are not content.
 */
function oneEvidenceLine(before, after) {
  const { added, removed } = lineDelta(before, after);
  if (removed.length > 0) {
    return no(
      "one_evidence_line",
      `.prettierignore: ${removed.length} line(s) removed; this file also protects other stages: ${removed
        .map((l) => l.trim())
        .join(" | ")}`
    );
  }
  const body = content(added);
  if (body.length !== 1) {
    return no(
      "one_evidence_line",
      `.prettierignore: expected exactly one added content line, got ${body.length}`
    );
  }
  return body[0].trim() === EVIDENCE_IGNORE_LINE
    ? ok("one_evidence_line")
    : no(
        "one_evidence_line",
        `.prettierignore: the added line must be "${EVIDENCE_IGNORE_LINE}" (the stage-5r evidence dir), got "${body[0].trim()}"`
      );
}

/**
 * check-e2e.sh: exactly one added line, and it must be a REPRODUCE entry naming 5R's reproduce
 * script. Removing or editing another stage's entry shows up as a removal and is refused.
 */
function oneReproduceEntry(before, after) {
  const { added, removed } = lineDelta(before, after);
  if (removed.length > 0) {
    return no(
      "one_reproduce_entry",
      `check-e2e.sh: ${removed.length} line(s) removed — a prior stage's entry must not be edited: ${removed
        .map((l) => l.trim())
        .join(" | ")}`
    );
  }
  const body = content(added);
  if (body.length !== 1) {
    return no(
      "one_reproduce_entry",
      `check-e2e.sh: expected exactly one added line, got ${body.length}`
    );
  }
  return /^\s*"[^"|]*5R[^"|]*\|scripts\/reproduce-llm-shield-stage5r\.sh"\s*$/i.test(body[0])
    ? ok("one_reproduce_entry")
    : no(
        "one_reproduce_entry",
        `check-e2e.sh: the added line must be a REPRODUCE entry for scripts/reproduce-llm-shield-stage5r.sh, got "${body[0].trim()}"`
      );
}

/**
 * The two security-audit allowlists: exactly one added exemption line, for 5R's own fixture keys, and
 * its filename character class must NOT admit digits.
 *
 * The no-digit rule is the load-bearing half. An exemption whose variable part accepts digits stops
 * being an exemption for THIS stage's fixture keys and becomes an exemption for anything shaped
 * roughly like them — which is how a real key acquires a hole to hide in.
 */
function oneAllowlistLine(before, after) {
  const { added, removed } = lineDelta(before, after);
  if (removed.length > 0) {
    return no(
      "one_allowlist_line",
      `audit allowlist: ${removed.length} line(s) removed; an existing exemption must not be dropped`
    );
  }
  const body = content(added);
  if (body.length !== 1) {
    return no(
      "one_allowlist_line",
      `audit allowlist: expected exactly one added line, got ${body.length}`
    );
  }
  const line = body[0];
  if (!/stage5r\//.test(line)) {
    return no(
      "one_allowlist_line",
      `audit allowlist: the added exemption must be for stage5r, got "${line.trim()}"`
    );
  }
  // Isolate the variable part: everything inside the bracketed or escaped class expressions.
  const permissive = [/\[[^\]]*0-9[^\]]*\]/, /\[[^\]]*\\d[^\]]*\]/, /\\w/, /\[\^/, /(?<!\\)\.\+/];
  for (const re of permissive) {
    if (re.test(line)) {
      return no(
        "one_allowlist_line",
        `audit allowlist: the filename class admits digits or arbitrary characters ("${line.trim()}"); use [A-Za-z-]+`
      );
    }
  }
  return ok("one_allowlist_line");
}

/**
 * README.md: every changed line must belong to the release banner.
 *
 * Honest about its own limit: this bounds WHERE the edit sits, not what the prose says. It stops an
 * unrelated paragraph riding in under "banner update", which is the smuggling route; it does not
 * review the sentence.
 */
function releaseBannerOnly(before, after) {
  const { added, removed } = lineDelta(before, after);
  const bannerish = (l) => /stage-5[a-z]|v\d+\.\d+\.\d+|🆕|img\.shields\.io/.test(l);
  const strays = [...added, ...removed].filter((l) => l.trim() !== "" && !bannerish(l));
  return strays.length === 0
    ? ok("release_banner_only")
    : no(
        "release_banner_only",
        `README.md: only the release banner may change; ${strays.length} non-banner line(s) changed: ${strays
          .map((l) => l.trim().slice(0, 60))
          .join(" | ")}`
      );
}

const RULES = {
  scripts_key_only: scriptsKeyOnly,
  one_evidence_line: oneEvidenceLine,
  one_reproduce_entry: oneReproduceEntry,
  one_allowlist_line: oneAllowlistLine,
  release_banner_only: releaseBannerOnly,
};

/**
 * Check one changed path.
 *
 * @param {{path: string, before?: string, after?: string}} change
 * @returns {{ok: boolean, rule?: string, reason?: string}}
 */
export function checkChange(change) {
  const { path, before, after } = change ?? {};
  const kind = classifyPath(path);
  if (kind === "stage_owned") return ok("stage_owned");
  if (kind === "outside") {
    return no("outside", `${path}: outside the 5R write surface (frozen §2.3 is exhaustive)`);
  }
  if (typeof before !== "string" || typeof after !== "string") {
    return no(
      SHARED_FILES[path],
      `${path}: shared files are checked by parsed before/after structure, and the content was not supplied — a path check is not a write-surface check`
    );
  }
  return RULES[SHARED_FILES[path]](before, after);
}

/**
 * Check a whole change set, reporting EVERY violation rather than stopping at the first — a verifier
 * that reports one problem per run teaches its operator to fix one problem per run.
 *
 * @param {Array<{path: string, before?: string, after?: string}>} changes
 * @returns {{ok: boolean, violations: Array<{path: string, rule: string, reason: string}>}}
 */
export function checkChangeSet(changes) {
  if (!Array.isArray(changes)) throw new TypeError("write surface: changes must be an array");
  const violations = [];
  for (const c of changes) {
    const r = checkChange(c);
    if (!r.ok) violations.push({ path: c?.path, rule: r.rule, reason: r.reason });
  }
  return { ok: violations.length === 0, violations };
}
