// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — K7 all-functions net: touches every exported function, proves every raw code 384-395 reachable,
// reaches 395 via an injected throwing adapter (never a bundle field), and checks cross-stage invariants
// (additive codes disjoint from 364-383; the real Lane-B bundle verifies to the honest pending floor).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import * as constants from "../../../../tools/simurgh-attestation/stage5m/constants.mjs";
import { checkV2Schema } from "../../../../tools/simurgh-attestation/stage5m/core/schema.mjs";
import { checkRekorSeat } from "../../../../tools/simurgh-attestation/stage5m/core/rekorSeat.mjs";
import {
  checkCrossSeat,
  checkDistinctEcologies,
} from "../../../../tools/simurgh-attestation/stage5m/core/crossSeat.mjs";
import {
  checkState,
  stateFields,
  ecologyIndependenceNumber,
  computedEcologyState,
  outcomeClass,
} from "../../../../tools/simurgh-attestation/stage5m/core/state.mjs";
import {
  projectToFiveL,
  dispatchVtcQuorum,
} from "../../../../tools/simurgh-attestation/stage5m/core/dispatch.mjs";
import { verifyVtcQuorum } from "../../../../tools/simurgh-attestation/stage5m/node/verify.mjs";
import {
  signAttestation,
  verifyAttestation,
  buildPublicAttestationPayload,
  buildAuditAttestationPayload,
} from "../../../../tools/simurgh-attestation/stage5m/node/attestation.mjs";
import { emitContainmentQuorumPredicate } from "../../../../tools/simurgh-attestation/stage5m/node/intoto.mjs";
import { vtcQuorumLaneKeys } from "../../../../tools/simurgh-attestation/stage5m/node/laneKeys.mjs";
import { extensionVerdict } from "../../../../tools/simurgh-attestation/stage5m/browser/vtcq-quorum-portable.mjs";
import { verifyInclusion } from "../../../../tools/simurgh-attestation/stage5m/node/rekorAdapter.mjs";
import { VTCQUORUM_RAW_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5l/node/signatures.mjs";

const EV = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb"
);
const ok5L = () => ({ raw: 0 });

function v2bundle(over = {}) {
  return {
    schema_version: "simurgh.vtcq.bundle.v1",
    envelope_schema: "vtc_quorum_confirmed.v2",
    quorum_profile: "third_trust_ecology",
    quorum_rule: "all_required",
    required_members: [
      "rfc3161_tsa",
      "bitcoin_confirmed_publication",
      "transparency_log_inclusion",
    ],
    anchors: [{ anchor_type: "rfc3161_tsa" }, { anchor_type: "bitcoin_ots" }],
    quorum_policy: { profile: "vtc_quorum" },
    transparency_log_seat: {
      uuid: "u",
      body: "b",
      logID: "l",
      signedEntryTimestamp: "s",
      submitter_pubkey: "p",
      inclusionProof: {
        logIndex: 0,
        treeSize: 2,
        rootHash: "00",
        hashes: [],
        checkpoint: "c\n\n— x y",
      },
    },
    ...over,
  };
}
function facts(over = {}) {
  return {
    seat_present: true,
    rekor: { kind: "hashedrekord", artifact_hash: "H" },
    anchor_sha256: "H",
    inclusion_ok: true,
    checkpoint_ok: true,
    set_ok: true,
    submitter_ok: true,
    entry_submitter_fpr: "fp",
    expected_submitter_fpr: "fp",
    commitment: "D",
    anchor_decoded: "D",
    tsa_imprint: "D",
    ots_leaf: "D",
    rekor_artifact_hash: "H",
    present_valid_ecology_classes: ["rfc3161", "bitcoin", "rekor"],
    declared_externally_anchored: true,
    ...over,
  };
}
const run = (b, f) => dispatchVtcQuorum(b, { facts5L: {}, facts5M: f, cfg5L: {}, run5L: ok5L });

test("K7: every raw code 384-395 is reachable", () => {
  const seen = new Set();
  seen.add(run(v2bundle({ envelope_schema: "bad" }), facts()).raw); // 384
  seen.add(run(v2bundle(), facts({ rekor: { kind: "x" } })).raw); // 385
  seen.add(run(v2bundle(), facts({ anchor_sha256: "Z" })).raw); // 386
  seen.add(run(v2bundle(), facts({ inclusion_ok: false })).raw); // 387
  seen.add(run(v2bundle(), facts({ checkpoint_ok: false })).raw); // 388
  seen.add(run(v2bundle(), facts({ set_ok: false })).raw); // 389
  seen.add(run(v2bundle(), facts({ submitter_ok: false })).raw); // 390
  seen.add(run(v2bundle(), facts({ tsa_imprint: "Z" })).raw); // 391
  seen.add(
    run(v2bundle(), facts({ present_valid_ecology_classes: ["rekor", "rekor", "rfc3161"] })).raw
  ); // 392
  seen.add(
    run(
      v2bundle(),
      facts({
        seat_present: false,
        present_valid_ecology_classes: ["rfc3161", "bitcoin"],
        declared_externally_anchored: true,
      })
    ).raw
  ); // 394
  seen.add(
    run(
      v2bundle(),
      facts({
        seat_present: false,
        present_valid_ecology_classes: ["rfc3161", "bitcoin"],
        declared_externally_anchored: false,
      })
    ).raw
  ); // 393
  // 395 via injected throwing adapter (NOT a bundle field)
  seen.add(
    verifyVtcQuorum(
      v2bundle(),
      {},
      {},
      {
        _factsAdapter: () => {
          throw new Error("x");
        },
      }
    ).raw
  );
  for (let c = 384; c <= 395; c++) assert.ok(seen.has(c), `raw ${c} unreachable`);
});

test("K7: clean path banks (raw 0) + state helpers cover confirmed", () => {
  const r = run(v2bundle(), facts());
  assert.equal(r.raw, 0);
  const f = facts();
  assert.equal(ecologyIndependenceNumber(f), 3);
  assert.equal(computedEcologyState(f), "confirmed");
  assert.equal(outcomeClass(f), "ecology_confirmed");
  assert.equal(stateFields(f).externally_anchored, true);
  assert.equal(checkState(f), null);
});

test("K7: pure-check functions + browser parity + projection whitelist", () => {
  assert.equal(checkV2Schema(v2bundle()), null);
  assert.equal(checkRekorSeat(facts()), null);
  assert.equal(checkCrossSeat(facts()), null);
  assert.equal(checkDistinctEcologies(facts()), null);
  assert.equal(extensionVerdict(facts()).raw, 0);
  assert.equal(projectToFiveL(v2bundle()).envelope_schema, undefined);
});

test("K7: attestation both tiers + in-toto + tamper", () => {
  const keys = vtcQuorumLaneKeys();
  const b = v2bundle({ commitment_session_id: "sha256:abcd" });
  const verdict = stateFields(facts());
  for (const tier of ["public", "audit"]) {
    const att = signAttestation(keys.gate.privatePem, tier, b, verdict, {});
    assert.equal(verifyAttestation(keys.gate.id, att), true);
    att.payload.raw = 999;
    assert.equal(verifyAttestation(keys.gate.id, att), false);
  }
  assert.ok(buildPublicAttestationPayload(b, verdict).outcome_class);
  assert.ok(buildAuditAttestationPayload(b, verdict, {}).public_attestation_digest);
  assert.equal(emitContainmentQuorumPredicate(b, verdict).subject[0].digest.sha256, "abcd");
});

test("K7 cross-stage: 384-395 disjoint from 364-383; real Lane-B bundle → honest 372", () => {
  for (const c of Object.values(VTCQUORUM_RAW_CODES)) assert.ok(c === 0 || (c >= 384 && c <= 395));
  const bundle = JSON.parse(readFileSync(join(EV, "laneb-bundle.json"), "utf8"));
  const p = JSON.parse(readFileSync(join(EV, "laneb-pinned.json"), "utf8"));
  const pubId = (n, s) => ({
    id: {
      identity_subject: s,
      public_key_pem: readFileSync(join(EV, `keys/PUB_${n}.pem`), "utf8"),
      key_fingerprint: fingerprint(readFileSync(join(EV, `keys/PUB_${n}.pem`), "utf8")),
    },
  });
  const keys = {
    gate: pubId("gate"),
    sequencer: pubId("sequencer"),
    tsaverifier: pubId("tsaverifier"),
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
  assert.equal(verifyVtcQuorum(bundle, pinned, keys, {}).raw, 372);
  // real Rekor adapter touched
  const seat = bundle.transparency_log_seat;
  assert.equal(verifyInclusion(seat).ok, true);
  assert.ok(Array.isArray(constants.REQUIRED_MEMBERS));
});
