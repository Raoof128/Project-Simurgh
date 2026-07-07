// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W green narrative over the pinned 4T green capsule (spec §3 Lane A).
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenBundle } from "../../stage4t/node/greenCapsule.mjs";
import { recordDigest, canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { buildNarrative, resignNarrative } from "../core/narrativeCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

export const resignNarrativeGreen = (n) => resignNarrative(n, readKey("vsn-author"));

const B = (s) => Buffer.byteLength(s);

export function buildGreenNarrative() {
  const green = buildGreenBundle();
  const sections = green.bundle.content.projected_sections;
  // Two self-contained evidence_backed sections (no ctx.chainVerdict needed).
  const slotA = sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const slotB = sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "kernel_block_record"
  );
  // Deterministic judgment signer: the `vsn` fixture key (NOT a fresh ephemeral pair) so
  // the green narrative — and every fixture derived from it — is byte-stable across runs.
  const jContent = {
    judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "vsn-green-judgment" })),
  };
  const jSig = crypto
    .sign(null, Buffer.from(canonicalJson(jContent)), crypto.createPrivateKey(readKey("vsn")))
    .toString("base64");
  const signedJudgment = {
    content: jContent,
    signature: jSig,
    judgment_pub_key_pem: readPub("vsn"),
  };

  const claimA = `participants recorded: ${JSON.stringify(slotA.value)}`;
  const claimB = `kernel blocks recorded: ${JSON.stringify(slotB.value)}`;
  const judgeText = "we judge the root cause was a poisoned tool description";
  const voiceText = "we believe most users trust us and we regret the incident";
  const p1 = "the simurgh (سیمرغ) watches. ";
  const p2 = " furthermore, ";
  const p3 = " in our view: ";
  const p4 = " declared voice: ";
  const p5 = " calm close.\n";
  const body = p1 + claimA + p2 + claimB + p3 + judgeText + p4 + voiceText + p5;

  let off = B(p1);
  const span = (id, text, extra) => {
    const s = { span_id: id, start_byte: off, end_byte: off + B(text), ...extra };
    off += B(text);
    return s;
  };
  const spanMap = [];
  spanMap.push(
    span("s-a", claimA, {
      type: "slot_bound",
      regime: slotA.regime,
      section_id: slotA.section_id,
      claimed_value: slotA.value,
      recompute_kind: slotA.recompute_kind,
      evidence_digest: slotA.evidence_digest,
    })
  );
  off += B(p2);
  spanMap.push(
    span("s-b", claimB, {
      type: "slot_bound",
      regime: slotB.regime,
      section_id: slotB.section_id,
      claimed_value: slotB.value,
      recompute_kind: slotB.recompute_kind,
      evidence_digest: slotB.evidence_digest,
    })
  );
  off += B(p3);
  spanMap.push(
    span("j-1", judgeText, {
      type: "judgment",
      judgment_id: "j1",
      judgment_digest: recordDigest(signedJudgment),
    })
  );
  off += B(p4);
  spanMap.push(span("v-1", voiceText, { type: "unverified_prose" }));

  const narrative = buildNarrative({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    body,
    spanMap,
    judgments: [{ judgment_id: "j1", signed_judgment: signedJudgment }],
    authorRole: "operator",
    privKeyPem: readKey("vsn-author"),
    pubKeyPem: readPub("vsn-author"),
  });
  return { capsuleBundle: green.bundle, narrative, capsulePubKeyPem: green.pubKeyPem };
}
