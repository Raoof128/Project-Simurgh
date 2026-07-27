// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — the deterministic surface, portable across Node and a browser (Task 25).
//
// THE PARITY CHAIN IS FOUR-WAY, AND THE FIRST LINK IS WHAT MAKES THE REST MEAN ANYTHING:
//
//     Node core  ≡  this portable module  ≡  Python  ≡  browser
//
// Three mirrors agreeing with each other proves they were written by one person on one afternoon.
// The chain has to start at the real `core/*.mjs` that computes the committed digests, or it is a
// parity claim over a surface nobody ships.
//
// NO NODE BUILT-INS. `globalThis.crypto.subtle` and `TextEncoder` exist in Node 26 and in every
// browser; `node:crypto` and `Buffer` exist in neither direction. Every function is async because
// `crypto.subtle.digest` is.

const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const joined = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    joined.set(p, at);
    at += p.length;
  }
  return hex(await globalThis.crypto.subtle.digest("SHA-256", joined));
}

/** Integer round-half-up, in TENTHS of a percent. No float ever decides a published figure. */
export function tenths(numerator, denominator) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new TypeError("tenths: integers only");
  }
  if (denominator <= 0) throw new RangeError("tenths: denominator must be positive");
  return Math.floor((numerator * 1000 + Math.floor(denominator / 2)) / denominator);
}

/** Domain-separated digest of a control's source span. */
export async function spanDigest(source) {
  return sha256([
    enc.encode("simurgh.vpf.control-span.v1"),
    new Uint8Array([0]),
    enc.encode(String(source)),
  ]);
}

/**
 * 5R's pin over an inherited file's canonical bytes.
 *
 * Canonicalisation is byte-level: CRLF and lone CR become LF, exactly one trailing LF, nothing else.
 */
export async function filePin(text) {
  const lf = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const canonical = lf.endsWith("\n") ? lf : `${lf}\n`;
  return sha256([
    enc.encode("simurgh.vpf.inherited-file.v1"),
    new Uint8Array([0]),
    enc.encode(canonical),
  ]);
}

/** The digest the detector child stamps its verdict with. */
export async function verdictReceiptDigest(receipt) {
  const canonical = [
    receipt.control_digest,
    receipt.detector_digest,
    receipt.declared_signal,
    receipt.verdict,
    receipt.signal_evidence_digest,
  ].join(" ");
  return sha256([
    enc.encode("simurgh.vpf.verdict-receipt.v1"),
    new Uint8Array([0]),
    enc.encode(canonical),
  ]);
}

/** Seeded control ordering, so sequence cannot leak the label. */
export async function permute(items, seed) {
  const keyed = [];
  for (const item of items) keyed.push({ item, k: await sha256([enc.encode(`${seed} ${item}`)]) });
  keyed.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return keyed.map((x) => x.item);
}

/** Answer a whole parity manifest. The manifest is the contract; this reads it, never a copy. */
export async function answerManifest(manifest) {
  const answers = {};
  for (const entry of manifest.entries) {
    answers[entry.id] = [];
    for (const v of entry.vectors) {
      answers[entry.id].push(await answerOne(entry.id, v.input));
    }
  }
  return answers;
}

async function answerOne(id, input) {
  switch (id) {
    case "measurements.tenths":
      return tenths(input.numerator, input.denominator);
    case "controls.spanDigest":
      return spanDigest(input.source);
    case "inherit.filePin":
      return filePin(input.text);
    case "laneB.verdictReceiptDigest":
      return verdictReceiptDigest(input);
    case "laneB.permute":
      return (await permute(input.items, input.seed)).join(",");
    default:
      // Fail closed: an unknown entry must not be silently skipped, or the mirror reports parity
      // over the subset it happens to implement.
      throw new Error(`portable mirror: no implementation for manifest entry "${id}"`);
  }
}
