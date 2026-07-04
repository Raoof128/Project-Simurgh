// SPDX-License-Identifier: AGPL-3.0-or-later
// Q15 — heartbeats must bind REAL 4K/4L/4M evidence, not decorative digests (spec §6).
// Roots are recomputed from the committed source-stage fixtures; v0 models the private
// side in-repo because everything is synthetic (known limitation, spec §14).
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { merkleRootSorted, recordDigest } from "../../stage4m/core/canonical.mjs";

const parse = async (path) => JSON.parse(await readFile(path, "utf8"));

export async function computeSourceRoots(repoRoot) {
  const fx = join(repoRoot, "tests/fixtures/llmShield");
  const stage4k_exposure_root = recordDigest(
    await parse(join(fx, "stage4k/expected-results/exposure-matrix.json"))
  );
  const stage4l_cluster_budget_root = recordDigest(
    await parse(join(fx, "stage4l/expected-results/cluster-matrix.json"))
  );
  const bundlesDir = join(fx, "stage4m/bundles");
  const disclosure_leaves = [];
  for (const name of (await readdir(bundlesDir)).sort()) {
    try {
      disclosure_leaves.push(recordDigest(await parse(join(bundlesDir, name, "disclosure.json"))));
    } catch {
      // bundle without a disclosure.json — not a leaf
    }
  }
  return {
    stage4k_exposure_root,
    stage4l_cluster_budget_root,
    stage4m_disclosure_root: merkleRootSorted(disclosure_leaves),
    disclosure_leaves,
  };
}

export function verifySourceRoots(heartbeats, roots) {
  for (const h of heartbeats) {
    const c = h?.commitments ?? {};
    if (
      c.stage4k_exposure_root !== roots.stage4k_exposure_root ||
      c.stage4l_cluster_budget_root !== roots.stage4l_cluster_budget_root ||
      c.stage4m_disclosure_root !== roots.stage4m_disclosure_root
    ) {
      return { raw: 50, reason: "source_root_mismatch" };
    }
    const expected = recordDigest({
      stage4k_exposure_root: c.stage4k_exposure_root,
      stage4l_cluster_budget_root: c.stage4l_cluster_budget_root,
      stage4m_disclosure_root: c.stage4m_disclosure_root,
      window_id: h.window_id,
    });
    if (c.private_evidence_root !== expected) {
      return { raw: 50, reason: "private_evidence_root_mismatch" };
    }
  }
  return { raw: 0 };
}
