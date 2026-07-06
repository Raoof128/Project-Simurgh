// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R Lane B operator process (4R spec §10). Motto: AnthropicSafe First,
// then ReviewerSafe. A SEPARATE OS process per operator: its scalar is loaded
// from its own quarantined fixture file into THIS process's memory and is NEVER
// printed or written — only masks, epk, DLEQ proofs, tokens, commitments, and
// signatures leave via stdout. This is the "two real processes, not one heap"
// property the ceremony orchestrator relies on (contrast: 4Q's separate approver).
//
// Usage: operator.mjs --phase mask|z|sign --role a|b --scalar-file F --key-file F
//        --epoch E --run R --pair P [--class C] [--peer-mask HEX] [--nonce N]
//        [--transcript-digest D]
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { G, mul, encodePoint, decodePoint, scalarFromHex } from "../core/edwards25519.mjs";
import { classPoint, maskPoint, matchToken, ephemeralPublicDigest } from "../core/maskCore.mjs";
import { dleqProve } from "../core/dleq.mjs";
import { tokenCommitment, maskDigest } from "../core/pcccCore.mjs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const phase = arg("--phase");
const role = arg("--role");
const epoch = arg("--epoch");
const runId = arg("--run");
const pair = arg("--pair");
const scalar = scalarFromHex(readFileSync(arg("--scalar-file"), "utf8").trim());

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

if (phase === "mask") {
  const Hc = classPoint(epoch, arg("--class"));
  const mask = maskPoint(scalar, Hc);
  const epk = mul(scalar, G);
  const proof = dleqProve({
    scalar,
    basePoint: Hc,
    epk,
    targetPoint: mask,
    relationKind: "mask",
    epoch,
    runId,
    pairId: pair,
    role,
  });
  emit({
    role,
    mask_point: encodePoint(mask),
    epk: encodePoint(epk),
    dleq_mask: proof,
    ephemeral_digest: ephemeralPublicDigest(epoch, role, scalar),
  });
} else if (phase === "z") {
  const peerMask = decodePoint(arg("--peer-mask"));
  const z = maskPoint(scalar, peerMask);
  const epk = mul(scalar, G);
  const token = matchToken(epoch, pair, z);
  const nonce = arg("--nonce");
  const commitment = tokenCommitment({
    epoch,
    runId,
    pairId: pair,
    role,
    peerMaskDigest: maskDigest(arg("--peer-mask")),
    token,
    tokenNonce: nonce,
  });
  const proof = dleqProve({
    scalar,
    basePoint: peerMask,
    epk,
    targetPoint: z,
    relationKind: "z",
    epoch,
    runId,
    pairId: pair,
    role,
  });
  emit({ role, z: encodePoint(z), token, token_nonce: nonce, commitment, dleq_z: proof });
} else if (phase === "sign") {
  const key = crypto.createPrivateKey(readFileSync(arg("--key-file")));
  const sig = crypto.sign(null, Buffer.from(arg("--transcript-digest")), key).toString("hex");
  emit({ role, signature: sig });
} else {
  process.stderr.write("unknown --phase\n");
  process.exit(2);
}
