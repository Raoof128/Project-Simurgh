// SPDX-License-Identifier: AGPL-3.0-or-later
// Premise lock for the Stage 4J P8 gate. P8's whole basis is that authority-sink MEMBERSHIP
// in the 4H certificate's sink_safety_claims is derived from the SAME per-action flag the
// gate cross-checks (replay_material[*].taint_derivation_inputs.authority_sink — see
// canonicalPremises.mjs). If a future 4H change decouples these, P8's precedence semantics
// (38-over-34 for under-declared high-consequence sinks) silently rot. This test pins the
// coupling on both committed substrates.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const H = "tests/fixtures/llmShield/stage4h";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const SUBSTRATES = ["q0-clean-disconnected-untrusted", "q4-dirty-one-edge-delta"];

for (const name of SUBSTRATES) {
  test(`sink_safety_claims node set == actions flagged authority_sink:true (${name})`, () => {
    const pack = readJson(`${H}/${name}-base-pack.json`);
    const cert = readJson(`${H}/${name}-dfi-certificate.json`);

    const flagged = Object.entries(pack.replay_material)
      .filter(([, m]) => m.taint_derivation_inputs?.authority_sink === true)
      .map(([actionId]) => `action:${actionId}`)
      .sort();
    const claimed = cert.derivation.sink_safety_claims.map((c) => c.node).sort();

    assert.deepEqual(claimed, flagged, `${name}: claims must mirror the authority_sink flags`);
    assert.equal(cert.summary.authority_sinks_checked, flagged.length);
  });
}
