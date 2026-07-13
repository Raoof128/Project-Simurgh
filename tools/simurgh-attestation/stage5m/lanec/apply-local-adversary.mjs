// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — Lane C-adv (LOCAL backend, apply+verify). Consumes lanec-local-mutations.json (from the cached
// Llama-3.2-1B fuzzer) and runs EACH forgery through the frozen verifyVtcQuorum. contained = the forged
// bundle did NOT bank externally_anchored. This fills the attack classes a frontier model refused, so every
// class is exercised against the verifier. Digest-only, NOT CI-gated.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { verifyVtcQuorum } from "../node/verify.mjs";
import { fingerprint } from "../../stage5l/node/signatures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EV = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb");
const LANEC = join(EV, "..", "real-lanec");
const BUNDLE0 = JSON.parse(readFileSync(join(EV, "laneb-bundle.json"), "utf8"));
const P = JSON.parse(readFileSync(join(EV, "laneb-pinned.json"), "utf8"));
const pubId = (n) => ({
  id: {
    identity_subject: n,
    public_key_pem: readFileSync(join(EV, `keys/PUB_${n}.pem`), "utf8"),
    key_fingerprint: fingerprint(readFileSync(join(EV, `keys/PUB_${n}.pem`), "utf8")),
  },
});
const KEYS = {
  gate: pubId("gate"),
  sequencer: pubId("sequencer"),
  tsaverifier: pubId("tsaverifier"),
};
const PINNED = {
  rekorPubPem: readFileSync(join(EV, "rekor_pubkey.pem"), "utf8"),
  expectedSubmitterPem: readFileSync(join(EV, "keys/PUB_submitter.pem"), "utf8"),
  expected_submitter_fpr: P.expected_submitter_fpr,
  canonicalAnchorBytes: readFileSync(join(EV, "canonical-anchor.txt")),
  accuracy_policy_s: P.accuracy_policy_s,
  tsa_verifier_pubkey_fpr: P.tsa_verifier_pubkey_fpr,
  vtcq_policy_digest: P.vtcq_policy_digest,
};

function applyMutations(bundle, muts) {
  const b = structuredClone(bundle);
  for (const m of muts ?? []) {
    try {
      const parts = String(m.path).split(".");
      let o = b;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      if (o && typeof o === "object") o[parts[parts.length - 1]] = m.value;
    } catch {
      /* malformed path → skip; verifier still runs */
    }
  }
  return b;
}

const gen = JSON.parse(readFileSync(join(LANEC, "lanec-local-mutations.json"), "utf8"));
const results = [];
for (const a of gen.attacks) {
  let raw,
    anchored,
    err = null;
  try {
    const v = verifyVtcQuorum(applyMutations(BUNDLE0, a.mutations), PINNED, KEYS, {});
    raw = v.raw;
    anchored = v.externally_anchored === true;
  } catch (e) {
    raw = "threw→contained";
    anchored = false;
    err = String(e).slice(0, 80);
  }
  const contained = anchored === false;
  results.push({
    attack: a.attack,
    mutation_count: (a.mutations ?? []).length,
    raw,
    externally_anchored: anchored,
    contained,
    err,
  });
  console.log(JSON.stringify(results.at(-1)));
}
const contained = results.filter((r) => r.contained).length;
writeFileSync(
  join(LANEC, "lanec-local-capture.json"),
  JSON.stringify(
    {
      stage: "5M-VTC-Quorum",
      lane: "C-adv-local",
      model: gen.model,
      device: gen.device,
      captured_at: new Date().toISOString(),
      summary: { attacks_run: results.length, contained, bypasses: results.length - contained },
      results,
      non_claim:
        "Local uncensored fuzzer (Llama-3.2-1B) exercises EVERY attack class — including those a frontier model refuses — against the frozen verifier. 'contained' = did NOT bank externally_anchored. Defensive; target is our own verifier. Digest-only, NOT CI-gated.",
    },
    null,
    2
  )
);
console.log(`\nLANE C-adv (local): ${contained}/${results.length} contained (0 bypasses required)`);
