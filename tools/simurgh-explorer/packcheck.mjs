// SPDX-License-Identifier: AGPL-3.0-or-later
// Recompute a pack's root from its bytes, in a browser or in Node, with no package.
//
// A pack is a ZIP whose root is the SHA-256 of its `manifest.json`, and whose manifest lists
// the SHA-256 of every other member. This reads the archive, hashes the manifest and each
// member, and reports what it found. It is the first thing a pack's own verifier does and no
// more: it replays nothing, runs no model and says nothing about who produced the bytes.
const LIMIT = 64 * 1024 * 1024;
const MEMBERS = 10000;
const refuse = (message) => {
  throw new Error(`Pack ${message}`);
};
const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (bytes) => hex(await crypto.subtle.digest("SHA-256", bytes));

async function inflate(bytes, expected) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const out = new Uint8Array(expected);
  let at = 0;
  try {
    for await (const chunk of stream) {
      if (at + chunk.length > expected) refuse("member is larger than its header says");
      out.set(chunk, at);
      at += chunk.length;
    }
  } catch (e) {
    // A damaged member fails inside the browser's own decompressor, with its own wording.
    if (e.message.startsWith("Pack ")) throw e;
    refuse("has a member that cannot be decompressed");
  }
  if (at !== expected) refuse("member is shorter than its header says");
  return out;
}

// The members of a ZIP, read from its central directory. Encrypted, split and ZIP64 archives
// are refused, as is any member over 64 MiB: a pack has none of these.
export async function readZip(bytes) {
  if (!(bytes instanceof Uint8Array)) refuse("must be given as bytes");
  if (bytes.length > 4 * LIMIT) refuse("is larger than 256 MiB");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) refuse("is not a ZIP archive");
  const count = view.getUint16(end + 10, true),
    directory = view.getUint32(end + 16, true);
  if (count > MEMBERS || count === 0xffff || directory === 0xffffffff)
    refuse("has too many members or is a ZIP64 archive");
  const members = new Map();
  let at = directory;
  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50)
      refuse("has a damaged directory");
    const flags = view.getUint16(at + 8, true),
      method = view.getUint16(at + 10, true),
      packed = view.getUint32(at + 20, true),
      size = view.getUint32(at + 24, true),
      nameLength = view.getUint16(at + 28, true),
      skip = view.getUint16(at + 30, true) + view.getUint16(at + 32, true),
      local = view.getUint32(at + 42, true);
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(at + 46, at + 46 + nameLength)
    );
    if (flags & 1) refuse("is encrypted");
    if (size > LIMIT) refuse("has a member over 64 MiB");
    if (members.has(name)) refuse(`names ${name} twice`);
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50)
      refuse("has a damaged member");
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (start + packed > bytes.length) refuse("has a member that runs past its end");
    const data = bytes.subarray(start, start + packed);
    if (method === 0) members.set(name, data);
    else if (method === 8) members.set(name, await inflate(data, size));
    else refuse("uses a compression this check does not read");
    at += 46 + nameLength + skip;
  }
  return members;
}

const digestOf = (entry) =>
  String((entry && typeof entry === "object" ? entry.sha256 : entry) ?? "").replace(/^sha256:/, "");

export async function checkPack(bytes, { keep = false } = {}) {
  const members = await readZip(bytes);
  const manifestBytes = members.get("manifest.json");
  if (!manifestBytes) refuse("has no manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
  } catch {
    refuse("has a manifest that is not JSON");
  }
  const files = manifest?.files;
  if (!files || typeof files !== "object" || Array.isArray(files))
    refuse("has a manifest without a list of files");
  const listed = Object.keys(files);
  if (listed.length > MEMBERS) refuse("lists too many files");
  const differing = [],
    missing = [];
  for (const name of listed) {
    const data = members.get(name);
    if (!data) missing.push(name);
    else if ((await sha256(data)) !== digestOf(files[name])) differing.push(name);
  }
  const unlisted = [...members.keys()].filter((n) => n !== "manifest.json" && !(n in files));
  const wrong = new Set([...differing, ...unlisted]);
  return {
    members: [...members].map(([name, data]) => ({
      name,
      bytes: data.length,
      state: name === "manifest.json" ? "manifest" : wrong.has(name) ? "differs" : "matches",
    })),
    // The bytes themselves, for a reader who wants to look inside. Not kept unless asked.
    ...(keep ? { contents: members } : {}),
    root: await sha256(manifestBytes),
    listed: listed.length,
    matching: listed.length - differing.length - missing.length,
    differing,
    missing,
    unlisted,
  };
}

// What a reader is told. "match" is never called verified: the root it is compared with comes
// from the same place as the page unless the reader brings one from elsewhere.
export function verdict(result, expectedRoot) {
  const rootMatches = result.root === expectedRoot;
  const whole = !result.differing.length && !result.missing.length && !result.unlisted.length;
  return { rootMatches, whole, match: rootMatches && whole };
}
