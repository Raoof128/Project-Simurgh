import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { validBundle, fixtureArtifacts } from "./_validBundle.mjs";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5g/browser/vfc-portable.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const HTML = join(ROOT, "tools/simurgh-attestation/stage5g/browser/index.html");

test("portable verifier returns the exact capability object with raw:null", async () => {
  const b = validBundle({ rung: "challenge_bound" });
  const r = await verifyPortable(b, fixtureArtifacts());
  assert.equal(r.verification_scope, "portable");
  assert.equal(r.portable_valid, true);
  assert.equal(r.proven_rung_portable, "challenge_bound");
  assert.equal(r.full_attestation_status, "not_evaluated");
  assert.equal(r.raw, null);
});

test("portable NEVER reports externally_anchored even with an anchor present", async () => {
  const b = validBundle({ rung: "externally_anchored" });
  const r = await verifyPortable(b, fixtureArtifacts());
  assert.notEqual(r.proven_rung_portable, "externally_anchored");
  assert.equal(r.rung2_status, "not_evaluated");
});

test("a mutated capture is caught by the portable digest recompute", async () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.capture.cells[0].label = "malicious";
  const r = await verifyPortable(b, fixtureArtifacts());
  assert.equal(r.portable_valid, false);
});

test("index.html enforces CSP no-egress by static inspection", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /connect-src/); // no outbound fetch/XHR/WebSocket permitted
  assert.doesNotMatch(html, /https?:\/\/[a-z]/i); // no external hosts referenced
});
