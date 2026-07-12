// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — portable browser verifier of the deterministic surface (WebCrypto/SubtleCrypto async). Zero
// external imports beyond the local canonical-json (CSP no-egress). This is a WebCrypto REIMPLEMENTATION
// of the frozen Merkle-set + projection + set-equality surface proven by parity vectors — NOT a direct
// import of the node:crypto core. The anchor path (Rekor/Bitcoin) is DECLARED, not simulated. Runs under
// Node's global WebCrypto too.
import { canonicalJson } from "./canonical-json.mjs";

const te = new TextEncoder();
const NUL = new Uint8Array([0]);

async function sha256Bytes(...chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}
const encHex = (u8) => "sha256:" + [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(str) {
  return encHex(await sha256Bytes(te.encode(str)));
}
const artifactDigest = (obj) => sha256Hex(canonicalJson(obj));
const domainDigest = (dom, obj) => sha256Hex(dom + canonicalJson(obj));

async function leafHash(leaf) {
  const payload = canonicalJson({
    leaf_id: leaf.leaf_id,
    leaf_type: leaf.leaf_type,
    subject_digest: leaf.subject_digest,
  });
  return sha256Bytes(te.encode("simurgh.vuc.leaf.v1"), NUL, te.encode(payload));
}
async function nodeHash(l, r) {
  return sha256Bytes(te.encode("simurgh.vuc.node.v1"), NUL, l, r);
}
async function merkleRoot(hashes) {
  let level = hashes;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2)
      next.push(i + 1 < level.length ? await nodeHash(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return level[0];
}

async function subjectDigest(partition_digest, s) {
  return domainDigest("simurgh.vuc.section_subject.v1", {
    partition_digest,
    section_id: s.section_id,
    canonical_path: s.canonical_path,
    redaction_types: s.redaction_types ?? [],
  });
}
async function project(sectionsById, ids, partition_digest) {
  const out = [];
  for (const id of ids) {
    const s = sectionsById.get(id);
    if (!s) continue;
    out.push({
      leaf_id: s.section_id,
      leaf_type: "vpc_section",
      subject_digest: await subjectDigest(partition_digest, s),
    });
  }
  return out;
}
async function universeSetDigest(leaves) {
  const triples = leaves
    .map((l) => ({ leaf_id: l.leaf_id, leaf_type: l.leaf_type, subject_digest: l.subject_digest }))
    .sort((a, b) => (a.leaf_id < b.leaf_id ? -1 : a.leaf_id > b.leaf_id ? 1 : 0));
  return artifactDigest({ universe_triples: triples });
}

export async function verifyPortable(bundle, cfg) {
  const uc = bundle.universe_commitment;
  const leaves = uc.leaves;
  // leaf_digest recompute
  for (const l of leaves) {
    if (encHex(await leafHash(l)) !== l.leaf_digest) return { raw: 349, where: "leaf_digest" };
  }
  // universe_root recompute
  const hashes = [];
  for (const l of leaves) hashes.push(await leafHash(l));
  const universe_root = encHex(await merkleRoot(hashes));
  if (universe_root !== uc.universe_root) return { raw: 349, where: "universe_root" };
  // commitment digest recompute
  const pcs = bundle.producer_commitment_statement;
  const universe_commitment_digest = await domainDigest("simurgh.vuc.commitment.v1", {
    schema_version: bundle.schema_version,
    composition_profile: bundle.composition_profile,
    producer_identity_digest: pcs.producer_identity_digest,
    canonicalization_profile: uc.canonicalization_profile,
    tree_profile: uc.tree_profile,
    hash_algorithm: uc.hash_algorithm,
    leaf_count: uc.leaf_count,
    universe_root: uc.universe_root,
  });
  if (universe_commitment_digest !== uc.universe_commitment_digest)
    return { raw: 349, where: "commitment_digest" };
  // U set digests
  const vpc = cfg.vpc_bundle;
  const vrc = cfg.vrc_bundle;
  const partition_digest = vpc.attestation.content.partition_digest;
  const sectionsById = new Map(vpc.partition.content.sections.map((s) => [s.section_id, s]));
  const covered = [
    ...new Set(vpc.coverage_receipts.flatMap((c) => c.content.evaluated_sections)),
  ].sort();
  const rated = [...new Set(vrc.producer_ratings.map((p) => p.content.section_id))].sort();
  const uCommit = leaves.map((l) => ({
    leaf_id: l.leaf_id,
    leaf_type: l.leaf_type,
    subject_digest: l.subject_digest,
  }));
  const uVpc = await project(sectionsById, covered, partition_digest);
  const uVrc = await project(sectionsById, rated, partition_digest);
  const dCommit = await universeSetDigest(uCommit);
  const dVpc = await universeSetDigest(uVpc);
  const dVrc = await universeSetDigest(uVrc);
  if (!(dCommit === dVpc && dCommit === dVrc))
    return { raw: 357, u_commit: dCommit, u_vpc: dVpc, u_vrc: dVrc };
  return {
    raw: 0,
    universe_root,
    universe_commitment_digest,
    u_commit: dCommit,
    u_vpc: dVpc,
    u_vrc: dVrc,
    anchor_path: "declared_not_simulated", // browser does not contact Rekor/Bitcoin
  };
}
