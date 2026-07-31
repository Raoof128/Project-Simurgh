// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 17 — deterministic keys from committed seeds.
//
// `generateKeyPairSync` is the obvious way to make an Ed25519 key and the wrong one here: a fixture
// pack built from fresh keys differs from itself on every run, so "the builder is deterministic"
// becomes unfalsifiable and the byte-for-byte reproduce that every stage in this repository ships
// cannot be run at all.
//
// Ed25519 private keys ARE their 32-byte seed, so a committed seed is a committed key. The PKCS#8
// prefix below is the fixed ASN.1 header for a v1 Ed25519 PrivateKeyInfo — version, the
// id-Ed25519 algorithm identifier, and the OCTET STRING wrapper — and nothing in it varies with the
// seed, which is why it can be a constant rather than an encoder.
//
// THESE ARE TEST KEYS AND ONLY TEST KEYS. The seeds are committed in the open on purpose: a fixture
// signed by a secret is a fixture nobody else can rebuild, which defeats the entire point of a
// byte-reproducible pack. No path in this repository signs anything real with them, and the
// private-key surface refusal in Annex S.3 is unaffected — a seed constant in a fixture module is
// not a key file.

import { createPrivateKey, createPublicKey } from "node:crypto";

/** ASN.1 PKCS#8 header for an Ed25519 private key: fixed for every seed. */
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

/** The committed seeds. Named by role so a fixture reads as a story rather than as hex. */
export const SEEDS = Object.freeze({
  producer: "5300000000000000000000000000000000000000000000000000000000000001",
  stranger: "5300000000000000000000000000000000000000000000000000000000000002",
  witness_a: "5300000000000000000000000000000000000000000000000000000000000011",
  witness_b: "5300000000000000000000000000000000000000000000000000000000000012",
  witness_c: "5300000000000000000000000000000000000000000000000000000000000013",
  receiver_a: "5300000000000000000000000000000000000000000000000000000000000021",
  receiver_b: "5300000000000000000000000000000000000000000000000000000000000022",
});

const cache = new Map();

/**
 * The key pair for a committed role. Same seed, same key, on every machine and every run.
 *
 * @param {keyof SEEDS} role
 * @returns {{privateKey: import("node:crypto").KeyObject, publicKey: import("node:crypto").KeyObject,
 *            pem: string}}
 */
export function keyFor(role) {
  if (cache.has(role)) return cache.get(role);
  const seed = SEEDS[role];
  if (typeof seed !== "string") throw new Error(`no committed seed for role: ${role}`);
  const privateKey = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seed, "hex")]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  const pair = {
    privateKey,
    publicKey,
    pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  cache.set(role, pair);
  return pair;
}

export const ROLES = Object.freeze(Object.keys(SEEDS));
