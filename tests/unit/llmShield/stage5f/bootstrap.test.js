// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBootstrap } from "../../../../tools/simurgh-attestation/stage5f/core/bootstrap.mjs";
import { validBundle } from "./_validBundle.mjs";

test("provenance_mode none with empty imports -> null", () => {
  assert.equal(checkBootstrap(validBundle(), {}), null);
});
test("provenance_mode none but imports present -> 278", () => {
  const b = validBundle();
  b.bootstrap_provenance = [{ imported_from: "stage-5e" }];
  assert.equal(checkBootstrap(b, {}), 278);
});
test("historical_verifier with a matching runner result -> null", () => {
  const b = validBundle();
  b.provenance_mode = "historical_verifier";
  b.bootstrap_provenance = [
    {
      imported_from: "stage-5e",
      release_tag: "v2.40.0",
      commit: "6457d48c",
      bundle_digest: "sha256:aa",
      original_schema: "s",
      original_key_fingerprint: "sha256:kf",
      recorded_raw: 0,
    },
  ];
  const runner = {
    "stage-5e": {
      ok: true,
      recorded_raw: 0,
      bundle_digest: "sha256:aa",
      key_fingerprint: "sha256:kf",
    },
  };
  assert.equal(checkBootstrap(b, runner), null);
});
test("historical_verifier with runner unavailable -> 282", () => {
  const b = validBundle();
  b.provenance_mode = "historical_verifier";
  b.bootstrap_provenance = [
    {
      imported_from: "stage-5e",
      release_tag: "v2.40.0",
      commit: "6457d48c",
      bundle_digest: "sha256:aa",
      original_schema: "s",
      original_key_fingerprint: "sha256:kf",
      recorded_raw: 0,
    },
  ];
  assert.equal(checkBootstrap(b, {}), 282);
});
test("historical_verifier where runner raw disagrees -> 278", () => {
  const b = validBundle();
  b.provenance_mode = "historical_verifier";
  b.bootstrap_provenance = [
    {
      imported_from: "stage-5e",
      release_tag: "v2.40.0",
      commit: "6457d48c",
      bundle_digest: "sha256:aa",
      original_schema: "s",
      original_key_fingerprint: "sha256:kf",
      recorded_raw: 0,
    },
  ];
  const runner = {
    "stage-5e": {
      ok: true,
      recorded_raw: 20,
      bundle_digest: "sha256:aa",
      key_fingerprint: "sha256:kf",
    },
  };
  assert.equal(checkBootstrap(b, runner), 278);
});
