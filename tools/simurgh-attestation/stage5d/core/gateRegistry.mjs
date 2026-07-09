// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — gate registry + pinned verdict (plan Task 4). Motto: AnthropicSafe First, then
// ReviewerSafe. v1 = the FROZEN 5C kernel (imported read-only); v3/v4 = verifier-side PROPOSED
// normalizers over that kernel (the 4W/4X/4Y code is never edited). `verdictAt` is the watcher
// recompute; it takes no attacker input [Lean verdictIgnoresAttacker]. `sourceDigest` pins every
// module a verdict transitively touches (G2-3: leakage=4W, doc_residue=4Y→4X) so a swapped gate
// trips 242.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";
import { extractSpans } from "../../stage4y/core/spanExtractor.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// ---- Normalizers (copied in from the stage5c/experiments prototypes; NEVER imported — G2-5) ----
const HOMOGLYPH = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  ѕ: "s",
  і: "i",
  ј: "j",
  ԁ: "d",
  А: "A",
  Е: "E",
  О: "O",
  Р: "P",
  С: "C",
  У: "Y",
  Х: "X",
  М: "M",
  Т: "T",
  В: "B",
  Н: "H",
  К: "K",
  ο: "o",
  ν: "v",
  α: "a",
  ρ: "p",
  τ: "t",
  ι: "i",
  κ: "k",
};
const HG_RE = new RegExp("[" + Object.keys(HOMOGLYPH).join("") + "]", "gu");

const normalizeV3 = (text) => {
  let t = String(text).normalize("NFKC");
  t = t.replace(HG_RE, (c) => HOMOGLYPH[c] ?? c);
  t = t.replace(/\bper\s+cent\b/giu, "percent");
  t = t.replace(/[​-‍﻿]/g, ""); // hand zero-width strip (ENUMERATION → brittle)
  return t;
};
const normalizeV4 = (text) => {
  let t = String(text).normalize("NFKC");
  t = t.replace(/[\p{M}\p{Default_Ignorable_Code_Point}]/gu, ""); // PROPERTY strip → durable
  t = t.replace(HG_RE, (c) => HOMOGLYPH[c] ?? c);
  t = t.replace(/\bper\s+cent\b/giu, "percent");
  return t;
};

export const NORMALIZERS = Object.freeze({
  v1: (t) => String(t),
  v3: normalizeV3,
  v4: normalizeV4,
});

// Frozen kernel verdict for a base's mechanism (all bases use the v1 lexicon).
function frozenFlagged(mechanism, text) {
  if (mechanism === "leakage") return scanLeakage(text, [], []).length > 0;
  if (mechanism === "doc_residue") return extractSpans(text).length > 0;
  throw new Error(`unknown mechanism: ${mechanism}`);
}

// The watcher recompute. gate_version selects the normalizer; mechanism selects the frozen detector.
export function verdictAt(gate_version, mechanism, text) {
  const norm = NORMALIZERS[gate_version];
  if (!norm) throw new Error(`unknown gate_version: ${gate_version}`);
  return frozenFlagged(mechanism, norm(text));
}

// Every module a verdict transitively touches. leakage → 4W; doc_residue → 4Y (→ 4W + 4X V2_LEXICON).
const KERNEL_FILES = [
  "tools/simurgh-attestation/stage4w/core/leakageGate.mjs",
  "tools/simurgh-attestation/stage4w/constants.mjs",
  "tools/simurgh-attestation/stage4w/core/textCore.mjs",
  "tools/simurgh-attestation/stage4y/core/spanExtractor.mjs",
  "tools/simurgh-attestation/stage4y/constants.mjs",
  "tools/simurgh-attestation/stage4x/core/gateV2.mjs",
];
const NORMALIZER_FILE = "tools/simurgh-attestation/stage5d/core/gateRegistry.mjs";
export const GATE_SOURCE_FILES = Object.freeze({
  v1: KERNEL_FILES,
  v3: [...KERNEL_FILES, NORMALIZER_FILE],
  v4: [...KERNEL_FILES, NORMALIZER_FILE],
});

// sourceDigest = sha256 over the sorted [path\n perFileSha256] of LF-normalized bytes (242).
export function sourceDigest(gate_version) {
  const files = GATE_SOURCE_FILES[gate_version];
  if (!files) throw new Error(`unknown gate_version: ${gate_version}`);
  const lines = [...files].sort().map((rel) => {
    const bytes = readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
    return `${rel}\n${sha256(Buffer.from(bytes, "utf8"))}`;
  });
  return "sha256:" + sha256(Buffer.from(lines.join("\n"), "utf8"));
}
