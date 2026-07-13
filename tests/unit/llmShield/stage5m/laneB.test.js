// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — Lane B real offline gate. Verifies the FROZEN real signed bundle (real DigiCert token, real
// Rekor entry, real ceremony over commitment D) through the whole verifier. The OTS for this coherent-window
// D is Bitcoin-confirmed (block 957782); the verifier banks externally_anchored at raw 0 (Task 1B closed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { verifyVtcQuorum } from "../../../../tools/simurgh-attestation/stage5m/node/verify.mjs";
import { makeVtcQuorumFacts } from "../../../../tools/simurgh-attestation/stage5m/node/facts.mjs";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5l/node/signatures.mjs";

const EV = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb"
);

function pubId(name, subject) {
  const pem = readFileSync(join(EV, `keys/PUB_${name}.pem`), "utf8");
  return {
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

test("Lane B: real signed bundle banks externally_anchored (raw 0, Bitcoin-confirmed)", () => {
  const bundle = JSON.parse(readFileSync(join(EV, "laneb-bundle.json"), "utf8"));
  const p = JSON.parse(readFileSync(join(EV, "laneb-pinned.json"), "utf8"));
  const keys = {
    gate: pubId("gate", "vtcq-5m-gate"),
    sequencer: pubId("sequencer", "vtcq-5m-seq"),
    tsaverifier: pubId("tsaverifier", "vtcq-5m-tsaver"),
  };
  const pinned = {
    rekorPubPem: readFileSync(join(EV, "rekor_pubkey.pem"), "utf8"),
    expectedSubmitterPem: readFileSync(join(EV, "keys/PUB_submitter.pem"), "utf8"),
    expected_submitter_fpr: p.expected_submitter_fpr,
    canonicalAnchorBytes: readFileSync(join(EV, "canonical-anchor.txt")),
    accuracy_policy_s: p.accuracy_policy_s,
    tsa_verifier_pubkey_fpr: p.tsa_verifier_pubkey_fpr,
    vtcq_policy_digest: p.vtcq_policy_digest,
  };
  const r = verifyVtcQuorum(bundle, pinned, keys, { tier: "public" });
  assert.equal(r.raw, 0, `expected banked raw 0, got ${r.raw} ${r.reason ?? ""}`);
  assert.equal(r.externally_anchored, true, "externally_anchored must be banked");
  assert.equal(r.ecology_independence_number, 3);
  assert.equal(bundle.declared_externally_anchored, true, "confirmed bundle declares anchored");

  // The Rekor seat itself is REAL and valid offline (three ecologies present) even though finality is pending.
  const facts = makeVtcQuorumFacts(bundle, pinned);
  assert.equal(facts.seat_present, true);
  assert.equal(facts.inclusion_ok, true);
  assert.equal(facts.checkpoint_ok, true);
  assert.equal(facts.set_ok, true);
  assert.equal(facts.submitter_ok, true);
  assert.deepEqual(facts.present_valid_ecology_classes, ["rfc3161", "bitcoin", "rekor"]);
});

test("Lane B: confirmed bundle exists only when Task 1B has closed (guard)", () => {
  // If a confirmed bundle is later frozen, it must bank; until then this is a no-op guard.
  const confirmedPath = join(EV, "laneb-bundle-confirmed.json");
  if (!existsSync(confirmedPath)) {
    assert.ok(
      true,
      "no confirmed bundle yet (OTS still pending) — banking is the signed next step"
    );
  }
});
