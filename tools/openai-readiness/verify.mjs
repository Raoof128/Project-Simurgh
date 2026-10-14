// SPDX-License-Identifier: AGPL-3.0-or-later
import { openSync, closeSync, fstatSync, readSync, constants } from "node:fs";
import { verifyArtifact } from "./artifact.mjs";
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
try {
  const [path, flag, fingerprint, ...extra] = process.argv.slice(2);
  if (
    !path ||
    extra.length ||
    (flag && (flag !== "--expected-fingerprint" || !fingerprint)) ||
    (!flag && fingerprint)
  )
    throw new Error("Usage: verify.mjs REPORT [--expected-fingerprint SHA256]");
  if (fingerprint && !/^[a-f0-9]{64}$/.test(fingerprint))
    throw new Error("Invalid expected fingerprint");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let text;
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_ARTIFACT_BYTES)
      throw new Error("Artifact size or file type invalid");
    const buffer = Buffer.alloc(MAX_ARTIFACT_BYTES + 1);
    let size = 0,
      read;
    do {
      read = readSync(fd, buffer, size, buffer.length - size, null);
      size += read;
    } while (read && size < buffer.length);
    if (size > MAX_ARTIFACT_BYTES) throw new Error("Artifact size exceeds limit");
    text = buffer.subarray(0, size).toString("utf8");
  } finally {
    closeSync(fd);
  }
  let artifact;
  try {
    artifact = JSON.parse(text);
  } catch {
    throw new Error("Artifact JSON invalid");
  }
  let result;
  try {
    result = verifyArtifact(artifact, { expectedFingerprint: fingerprint });
  } catch {
    throw new Error("Artifact signature, fingerprint, schema or recomputed evidence invalid");
  }
  console.log(JSON.stringify({ status: "verified", ...result }, null, 2));
} catch (error) {
  // Never echo report contents through JSON parser or crypto errors.
  const known = /^(Usage:|Invalid expected fingerprint|Artifact )/.test(error.message);
  console.error(`Verification failed: ${known ? error.message : "Artifact could not be read"}`);
  process.exitCode = 1;
}
