// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — claimCore: claim-table digest, span resolution, precommit (202). Plan Task 3.
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  claimTableDigest,
  resolveSpan,
  checkClaimTable,
} from "../../../../tools/simurgh-attestation/stage5a/core/claimCore.mjs";

// A minimal narrative object — claimCore only reads narrative_body + span_map, so a
// hand-built shape suffices here (real signed/capsule-bound narratives arrive in Task 10).
// Body: "the simurgh watches. i noticed nothing unusual. calm.\n"
const BODY = "the simurgh watches. i noticed nothing unusual. calm.\n";
const B = (s) => Buffer.byteLength(s);
const off1 = B("the simurgh watches. ");
const narrative = {
  content: {
    narrative_body: BODY,
    span_map: [
      {
        span_id: "s1",
        start_byte: off1,
        end_byte: off1 + B("i noticed nothing unusual."),
        type: "unverified_prose",
      },
      {
        span_id: "sj",
        start_byte: 0,
        end_byte: B("the simurgh watches."),
        type: "judgment",
      },
    ],
  },
};

const claim = (over = {}) => ({
  claim_id: "c1",
  span_ref: { span_id: "s1", start_byte: off1, end_byte: off1 + B("i noticed nothing unusual.") },
  token_ids: ["1001", "1002"],
  polarity: "asserts_unflagged",
  ...over,
});

const table = (claims) => ({
  content: {
    schema: "simurgh.vnc.claim_table.v1",
    claims,
    scope_rule_id: "all_cells",
    narrative_digest: "sha256:" + "0".repeat(64),
    declaration_digest: "sha256:" + "1".repeat(64),
  },
  signature: "deadbeef",
  author_pub_key_pem: "PEM",
});

test("claimTableDigest = recordDigest over the whole outer table object", () => {
  const t = table([claim()]);
  assert.equal(claimTableDigest(t), recordDigest(t));
});

test("resolveSpan returns the matching unverified_prose span", () => {
  const s = resolveSpan(narrative, claim().span_ref);
  assert.equal(s.span_id, "s1");
  assert.equal(s.type, "unverified_prose");
});

test("resolveSpan returns null for an unknown span_id or coordinate mismatch", () => {
  assert.equal(resolveSpan(narrative, { span_id: "nope", start_byte: 0, end_byte: 3 }), null);
  assert.equal(
    resolveSpan(narrative, { span_id: "s1", start_byte: off1, end_byte: off1 + 999 }),
    null
  );
});

test("clean table → null", () => {
  assert.equal(checkClaimTable(table([claim()]), narrative), null);
});

test("202: scope rule not all_cells", () => {
  const t = table([claim()]);
  t.content.scope_rule_id = "some_cells";
  const r = checkClaimTable(t, narrative);
  assert.equal(r.raw, 202);
  assert.equal(r.reason, "scope_rule_not_all_cells");
});

test("202: empty token_ids", () => {
  const r = checkClaimTable(table([claim({ token_ids: [] })]), narrative);
  assert.equal(r.raw, 202);
  assert.equal(r.reason, "token_ids_empty");
});

test("202: duplicate claim_id", () => {
  const r = checkClaimTable(table([claim(), claim({ span_ref: claim().span_ref })]), narrative);
  assert.equal(r.raw, 202);
  assert.equal(r.reason, "claim_id_duplicate");
});

test("202: unresolvable span (a MALFORMED table, not an unreadable verdict — MF3)", () => {
  const r = checkClaimTable(
    table([claim({ span_ref: { span_id: "ghost", start_byte: 0, end_byte: 3 } })]),
    narrative
  );
  assert.equal(r.raw, 202);
  assert.equal(r.reason, "span_unresolvable");
});

test("202: referenced span type is not unverified_prose (judgment span rejected)", () => {
  const r = checkClaimTable(
    table([
      claim({ span_ref: { span_id: "sj", start_byte: 0, end_byte: B("the simurgh watches.") } }),
    ]),
    narrative
  );
  assert.equal(r.raw, 202);
  assert.equal(r.reason, "span_type_not_unverified_prose");
});

test("token ids NOT in a lexicon is VALID at table level (unreadable is a verdict, not 202)", () => {
  // claimCore has no lexicon; out-of-lexicon is resolved at verdict time (Task 4). A table
  // whose tokens happen to be unknown to some map is still a well-formed precommit.
  assert.equal(checkClaimTable(table([claim({ token_ids: ["999999"] })]), narrative), null);
});
