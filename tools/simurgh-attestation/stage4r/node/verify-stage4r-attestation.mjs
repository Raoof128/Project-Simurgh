// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R two-tier offline verifier (4R spec §4.3). Motto: AnthropicSafe First,
// then ReviewerSafe. PUBLIC tier: attestation signature + per-case public-record
// schema + herd-token scan (digest-level). AUDIT tier: reconstruct each ceremony
// from the sealed packet and re-run evaluateCeremony UNILATERALLY (DLEQ-verified),
// asserting every committed verdict. Exit 0 on success; a raw code otherwise.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { evaluateCeremony } from "../core/pcccCore.mjs";
import { reconstructInput } from "../core/ceremonyBuilder.mjs";
import { validateMatchRecord, validateAttestation } from "../core/schemaCore.mjs";
import { herdTokenScan } from "../core/censusCore.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function fail(raw, reason) {
  console.error(`stage4r verify FAIL raw=${raw} reason=${reason}`);
  process.exit(raw);
}

function publicTier(dir) {
  const att = JSON.parse(readFileSync(join(dir, "pccc-attestation.json"), "utf8"));
  const shape = validateAttestation(att.body);
  if (!shape.ok) fail(90, shape.reason);
  const pub = crypto.createPublicKey(att.public_key);
  const ok = crypto.verify(
    null,
    Buffer.from(canonicalJson(att.body)),
    pub,
    Buffer.from(att.signature, "hex")
  );
  if (!ok) fail(91, "attestation_signature_invalid");

  const corpus = JSON.parse(readFileSync(join(dir, "lane-a/corpus.json"), "utf8"));
  for (const c of corpus.cases) {
    // only GREEN cases produce a valid public export; tamper cases still carry a
    // publicRecord for the herd scan, which must be clean regardless.
    const priv = {
      classDigests: new Set([c.sealedPacket.class_digests.a, c.sealedPacket.class_digests.b]),
      maskHexes: new Set([
        c.transcript.masks.a,
        c.transcript.masks.b,
        c.transcript.z.a,
        c.transcript.z.b,
      ]),
    };
    if (herdTokenScan(c.publicRecord, priv).hit) fail(99, `herd_token_in_public_record:${c.name}`);
    if (c.expect.green) {
      const r = validateMatchRecord(c.publicRecord);
      if (!r.ok) fail(90, `public_record_${c.name}:${r.reason}`);
    }
  }
  return { att, corpus };
}

function auditTier(corpus) {
  const pubKeys = {
    a: crypto.createPublicKey(
      crypto.createPrivateKey(
        readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha.pem"))
      )
    ),
    b: crypto.createPublicKey(
      crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-beta.pem")))
    ),
  };
  for (const c of corpus.cases) {
    const got = evaluateCeremony(
      reconstructInput(
        { transcript: c.transcript, sealedPacket: c.sealedPacket, operatorPublicKeys: pubKeys },
        c.overrides
      )
    );
    const want = c.expect.green
      ? { raw: 0, green: true }
      : { raw: c.expect.raw, reason: c.expect.reason, green: false };
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      fail(got.raw || 90, `audit_verdict_${c.name}:got=${JSON.stringify(got)}`);
    }
  }
}

function main() {
  const dir = arg("--offline", null);
  if (!dir) {
    console.error(
      "usage: verify-stage4r-attestation.mjs --offline <dir> [--tier public|audit|both]"
    );
    process.exit(2);
  }
  const tier = arg("--tier", "both");
  const base = isAbsolute(dir) ? dir : join(ROOT, dir);
  const { corpus } = publicTier(base);
  if (tier === "public") {
    console.log("stage4r verify OK (public tier)");
    return;
  }
  auditTier(corpus);
  console.log(`stage4r verify OK (${tier} tier): ${corpus.cases.length} cases`);
}

main();
