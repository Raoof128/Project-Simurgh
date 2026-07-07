// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane B drafter child (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// Blind by construction: only the capsule PUBLIC projection (+ its own ephemeral signing
// key) arrives on stdin — no raw evidence, no operator private key, no operator state.
// No quiet ghostwriter: this process signs its own narrative; the parent never rewrites it.
// It imports only the PURE canonicaliser (data isolation is via stdin, not code isolation),
// which guarantees byte-identical signatures to the project verifier.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

for (const k of Object.keys(process.env))
  if (/^OPERATOR(_|$)/.test(k)) {
    console.error("blindness violation: operator env visible");
    process.exit(3);
  }
for (const a of process.argv.slice(2))
  if (a.endsWith(".pem")) {
    console.error("blindness violation: key material on argv");
    process.exit(3);
  }

const input = JSON.parse(readFileSync(0, "utf8"));
const { capsule_projection, binding, laneb_priv_key_pem, laneb_pub_key_pem } = input;

const slots = capsule_projection.filter(
  (p) =>
    p.class === "evidence_backed" &&
    ["participant_count", "kernel_block_record"].includes(p.recompute_kind)
);
const B = (s) => Buffer.byteLength(s);
const p1 = "drafted from the public projection alone. ";
let body = p1;
const spanMap = [];
let off = B(p1);
slots.forEach((p, i) => {
  const claim = `${p.section_id} recorded as ${JSON.stringify(p.value)}`;
  spanMap.push({
    span_id: `d-${i}`,
    start_byte: off,
    end_byte: off + B(claim),
    type: "slot_bound",
    regime: p.regime,
    section_id: p.section_id,
    claimed_value: p.value,
    recompute_kind: p.recompute_kind,
    evidence_digest: p.evidence_digest,
  });
  body += claim;
  off += B(claim);
  const glue = i < slots.length - 1 ? " and also " : "";
  body += glue;
  off += B(glue);
});
body += " nothing further.\n";

const content = {
  schema: "simurgh.vsn.narrative.v1",
  narrative_body: body,
  span_map: spanMap,
  judgments: [],
  binding, // parent supplies the expected binding fields (public data)
  author_role: "drafting_model_operator_signed",
  leakage_ruleset: "vsn.leakage.v1",
};
const signature = crypto
  .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(laneb_priv_key_pem))
  .toString("base64");
process.stdout.write(JSON.stringify({ content, signature, author_pub_key_pem: laneb_pub_key_pem }));
