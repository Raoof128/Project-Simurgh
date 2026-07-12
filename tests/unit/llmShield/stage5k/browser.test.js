// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — browser packaging/execution parity. The portable WebCrypto verifier reproduces the same
// raw + byte-identical Merkle/projection/set digests as the Node core on the committed Lane-A pack, and
// declares (not simulates) the anchor path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5k/browser/vuc-portable.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5k/node/build-vuc-evidence.mjs";

test("browser portable verifier ↔ committed pack: raw 0 + byte-identical roots (WebCrypto)", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  const r = await verifyPortable(bundle, cfg);
  assert.equal(r.raw, 0);
  assert.equal(r.universe_root, bundle.universe_commitment.universe_root);
  assert.equal(r.universe_commitment_digest, bundle.universe_commitment.universe_commitment_digest);
  const bij = bundle.projections.bijection_census;
  assert.equal(r.u_commit, bij.commit);
  assert.equal(r.u_vpc, bij.vpc);
  assert.equal(r.u_vrc, bij.vrc);
  assert.equal(r.anchor_path, "declared_not_simulated");
});

test("browser portable: a tampered universe_root → 349", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  bundle.universe_commitment.universe_root = "sha256:" + "9".repeat(64);
  const r = await verifyPortable(bundle, cfg);
  assert.equal(r.raw, 349);
});
