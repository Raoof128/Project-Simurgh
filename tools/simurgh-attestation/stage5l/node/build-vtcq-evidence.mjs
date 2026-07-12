// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — build the byte-stable Lane-A evidence pack: signed bundles for the three computed states
// (core, quorum-confirmed-STUB, quorum-pending) + their public/audit attestations. quorum-confirmed here
// is a STUB-facts logic fixture (never a claim of externally_anchored — that waits for Lane B's real
// upgraded .ots). Deterministic keys ⇒ byte-identical output.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../core/digests.mjs";
import { buildSignedVtcqBundle, attachProjections } from "./buildSignedBundle.mjs";
import { makeVtcqFacts, verifyVtcq } from "./adapter.mjs";
import { buildPublicAttestation, buildAuditAttestation } from "./attestation.mjs";
import { vtcqLaneKeys } from "./laneKeys.mjs";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5l/lane-a"
);

const CASES = [
  {
    name: "core-positive",
    profile: "vtc_core",
    finality: "confirmed",
    expect: { public: 0, audit: 0 },
  },
  {
    name: "quorum-confirmed-stub",
    profile: "vtc_quorum",
    finality: "confirmed",
    expect: { public: 0, audit: 0 },
  },
  {
    name: "quorum-pending-typed",
    profile: "vtc_quorum",
    finality: "pending",
    expect: { public: 372 },
  },
];

export function buildEvidence({ write = true } = {}) {
  const keys = vtcqLaneKeys();
  const out = {};
  if (write) mkdirSync(OUT, { recursive: true });
  for (const c of CASES) {
    const { bundle, cfg } = buildSignedVtcqBundle(keys, {
      profile: c.profile,
      finality: c.finality,
    });
    const facts = makeVtcqFacts(bundle, cfg, keys);
    attachProjections(bundle, cfg, facts);
    for (const [tier, want] of Object.entries(c.expect)) {
      const got = verifyVtcq(bundle, cfg, keys, { tier }).raw;
      if (got !== want) throw new Error(`${c.name} ${tier}: expected raw ${want}, got ${got}`);
    }
    const pub = buildPublicAttestation(bundle, cfg, facts, keys);
    const audit = c.expect.audit === 0 ? buildAuditAttestation(bundle, cfg, facts, keys) : null;
    const files = {
      bundle,
      config: cfg,
      public_attestation: pub,
      ...(audit ? { audit_attestation: audit } : {}),
    };
    out[c.name] = files;
    if (write) {
      const dir = join(OUT, c.name);
      mkdirSync(dir, { recursive: true });
      for (const [k, v] of Object.entries(files))
        writeFileSync(join(dir, `${k}.json`), canonicalJson(v) + "\n");
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildEvidence({ write: true });
  console.log("VTC-Q Lane-A evidence written:", CASES.map((c) => c.name).join(", "));
}
