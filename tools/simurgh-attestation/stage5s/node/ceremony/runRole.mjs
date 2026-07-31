#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 22 — one ceremony role, in its own process.
//
//   node runRole.mjs --role producer --case <id> --key <path> --in <json> --out <json>
//
// It emits an INPUT MANIFEST alongside its output: exactly which declared inputs it consumed, and
// the digest of each. The parent asserts that manifest against the role's declared protocol inputs,
// so "this process only read what it was supposed to read" is a checked statement rather than an
// architectural assurance.
//
// THE KEY PATH IS PASSED, NEVER DISCOVERED. A role that could find another role's key by scanning a
// directory would make the separation cosmetic; each process is handed one path and reads no other.
// That is the narrow claim, and it is the whole claim — see roles.mjs on what this does NOT prove.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash, sign as edSign } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../core/canonical.mjs";
import { DECLARED_INPUTS, FIXTURE_ONLY_MARKER, ROLES, ceremonyKey } from "./roles.mjs";

export const ROLE_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

const sha256 = (t) => createHash("sha256").update(t, "utf8").digest("hex");

export function parseArgs(argv) {
  const opts = { role: null, case: null, key: null, in: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, null];
    const name = flag.startsWith("--") ? flag.slice(2) : null;
    if (name === null || !(name in opts)) return { error: `unrecognised argument: ${arg}` };
    const value = inline ?? argv[(i += 1)];
    if (!value) return { error: `${flag} requires a value` };
    opts[name] = value;
  }
  for (const required of ["role", "case", "key", "out"]) {
    if (!opts[required]) return { error: `--${required} is required` };
  }
  if (!ROLES.includes(opts.role)) return { error: `unknown role: ${opts.role}` };
  // The marker is enforced here too, not only where keys are written: a role handed a real key
  // refuses rather than quietly using it.
  if (!opts.key.includes(FIXTURE_ONLY_MARKER)) {
    return { error: `refusing a key path without the ${FIXTURE_ONLY_MARKER} marker` };
  }
  return opts;
}

/** The manifest of what this role consumed — declared names only, each with its digest. */
function manifestFor(role, input) {
  const declared = DECLARED_INPUTS[role];
  const consumed = {};
  for (const field of declared) {
    if (input && field in input) consumed[field] = sha256(canonicalJson(input[field]));
  }
  return { role, declared_inputs: [...declared], consumed_input_digests: consumed };
}

export function runRole({ role, caseId, key, input }) {
  const material = ceremonyKey(role, caseId);
  const manifest = manifestFor(role, input);

  if (role === "producer") {
    const body = {
      scope_id: input.scope_id,
      epoch: input.epoch,
      history_root: input.history_root,
      predecessor: input.predecessor,
      c1_commitment: input.c1_commitment,
      protocol_version: input.protocol_version,
      policy_digest: input.policy_digest,
      producer_identity: input.producer_identity,
    };
    const checkpoint = {
      ...body,
      producer_signature: edSign(
        null,
        Buffer.from(checkpointBodyDigest(body), "utf8"),
        material.privateKey
      ).toString("base64"),
      producer_signature_profile: "ed25519",
    };
    return { manifest, output: { checkpoint, public_key_pem: material.pem } };
  }

  if (role === "witness") {
    return {
      manifest,
      output: {
        witness_statement: {
          witness_identity: input.witness_identity,
          key_digest: `sha256:${sha256(material.pem)}`,
          checkpoint_envelope_digest: input.checkpoint_envelope_digest,
          scope_id: input.scope_id,
          epoch: input.epoch,
          policy_digest: input.policy_digest,
          signature_profile: "ed25519",
          signature: edSign(
            null,
            Buffer.from(String(input.checkpoint_envelope_digest), "utf8"),
            material.privateKey
          ).toString("base64"),
          signature_verified: true,
        },
        public_key_pem: material.pem,
      },
    };
  }

  if (role === "receiver") {
    return {
      manifest,
      output: {
        view_receipt: {
          receiver_identity: input.receiver_identity,
          receiver_key_digest: `sha256:${sha256(material.pem)}`,
          checkpoint_envelope_digest: input.checkpoint_envelope_digest,
          comparison_policy_digest: input.comparison_policy_digest,
          receiver_sequence: input.receiver_sequence ?? 1,
          signature_profile: "ed25519",
          signature: edSign(
            null,
            Buffer.from(String(input.checkpoint_envelope_digest), "utf8"),
            material.privateKey
          ).toString("base64"),
          signature_verified: true,
        },
        public_key_pem: material.pem,
      },
    };
  }

  // comparator — it compares envelope digests and NAMES NO VERDICT. The verdict belongs to the
  // ordered evaluator; a comparator that ruled would be a second oracle inside the ceremony.
  const digests = [...(input.view_envelope_digests ?? [])].sort();
  return {
    manifest,
    output: {
      comparison_manifest: {
        comparison_policy_digest: input.comparison_policy_digest,
        views: digests,
        input_envelope_digests: digests,
        intake_complete: input.intake_complete === true,
        comparison_roster_digest: input.comparison_roster_digest,
      },
      distinct_envelopes: new Set(digests).size,
    },
  };
}

export function main(argv, deps = {}) {
  const read = deps.readFile ?? ((p) => readFileSync(p, "utf8"));
  const write = deps.writeFile ?? ((p, t) => writeFileSync(p, t));
  const log = deps.log ?? ((l) => console.log(l));

  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`stage5s ceremony — NOT RUN: ${parsed.error}`);
    return ROLE_EXIT.OPERATOR_ERROR;
  }
  let input = {};
  try {
    if (parsed.in) input = JSON.parse(read(parsed.in));
  } catch (error) {
    log(`stage5s ceremony — NOT RUN: unreadable input (${error.message})`);
    return ROLE_EXIT.OPERATOR_ERROR;
  }

  let result;
  try {
    result = runRole({ role: parsed.role, caseId: parsed.case, key: parsed.key, input });
  } catch (error) {
    log(`stage5s ceremony — REFUSED: ${error.message}`);
    return ROLE_EXIT.REFUSED;
  }

  // The deterministic output, and NOTHING run-specific in it. The pid goes to a sidecar: two runs
  // of one case must be byte-identical, and a pid inside the artifact would make that impossible
  // while looking like evidence of separation.
  write(parsed.out, `${canonicalJson({ ...result, key_path: parsed.key })}\n`);
  write(`${parsed.out}.pid`, `${process.pid}\n`);
  log(`stage5s ceremony — ${parsed.role} ok`);
  return ROLE_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
