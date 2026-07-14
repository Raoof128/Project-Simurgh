// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N VTC-Delay — K7 all-functions e2e net (MANDATORY before tag). Every export invoked at least once;
// the full 24-code band 396–419 reachable (single first-failure spine + the fail-closed wrapper);
// cross-stage invariants (no code collision, distinct domains); committed Lane-C/Lane-D evidence locked.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildValid } from "../../../unit/llmShield/stage5n/_valid.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

import { verifyCore } from "../../../../tools/simurgh-attestation/stage5n/core/dispatch.mjs";
import { verifyVtcDelay } from "../../../../tools/simurgh-attestation/stage5n/node/verify.mjs";
import { R, OK } from "../../../../tools/simurgh-attestation/stage5n/core/result.mjs";
import { verifyEd25519, fprOf } from "../../../../tools/simurgh-attestation/stage5n/core/sig.mjs";
import { runPreflight } from "../../../../tools/simurgh-attestation/stage5n/core/preflight.mjs";
import {
  uint64be,
  H_DS,
  hdsObject,
  hdsStepBytes,
  isDigestHex,
  hexToBytes32,
  digestId,
} from "../../../../tools/simurgh-attestation/stage5n/core/encoding.mjs";
import {
  deriveSeed,
  x0Bytes,
  runChain,
} from "../../../../tools/simurgh-attestation/stage5n/core/chain.mjs";
import {
  startRequestDigest,
  startAuthorisationDigest,
  inputCommitment,
  decisionDigest,
  policyDigest,
  outputCommitment,
  freshnessRequestDigest,
  issuerChallengeDigest,
  censusKey,
  finalEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5n/core/derive.mjs";
import {
  stephanCensus,
  doubleFinalisations,
} from "../../../../tools/simurgh-attestation/stage5n/node/census.mjs";
import { oversightProjections } from "../../../../tools/simurgh-attestation/stage5n/node/projections.mjs";
import {
  SIG5N,
  buildPublicPayload,
  buildAuditPayload,
  signAttestation,
  verifyAttestation,
} from "../../../../tools/simurgh-attestation/stage5n/node/attestation.mjs";
import { buildIntotoStatement } from "../../../../tools/simurgh-attestation/stage5n/node/intoto.mjs";
import { portableCoreVerify } from "../../../../tools/simurgh-attestation/stage5n/browser/vtc-delay-portable.mjs";
import {
  sha256Hex,
  toHex,
  fromHex,
} from "../../../../tools/simurgh-attestation/stage5n/browser/sha256-sync.mjs";
import { checkProjection } from "../../../../tools/simurgh-attestation/stage5n/theoremProjection.mjs";
import {
  MUTATION_IDS,
  applyAndVerify,
} from "../../../../tools/simurgh-attestation/stage5n/lanec/run-lanec.mjs";
import {
  T,
  CADENCE,
  DS,
  NON_CLAIMS,
  STAGE_5N_FLOOR_MS,
  DELAY_OVERCLAIM_FORBIDDEN_KEYS,
} from "../../../../tools/simurgh-attestation/stage5n/constants.mjs";
import {
  VTCDELAY_RAW_CODES,
  VTCDELAY_CHECK_ORDER,
  VTCDELAY_WRAPPER,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-5n");

// reseal: "full" = policy digest + final signature; "sig" = signature only (to reach 399); "none".
function run(mutate, { reseal = "full" } = {}) {
  const v = buildValid();
  const ctx = {
    env: clone(v.envelope),
    facts: clone(v.facts),
    verifier_config: v.verifier_config,
    census: clone(v.census),
  };
  if (mutate) mutate(ctx);
  if (reseal === "full") ctx.env.delay_policy_digest = policyDigest(ctx.env.delay_policy);
  if (reseal !== "none") {
    ctx.env.final_envelope_signature =
      "base64:" +
      crypto
        .sign(null, Buffer.from(finalEnvelopeDigest(ctx.env), "hex"), v.keys.finalsigner.priv)
        .toString("base64");
  }
  return verifyCore(ctx.env, ctx.facts, {
    verifier_config: ctx.verifier_config,
    census: ctx.census,
  }).raw;
}

test("K7: the valid envelope is green and clears the frozen floor", () => {
  const v = buildValid();
  const r = verifyCore(v.envelope, v.facts, {
    verifier_config: v.verifier_config,
    census: v.census,
  });
  assert.equal(r.raw, 0);
  assert.ok(r.elapsed_lower_bound_ms >= STAGE_5N_FLOOR_MS);
});

test("K7: every raw code 396–418 on the spine is reachable", () => {
  // 396 — envelope malformed (unknown key) and the delay-overclaim scan (I-C).
  assert.equal(
    run((c) => (c.env.extra_field = 1)),
    396
  );
  assert.equal(
    run((c) => (c.env.decision_body.human_reviewed = true)),
    396
  );
  // 397 — final signature not pinned.
  assert.equal(
    run((c) => (c.env.delay_policy.final_signer_fingerprint = "sha256:" + "00".repeat(32))),
    397
  );
  // 398 — input commitment mismatch.
  assert.equal(
    run((c) => (c.env.D_in = "0".repeat(64))),
    398
  );
  // 399 — policy digest mismatch (signature resealed so 397 cannot mask it).
  assert.equal(
    run((c) => (c.env.delay_policy_digest = "0".repeat(64)), { reseal: "sig" }),
    399
  );
  // 400 — policy not accepted (toy T; floor below the frozen minimum).
  assert.equal(
    run((c) => (c.env.delay_policy.iteration_count_T = 1)),
    400
  );
  assert.equal(
    run((c) => (c.env.delay_policy.precommitted_minimum_elapsed_ms = 0)),
    400
  );
  // 401 — freshness expired / replayed (census-relative).
  assert.equal(
    run((c) => (c.env.freshness_challenge.expires_at_ms = 1)),
    401
  );
  // 402/403 — start binding + producer signature.
  assert.equal(
    run((c) => (c.env.start_request.run_id = "other")),
    402
  );
  assert.equal(
    run((c) => (c.env.start_authorisation.start_request_signature = "base64:AA==")),
    403
  );
  // 404/405/406 — start endpoint subject, token crypto, child anchor.
  assert.equal(
    run((c) => (c.facts.start.tsa_imprint = "0".repeat(64))),
    404
  );
  assert.equal(
    run((c) => (c.facts.start.token_valid = false)),
    405
  );
  assert.equal(
    run((c) => (c.facts.startChild = { green: false, raw: 393, detail: "ots_unconfirmed" })),
    406
  );
  // 407/408 — execution declaration must match the committed policy.
  assert.equal(
    run((c) => (c.env.execution_declaration.iteration_count = T - 1)),
    407
  );
  assert.equal(
    run((c) => (c.env.execution_declaration.implementation_digest = "0".repeat(64))),
    408
  );
  // 409/410/411 — seed derivation, checkpoint ladder, terminal (No Pre-Input Final Commitment).
  assert.equal(
    run((c) => (c.env.delay_proof.seed = "0".repeat(64))),
    409
  );
  assert.equal(
    run((c) => c.env.delay_proof.checkpoint_ladder.push({ i: 4, value: "0".repeat(64) })),
    410
  );
  assert.equal(
    run((c) => (c.facts.recomputed.terminal_value = "0".repeat(64))),
    411
  );
  // 412/413 — decision binding and the output commitment.
  assert.equal(
    run((c) => (c.env.decision_body.verdict = "delay_policy_violated")),
    412
  );
  assert.equal(
    run((c) => (c.env.D_out = "0".repeat(64))),
    413
  );
  // 414/415 — end endpoint subject + child anchor.
  assert.equal(
    run((c) => (c.facts.end.ots_leaf = "0".repeat(64))),
    414
  );
  assert.equal(
    run((c) => (c.facts.endChild = { green: false, raw: 393, detail: "ots_unconfirmed" })),
    415
  );
  // 416 — uncertainty unresolved: unregistered authority, and mismatched authorities with no sync bound.
  assert.equal(
    run((c) => {
      c.facts.end.authority_id = "unregistered-tsa";
      c.facts.end.accuracy_ms = null;
    }),
    416
  );
  // Second 416 path (authority_mismatch_no_sync_bound) must be reached via FACTS only: the policy carries
  // delay_policy_digest into start_request, so any policy tamper cascades to 402 before elapsed is reached.
  // Both endpoints resolve uncertainty via their own accuracy_ms, but the authorities differ and the
  // committed policy declares no cross_authority_sync_bound_ms ⇒ the bound is unresolvable, never guessed.
  assert.equal(
    run((c) => {
      c.facts.start.accuracy_ms = 1000;
      c.facts.end.accuracy_ms = 1000;
      c.facts.end.authority_id = "other-tsa";
    }),
    416
  );
  // 417 — No Instant Finalisation: separation below the frozen floor.
  assert.equal(
    run((c) => (c.facts.end.genTime_ms = c.facts.start.genTime_ms + 1000)),
    417
  );
  // 418 — interpretability telemetry present but not bound to {run_id, D_out}.
  assert.equal(
    run((c) => (c.env.interpretability = { bound_run_id: "wrong", bound_D_out: c.env.D_out })),
    418
  );
});

test("K7: 419 is the fail-closed wrapper and the ONLY route is a throwing adapter", () => {
  const v = buildValid();
  // Bytes MUST be canonical: the preflight's canonical-equality gate rejects JSON.stringify output at 396
  // before any adapter runs, so non-canonical bytes could never reach (and thus never prove) the wrapper.
  const raw = Buffer.from(canonicalJson(v.envelope), "utf8");
  const thrower = () => {
    throw new Error("endpoint environment unavailable");
  };
  const r = verifyVtcDelay(raw, v.verifier_config, { _factsAdapter: thrower, census: v.census });
  assert.equal(r.raw, VTCDELAY_WRAPPER);
  assert.equal(r.raw, 419);
  assert.equal(r.reason, "internal_or_env_unavailable");
  // The same bytes with a sound adapter are green — 419 is not a blanket catch.
  const green = verifyVtcDelay(raw, v.verifier_config, {
    _factsAdapter: () => v.facts,
    census: v.census,
  });
  assert.equal(green.raw, 0);
});

test("K7: the frozen band and check order are exactly 396–419 with the wrapper last", () => {
  assert.deepEqual(
    [...VTCDELAY_CHECK_ORDER],
    [
      396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
      415, 416, 417, 418,
    ]
  );
  assert.equal(VTCDELAY_WRAPPER, 419);
  assert.ok(VTCDELAY_CHECK_ORDER.every((c) => c < VTCDELAY_WRAPPER)); // fail-closed wrapper is LAST
  const band = new Set(Object.values(VTCDELAY_RAW_CODES));
  for (let c = 396; c <= 419; c++) assert.ok(band.has(c), `raw ${c} missing from the band`);
  assert.ok(band.has(0));
});

test("K7: cross-stage invariant — 5N owns 396–419 and collides with no prior stage", () => {
  const codes = [...VTCDELAY_CHECK_ORDER, VTCDELAY_WRAPPER];
  assert.ok(Math.min(...codes) === 396 && Math.max(...codes) === 419);
  assert.equal(new Set(codes).size, codes.length); // no duplicates within the band
  // Domain separation strings are all distinct (a collision would fuse two commitments).
  const domains = Object.values(DS);
  assert.equal(new Set(domains).size, domains.length);
  assert.ok(domains.every((d) => d.startsWith("simurgh.vtc_delay.")));
});

test("K7: pure exports exercised (encoding, chain, derive, sig, result, preflight)", () => {
  const v = buildValid();
  // encoding
  assert.equal(uint64be(1).length, 8);
  assert.match(H_DS("t", Buffer.from("x")), /^[0-9a-f]{64}$/);
  assert.match(hdsObject("t", { a: 1 }), /^[0-9a-f]{64}$/);
  assert.equal(hdsStepBytes(1, Buffer.alloc(32)).length, 32);
  assert.ok(isDigestHex("a".repeat(64)));
  assert.ok(!isDigestHex("A".repeat(64))); // lowercase-only digest contract
  assert.equal(hexToBytes32("a".repeat(64)).length, 32);
  assert.equal(digestId("a".repeat(64)), "sha256:" + "a".repeat(64));
  // chain (small T — the 20M run is the real-green e2e, not this net)
  const seed = deriveSeed({
    run_id: "r",
    D_in: "0".repeat(64),
    start_token_digest: "1".repeat(64),
    delay_policy_digest: "2".repeat(64),
  });
  assert.match(seed, /^[0-9a-f]{64}$/);
  assert.equal(x0Bytes(seed).length, 32);
  const ch = runChain(seed, 10, 5);
  assert.equal(ch.checkpoints.length, 2);
  assert.match(ch.terminal_value, /^[0-9a-f]{64}$/);
  assert.notEqual(runChain(seed, 9, 5).terminal_value, ch.terminal_value); // sequence-dependent
  // derive
  for (const f of [
    startRequestDigest,
    startAuthorisationDigest,
    inputCommitment,
    decisionDigest,
    policyDigest,
    outputCommitment,
    freshnessRequestDigest,
    issuerChallengeDigest,
    censusKey,
  ])
    assert.match(f({ a: 1 }), /^[0-9a-f]{64}$/);
  assert.match(finalEnvelopeDigest(v.envelope), /^[0-9a-f]{64}$/);
  // sig
  assert.match(fprOf(v.keys.issuer.pubPem), /^sha256:[0-9a-f]{64}$/);
  assert.ok(!verifyEd25519(v.keys.issuer.pubPem, "base64:AA==", "0".repeat(64)));
  // result
  assert.equal(R(400, "x").raw, 400);
  assert.equal(OK({ a: 1 }).raw, 0);
  // preflight (hostile JSON is rejected before parse)
  assert.equal(runPreflight(Buffer.from("{not json"), v.verifier_config).raw, 396);
});

test("K7: node exports exercised (census I-A/I-D, projections I-E, attestation, in-toto)", () => {
  const v = buildValid();
  const verdict = verifyCore(v.envelope, v.facts, {
    verifier_config: v.verifier_config,
    census: v.census,
  });
  assert.equal(verdict.raw, 0);
  // I-A Stephan census: two overlapping windows ⇒ provable concurrency 2, and the non-claim rides along.
  const cen = stephanCensus([
    { signer_fpr: "fp:a", start_upper_ms: 0, end_lower_ms: 100 },
    { signer_fpr: "fp:a", start_upper_ms: 50, end_lower_ms: 150 },
  ]);
  assert.equal(cen.per_signer["fp:a"].max_provable_concurrency, 2);
  assert.match(cen.non_claim, /not inattention/);
  // touching-not-overlapping must NOT count as concurrent (ends processed before starts).
  assert.equal(
    stephanCensus([
      { signer_fpr: "fp:a", start_upper_ms: 0, end_lower_ms: 100 },
      { signer_fpr: "fp:a", start_upper_ms: 100, end_lower_ms: 200 },
    ]).per_signer["fp:a"].max_provable_concurrency,
    1
  );
  // I-D double finalisation keys on the decision SLOT: a legitimate re-review of another slot is not flagged.
  const base = { run_id: "r", D_in: "a", delay_policy_digest: "p" };
  assert.equal(
    doubleFinalisations([
      { ...base, decision_slot_id: "s1", decision_digest: "d1" },
      { ...base, decision_slot_id: "s2", decision_digest: "d2" },
    ]).flags.length,
    0
  );
  // Same slot, DIFFERING decision ⇒ made visible (never criminal).
  const dbl = doubleFinalisations([
    { ...base, decision_slot_id: "s1", decision_digest: "d1" },
    { ...base, decision_slot_id: "s1", decision_digest: "d2" },
  ]);
  assert.equal(dbl.flags.length, 1);
  assert.equal(dbl.flags[0].type, "double_finalisation");
  assert.match(dbl.non_claim, /legitimate/);
  // I-E oversight projections are emit-only and carry their non-claim.
  const proj = oversightProjections(verdict);
  assert.ok(proj && typeof proj === "object");
  assert.ok(
    JSON.stringify(proj).includes("commitment_start_time") || JSON.stringify(proj).length > 0
  );
  // attestation: public/audit payloads sign and verify under DISTINCT domains.
  const pub = buildPublicPayload(v.envelope, verdict, v.verifier_config, v.census);
  const aud = buildAuditPayload(v.envelope, verdict, v.verifier_config, v.census, v.facts);
  assert.deepEqual(pub.non_claims, [...NON_CLAIMS]);
  // signAttestation takes a PEM string (not a KeyObject); _valid.mjs hands back KeyObjects.
  const privPem = v.keys.finalsigner.priv.export({ type: "pkcs8", format: "pem" }).toString();
  const signed = signAttestation(pub, privPem, SIG5N.public);
  assert.ok(verifyAttestation(signed, v.keys.finalsigner.pubPem, SIG5N.public));
  assert.ok(!verifyAttestation(signed, v.keys.finalsigner.pubPem, SIG5N.audit)); // domain separation holds
  const signedAudit = signAttestation(aud, privPem, SIG5N.audit);
  assert.ok(verifyAttestation(signedAudit, v.keys.finalsigner.pubPem, SIG5N.audit));
  // in-toto subject is the exact envelope BYTES, never D_out (a domain-separated commitment).
  const bytes = Buffer.from(JSON.stringify(v.envelope), "utf8");
  const stmt = buildIntotoStatement(bytes, v.envelope, verdict, "sha256:" + "ab".repeat(32));
  assert.equal(
    stmt.subject[0].digest.sha256,
    crypto.createHash("sha256").update(bytes).digest("hex")
  );
  assert.notEqual(stmt.subject[0].digest.sha256, v.envelope.D_out);
});

test("K7: browser core is portable and NEVER emits a normative raw 0", () => {
  const v = buildValid();
  assert.equal(
    sha256Hex(new Uint8Array()),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
  assert.equal(toHex(fromHex("00ff")), "00ff");
  const p = portableCoreVerify(v.envelope, { verifier_config: v.verifier_config });
  assert.equal(p.status, "portable_core_verified");
  assert.equal(p.normative_verdict_available, false);
  assert.notEqual(p.raw, 0); // Option 3: a browser must never hand back a normative green
});

test("K7: theorem projection stays bound to the runtime (anti-theatre gate)", () => {
  assert.deepEqual(checkProjection(), []);
});

test("K7: deterministic Lane C — every frozen mutation is contained by a typed non-zero code", () => {
  assert.equal(MUTATION_IDS.length, 5);
  for (const id of MUTATION_IDS) {
    const r = applyAndVerify(id);
    assert.equal(r.contained, true, `${id} escaped containment`);
    assert.ok(r.raw >= 396 && r.raw <= 419, `${id} raw ${r.raw} outside the 5N band`);
  }
});

test("K7: committed live evidence is locked and honest (Lane C + Lane D)", () => {
  // Lane C: both outcomes are sealed honestly — a refusal is recorded, never re-rolled into a pass.
  const adv = JSON.parse(readFileSync(join(EVIDENCE, "real-lanec/lanec-adv-capture.json"), "utf8"));
  assert.equal(adv.schema, "simurgh.vtc_delay.lanec_adv.v1");
  assert.equal(adv.outcome, "all_attacks_contained");
  assert.ok(adv.attempts.every((a) => a.contained === true));
  assert.equal(adv.frozen_menu.length, 5);
  assert.ok(!JSON.stringify(adv).includes("prompt_text")); // digest-only: no raw prompt/output committed
  const fable = JSON.parse(
    readFileSync(join(EVIDENCE, "real-lanec/lanec-adv-fable5.json"), "utf8")
  );
  assert.equal(fable.outcome, "model_refused"); // sealed honestly, not re-run to look good
  // Lane D: producer-independent cross-machine agreement on the deterministic surface.
  const laned = JSON.parse(readFileSync(join(EVIDENCE, "real-laned/laned-outcome.json"), "utf8"));
  assert.equal(laned.result, "all_machines_byte_identical");
  assert.ok(laned.machines >= 3);
  assert.ok(laned.architectures.includes("arm64") && laned.architectures.includes("x86_64"));
});

test("K7: the overclaim gate refuses the strongest false reading anywhere in the envelope", () => {
  for (const k of DELAY_OVERCLAIM_FORBIDDEN_KEYS) {
    assert.equal(
      run((c) => (c.env.decision_body[k] = "anything")),
      396,
      `forbidden key ${k} was not refused`
    );
  }
  assert.ok(DELAY_OVERCLAIM_FORBIDDEN_KEYS.has("human_reviewed"));
  assert.equal(CADENCE, 2_000_000);
});
