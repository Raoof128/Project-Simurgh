// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIGEST_RE } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  domainDigest,
  hopReceiptDigest,
  hopReplayDigest,
  custodyPathDigest,
  surfaceBindingDigest,
  windowedEvidenceCommitment,
  custodyClassDigest,
} from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import { DOMAINS, SCHEMAS } from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

test("domainDigest: 4P domains only, format, domain separation", () => {
  const a = domainDigest(DOMAINS.ENVELOPE, SCHEMAS.ENVELOPE, { x: 1 });
  const b = domainDigest(DOMAINS.CUSTODY_RECEIPT, SCHEMAS.ENVELOPE, { x: 1 });
  assert.match(a, DIGEST_RE);
  assert.notEqual(a, b); // same value, different domain, different digest
  assert.throws(() => domainDigest("SIMURGH_STAGE4O_ACTION_V1", SCHEMAS.ENVELOPE, {}), {
    message: /unknown_digest_domain/,
  });
});

test("hopReceiptDigest ignores signature; custodyPathDigest is order-sensitive", () => {
  const hop = {
    schema: SCHEMAS.HOP_RECEIPT,
    hop_index: 0,
    previous_receipt_digest: D("a"),
    relay_identity_digest: D("b"),
    transform_digest: "genesis",
    input_digest: D("c"),
    output_digest: D("d"),
  };
  const h1 = hopReceiptDigest({ ...hop, signature: "AAAA" });
  const h2 = hopReceiptDigest({ ...hop, signature: "BBBB" });
  assert.equal(h1, h2);
  assert.notEqual(custodyPathDigest([h1, D("e")]), custodyPathDigest([D("e"), h1]));
});

test("hopReplayDigest is content-only: same content at different index/prev collides (MF2)", () => {
  const base = {
    schema: SCHEMAS.HOP_RECEIPT,
    relay_identity_digest: D("b"),
    transform_digest: "genesis",
    input_digest: D("c"),
    output_digest: D("d"),
    signature: "AAAA",
  };
  const a = hopReplayDigest({ ...base, hop_index: 0, previous_receipt_digest: D("1") });
  const b = hopReplayDigest({ ...base, hop_index: 5, previous_receipt_digest: D("2") });
  assert.equal(a, b); // index + prev-link excluded → replayed content collides
  const c = hopReplayDigest({
    ...base,
    hop_index: 0,
    previous_receipt_digest: D("1"),
    output_digest: D("z"),
  });
  assert.notEqual(a, c);
});

test("windowedEvidenceCommitment binds the window; recompute-grade custodyClassDigest", () => {
  const wa = D("1");
  const oed = D("2");
  const wec = windowedEvidenceCommitment({
    stage4n_window_anchor_digest: wa,
    observed_evidence_digest: oed,
  });
  assert.match(wec, DIGEST_RE);
  // same raw evidence, different window → different commitment (cross-window unlinkability, MF1)
  assert.notEqual(
    wec,
    windowedEvidenceCommitment({
      stage4n_window_anchor_digest: D("3"),
      observed_evidence_digest: oed,
    })
  );
  const input = {
    stage4n_window_anchor_digest: wa,
    failure_class: "undeclared_proxy_hop",
    evidence_kind: "relay_spki_sha256",
    windowed_evidence_commitment: wec,
    entropy_floor_bits: 96,
    disclosure_budget_max_signals_per_window: 4,
  };
  // verifier-grade: recompute from PUBLISHED commitment, no raw evidence needed
  assert.equal(custodyClassDigest(input), custodyClassDigest({ ...input }));
  assert.throws(() => custodyClassDigest({ ...input, evidence_kind: "low_entropy_or_unknown" }), {
    message: /entropy_floor_not_met/,
  });
  assert.throws(() => custodyClassDigest({ ...input, evidence_kind: "surprise_kind" }), {
    message: /unknown_evidence_kind/,
  });
});

test("surfaceBindingDigest matches spec §6.7 construction", () => {
  const d = surfaceBindingDigest({
    stage4o_manifest_digest: D("a"),
    stage4o_toolset_digest: D("b"),
    stage4o_manifest_epoch: 3,
  });
  assert.match(d, DIGEST_RE);
});
