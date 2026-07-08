// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — manifestCore: the Reflection-Corpus Provenance manifest (raw 206). Merkle
// inclusion over the example digests + the principle-mapping TOTALITY law (every example
// carries ≥1 principle id, every id is registered). Plan Task 7 (4O Merkle lineage). Motto:
// AnthropicSafe First, then ReviewerSafe.
import { sha256Hex, merkleRootSorted, DIGEST_RE } from "../../stage4m/core/canonical.mjs";

const node = (l, r) => `sha256:${sha256Hex(`${l}|${r}`)}`;

export const manifestRoot = (exampleDigests) => merkleRootSorted(exampleDigests);

// Inclusion proof over the SAME sorted-leaf tree merkleRootSorted builds (odd node carries up).
export function inclusionProof(exampleDigests, target) {
  let level = [...exampleDigests].sort();
  let idx = level.indexOf(target);
  if (idx < 0) return null;
  const path = [];
  while (level.length > 1) {
    if (idx % 2 === 0) {
      if (idx + 1 < level.length) path.push({ side: "right", digest: level[idx + 1] });
    } else {
      path.push({ side: "left", digest: level[idx - 1] });
    }
    const next = [];
    for (let i = 0; i < level.length; i += 2)
      next.push(i + 1 === level.length ? level[i] : node(level[i], level[i + 1]));
    idx = Math.floor(idx / 2);
    level = next;
  }
  return path;
}

export function verifyInclusion(target, path, root) {
  let acc = target;
  for (const step of path)
    acc = step.side === "right" ? node(acc, step.digest) : node(step.digest, acc);
  return acc === root;
}

// 206 — the manifest's provenance law: root recomputes, mapping is total, registry is closed.
export function checkManifest(manifest) {
  const c = manifest.content ?? manifest;
  const fail = (reason, detail = {}) => ({ raw: 206, reason, detail });
  const examples = c.examples ?? [];
  const registry = c.principle_registry ?? {};

  for (const [pid, entry] of Object.entries(registry))
    if (!entry || !DIGEST_RE.test(entry.source_digest ?? ""))
      return fail("registry_digest_invalid", { principle_id: pid });

  for (const ex of examples) {
    if (!Array.isArray(ex.principle_ids) || ex.principle_ids.length === 0)
      return fail("example_missing_principle", { example_digest: ex.example_digest });
    for (const pid of ex.principle_ids)
      if (!Object.prototype.hasOwnProperty.call(registry, pid))
        return fail("unknown_principle", { principle_id: pid });
  }

  let root;
  try {
    root = manifestRoot(examples.map((e) => e.example_digest));
  } catch {
    return fail("example_digest_invalid");
  }
  if (root !== c.merkle_root)
    return fail("merkle_root_mismatch", { want: root, got: c.merkle_root });
  return null;
}
