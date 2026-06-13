#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// verify-audit — validates a Simurgh audit-chain export.
//
// Usage:
//   SIMURGH_AUDIT_SECRET=<hex> node tools/verify-audit.mjs <path-to-export.json>
//
// Exit codes: 0 OK, 1 invalid chain, 2 usage error.

import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const path = process.argv[2];
if (!path) {
  console.error("usage: SIMURGH_AUDIT_SECRET=<hex> node tools/verify-audit.mjs <path>");
  process.exit(2);
}
const secret = process.env.SIMURGH_AUDIT_SECRET;
if (!secret) {
  console.error(
    "error: SIMURGH_AUDIT_SECRET env var required (the same key the server signed with)."
  );
  process.exit(2);
}

const doc = JSON.parse(readFileSync(path, "utf8"));
if (!Array.isArray(doc.entries)) {
  console.error("error: input does not contain an entries[] array.");
  process.exit(2);
}
if (doc.hmac_key_ephemeral) {
  console.warn("warning: this export was generated with an ephemeral HMAC key.");
  console.warn("         If the server has restarted since export, verification will fail.");
}

let prev = "GENESIS";
let bad = 0;
for (let i = 0; i < doc.entries.length; i++) {
  const e = doc.entries[i];
  if (e.seq !== i) {
    console.error(`#${i}: seq mismatch (expected ${i}, got ${e.seq})`);
    bad++;
  }
  if (e.prev !== prev) {
    console.error(
      `#${i}: prev hash chain broken (expected ${prev.slice(0, 12)}…, got ${String(e.prev).slice(0, 12)}…)`
    );
    bad++;
  }
  const { sig, ...body } = e;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
  if (sig !== expected) {
    console.error(`#${i}: signature mismatch (entry tampered)`);
    bad++;
  }
  prev = sig;
}
if (doc.chain_terminator && prev !== doc.chain_terminator) {
  console.error(
    `chain terminator mismatch (expected ${doc.chain_terminator.slice(0, 12)}…, got ${prev.slice(0, 12)}…)`
  );
  bad++;
}

if (bad === 0) {
  console.log(
    `OK · ${doc.entries.length} entries · chain intact${doc.truncated ? " · TRUNCATED at cap" : ""}`
  );
  process.exit(0);
} else {
  console.error(`FAIL · ${bad} integrity violation(s)`);
  process.exit(1);
}
