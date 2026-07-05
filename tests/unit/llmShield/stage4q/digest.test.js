// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  domainDigest,
  approvalReceiptDigest,
  approvalExemptionDigest,
  crossingDigest,
  chainEntryDigest,
  chainEntryReplayDigest,
  chainRootDigest,
  censusCommitment,
  displayDigest,
  publicKeyDigest,
} from "../../../../tools/simurgh-attestation/stage4q/core/digest.mjs";
import {
  DOMAINS,
  SCHEMAS,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4q/constants.mjs";

const RE = /^sha256:[0-9a-f]{64}$/;

test("domainDigest rejects non-4q domains (fail closed)", () => {
  assert.throws(() => domainDigest("SIMURGH_STAGE4P_ENVELOPE_V1", SCHEMAS.ENVELOPE, {}));
  assert.match(domainDigest(DOMAINS.ENVELOPE, SCHEMAS.ENVELOPE, { a: 1 }), RE);
});

test("receipt digest excludes signature (two receipts differing only in signature collide)", () => {
  const base = { schema: SCHEMAS.APPROVAL_RECEIPT, action_digest: "sha256:" + "a".repeat(64) };
  const d1 = approvalReceiptDigest({ ...base, signature: "sigA" });
  const d2 = approvalReceiptDigest({ ...base, signature: "sigB" });
  assert.equal(d1, d2);
  assert.match(d1, RE);
});

test("crossing digest excludes signature; differs from receipt digest domain", () => {
  const c = { schema: SCHEMAS.BOUNDARY_CROSSING, action_digest: "sha256:" + "b".repeat(64) };
  assert.notEqual(
    crossingDigest({ ...c, signature: "s" }),
    approvalReceiptDigest({ ...c, signature: "s" })
  );
});

test("exemption digest excludes signature and is domain-distinct from a receipt (Freeze 5)", () => {
  const e = { schema: SCHEMAS.APPROVAL_EXEMPTION, action_digest: "sha256:" + "e".repeat(64) };
  assert.equal(
    approvalExemptionDigest({ ...e, signature: "x" }),
    approvalExemptionDigest({ ...e, signature: "y" })
  );
  assert.notEqual(
    approvalExemptionDigest({ ...e, signature: "x" }),
    approvalReceiptDigest({ ...e, signature: "x" })
  );
});

test("replay digest is position-independent (patch 2 — same content, different position collides)", () => {
  const a = {
    entry_kind: "approval",
    entry_digest: "sha256:" + "a".repeat(64),
    raw_code: 0,
    previous_entry_digest: "sha256:" + "f".repeat(64),
    chain_position: 0,
  };
  const b = {
    entry_kind: "approval",
    entry_digest: "sha256:" + "a".repeat(64),
    raw_code: 0,
    previous_entry_digest: "sha256:" + "e".repeat(64),
    chain_position: 5,
  };
  assert.equal(chainEntryReplayDigest(a), chainEntryReplayDigest(b)); // content-only: collide
  assert.notEqual(chainEntryDigest(a), chainEntryDigest(b)); // full digest: differ
});

test("chain root is order-sensitive and genesis-anchored", () => {
  const e1 = chainEntryDigest({ entry_kind: "approval", chain_position: 0 });
  const e2 = chainEntryDigest({ entry_kind: "crossing", chain_position: 1 });
  assert.notEqual(chainRootDigest([e1, e2]), chainRootDigest([e2, e1]));
  assert.match(chainRootDigest([]), RE);
  assert.equal(chainRootDigest([]), chainRootDigest([])); // deterministic from GENESIS
  assert.match(GENESIS, RE);
});

test("census commitment binds run and count", () => {
  const a = censusCommitment({ run_id_digest: "sha256:" + "c".repeat(64), committed_crossings: 3 });
  const b = censusCommitment({ run_id_digest: "sha256:" + "c".repeat(64), committed_crossings: 4 });
  assert.notEqual(a, b);
});

test("display digest is a plain content commitment", () => {
  assert.match(displayDigest("Approve send_email to bob@example.com?"), RE);
  assert.notEqual(displayDigest("A"), displayDigest("B"));
});

test("publicKeyDigest is stable over PEM body", () => {
  const pem = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA\n-----END PUBLIC KEY-----\n";
  assert.match(publicKeyDigest(pem), RE);
  assert.equal(publicKeyDigest(pem), publicKeyDigest(pem));
});
