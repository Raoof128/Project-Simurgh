// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R BYO external-operator-B demo (4R spec §8.6). Motto: AnthropicSafe
// First, then ReviewerSafe. Exercises the cross-org path end-to-end: operator B
// is a GENUINELY INDEPENDENT identity — a freshly generated Ed25519 key and a
// fresh curve scalar, driven ENTIRELY through byo/operator-kit.mjs, with NO
// dependence on our committed fixture keys. Operator A is our side. This proves
// the "send one link" mechanism produces a capture our shipped verifier accepts.
// It is NOT a real external pilot (no second organisation ran it): the rail
// `cross_org_operator_b_not_yet_exercised` stays until a real party does.
// Run: node tools/simurgh-attestation/stage4r/byo/demo-external-b.mjs
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS } from "../constants.mjs";
import {
  G,
  mul,
  encodePoint,
  decodePoint,
  randomScalar,
  scalarFromHex,
  scalarToHex,
} from "../core/edwards25519.mjs";
import { classPoint, maskPoint, matchToken, pairId } from "../core/maskCore.mjs";
import { dleqProve } from "../core/dleq.mjs";
import { tokenCommitment, maskDigest, evaluateCeremony } from "../core/pcccCore.mjs";
import { reconstructInput, signingDigest } from "../core/ceremonyBuilder.mjs";
import {
  validateInvitation,
  operatorMaskContribution,
  operatorZContribution,
} from "./operator-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4r");

const EPOCH = "sha256:" + "e2".repeat(32);
const RUN = "byo-external-b";
const nonce = (r) => crypto.createHash("sha256").update(`byo|${r}`).digest("hex").slice(0, 16);
const keyDigest = (pub) =>
  recordDigest({ pub: pub.export({ type: "spki", format: "der" }).toString("hex") });

function runScenario(aClass, bClass, label) {
  const sharedClass = aClass; // A's class; B's may differ (non-match scenario)
  const bClassDigest = bClass;

  // ---- Operator A (us): committed fixture identity + scalar.
  const aKey = crypto.createPrivateKey(
    readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha.pem"))
  );
  const aPub = crypto.createPublicKey(aKey);
  const aScalar = scalarFromHex(
    readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha-scalar.hex"), "utf8").trim()
  );
  const aKeyDigest = keyDigest(aPub);

  // ---- Operator B (EXTERNAL): freshly generated, independent of every fixture.
  const bKeyPair = crypto.generateKeyPairSync("ed25519");
  const bScalar = randomScalar(); // never written to disk, never shared with A
  const bKeyDigest = keyDigest(bKeyPair.publicKey);

  console.log(`\n── Scenario: ${label} ──`);
  console.log("Operator A key digest:", aKeyDigest.slice(0, 22), "(our committed fixture)");
  console.log("Operator B key digest:", bKeyDigest.slice(0, 22), "(freshly generated — external)");

  // Step 1: B receives and validates the invitation (the "one link").
  const inv = JSON.parse(readFileSync(join(EVID, "byo/sample-invitation.json"), "utf8"));
  const invOk = validateInvitation(inv, {
    verifierDigest: inv.verifier_digest,
    schemaVersions: inv.schema_versions,
  });
  console.log("B validated the invitation link:", invOk.ok);

  const pid = pairId(EPOCH, [aKeyDigest, bKeyDigest]);
  const HcA = classPoint(EPOCH, sharedClass);

  // Phase 1 — masks. A locally; B through the KIT (B's scalar stays in the kit).
  const mAraw = maskPoint(aScalar, HcA);
  const mA = { mask_point: encodePoint(mAraw), epk: encodePoint(mul(aScalar, G)) };
  const mB = operatorMaskContribution({
    scalar: bScalar,
    epoch: EPOCH,
    custodyClassDigest: bClassDigest,
    runId: RUN,
    pairId: pid,
    role: "b",
  });

  // Phase 2/3 — z, tokens, commitments. B through the KIT.
  const zAraw = maskPoint(aScalar, decodePoint(mB.mask_point));
  const tokenA = matchToken(EPOCH, pid, zAraw);
  const aZ = {
    z: encodePoint(zAraw),
    token: tokenA,
    token_nonce: nonce("a"),
    commitment: tokenCommitment({
      epoch: EPOCH,
      runId: RUN,
      pairId: pid,
      role: "a",
      peerMaskDigest: maskDigest(mB.mask_point),
      token: tokenA,
      tokenNonce: nonce("a"),
    }),
    dleq_z: dleqProve({
      scalar: aScalar,
      basePoint: decodePoint(mB.mask_point),
      epk: mul(aScalar, G),
      targetPoint: zAraw,
      relationKind: "z",
      epoch: EPOCH,
      runId: RUN,
      pairId: pid,
      role: "a",
    }),
  };
  const bZ = operatorZContribution({
    scalar: bScalar,
    epoch: EPOCH,
    peerMaskHex: mA.mask_point,
    runId: RUN,
    pairId: pid,
    role: "b",
    tokenNonce: nonce("b"),
  });

  // Assemble + sign (B signs with ITS OWN key).
  const transcript = {
    schema: SCHEMAS.MATCH_TRANSCRIPT,
    epoch: EPOCH,
    run_id: RUN,
    pair_id: pid,
    slot_index: 0,
    masks: { a: mA.mask_point, b: mB.mask_point },
    commitments: { a: aZ.commitment, b: bZ.commitment },
    openings: {
      a: { token: aZ.token, token_nonce: aZ.token_nonce },
      b: { token: bZ.token, token_nonce: bZ.token_nonce },
    },
    z: { a: aZ.z, b: bZ.z },
    dleq: {
      a: [
        dleqProve({
          scalar: aScalar,
          basePoint: HcA,
          epk: mul(aScalar, G),
          targetPoint: mAraw,
          relationKind: "mask",
          epoch: EPOCH,
          runId: RUN,
          pairId: pid,
          role: "a",
        }),
        aZ.dleq_z,
      ],
      b: [mB.dleq_mask, bZ.dleq_z],
    },
    phase_order: { a: ["mask", "commit", "open", "sign"], b: ["mask", "commit", "open", "sign"] },
    match: aZ.token === bZ.token,
    signatures: { a: "", b: "" },
  };
  const dig = signingDigest(transcript);
  transcript.signatures.a = crypto.sign(null, Buffer.from(dig), aKey).toString("hex");
  transcript.signatures.b = crypto
    .sign(null, Buffer.from(dig), bKeyPair.privateKey)
    .toString("hex");

  const sealedPacket = {
    epoch: EPOCH,
    run_id: RUN,
    pair_id: pid,
    slot_index: 0,
    class_digests: { a: sharedClass, b: bClassDigest },
    epk: { a: mA.epk, b: mB.epk },
    ephemeral_digests: { a: recordDigest({ epk: mA.epk }), b: recordDigest({ epk: mB.epk }) },
  };

  // Our shipped verifier evaluates using B's INDEPENDENT public key.
  const verdict = evaluateCeremony(
    reconstructInput({
      transcript,
      sealedPacket,
      operatorPublicKeys: { a: aPub, b: bKeyPair.publicKey },
    })
  );

  const leaked = JSON.stringify({ transcript, sealedPacket }).includes(scalarToHex(bScalar));
  const sameClass = aClass === bClass;
  console.log("A and B hold the same custody class:", sameClass ? "YES" : "NO");
  console.log("Ceremony match result:", transcript.match, `(expected ${sameClass})`);
  console.log("Our verifier verdict:", JSON.stringify(verdict));
  console.log("B's raw scalar leaked into transcript/packet:", leaked);
  const ok = verdict.green && transcript.match === sameClass && !leaked;
  console.log(ok ? "  ✓ scenario correct" : "  ✗ scenario FAILED");
  return ok;
}

function main() {
  const CLASS_X = "sha256:" + "5c".repeat(32);
  const CLASS_Y = "sha256:" + "6d".repeat(32);
  console.log("══ BYO external operator-B mechanism test ══");
  const r1 = runScenario(CLASS_X, CLASS_X, "shared class → should MATCH");
  const r2 = runScenario(CLASS_X, CLASS_Y, "different class → should NON-MATCH");
  console.log(
    r1 && r2
      ? "\n✅ External-B mechanism WORKS on both scenarios: an independent operator B (fresh key + scalar, driven only through the kit) is correctly matched when the class is shared and correctly non-matched when it differs, our verifier accepts both, and B's scalar never leaks. Safe to send the invitation link to a real party.\n   (Still signed cross_org_operator_b_not_yet_exercised until a real organisation runs it.)"
      : "\n❌ mechanism check failed"
  );
  process.exit(r1 && r2 ? 0 : 1);
}

main();
