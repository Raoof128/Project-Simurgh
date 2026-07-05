// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q Lane-B approver — a SEPARATE local process (4Q spec §2.1.5). It reads one
// approval request on stdin, refuses a display bait-and-switch (first line of defence;
// the verifier's raw-88 is the second), and signs the receipt with the supplied key.
// With --interactive it is the human-at-terminal ceremony (invention §6.7): it will only
// sign when a human confirmation is present. NEVER runs interactively in CI.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { createPrivateKey, sign as edSign } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { displayDigest } from "../core/digest.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}
const has = (name) => process.argv.includes(name);

function fail(code, msg) {
  process.stderr.write(msg + "\n");
  process.exit(code);
}

const keyPath = arg("--key");
if (!keyPath)
  fail(2, "usage: approver-signer.mjs --key <pem> [--interactive]  (request JSON on stdin)");

const request = JSON.parse(readFileSync(0, "utf8")); // fd 0 = stdin
const { unsigned_receipt: unsigned, rendered_display_text: rendered } = request;
if (!unsigned || typeof rendered !== "string") fail(2, "malformed_request");

// Refuse a display bait-and-switch: the receipt must commit exactly what was shown.
if (displayDigest(rendered) !== unsigned.approval_display_digest)
  fail(1, "display_digest_mismatch");

// Human-at-terminal ceremony: only sign when a confirmation is present. In a real terminal
// this is a typed "y"; here it is carried by STAGE4Q_HUMAN_CONFIRM so the one-time capture is
// reproducible. Absent confirmation => the human declined.
if (has("--interactive") && process.env.STAGE4Q_HUMAN_CONFIRM !== "y") fail(3, "human_declined");

const priv = createPrivateKey(readFileSync(keyPath, "utf8"));
const signature = edSign(null, Buffer.from(canonicalJson(unsigned)), priv).toString("base64");
process.stdout.write(JSON.stringify({ ...unsigned, signature }) + "\n");
