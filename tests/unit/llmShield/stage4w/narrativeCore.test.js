import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildNarrative,
  resignNarrative,
  computeEvidenceDensity,
  evaluateNarrativeSafe,
  payloadCheck,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { buildNarrativeBinding } from "../../../../tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const priv = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vsn-author.pem"), "utf8");
const pub = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vsn-author.pub.pem"), "utf8");

// Pick a self-contained evidence_backed section (participant_count needs no ctx.chainVerdict).
function greenNarrative() {
  const g = buildGreenBundle();
  const section = g.bundle.content.projected_sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const art = g.bundle.content.evidence_artifacts.find(
    (a) => recordDigest(a) === section.evidence_digest
  );
  assert.ok(art, "green capsule must seal the participant_count evidence");
  const claim = "participants: " + JSON.stringify(section.value);
  const body = `calm opening voice.\n${claim}\nclosing voice.\n`;
  const start = Buffer.byteLength("calm opening voice.\n");
  const spanMap = [
    {
      span_id: "s1",
      start_byte: start,
      end_byte: start + Buffer.byteLength(claim),
      type: "slot_bound",
      regime: section.regime,
      section_id: section.section_id,
      claimed_value: section.value,
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
  ];
  const narrative = buildNarrative({
    capsuleBundle: g.bundle,
    capsulePubKeyPem: g.pubKeyPem,
    body,
    spanMap,
    judgments: [],
    authorRole: "operator",
    privKeyPem: priv,
    pubKeyPem: pub,
  });
  return { g, narrative, section };
}

const opts = (g) => ({ capsulePubKeyPem: g.pubKeyPem, ctx: {} });
function resignRebind(n) {
  const g = buildGreenBundle();
  n.content.binding = buildNarrativeBinding(
    g.bundle,
    g.pubKeyPem,
    n.content.narrative_body,
    n.content.span_map
  );
  return resignNarrative(n, priv);
}

test("green narrative: raw 0 + density accounting", () => {
  const { g, narrative } = greenNarrative();
  const r = evaluateNarrativeSafe(g.bundle, narrative, opts(g));
  assert.equal(r.raw, 0);
  const d = r.density;
  assert.equal(d.slot_bound_bytes + d.judgment_bytes + d.voice_bytes, d.total_bytes);
  assert.ok(d.slot_bound_bytes > 0 && d.voice_bytes > 0);
  // computeEvidenceDensity is a pure projection of the same span map.
  const d2 = computeEvidenceDensity(narrative.content);
  assert.deepEqual(d, d2);
});

test("169 fires on value drift and on sealed-evidence-wrong-section blend", () => {
  const { g, narrative } = greenNarrative();
  const drift = JSON.parse(JSON.stringify(narrative));
  drift.content.span_map[0].claimed_value = 99;
  const r1 = evaluateNarrativeSafe(g.bundle, resignRebind(drift), opts(g));
  assert.equal(r1.raw, 169);
  const blend = JSON.parse(JSON.stringify(narrative));
  blend.content.span_map[0].section_id = "remedial_actions"; // real section, wrong evidence pairing
  const r2 = evaluateNarrativeSafe(g.bundle, resignRebind(blend), opts(g));
  assert.equal(r2.raw, 169);
});

test("171 payload violation on smuggled transcript key + outer-field smuggle", () => {
  const { g, narrative } = greenNarrative();
  const dirty = JSON.parse(JSON.stringify(narrative));
  dirty.content.judgments = [
    {
      judgment_id: "jx",
      reserved: true,
      signed_judgment: { content: { prompt: "hidden" }, signature: "", judgment_pub_key_pem: "" },
    },
  ];
  const r = evaluateNarrativeSafe(g.bundle, resignRebind(dirty), opts(g));
  assert.equal(r.raw, 171);
  // Reviewer P0 #1: forbidden material BESIDE content (not covered by the signature)
  // must not hide. Unknown outer key -> 162 (outer allowlist).
  const outer = JSON.parse(JSON.stringify(narrative));
  outer.transcript = "raw hidden completion material";
  const ro = evaluateNarrativeSafe(g.bundle, outer, opts(g));
  assert.equal(ro.raw, 162);
  assert.equal(payloadCheck({ x: "-----BEGIN PRIVATE KEY-----" }).raw, 171);
  assert.equal(payloadCheck({ x: "-----BEGIN PUBLIC KEY-----" }), null); // public key allowed
});

test("172 wrapper on a poisoned ctx that throws in the trusted path", () => {
  const g = buildGreenBundle();
  // A chain_of_events span forces ctx.chainVerdict; make it throw -> caught -> 172.
  const section = g.bundle.content.projected_sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "stage4s_chain_verdict"
  );
  const art = g.bundle.content.evidence_artifacts.find(
    (a) => recordDigest(a) === section.evidence_digest
  );
  const claim = "chain verdict: " + JSON.stringify(section.value);
  const body = `opening.\n${claim}\nclose.\n`;
  const start = Buffer.byteLength("opening.\n");
  const spanMap = [
    {
      span_id: "s1",
      start_byte: start,
      end_byte: start + Buffer.byteLength(claim),
      type: "slot_bound",
      regime: section.regime,
      section_id: section.section_id,
      claimed_value: section.value,
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
  ];
  const narrative = buildNarrative({
    capsuleBundle: g.bundle,
    capsulePubKeyPem: g.pubKeyPem,
    body,
    spanMap,
    judgments: [],
    authorRole: "operator",
    privKeyPem: priv,
    pubKeyPem: pub,
  });
  const boom = evaluateNarrativeSafe(g.bundle, narrative, {
    capsulePubKeyPem: g.pubKeyPem,
    ctx: {
      chainVerdict: () => {
        throw new Error("boom");
      },
    },
  });
  assert.equal(boom.raw, 172);
});
