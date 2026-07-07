// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W K7 all-functions e2e net: composes every stage4w export, the full tamper
// matrix, the check-order first-failure guarantee, contest + views + density, attestation
// both tiers + bridge, Lane B re-verify, Lane C validation, cross-stage invariants, and
// the read-only-kernel guard. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import * as C from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";
import {
  normaliseBody,
  checkNormalisation,
  checkSpanGeometry,
  isCodePointBoundary,
  bodyBytes,
} from "../../../../tools/simurgh-attestation/stage4w/core/textCore.mjs";
import {
  scanLeakage,
  checkLeakage,
  uncoveredRegions,
} from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import {
  narrativeBodyDigest,
  spanMapDigest,
  buildNarrativeBinding,
  verifyNarrativeBinding,
  checkEvidenceLocality,
  checkJudgments,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs";
import {
  buildNarrative,
  resignNarrative,
  computeEvidenceDensity,
  evaluateNarrative,
  evaluateNarrativeSafe,
  payloadCheck,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import {
  contestSlotSpan,
  contestProseSpanClassification,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeContest.mjs";
import {
  renderView,
  checkMarkerIntegrity,
  MARKERS,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeViews.mjs";
import {
  buildGreenNarrative,
  resignNarrativeGreen,
} from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import {
  buildAttestation,
  bundleMerkleRoot,
  resignAttestation,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4w/node/verify-stage4w-attestation.mjs";
import { buildBridgeStatement } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs";
import { validateLaneCCapture } from "../../../../tools/simurgh-attestation/stage4w/lanec/validateLaneCCapture.mjs";
// Cross-stage byte-frozen neighbours.
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { evaluateCapsuleSafe } from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";

const opts = (g) => ({ capsulePubKeyPem: g.capsulePubKeyPem, ctx: {} });

test("K7.1 every pure-core export is reachable and typed", () => {
  assert.equal(typeof normaliseBody, "function");
  assert.equal(typeof checkNormalisation, "function");
  assert.equal(typeof checkSpanGeometry, "function");
  assert.equal(typeof isCodePointBoundary, "function");
  assert.equal(typeof bodyBytes, "function");
  assert.equal(typeof scanLeakage, "function");
  assert.equal(typeof checkLeakage, "function");
  assert.equal(typeof uncoveredRegions, "function");
  assert.equal(typeof narrativeBodyDigest, "function");
  assert.equal(typeof spanMapDigest, "function");
  assert.equal(typeof buildNarrativeBinding, "function");
  assert.equal(typeof verifyNarrativeBinding, "function");
  assert.equal(typeof checkEvidenceLocality, "function");
  assert.equal(typeof checkJudgments, "function");
  assert.equal(typeof buildNarrative, "function");
  assert.equal(typeof resignNarrative, "function");
  assert.equal(typeof computeEvidenceDensity, "function");
  assert.equal(typeof evaluateNarrative, "function");
  assert.equal(typeof evaluateNarrativeSafe, "function");
  assert.equal(typeof payloadCheck, "function");
  assert.equal(typeof contestSlotSpan, "function");
  assert.equal(typeof contestProseSpanClassification, "function");
  assert.equal(typeof renderView, "function");
  assert.equal(typeof checkMarkerIntegrity, "function");
  assert.equal(typeof buildBridgeStatement, "function");
  assert.equal(typeof validateLaneCCapture, "function");
  assert.equal(C.SPAN_TYPES.length, 3);
  assert.equal(C.VSN_NON_CLAIMS.length, 10);
});

test("K7.2 green narrative raw 0 + density triple sums", () => {
  const g = buildGreenNarrative();
  const r = evaluateNarrativeSafe(g.capsuleBundle, g.narrative, opts(g));
  assert.equal(r.raw, 0);
  assert.equal(
    r.density.slot_bound_bytes + r.density.judgment_bytes + r.density.voice_bytes,
    r.density.total_bytes
  );
});

test("K7.3 full tamper matrix — every fixture hits its declared raw", () => {
  const g = buildGreenNarrative();
  const seen = new Set();
  for (const f of buildLaneAFixtures()) {
    const r = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, opts(g));
    assert.equal(r.raw, f.expected_raw, `${f.name}: got ${r.raw}`);
    seen.add(f.expected_raw);
  }
  for (const raw of [162, 163, 164, 165, 166, 167, 168, 169, 170, 171])
    assert.ok(seen.has(raw), `raw ${raw} uncovered`);
});

test("K7.4 check-order first-failure: 164 wins over a co-occurring 170", () => {
  // A body that is both non-canonical (CRLF) AND has an undeclared digit: 164 must fire.
  const g = buildGreenNarrative();
  const n = JSON.parse(JSON.stringify(g.narrative));
  n.content.narrative_body = n.content.narrative_body.replace("calm close.\n", "9 problems.\r\n");
  n.content.binding = buildNarrativeBinding(
    g.capsuleBundle,
    g.capsulePubKeyPem,
    n.content.narrative_body,
    n.content.span_map
  );
  const signed = resignNarrativeGreen(n);
  assert.equal(evaluateNarrativeSafe(g.capsuleBundle, signed, opts(g)).raw, 164);
});

test("K7.5 contest adapter (AGREED) + prose classification + digest helpers", () => {
  const g = buildGreenBundle();
  const section = g.bundle.content.projected_sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const art = g.bundle.content.evidence_artifacts.find(
    (a) => spanMapDigest([a]) === spanMapDigest([a]) && a.kind === "stage4s_chain_bundle"
  );
  const agreed = contestSlotSpan({
    capsuleBundle: g.bundle,
    span: { regime: section.regime, section_id: section.section_id },
    contest: {
      verb: "agree",
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
    artifacts: { [section.evidence_digest]: art },
    ctx: {},
  });
  assert.equal(agreed.status, "AGREED");
  assert.match(narrativeBodyDigest("x"), /^sha256:/);
  const prose = contestProseSpanClassification({
    span_id: "p",
    judgment_text_digest: "sha256:" + "a".repeat(64),
  });
  assert.equal(prose.status, "DISPUTE_RECORDED");
});

test("K7.6 views: marker downgrade refused", () => {
  const g = buildGreenNarrative();
  const view = renderView(g.narrative.content, "audit");
  assert.equal(checkMarkerIntegrity(view, g.narrative.content), null);
  const tampered = JSON.parse(JSON.stringify(view));
  const idx = tampered.segments.findIndex((s) => s.marker === MARKERS.unverified_prose);
  tampered.segments[idx].marker = MARKERS.slot_bound;
  assert.equal(
    checkMarkerIntegrity(tampered, g.narrative.content).violation,
    "marker_downgraded_or_forged"
  );
});

test("K7.7 attestation public + audit + bridge + re-signed forgery caught", () => {
  const att = buildAttestation();
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit" }).ok, true);
  const forged = JSON.parse(JSON.stringify(att));
  forged.content.lane_a_fixtures[0].narrative_digest = "sha256:" + "0".repeat(64);
  forged.bundle_merkle_root = bundleMerkleRoot(forged);
  resignAttestation(
    forged,
    readFileSync(
      new URL(
        "../../../fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_vsn.pem",
        import.meta.url
      ),
      "utf8"
    )
  );
  assert.equal(verifyAttestation(forged, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(forged, { tier: "audit" }).reason, "lane_a_fixture_falsified");
  const bridge = buildBridgeStatement(
    att.content.bridge_subject.narrative_body_digest,
    att.content.bridge_subject.span_map_digest,
    att.attestation_digest
  );
  assert.equal(bridge._type, C.VSN_BRIDGE_STATEMENT_SCHEMA);
});

test("K7.8 corpus completeness: >=22 signed cases", () => {
  const corpus = corpusDocument();
  assert.ok(corpus.content.cases.length >= 22);
  assert.ok(corpus.signature.length > 0);
});

test("K7.9 Lane B capture re-verifies to raw 0", () => {
  execFileSync(process.execPath, [
    "tools/simurgh-attestation/stage4w/laneb/run-laneb-drafting-ceremony.mjs",
  ]);
  const cap = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-4w/laneb/capture.json", "utf8")
  );
  const g = buildGreenNarrative();
  assert.equal(evaluateNarrativeSafe(g.capsuleBundle, cap.narrative, opts(g)).raw, 0);
  assert.equal(cap.child_input_profile.operator_private_state_visible, false);
});

test("K7.10 Lane C validator accepts a well-formed capture, rejects raw transcript", () => {
  const good = {
    schema: C.VSN_LANEC_CAPTURE_SCHEMA,
    model_id: "m",
    mode: "standard",
    prompt_digest: "sha256:" + "a".repeat(64),
    completion_digest: "sha256:" + "b".repeat(64),
    verify_result: { raw: 0 },
  };
  assert.equal(validateLaneCCapture(good), null);
  assert.ok(validateLaneCCapture({ ...good, transcript: "raw" }).error);
});

test("K7.11 cross-stage invariant: 4T green capsule still verifies raw 0", () => {
  const g = buildGreenBundle();
  const r = evaluateCapsuleSafe(g.bundle, {
    capsulePubKeyPem: g.pubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(r.raw, 0);
});

test("K7.12 read-only kernel: no src/llmShield diff vs the shipped 4V tag", () => {
  let diff = "";
  try {
    diff = execFileSync(
      "git",
      ["diff", "--name-only", "v2.31.0-stage-4v-vdp", "--", "src/llmShield"],
      {
        encoding: "utf8",
      }
    );
  } catch {
    diff = "TAG_UNAVAILABLE"; // offline/clone without tags — do not fail the net
  }
  if (diff !== "TAG_UNAVAILABLE") assert.equal(diff.trim(), "", `src/llmShield changed: ${diff}`);
});
