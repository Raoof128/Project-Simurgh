// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attestation verifier (4U spec §9). Motto: AnthropicSafe First, then
// ReviewerSafe. THREE distinct keys — attestation + findings signed by vrta.pem,
// charter by vrta-charter.pem — so no single key can verify all three. PUBLIC tier
// checks attestation signature + charter/finding signatures + structure + 127/128 +
// ASR-ledger (no engine); AUDIT tier additionally re-runs the engine and checks each
// per-fixture observed_raw against a fresh run (129).
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { evaluateVrta } from "../core/vrtaCore.mjs";
import { bundleMerkleRoot } from "./build-stage4u-attestation.mjs";

export function verifyAttestation(att, { tier = "public", attestationPubKeyPem, charterPubKeyPem, findingPubKeyPem } = {}) {
  const findingPub = findingPubKeyPem || attestationPubKeyPem;
  const fail = (raw, reason, detail) => ({ ok: false, raw, reason, tier, detail });

  // 1 — attestation signature (120) + key binding.
  const { signature, ...unsigned } = att;
  let sigOk = false;
  try {
    sigOk = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsigned)),
      crypto.createPublicKey(attestationPubKeyPem),
      Buffer.from(signature, "hex"),
    );
  } catch {
    sigOk = false;
  }
  if (!sigOk) return fail(120, "attestation_signature_invalid");
  if (att.attestation_key_digest !== keyDigest(attestationPubKeyPem))
    return fail(120, "attestation_signature_invalid", { key_digest_mismatch: true });

  // 2 — bundle Merkle root must recompute (integrity of the five sealed groups).
  if (bundleMerkleRoot(att) !== att.bundle_merkle_root)
    return fail(119, "vrta_bundle_schema_invalid", { bundle_merkle_root: true });

  // 3 — reconstruct the evaluable bundle and run the shared verifier.
  const bundle = {
    charter: att.charter,
    attack_fixtures: att.attack_fixtures,
    finding_records: att.finding_records,
    lane_b_capture: att.lane_b_capture,
    asr: att.asr,
  };
  const engine = tier === "audit" ? (fx) => evaluateChainSafe(fx.payload.bundle).raw : undefined;
  const r = evaluateVrta(bundle, { pubKeyPem: charterPubKeyPem, findingPubKeyPem: findingPub, engine });
  if (r.raw) return { ok: false, ...r, tier };

  // 4 — audit tier: every per-fixture observed_raw must reproduce on a fresh run (129).
  if (tier === "audit") {
    const fxById = new Map(att.attack_fixtures.map((f) => [f.attack_id, f]));
    for (const p of att.per_fixture) {
      const fresh = evaluateChainSafe(fxById.get(p.attack_id).payload.bundle).raw;
      if (fresh !== p.observed_raw)
        return fail(129, "attack_not_reproducible", { attack_id: p.attack_id, recorded: p.observed_raw, fresh });
    }
  }
  return { ok: true, raw: 0, reason: "green", tier };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arg = (flag, def) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : def);
  const attPath = arg("--att", "docs/research/llm-shield/evidence/stage-4u/attestation/vrta-attestation.json");
  const tier = arg("--tier", "public");
  const kd = "tests/fixtures/llmShield/stage4u/test-keys";
  const readPem = (p) => readFileSync(p, "utf8");
  const attestationPubKeyPem = readPem(arg("--pubkey", `${kd}/INSECURE_FIXTURE_ONLY_vrta.pub.pem`));
  const charterPubKeyPem = readPem(arg("--charter-pubkey", `${kd}/INSECURE_FIXTURE_ONLY_vrta-charter.pub.pem`));
  const findingPubKeyPem = readPem(arg("--finding-pubkey", `${kd}/INSECURE_FIXTURE_ONLY_vrta.pub.pem`));
  const att = JSON.parse(readFileSync(attPath, "utf8"));
  const res = verifyAttestation(att, { tier, attestationPubKeyPem, charterPubKeyPem, findingPubKeyPem });
  console.error(`stage4u verify [${tier}]: raw=${res.raw} reason=${res.reason}`);
  process.exit(res.raw === 0 ? 0 : res.raw);
}
