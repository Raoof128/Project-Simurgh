import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildGreenNarrative } from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import { buildLaneAFixtures } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import { evaluateNarrativeSafe } from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

// Python public tier covers the byte-geometry surface: normalisation, geometry, binding
// (incl. fingerprint), locality, slot recompute, leakage. Signature (163), full schema
// allowlists, judgments (168) and payload (171) stay Node-authoritative (parity contract).
const EXCLUDED = new Set([
  "signature-tampered",
  "schema-alien-key",
  "payload-smuggled-prompt",
  "judgment-digest-mismatch",
  "judgment-unreferenced",
]);

test("JS/Python parity on the byte-geometry surface", () => {
  const g = buildGreenNarrative();
  for (const f of buildLaneAFixtures()) {
    if (EXCLUDED.has(f.name)) continue;
    const node = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, {
      capsulePubKeyPem: g.capsulePubKeyPem,
      ctx: {},
    });
    const py = JSON.parse(
      execFileSync("python3", ["tools/simurgh-attestation/stage4w/python/vsn_parity.py"], {
        input: canonicalJson({
          narrative: f.narrative,
          capsule: g.capsuleBundle.content,
          capsule_pubkey_pem: g.capsulePubKeyPem,
        }),
        encoding: "utf8",
      })
    );
    assert.equal(
      py.raw,
      node.raw,
      `${f.name}: node ${node.raw} vs py ${py.raw} (${py.reason ?? ""})`
    );
  }
});
