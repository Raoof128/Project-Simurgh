// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCpcSignal,
  verifyCpcEmission,
} from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);
const ANCHOR = D("a");
const base = {
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: ANCHOR,
  evidence_kind: "relay_spki_sha256",
  observed_evidence_digest: D("b"),
  disclosure_budget_max_signals_per_window: 2,
};

test("high-entropy evidence -> matchable; same inputs match across operators", () => {
  const a = buildCpcSignal(base);
  const b = buildCpcSignal({ ...base });
  assert.equal(a.signal_mode, "matchable");
  assert.match(a.windowed_evidence_commitment, /^sha256:/); // window-bound commitment IS published
  assert.ok(!("observed_evidence_digest" in a)); // raw evidence is NEVER published (MF1)
  assert.equal(a.custody_class_digest, b.custody_class_digest); // CPC match arm
  const c = buildCpcSignal({ ...base, observed_evidence_digest: D("c") });
  assert.notEqual(a.custody_class_digest, c.custody_class_digest); // differ arm
  const w = buildCpcSignal({ ...base, stage4n_window_anchor_digest: D("d") });
  assert.notEqual(a.custody_class_digest, w.custody_class_digest); // cross-window arm
  assert.notEqual(a.windowed_evidence_commitment, w.windowed_evidence_commitment); // and the commitment differs
});

test("low-entropy evidence -> degraded, no digest anywhere", () => {
  const s = buildCpcSignal({ ...base, evidence_kind: "low_entropy_or_unknown" });
  assert.equal(s.signal_mode, "degraded_non_matchable");
  assert.equal(s.coarse_failure_class, "undeclared_proxy_hop");
  assert.ok(!("custody_class_digest" in s));
  assert.equal(s.observed_entropy_bits, 0);
  assert.equal(s.public_linkability, "none");
});

test("verifyCpcEmission: anchor membership, budget cap, tampered below-floor digest", () => {
  const ok2 = [
    buildCpcSignal(base),
    buildCpcSignal({ ...base, failure_class: "model_identity_mismatch" }),
  ];
  assert.deepEqual(verifyCpcEmission({ signals: ok2, declared_cap: 2, anchor_digests: [ANCHOR] }), {
    ok: true,
  });
  // Exceed the cap with THREE budget-2 signals against declared_cap 2 (each signal's
  // advertised budget equals the cap, so the count check — not the mismatch check — fires).
  const three = [...ok2, buildCpcSignal({ ...base, failure_class: "account_pool_ambiguity" })];
  assert.deepEqual(
    verifyCpcEmission({ signals: three, declared_cap: 2, anchor_digests: [ANCHOR] }),
    { ok: false, raw: 79, reason: "disclosure_budget_exceeded" }
  );
  assert.deepEqual(
    verifyCpcEmission({ signals: [ok2[0]], declared_cap: 2, anchor_digests: [D("z")] }),
    { ok: false, raw: 79, reason: "window_anchor_not_in_feed" }
  );
  // Adversarial bundle: matchable signal claiming a low-entropy kind (built by hand,
  // since buildCpcSignal cannot construct it — that is the point).
  const forged = { ...ok2[0], evidence_kind: "low_entropy_or_unknown" };
  assert.deepEqual(
    verifyCpcEmission({ signals: [forged], declared_cap: 2, anchor_digests: [ANCHOR] }),
    { ok: false, raw: 79, reason: "below_floor_digest_emitted" }
  );
  // Forged class digest that does not recompute from the published commitment (MF1).
  const badDigest = { ...ok2[0], custody_class_digest: D("f") };
  assert.deepEqual(
    verifyCpcEmission({ signals: [badDigest], declared_cap: 2, anchor_digests: [ANCHOR] }),
    { ok: false, raw: 79, reason: "custody_class_recompute_mismatch" }
  );
  // Valid signal (budget 2) verified against a different declared cap -> mismatch.
  assert.deepEqual(
    verifyCpcEmission({ signals: [ok2[0]], declared_cap: 5, anchor_digests: [ANCHOR] }),
    { ok: false, raw: 79, reason: "declared_budget_mismatch" }
  );
});
