// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the static census (spec §2.1-§2.3, Annex A1).
//
// Parses with acorn 8.17.0, PINNED EXACTLY. An earlier draft said "node:module + a lightweight AST
// walk, or a regex fallback" — an unresolved choice AND technically wrong: node:module is the
// module-resolution API and exposes no parser (its exports are _cache, _findPath, createRequire).
// Regex over source is the class of mistake spec §2.5 deleted.
//
// The parser enters the closure as an `imported_dependency` with its version committed. The tool
// that measures the closure is named in the closure; otherwise the census has an unmeasured oracle
// at its root.
//
// Non-JS languages use documented LINE SCANNERS, and every member records `extraction_method` so a
// reviewer can see which claims rest on a real parse and which on a scan. Silent best-effort is how
// a census stops being one.

import * as acorn from "acorn";
import { sourceSpanDigest, decodeUtf8Strict } from "./sourceDigest.mjs";
import { makeFunctionId, symbol as sym, FILE_GATE_SYMBOL } from "./functionId.mjs";

export const PARSER = Object.freeze({ name: "acorn", version: "8.17.0", ecmaVersion: 2024 });

/** Test-runner callbacks are NOT members: they are invocations of a gate, not units of it. */
const TEST_CALLEES = new Set(["test", "it", "describe", "suite", "before", "after"]);

/** Which root a repo-relative path belongs to. Order matters: R8 before the generic R2 check. */
export function rootFor(path) {
  if (/^tools\/simurgh-attestation\/stage5[a-p]\//.test(path)) return "R1";
  if (/^tests\/e2e\/llmShield\/stage5[a-p]\//.test(path)) return "R2";
  if (/^proofs\/stage5[a-p]\//.test(path)) return "R3";
  if (/^scripts\/(reproduce|build)-llm-shield-stage5[a-p]/.test(path)) return "R4";
  if (/^\.github\/workflows\//.test(path)) return "R5";
  if (/^tests\/unit\/llmShield\/stage5[a-p]\//.test(path)) return "R8";
  return null;
}

/** Stage id from a path, or "cross" for members that belong to no single stage. */
export function stageFor(path) {
  const m = /stage-?5([a-p])\b/.exec(path) || /stage5([a-p])\//.exec(path);
  return m ? `5${m[1]}` : "cross";
}

const isFnNode = (n) =>
  n &&
  (n.type === "FunctionDeclaration" ||
    n.type === "FunctionExpression" ||
    n.type === "ArrowFunctionExpression");

/**
 * Parse a JavaScript/ESM source into members and edges.
 *
 * @param {{ path: string, bytes: Buffer }} file
 * @returns {{ members: object[], edges: object[] }}
 */
export function parseJs({ path, bytes }) {
  const text = decodeUtf8Strict(bytes);
  const stageId = stageFor(path);
  const root = rootFor(path);
  const members = [];
  const edges = [];
  const digest = sourceSpanDigest(bytes);

  const add = (symbolName, category, node, exported) => {
    const id = makeFunctionId({ stageId, modulePath: path, symbol: symbolName });
    members.push({
      function_id: id,
      stage_id: stageId,
      module_path: path,
      export_name_or_internal_symbol: symbolName,
      source_digest: digest,
      category,
      root,
      exported,
      runtime_visible: exported,
      extraction_method: "acorn",
    });
    return id;
  };

  let ast;
  try {
    ast = acorn.parse(text, {
      ecmaVersion: PARSER.ecmaVersion,
      sourceType: "module",
      locations: true,
      allowHashBang: true,
    });
  } catch (error) {
    // A parse failure is DATA, not a crash: an unparseable module in the closure is a
    // precommit_blocker, and swallowing it would shrink the universe silently.
    return {
      members: [],
      edges: [],
      parseError: { path, message: String(error.message) },
    };
  }

  // Walk top-level statements. Deliberately shallow-plus-targeted rather than a full generic
  // visitor: every member category we admit is reachable from a known statement shape, and a
  // generic walker would invent members from expression internals we do not claim to inventory.
  const declareFrom = (decl, exported) => {
    if (decl?.type === "FunctionDeclaration" && decl.id) {
      const id = add(
        sym.top(decl.id.name),
        exported ? "exported_function" : "internal_function",
        decl,
        exported
      );
      collectInner(decl.body, decl.id.name, id);
    } else if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations) {
        if (!d.id || d.id.type !== "Identifier") continue;
        if (isFnNode(d.init)) {
          const id = add(
            sym.top(d.id.name),
            exported ? "exported_function" : "internal_function",
            d,
            exported
          );
          collectInner(d.init.body, d.id.name, id);
        } else if (exported) {
          add(sym.top(d.id.name), "exported_constant", d, true);
        }
      }
    } else if (decl?.type === "ClassDeclaration" && decl.id) {
      for (const el of decl.body.body) {
        if (el.type !== "MethodDefinition" || el.key?.type !== "Identifier") continue;
        const s = el.static
          ? sym.staticMethod(decl.id.name, el.key.name)
          : sym.instanceMethod(decl.id.name, el.key.name);
        add(s, exported ? "exported_function" : "internal_function", el, exported);
      }
    }
  };

  function collectInner(body, outerName, outerId) {
    if (!body || body.type !== "BlockStatement") return;
    for (const stmt of body.body) {
      if (stmt.type === "FunctionDeclaration" && stmt.id) {
        const id = add(sym.nested(outerName, stmt.id.name), "internal_function", stmt, false);
        edges.push({
          kind: "call_edge",
          from_function_id: outerId,
          to_function_id: id,
          derivation: "acorn_static",
          confidence: "exact",
        });
      }
    }
  }

  for (const node of ast.body) {
    if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) declareFrom(node.declaration, true);
      if (node.source) {
        edges.push({
          kind: "reexport_edge",
          from_function_id: makeFunctionId({ stageId, modulePath: path, symbol: FILE_GATE_SYMBOL }),
          to_unresolved: node.source.value,
          derivation: "acorn_static",
          confidence: "exact",
        });
      }
    } else if (node.type === "ExportDefaultDeclaration") {
      add(sym.default(), "exported_function", node, true);
    } else if (node.type === "ImportDeclaration") {
      edges.push({
        kind: "import_edge",
        from_function_id: makeFunctionId({ stageId, modulePath: path, symbol: FILE_GATE_SYMBOL }),
        to_unresolved: node.source.value,
        derivation: "acorn_static",
        confidence: "exact",
      });
    } else {
      declareFrom(node, false);
    }
  }

  // Verifier branches: `reject("S2.C3", "outcome")` — one member per distinct EMISSION SITE, not
  // per (check, outcome) pair. The live census proved the pair alone collides: 5P's section2Verifier
  // emits the same pair from three different sites. An ordinal per pair keeps them distinct.
  const branchOrdinal = new Map();
  walkCalls(ast, (call) => {
    const callee = call.callee?.name;
    if (callee === "reject" && call.arguments.length >= 2) {
      const [a, b] = call.arguments;
      if (a?.type === "Literal" && b?.type === "Literal") {
        const key = `${a.value}/${b.value}`;
        const ordinal = (branchOrdinal.get(key) ?? 0) + 1;
        branchOrdinal.set(key, ordinal);
        add(
          sym.verifierBranch(String(a.value), String(b.value), ordinal),
          "verifier_branch",
          call,
          false
        );
      }
    }
    // A dynamic call becomes an EXPLICIT unresolved edge. It never disappears: a silently dropped
    // edge is a silently missing caller, and a missing caller is how delegation becomes a lie.
    if (call.callee?.type === "MemberExpression" && call.callee.computed) {
      edges.push({
        kind: "call_edge",
        from_function_id: makeFunctionId({ stageId, modulePath: path, symbol: FILE_GATE_SYMBOL }),
        to_unresolved: "<computed-member-call>",
        derivation: "acorn_static",
        confidence: "heuristic",
      });
    }
  });

  // Dynamic import is an `ImportExpression` in ESTree, NOT a CallExpression with callee.type
  // "Import" — verified against acorn rather than assumed. A first version looked for the wrong
  // node type and silently produced no edge, which is precisely the disappearing-edge failure this
  // code exists to prevent. A literal specifier still resolves; a computed one stays unresolved.
  walkNodes(ast, "ImportExpression", (node) => {
    edges.push({
      kind: "import_edge",
      from_function_id: makeFunctionId({ stageId, modulePath: path, symbol: FILE_GATE_SYMBOL }),
      to_unresolved:
        node.source?.type === "Literal" ? String(node.source.value) : "<dynamic-import>",
      derivation: "acorn_static",
      confidence: node.source?.type === "Literal" ? "exact" : "heuristic",
    });
  });

  // R8 gate files: the FILE is a member (second gauntlet B3). Without this, a unit-test file that
  // exports nothing and whose test() callbacks are excluded would yield no member at all, and the
  // annex that admitted 243 files would admit them into nothing.
  if (root === "R8" || root === "R2") {
    const hasBuilder = members.some((m) => m.category === "exported_function");
    members.push({
      function_id: makeFunctionId({ stageId, modulePath: path, symbol: FILE_GATE_SYMBOL }),
      stage_id: stageId,
      module_path: path,
      export_name_or_internal_symbol: FILE_GATE_SYMBOL,
      source_digest: digest,
      category: hasBuilder ? "evidence_emission" : "gate_definition",
      root,
      exported: false,
      runtime_visible: false,
      extraction_method: "acorn",
    });
  }

  return { members, edges };
}

/**
 * Minimal targeted walker: visits nodes of one type without inventing members.
 *
 * Deliberately not a generic visitor — a generic walk over expression internals would mint members
 * for units this census does not claim to inventory, inflating the universe with targets no attack
 * pack could meaningfully aim at.
 */
function walkNodes(node, type, visit, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (node.type === type) visit(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walkNodes(c, type, visit, seen));
    else if (v && typeof v === "object" && typeof v.type === "string") {
      walkNodes(v, type, visit, seen);
    }
  }
}

const walkCalls = (node, visit) => walkNodes(node, "CallExpression", visit);

/** Documented line scanners for the languages acorn cannot parse. */
const SCANNERS = Object.freeze({
  ".py": { re: /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)/, category: "python_mirror" },
  ".lean": { re: /^(?:theorem|lemma)\s+([A-Za-z0-9_'.]+)/, category: "lean_theorem" },
  ".sh": { re: /^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)/, category: "shell_step" },
});

export function parseScanned({ path, bytes, ext }) {
  const scanner = SCANNERS[ext];
  if (!scanner) return { members: [], edges: [] };
  const text = decodeUtf8Strict(bytes);
  const digest = sourceSpanDigest(bytes);
  const stageId = stageFor(path);
  const root = rootFor(path);
  const members = [];
  for (const line of text.split("\n")) {
    const m = scanner.re.exec(line);
    if (!m) continue;
    members.push({
      function_id: makeFunctionId({ stageId, modulePath: path, symbol: sym.top(m[1]) }),
      stage_id: stageId,
      module_path: path,
      export_name_or_internal_symbol: m[1],
      source_digest: digest,
      category: scanner.category,
      root,
      exported: true,
      runtime_visible: false,
      // Recorded per member, never assumed: a reviewer must be able to see which claims rest on a
      // real parse and which on a line scan.
      extraction_method: "line_scanner",
    });
  }
  return { members, edges: [] };
}

/**
 * Build the static census over a set of files.
 *
 * `staticCensus` returns members and edges ONLY. It receives no previous census and therefore
 * cannot compute succession hints — that lives in censusCompare.mjs, because a current-state census
 * must not claim temporal knowledge it does not possess (gauntlet P0-7).
 */
export function staticCensus({ files }) {
  const members = [];
  const edges = [];
  const parseErrors = [];
  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf("."));
    const out = ext === ".mjs" || ext === ".js" ? parseJs(file) : parseScanned({ ...file, ext });
    if (out.parseError) parseErrors.push(out.parseError);
    members.push(...out.members);
    edges.push(...out.edges);
  }

  // Duplicate ids are a HARD failure, not last-write-wins. Canonical sorting downstream would
  // otherwise collapse two records into one and shrink the universe invisibly.
  const byId = new Map();
  const duplicates = [];
  for (const m of members) {
    if (byId.has(m.function_id)) duplicates.push(m.function_id);
    else byId.set(m.function_id, m);
  }

  return { members, byId, edges, parseErrors, duplicates };
}
