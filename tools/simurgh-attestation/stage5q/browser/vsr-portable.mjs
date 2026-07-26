// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the deterministic surface, portable across Node and a browser (Task 19.5).
//
// THE PARITY CLAIM IS FOUR-WAY, NOT THREE-WAY, AND THAT IS THE POINT.
//
// Three mirrors agreeing with each other proves the mirrors were written by the same person on the
// same afternoon. It says nothing about the code that actually computes the committed digests. So
// the chain that must hold is:
//
//     Node core  ≡  this portable module  ≡  Python  ≡  browser
//
// The first link is what makes the rest mean anything: `crossRuntimeParity.test.js` runs the REAL
// `core/sourceDigest.mjs`, `core/functionId.mjs` and stage5k's merkle against the same vectors this
// module computes. A portable mirror that agrees with two other mirrors while disagreeing with the
// implementation would be a parity claim over a surface nobody ships.
//
// NO NODE BUILT-INS. `globalThis.crypto.subtle` and `TextEncoder` exist in Node 26 and in every
// browser this could run in; `node:crypto` and `Buffer` exist in neither direction. Every function
// is async because `crypto.subtle.digest` is, and pretending otherwise would mean shipping a
// hand-rolled SHA-256 whose bugs are ours.
//
// THE SURFACE IS BOUNDED AND DECLARED. Nothing here touches the filesystem, the clock or a process.
// A parity claim over a function that reads the disk is a claim about two machines' disks.

export const DOMAIN = Object.freeze({
  sourceSpan: "simurgh.vsr.source-span.v1",
  closureMember: "simurgh.vsr.closure-member.v1",
  merkleLeaf: "simurgh.vuc.leaf.v1",
  merkleNode: "simurgh.vuc.node.v1",
});

/** The four coverage statuses (spec §2.7). A fifth value is not a status. */
export const COVERAGE_STATUSES = Object.freeze([
  "attacked_pass",
  "finding_frozen",
  "mechanically_unreachable",
  "delegated_to_attacked_caller",
]);

/** Omission reasons that make a member mechanically unreachable — `delegated` is NOT one. */
export const MECHANICAL_OMISSION_REASONS = Object.freeze([
  "no_such_input_surface",
  "no_trust_decision",
  "no_persistent_state",
  "single_runtime",
  "not_in_historical_closure",
]);

const SEP = ":";
const enc = new TextEncoder();

const concat = (...parts) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) => {
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`not lowercase hex: ${hex.slice(0, 24)}`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

/** Domain-separated digest: SHA256( UTF8(domain) || 0x00 || bytes ). */
export async function domainDigest(domain, bytes) {
  return sha256(concat(enc.encode(domain), new Uint8Array([0x00]), bytes));
}

/**
 * Canonical JSON: recursively key-sorted, then `JSON.stringify`.
 *
 * Python's mirror is `json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)`. The
 * two agree on every value in the parity surface, which is strings, integers, arrays and plain
 * objects. They diverge on floats and on non-BMP escaping, so neither appears in the surface — and
 * that exclusion is stated rather than hoped for.
 */
export function canonicalJson(value) {
  const canonicalise = (v) => {
    if (Array.isArray(v)) return v.map(canonicalise);
    if (v && typeof v === "object") {
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = canonicalise(v[key]);
      return out;
    }
    return v;
  };
  return JSON.stringify(canonicalise(value));
}

/**
 * Canonical source bytes (spec §2.5).
 *
 * BOM rejected rather than stripped; CRLF and lone CR to LF; exactly one trailing LF. Byte-level
 * only — no comment removal, no whitespace collapsing.
 */
export function canonicalSourceBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("canonical source bytes: input must be a Uint8Array");
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("source digest: BOM present; canonical source bytes reject a BOM");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("source digest: BOM present; canonical source bytes reject a BOM");
  }
  const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return enc.encode(lf.endsWith("\n") ? lf : `${lf}\n`);
}

export async function sourceSpanDigest(bytes) {
  return toHex(await domainDigest(DOMAIN.sourceSpan, canonicalSourceBytes(bytes)));
}

export function makeFunctionId({ stageId, modulePath, symbol }) {
  if (!stageId || !modulePath || !symbol) {
    throw new Error("function id: stageId, modulePath and symbol are all required");
  }
  if (String(modulePath).includes(SEP)) {
    throw new Error(`function id: module path must not contain '${SEP}': ${modulePath}`);
  }
  if (String(stageId).includes(SEP)) {
    throw new Error(`function id: stage id must not contain '${SEP}': ${stageId}`);
  }
  return `${stageId}${SEP}${modulePath}${SEP}${symbol}`;
}

export function parseFunctionId(id) {
  const first = id.indexOf(SEP);
  const second = id.indexOf(SEP, first + 1);
  if (first === -1 || second === -1) {
    throw new Error(`function id: malformed, expected stage:path:symbol — got ${id}`);
  }
  return {
    stageId: id.slice(0, first),
    modulePath: id.slice(first + 1, second),
    symbol: id.slice(second + 1),
  };
}

/** The nine immutable commitment fields, in the order that fixes the canonical bytes. */
export const COMMITMENT_FIELDS = Object.freeze([
  "function_id",
  "stage_id",
  "module_path",
  "export_name_or_internal_symbol",
  "source_digest",
  "category",
  "reachable_from",
  "security_role",
  "historical_tags",
]);

/** One closure member's Merkle leaf, hex. */
export async function closureLeafHash(row) {
  const projected = {};
  for (const field of COMMITMENT_FIELDS) projected[field] = row[field];
  const memberDigest = toHex(
    await domainDigest(DOMAIN.closureMember, enc.encode(JSON.stringify(projected)))
  );
  const payload = canonicalJson({
    leaf_id: row.function_id,
    leaf_type: "closure_member",
    subject_digest: `sha256:${memberDigest}`,
  });
  return toHex(await domainDigest(DOMAIN.merkleLeaf, enc.encode(payload)));
}

/**
 * Merkle root over leaf hex strings. ORDER-SENSITIVE.
 *
 * The odd leaf at the end of a level is PROMOTED, not duplicated. Duplicating it is the other
 * common convention and it produces a different root for the same leaves, so the choice is written
 * here rather than inferred from a passing test.
 */
export async function merkleRootHex(leafHexes) {
  if (!Array.isArray(leafHexes) || leafHexes.length === 0) throw new Error("empty merkle tree");
  let level = leafHexes.map(fromHex);
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await domainDigest(DOMAIN.merkleNode, concat(level[i], level[i + 1])));
      } else {
        next.push(level[i]);
      }
    }
    level = next;
  }
  return toHex(level[0]);
}

/**
 * Derive a member's coverage status from its cells (Annex A4.3), as a PURE list operation.
 *
 * `cells` is `[{attack_class, applicability, omission_reason, discharged, discharge_status,
 * finding_count}]`. Returns one of the four statuses or `null` — and `null` is an answer, not a
 * missing one: a member whose obligated cells were never attacked has no status, and defaulting it
 * would be the false green this stage is named after.
 */
export function deriveCoverageStatus(cells, { delegatesTo = null } = {}) {
  if (!Array.isArray(cells) || cells.length === 0) return null;
  if (cells.some((c) => (c.finding_count ?? 0) > 0)) return "finding_frozen";

  const obligated = cells.filter((c) => c.applicability === "obligated");
  const omitted = cells.filter((c) => c.applicability === "omitted");

  if (obligated.length === 0) {
    const allMechanical = omitted.every((c) =>
      MECHANICAL_OMISSION_REASONS.includes(c.omission_reason)
    );
    if (allMechanical) return "mechanically_unreachable";
    return delegatesTo ? "delegated_to_attacked_caller" : null;
  }

  const undischarged = obligated.filter((c) => !c.discharged);
  const notPassing = obligated.filter(
    (c) => c.discharged && c.discharge_status !== "attacked_pass"
  );
  if (undischarged.length === 0 && notPassing.length === 0) return "attacked_pass";
  if (delegatesTo && undischarged.length === obligated.length) {
    return "delegated_to_attacked_caller";
  }
  return null;
}

/** Run every vector and return `{vector_id: result}`. Shared by Node, Python and the browser. */
export async function evaluateVectors(vectors) {
  const out = {};
  for (const v of vectors) {
    switch (v.kind) {
      case "source_span_digest":
        out[v.id] = await sourceSpanDigest(new Uint8Array(v.bytes));
        break;
      case "canonical_source_bytes":
        out[v.id] = [...canonicalSourceBytes(new Uint8Array(v.bytes))];
        break;
      case "function_id":
        out[v.id] = makeFunctionId(v.parts);
        break;
      case "parse_function_id":
        out[v.id] = parseFunctionId(v.id_text);
        break;
      case "canonical_json":
        out[v.id] = canonicalJson(v.value);
        break;
      case "closure_leaf":
        out[v.id] = await closureLeafHash(v.row);
        break;
      case "merkle_root":
        out[v.id] = await merkleRootHex(v.leaves);
        break;
      case "coverage_status":
        out[v.id] = deriveCoverageStatus(v.cells, { delegatesTo: v.delegates_to ?? null });
        break;
      default:
        throw new Error(`unknown vector kind: ${v.kind}`);
    }
  }
  return out;
}
