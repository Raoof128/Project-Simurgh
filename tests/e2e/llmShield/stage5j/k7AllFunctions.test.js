// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — K7 all-functions net (plan Task 5.1). Every raw 332–347 is reachable; the committed
// Lane-A pack is locked (a fresh build byte-matches it); the pure-core + node exports are exercised.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validBundle } from "../../../unit/llmShield/stage5j/_validBundle.mjs";
import { vrcVerify } from "../../../../tools/simurgh-attestation/stage5j/core/vrcCore.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage5j/core/digests.mjs";
import {
  buildLaneAEvidence,
  EVIDENCE_DIR,
} from "../../../../tools/simurgh-attestation/stage5j/node/build-vrc-evidence.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

// Each raw 332–346 driven from the valid fixture; 347 via a runtime throwing fact.
const arms = {
  332: (b) => delete b.bundle.reviewer_ratings,
  333: (b) => (b.bundle.vpc_ref.panel_subject_root = "sha256:x"),
  334: (b) => (b.bundle.rating_obligation_root = "sha256:x"),
  335: (b) => b.bundle.reviewer_ratings.pop(),
  336: (b) => {
    const o = structuredClone(b.bundle.reviewer_ratings[0]);
    o.content.reviewer_id = "sha256:ghost";
    o.content.chain_subject = "reviewer:1:sha256:ghost";
    o.entry_digest = "sha256:orphanK7";
    b.facts.reviewerSigValid[o.entry_digest] = true;
    b.bundle.reviewer_ratings.push(o);
  },
  337: (b) => {
    b.bundle.producer_ratings[1].content.supersedes_digest =
      b.bundle.producer_ratings[0].entry_digest;
    b.bundle.producer_ratings[1].content.revision = 1;
  },
  338: (b) => (b.facts.scaleSigValid = false),
  339: (b) => {
    const rev8 = b.bundle.reviewer_ratings.find((e) => e.content.value_kind === "not_assessed");
    const prod8 = b.bundle.producer_ratings.find((e) => e.content.section_id === "8");
    b.bundle.contest_history.push({
      content: {
        section_id: "8",
        reviewer_id: rev8.content.reviewer_id,
        producer_rating_digest: prod8.entry_digest,
        reviewer_rating_digest: rev8.entry_digest,
        rating_scale_digest: prod8.content.rating_scale_digest,
        ledger_epoch: 999,
      },
      contest_event_digest: "sha256:ceAbstainK7",
    });
  },
  340: (b) => (b.facts.reviewerSigValid[b.bundle.reviewer_ratings[0].entry_digest] = false),
  341: (b) => (b.facts.producerSigValid[b.bundle.producer_ratings[0].entry_digest] = false),
  342: (b) =>
    (b.bundle.contest_history = b.bundle.contest_history.filter(
      (c) => c.content.section_id !== "3"
    )),
  343: (b) => (b.facts.responseSigValid[b.bundle.producer_responses[0].response_digest] = false),
  344: (b) => (b.facts.concurrenceSigValid[b.bundle.concurrences[0].concurrence_digest] = false),
  346: (b) => (b.bundle.universe_commitment_anchor = { activated: true }),
};

test("K7 — every raw 332–346 is reachable (public/audit as appropriate)", () => {
  for (const [raw, mutate] of Object.entries(arms)) {
    const b = validBundle();
    mutate(b);
    const r = vrcVerify(b.bundle, b.cfg, b.facts, { tier: "public" });
    assert.equal(r.raw, Number(raw), `raw ${raw} reachable`);
  }
});

test("K7 — raw 345 is reachable at the audit tier (projection recompute)", () => {
  const b = validBundle();
  b.bundle.projections.favourable_skew.favourable_count += 1;
  assert.equal(vrcVerify(b.bundle, b.cfg, b.facts, { tier: "audit" }).raw, 345);
});

test("K7 — raw 347 wrapper: a throwing fact is caught, never escapes", () => {
  const b = validBundle();
  Object.defineProperty(b.facts, "vpc_verdict", {
    get() {
      throw new Error("boom");
    },
  });
  assert.equal(vrcVerify(b.bundle, b.cfg, b.facts).raw, 347);
});

test("K7 — the committed Lane-A pack is locked (a fresh build byte-matches it)", () => {
  const fresh = buildLaneAEvidence(mkdtempSync(join(tmpdir(), "vrc-k7-")));
  const committed = readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8").trimEnd();
  assert.equal(canonicalJson(fresh.bundle), committed);
});
