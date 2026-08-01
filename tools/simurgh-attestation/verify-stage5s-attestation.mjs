#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the standalone attestation verifier.
//
//   node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle <envelope.json>
//
// IT REFUSES `--key`, BY NAME. Every input it needs is public: the envelope and the committed public
// key beside it. A verifier that accepted a private key would invite somebody to hand it the signing
// key and call the output a verification — which is signing wearing a verifier's name.
//
// It reads only what is committed, computes only from that, and never reaches the network.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { verifyAttestation } from "./stage5s/node/attestation.mjs";

export const VERIFY_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

export function parseArgs(argv) {
  const opts = { bundle: null, key: null, tier: "public" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, null];
    if (flag === "--key") {
      return {
        error:
          "--key is refused: this verifier needs no private key, and a verifier that accepts one " +
          "is signing wearing a verifier's name",
      };
    }
    const name = flag.startsWith("--") ? flag.slice(2) : null;
    if (name === null || !(name in opts)) return { error: `unrecognised argument: ${arg}` };
    const value = inline ?? argv[(i += 1)];
    if (!value) return { error: `${flag} requires a value` };
    opts[name] = value;
  }
  if (!opts.bundle) return { error: "--bundle <envelope.json> is required" };
  return opts;
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  const read = deps.readFile ?? ((p) => readFileSync(p, "utf8"));

  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`Stage 5S attestation — NOT RUN: ${parsed.error}`);
    return VERIFY_EXIT.OPERATOR_ERROR;
  }

  let envelope;
  let publicKeyPem;
  try {
    envelope = JSON.parse(read(parsed.bundle));
    publicKeyPem = read(join(dirname(parsed.bundle), "vwq-public-key.pem"));
  } catch (error) {
    log(`Stage 5S attestation — NOT RUN: ${error.message}`);
    return VERIFY_EXIT.OPERATOR_ERROR;
  }

  const result = verifyAttestation(envelope, publicKeyPem, { tier: parsed.tier });
  log(`Stage 5S attestation — tier=${parsed.tier}`);
  if (!result.ok) {
    log(`  REFUSALS: ${result.refusals.length}`);
    for (const r of result.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
    return VERIFY_EXIT.REFUSED;
  }
  log(
    `  OK — root recomputed, signature verified, ${envelope.body.compared_checkpoint_envelope_digests.length} compared digests each carry a quorum status`
  );
  return VERIFY_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
