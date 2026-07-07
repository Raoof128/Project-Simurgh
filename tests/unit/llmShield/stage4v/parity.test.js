import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { corpusDocument } from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs";
import { evaluateContestPublic } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const PARITY = join(ROOT, "tools/simurgh-attestation/stage4v/python/vdp_parity.py");
const CORPUS = join(ROOT, "tests/fixtures/llmShield/stage4v/expected-results/laneA/corpus.json");
const EXCLUDED = new Set(["signature-invalid", "subpoena-capsule-tampered"]);

test("python public-tier core matches node public-tier over the corpus", () => {
  const py = JSON.parse(execFileSync("python3", [PARITY, CORPUS], { encoding: "utf8" }));
  const byName = new Map(py.map((r) => [r.name, r]));
  const doc = corpusDocument();
  for (const c of doc.cases) {
    if (EXCLUDED.has(c.name)) continue;
    const capsule = c.capsule_override ?? doc.reference_capsule_bundle;
    const res = evaluateContestPublic(capsule, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      ...(c.eval_opts ?? {}),
    });
    const p = byName.get(c.name);
    assert.ok(p, `python missing ${c.name}`);
    assert.equal(p.raw, res.raw, `raw ${c.name}`);
    assert.equal(p.envelope_digest, recordDigest(res.envelope), `envelope ${c.name}`);
  }
});
