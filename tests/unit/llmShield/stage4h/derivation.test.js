// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INTEGRITY_LABELS,
  INTEGRITY_LATTICE,
  INTEGRITY_LATTICE_DIGEST,
  REQUIRED_SINK_INTEGRITY,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  combineIntegrity,
  integrityLte,
  normalizeIntegrityLabel,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";

test("Stage 4H.1 pins a fixed 2-point integrity lattice", () => {
  assert.deepEqual(INTEGRITY_LABELS, ["trusted", "untrusted"]);
  assert.equal(REQUIRED_SINK_INTEGRITY, "trusted");
  assert.equal(INTEGRITY_LATTICE.proof_system, "simurgh-ifc-lattice-v0");
  assert.equal(INTEGRITY_LATTICE.bottom, "untrusted");
  assert.equal(INTEGRITY_LATTICE.top, "trusted");
  assert.match(INTEGRITY_LATTICE_DIGEST, /^sha256:[a-f0-9]{64}$/);
});

test("Stage 4H.1 normalizes only exact trusted as trusted", () => {
  assert.equal(normalizeIntegrityLabel("trusted"), "trusted");
  assert.equal(normalizeIntegrityLabel("untrusted"), "untrusted");
  assert.equal(normalizeIntegrityLabel("untrusted_web"), "untrusted");
  assert.equal(normalizeIntegrityLabel("external"), "untrusted");
  assert.equal(normalizeIntegrityLabel(""), "untrusted");
  assert.equal(normalizeIntegrityLabel(null), "untrusted");
});

test("Stage 4H.1 integrity combine is greatest-lower-bound", () => {
  assert.equal(combineIntegrity(["trusted", "trusted"]), "trusted");
  assert.equal(combineIntegrity(["trusted", "untrusted"]), "untrusted");
  assert.equal(combineIntegrity([]), "trusted");
  assert.throws(() => combineIntegrity(["untrusted_web"]), /unknown integrity label/);
});

test("Stage 4H.1 integrity order is untrusted below trusted", () => {
  assert.equal(integrityLte("untrusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "untrusted"), false);
  assert.throws(() => integrityLte("untrusted_web", "trusted"), /unknown integrity label/);
});
