// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.4 — generate the read-only SECTION7_AUTHORITY_REGISTRY from the descriptor packet.
//
// section7AuthorityDescriptors.mjs is the NORMATIVE SOURCE. This generator hashes each descriptor in
// topological (leaf-first) order under one of three bootstrap digest-domain constants, producing a
// map id -> bare-hex digest token. Check 4 of the §7.2 relation compares BOTH the profile_bundle pair
// digest AND the presented artifact digest against this table.
//
// The registry is transitively closed: an `imports` entry is resolved to its already-computed digest
// and embedded in the dependent's preimage, so a changed upstream descriptor propagates into every
// dependent digest along the imports graph. Pair 23's four `<regenerated>` maxima are injected from
// measureChallengeMaxima BEFORE hashing, so the registry is HELD until the maxima regenerate.
//
// This is a build-time generator: it frames binary length prefixes, so it hashes with node:crypto
// over a Buffer. The runtime verifier consumes the pre-generated table and never re-frames a
// descriptor. No digest literal appears in this source (oracle-free); the test derives every value.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "../core/digestTokenCodec.mjs";
import { generateMaxima } from "./measureChallengeMaxima.mjs";
import {
  GRAMMAR_DESCRIPTORS,
  SCHEMA_DESCRIPTORS,
  PROFILE_DESCRIPTORS,
  GENERATION_ORDER,
  EXTERNAL_AUTHORITY_ROOTS,
  GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN,
  SCHEMA_DESCRIPTOR_DIGEST_DOMAIN,
  PROFILE_DESCRIPTOR_DIGEST_DOMAIN,
} from "../core/section7AuthorityDescriptors.mjs";

const u16be = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
const u32be = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};

// The framed descriptor-digest preimage (shared by all three kinds; the domain switches per kind):
//   SHA256( u16be(len(UTF8(DOMAIN))) || UTF8(DOMAIN)
//        || u32be(len(UTF8(canonicalJson(descriptor)))) || UTF8(canonicalJson(descriptor)) )
export function framedDescriptorDigest(domain, descriptor) {
  const d = Buffer.from(domain, "utf8");
  const body = Buffer.from(canonicalJson(descriptor), "utf8");
  const pre = Buffer.concat([u16be(d.length), d, u32be(body.length), body]);
  return createHash("sha256").update(pre).digest(); // 32-byte Buffer
}

const KIND = {
  grammar: {
    map: GRAMMAR_DESCRIPTORS,
    domain: GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN,
    idKey: "grammar_id",
  },
  schema: { map: SCHEMA_DESCRIPTORS, domain: SCHEMA_DESCRIPTOR_DIGEST_DOMAIN, idKey: "schema_id" },
  profile: {
    map: PROFILE_DESCRIPTORS,
    domain: PROFILE_DESCRIPTOR_DIGEST_DOMAIN,
    idKey: "profile_id",
  },
};

const EXTERNAL = new Map(EXTERNAL_AUTHORITY_ROOTS.map((r) => [r.id, r.digest]));

// Inject the four generated maxima into pair 23's `<regenerated>` rules before hashing.
function injectMaxima(descriptor, maxima) {
  const table = {
    max_beacon_suffix_artifact_bytes: maxima.MAX_BEACON_SUFFIX_ARTIFACT_BYTES_V1,
    max_selected_indices_artifact_bytes: maxima.MAX_SELECTED_INDICES_ARTIFACT_BYTES_V1,
    max_challenge_record_bytes: maxima.MAX_CHALLENGE_RECORD_BYTES_V1,
    max_challenge_package_canonical_bytes: maxima.MAX_CHALLENGE_PACKAGE_BYTES_V1,
  };
  const rules = descriptor.rules.map((r) =>
    r.rule_id in table ? { ...r, value: table[r.rule_id] } : r
  );
  return { ...descriptor, rules };
}

function resolveId(id, registry) {
  if (Object.prototype.hasOwnProperty.call(registry, id)) return registry[id];
  if (EXTERNAL.has(id)) return EXTERNAL.get(id);
  throw new Error(`dangling_import:${id}`);
}

// Resolve the top-level `imports` array to {id, digest} (topological) for the digest preimage.
function resolveImports(descriptor, registry) {
  if (!Array.isArray(descriptor.imports)) return descriptor;
  const imports = descriptor.imports.map((im) => ({
    id: im.id,
    digest: resolveId(im.id, registry),
  }));
  return { ...descriptor, imports };
}

/** Deep-collect every {id: <string>} reference anywhere in a descriptor (closure census). */
export function collectIdReferences(node, out = new Set()) {
  if (Array.isArray(node)) {
    for (const x of node) collectIdReferences(x, out);
    return out;
  }
  if (node && typeof node === "object") {
    if (typeof node.id === "string") out.add(node.id);
    for (const v of Object.values(node)) collectIdReferences(v, out);
    return out;
  }
  return out;
}

export function generateAuthorityRegistry(opts = {}) {
  const maxima = opts.maxima ?? generateMaxima();
  const registry = {};
  const perId = {};
  for (const entry of GENERATION_ORDER) {
    const [kind, key] = entry.split(":");
    const k = KIND[kind];
    if (!k) throw new Error(`unknown_kind:${kind}`);
    const raw = k.map[key];
    if (!raw) throw new Error(`missing_descriptor:${entry}`);
    const id = raw[k.idKey];
    if (typeof id !== "string") throw new Error(`descriptor_missing_id:${entry}`);
    let prepared = key === "challenge_resource_limits_profile" ? injectMaxima(raw, maxima) : raw;
    prepared = resolveImports(prepared, registry);
    const token = encodeDigestToken(framedDescriptorDigest(k.domain, prepared));
    if (Object.prototype.hasOwnProperty.call(registry, id)) {
      throw new Error(`duplicate_registry_id:${id}`);
    }
    registry[id] = token;
    // `prepared` is the exact object hashed (imports resolved to embedded digests, maxima injected);
    // an independent runtime frames+hashes canonicalJson(prepared) under `domain` to reproduce `token`.
    perId[id] = Object.freeze({ entry, kind, domain: k.domain, token, prepared });
  }
  return Object.freeze({ registry: Object.freeze(registry), perId: Object.freeze(perId), maxima });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { registry } = generateAuthorityRegistry();
  const width = Math.max(...Object.keys(registry).map((k) => k.length));
  for (const [id, tok] of Object.entries(registry)) console.log(`${id.padEnd(width)}  ${tok}`);
}
