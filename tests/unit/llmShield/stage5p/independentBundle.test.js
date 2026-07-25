// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — the independent-verification bundle stays in sync with what it copies.
//
// The bundle is a COPY, and copies rot. If the attestation is re-signed, a capture is refreshed, or
// the spec is amended, a stale bundle would keep verifying happily against yesterday's evidence and
// an external reviewer would be checking a document nobody in this repo is standing behind any more.
//
// So every copied file is compared to its source BY DIGEST, and the bundle carries its own
// SHA256SUMS so the recipient can detect corruption in transit independently of us.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const B = join(ROOT, "docs/research/llm-shield/evidence/stage-5p/independent-verification");
const E = join(ROOT, "docs/research/llm-shield/evidence/stage-5p");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// bundle-relative path -> source path in the repo
const COPIES = {
  "attestation/stage5p-attestation.json": join(E, "attestation/stage5p-attestation.json"),
  "attestation/stage5p-signer.pub": join(E, "attestation/stage5p-signer.pub"),
  "rekor-ceremony/rekor-response.json": join(E, "rekor-ceremony/rekor-response.json"),
  "rekor-ceremony/artifact.json": join(E, "rekor-ceremony/artifact.json"),
  "rekor-ceremony/rekor-log-public-key.pem": join(E, "rekor-ceremony/rekor-log-public-key.pem"),
  "lane-l-capture/probes.json": join(E, "lane-l-capture/probes.json"),
  "proofs/Vsi.lean": join(ROOT, "proofs/stage5p/Vsi.lean"),
  "parity-vectors.json": join(ROOT, "tools/simurgh-attestation/stage5p/python/parity-vectors.json"),
  "vsi_parity.py": join(ROOT, "tools/simurgh-attestation/stage5p/python/vsi_parity.py"),
  "browser/vsi-portable.mjs": join(
    ROOT,
    "tools/simurgh-attestation/stage5p/browser/vsi-portable.mjs"
  ),
  "CLOSEOUT.md": join(ROOT, "docs/research/llm-shield/STAGE_5P_CLOSEOUT.md"),
  "SPEC.md": join(
    ROOT,
    "docs/superpowers/specs/2026-07-25-stage-5p-vsi-verifiable-submitter-identity-design.md"
  ),
};

test("every copied file is byte-identical to its source — the bundle has not gone stale", () => {
  const drifted = [];
  for (const [rel, source] of Object.entries(COPIES)) {
    const copy = join(B, rel);
    if (!existsSync(copy)) {
      drifted.push(`${rel}: MISSING from the bundle`);
      continue;
    }
    if (sha(copy) !== sha(source)) drifted.push(`${rel}: differs from ${source}`);
  }
  assert.deepEqual(
    drifted,
    [],
    `the bundle is stale — rebuild it before sending:\n  ${drifted.join("\n  ")}`
  );
});

test("the bundle carries its own SHA256SUMS, covering every file it ships", () => {
  const manifest = readFileSync(join(B, "SHA256SUMS.txt"), "utf8");
  const listed = new Set([...manifest.matchAll(/^([0-9a-f]{64})\s+\.\/(.+)$/gm)].map((m) => m[2]));
  const walk = (dir, prefix = "") => {
    const out = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.isDirectory()) out.push(...walk(join(dir, name.name), `${prefix}${name.name}/`));
      else if (name.name !== "SHA256SUMS.txt") out.push(`${prefix}${name.name}`);
    }
    return out;
  };
  const present = walk(B);
  assert.ok(present.length >= 25, `expected a full bundle, found ${present.length} files`);
  const unlisted = present.filter((f) => !listed.has(f));
  assert.deepEqual(
    unlisted,
    [],
    `files shipped but absent from SHA256SUMS: ${unlisted.join(", ")}`
  );
});

test("every digest in SHA256SUMS is CORRECT, not merely present", () => {
  const manifest = readFileSync(join(B, "SHA256SUMS.txt"), "utf8");
  const rows = [...manifest.matchAll(/^([0-9a-f]{64})\s+\.\/(.+)$/gm)];
  assert.ok(rows.length >= 25, "the manifest must cover the bundle");
  const bad = rows.filter(([, digest, rel]) => sha(join(B, rel)) !== digest).map(([, , r]) => r);
  assert.deepEqual(bad, [], `manifest digests do not match: ${bad.join(", ")}`);
});

test("NO private key ships in the bundle — it verifies from public material alone", () => {
  const walk = (dir) => {
    const out = [];
    for (const n of readdirSync(dir, { withFileTypes: true })) {
      if (n.isDirectory()) out.push(...walk(join(dir, n.name)));
      else out.push(join(dir, n.name));
    }
    return out;
  };
  for (const f of walk(B)) {
    if (/\.(png|gz|zip)$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    assert.ok(!text.includes("PRIVATE KEY"), `${f} contains private key material`);
    assert.ok(!/ANTHROPIC_API_KEY|sk-ant-/.test(text), `${f} contains a credential`);
  }
});

test("the README states the four things the bundle does NOT establish", () => {
  // A bundle sent outward is the likeliest place for a claim to be over-read, so the bounds must be
  // in the document the reviewer opens first — not only in the spec they may never reach.
  const readme = readFileSync(join(B, "README.md"), "utf8");
  assert.match(readme, /NOT a Fulcio keyless ceremony/i);
  assert.match(readme, /not signed by GLEIF|TLS-at-capture/i);
  assert.match(readme, /Lane C2 was never run/i);
  assert.match(readme, /Lane L is not a measurement/i);
  // ...and it must invite the reader to break it, or "verified" is just a word.
  assert.match(readme, /Try to break it/i);
  assert.match(readme, /rekor\.sigstore\.dev\/api\/v1\/log\/entries/);
});

test("the reproduction receipt records a GENUINELY different environment", () => {
  // Guards the failure mode of pasting a local run and calling it a reproduction. The receipt earns
  // its name only if the host differs from the machine that built the bundle; if every row matched
  // the producer's toolchain it would be a screenshot of ourselves.
  const receipt = readFileSync(join(B, "REPRODUCTION_RECEIPT.md"), "utf8");
  assert.match(receipt, /ALL CHECKS PASSED/);
  assert.match(receipt, /exit code \`0\`/);
  for (const marker of ["x86_64", "Ubuntu Linux", "3.12.3", "3.0.13"]) {
    assert.ok(receipt.includes(marker), `the receipt omits the host's ${marker}`);
  }
  // The producer's own toolchain must be recorded alongside, or "different" is unfalsifiable.
  for (const ours of ["arm64", "macOS", "3.14.6", "3.6.3"]) {
    assert.ok(receipt.includes(ours), `the receipt omits the producer's ${ours} for comparison`);
  }
});

test("the receipt REFUSES the party-independence claim it would be easiest to make", () => {
  // The whole risk of a reproduction receipt is that it gets read as external validation. A third
  // party DID run this one — which makes the temptation worse, not better, because the record binds
  // the run to a shared login and cannot tell that party apart from us. The receipt must refuse the
  // upgrade on the evidence rather than on modesty, and say so unskimmably.
  // NB: the file is hard-wrapped prose, so any multi-word phrase may straddle a newline. Match
  // whitespace flexibly or these assertions fail on reflow rather than on substance.
  const receipt = readFileSync(join(B, "REPRODUCTION_RECEIPT.md"), "utf8");
  assert.match(receipt, /does\s+NOT\s+establish/i);
  assert.match(receipt, /identity_unresolved/);
  assert.match(receipt, /shared\s+administrative\s+account/i);
  assert.match(receipt, /not\s+discharged\s+by\s+this\s+run/i);
  assert.match(receipt, /No\s+score\s+moved/i);
});

test("the receipt records the operator correction instead of quietly applying it", () => {
  // The first version of this file asserted the operator was the producer. That was false. A
  // reproduction receipt that silently rewrites its own provenance is worth less than one that
  // shows the correction, so the superseded claim must remain visible.
  const receipt = readFileSync(join(B, "REPRODUCTION_RECEIPT.md"), "utf8");
  assert.match(receipt, /earlier\s+version\s+of\s+this\s+receipt/i);
  assert.match(receipt, /That\s+was\s+wrong/i);
  // ...and it must state the one concrete step that WOULD discharge party independence, or the
  // refusal is just a shrug.
  assert.match(receipt, /What\s+would\s+discharge\s+it/i);
  assert.match(receipt, /openssl dgst -sha256 -sign/);
});

test("the receipt does NOT publish a live SSH endpoint", () => {
  // The repo is public. An IP plus a username is a free gift to anyone scanning for hosts, and the
  // run's evidentiary value is entirely in the environment delta, which needs no hostname.
  const receipt = readFileSync(join(B, "REPRODUCTION_RECEIPT.md"), "utf8");
  assert.ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(receipt), "the receipt leaks an IP address");
  assert.ok(!/ssh -i|@\d+\.\d+\.\d+\.\d+|eoiadmin/.test(receipt), "the receipt leaks SSH details");
  assert.match(receipt, /redact/i, "the redaction must be declared, not silent");
});

test("the verifier imports NO producer code and needs no network", () => {
  const src = readFileSync(join(B, "verify.py"), "utf8");
  for (const forbidden of ["requests", "urllib.request", "http.client", "socket."]) {
    assert.ok(!src.includes(forbidden), `verify.py must not reach the network: ${forbidden}`);
  }
  // Only the standard library and the openssl CLI.
  const imports = [...src.matchAll(/^import\s+(\w+)/gm)].map((m) => m[1]);
  for (const mod of imports) {
    assert.ok(
      ["base64", "hashlib", "json", "os", "subprocess", "sys", "tempfile"].includes(mod),
      `verify.py imports a non-stdlib module: ${mod}`
    );
  }
});
