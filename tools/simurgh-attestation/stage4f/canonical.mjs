// SPDX-License-Identifier: AGPL-3.0-or-later
import { canonicalJson, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";

export function canonicalBytes(value) {
  return canonicalJson(value);
}

export function canonicalHash(value) {
  return `sha256:${sha256Canonical(value)}`;
}

export function stripHashPrefix(value) {
  return typeof value === "string" && value.startsWith("sha256:") ? value.slice(7) : value;
}
