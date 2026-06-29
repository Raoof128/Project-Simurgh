// SPDX-License-Identifier: AGPL-3.0-or-later
import { sign, verify } from "node:crypto";
import { merkleRoot } from "../stage4d/merkle.mjs";
import { canonicalJson, domainBytes, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { CAMPAIGN_DOMAIN, CAMPAIGN_RECORD_DOMAIN } from "./constants.mjs";

export function campaignHash(payload) {
  return `sha256:${sha256Canonical(payload)}`;
}

export function campaignIdFromConfig({
  seed,
  budget,
  library_hash,
  target_commit,
  policy_hash,
  driver_hash,
}) {
  return campaignHash({ seed, budget, library_hash, target_commit, policy_hash, driver_hash });
}

export function campaignMerkleRoot(recordHashes) {
  return `sha256:${merkleRoot(recordHashes.map((value) => value.replace(/^sha256:/, "")))}`;
}

export function canonicalBytes(payload) {
  return Buffer.from(canonicalJson(payload), "utf8");
}

export function signCampaignPayload(payload, privateKey) {
  return sign(null, domainBytes(CAMPAIGN_DOMAIN, payload), privateKey).toString("base64");
}

export function verifyCampaignSignature(payload, signature, publicKey) {
  try {
    return verify(
      null,
      domainBytes(CAMPAIGN_DOMAIN, payload),
      publicKey,
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

export function signCampaignRecord(payload, privateKey) {
  return sign(null, domainBytes(CAMPAIGN_RECORD_DOMAIN, payload), privateKey).toString("base64");
}

export function verifyCampaignRecordSignature(payload, signature, publicKey) {
  try {
    return verify(
      null,
      domainBytes(CAMPAIGN_RECORD_DOMAIN, payload),
      publicKey,
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}
