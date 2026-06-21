// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3S E2E: proves the narrative slots are drafted THROUGH the real gateway via the
// existing recorded_fixture path, and that the gateway receipt binds the slots by hash.
// Deterministic on output_text + binding (the receipt timestamp/session id are per-run).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { startServer, newSession } from "./_live_server.mjs";
import { hashPrompt } from "../../src/llmShield/promptNormalise.js";
import {
  buildModelSlotsFromGatewayRun,
  buildVerifiedArtifact,
  NARRATIVE_CASE_ID,
} from "../../tools/simurgh-narrative/simurgh-narrative.mjs";
import { buildEvidenceDigest } from "../../tools/simurgh-narrative/evidenceDigest.mjs";

test("3S E2E: narrative slots flow through the real gateway and bind to the receipt", async () => {
  const fixture = JSON.parse(
    await readFile(
      "docs/research/llm-shield/evidence/stage-3e/fixtures/recorded_fixture/3e_narrative_001.json",
      "utf8"
    )
  );
  const srv = await startServer({});
  try {
    const sess = await newSession(srv.base);
    const res = await fetch(`${sess.api}/${sess.sessionId}/run`, {
      method: "POST",
      headers: sess.auth,
      body: JSON.stringify({
        input: "produce a defensive integrity summary",
        provider_mode: "recorded_fixture",
        case_id: NARRATIVE_CASE_ID,
      }),
    });
    const j = await res.json();
    // gateway-mediated: the model output is exactly the committed fixture slot JSON
    assert.equal(j.output_text, fixture.synthetic_provider_output, JSON.stringify(j));
    assert.equal(j.receipt.output_hash, hashPrompt(j.output_text));
    // receipt-binding holds
    const ms = buildModelSlotsFromGatewayRun({ outputText: j.output_text, receipt: j.receipt });
    assert.equal(ms.ok, true);
    // the narrative renders, no automatic finding
    const digest = buildEvidenceDigest({
      sessionHash: "sha256:s",
      sourceInputs: [],
      audit_chain_valid: true,
      daemon_proof_counts: {},
      gateway: {},
      vca: {},
      privacy: {},
    });
    const art = buildVerifiedArtifact({ digest, modelSlots: ms.modelSlots });
    assert.equal(art.automatic_finding_made, false);
    assert.equal(art.verified_slots, 1);
  } finally {
    srv.stop();
  }
});
