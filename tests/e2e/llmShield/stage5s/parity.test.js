// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 28 — cross-runtime parity, with the browser claim split honestly.
//
// THREE RUNTIMES AGREE ON BYTES, and the split is stated where it cannot be missed:
//
//   NODE CORE   the implementation this stage ships
//   PORTABLE    the same algebra over WHATWG WebCrypto, run under Node 26. This proves **API
//               equivalence** — the identical API a browser exposes — and it is NOT browser
//               execution. Following 5O's precedent, which states the same distinction.
//   PYTHON      a second language, so agreement is not two spellings of one implementation
//
// The real browser run is a CAPTURE: present, or typed absent, never implied. When no driver is
// installed the capture records `not_captured_driver_absent` and explicitly refuses to let the CI
// lane's result stand in for it — that substitution is the one shortcut that would make the whole
// distinction cosmetic.
//
// A RUNTIME THAT FAILS TO LAUNCH IS A REFUSAL, NEVER A SKIP. There is no `if python3 exists` branch
// below, because that branch is how a parity claim quietly becomes a claim about one runtime.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PARITY_VECTORS } from "../../../../tools/simurgh-attestation/stage5s/browser/parityVectors.mjs";
import {
  PARITY_IDS,
  checkCoverage,
} from "../../../../tools/simurgh-attestation/stage5s/core/parityManifest.mjs";
import {
  COVERED_SURFACES,
  runVectors as runPortable,
} from "../../../../tools/simurgh-attestation/stage5s/browser/vwq-portable.mjs";
import {
  canonicalJson,
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import { compare } from "../../../../tools/simurgh-attestation/stage5s/core/compatibility.mjs";
import { proveAncestry } from "../../../../tools/simurgh-attestation/stage5s/core/ancestry.mjs";
import { tally } from "../../../../tools/simurgh-attestation/stage5s/core/quorum.mjs";
import {
  comparisonStatusOf,
  equivocationArtifactStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";

const PYTHON = "tools/simurgh-attestation/stage5s/python/vwq_parity.py";
const BROWSER_CAPTURE = "docs/research/llm-shield/evidence/stage-5s/browser/browser-capture.json";

/** The Node core, projected onto the same shape the mirrors report. */
function runNodeCore(v) {
  return {
    runtime: "node-core",
    covered: [...PARITY_IDS],
    canonical_json: v.canonical.map((x) => canonicalJson(x)),
    checkpoint_body_digest: v.checkpoints.map((c) => checkpointBodyDigest(c)),
    checkpoint_envelope_digest: v.checkpoints.map((c) => checkpointEnvelopeDigest(c)),
    compatibility_relation: v.comparisons.map((pair) => {
      const r = compare(pair.a, pair.b, {
        ancestry: (e, l) => proveAncestry(e, l, pair.committed ?? {}),
      });
      return r.ok ? r.relation : `refused:${r.refusal.reason}`;
    }),
    ancestry: v.ancestries.map((x) => proveAncestry(x.earlier, x.later, x.committed).verdict),
    quorum_arithmetic: v.tallies.map((x) => {
      const r = tally(x);
      return { met: r.tally.met, distinct: r.tally.distinct_eligible_witnesses, ok: r.ok };
    }),
    typed_status_rendering: v.statuses.map((x) => {
      const comparison = comparisonStatusOf(x);
      return {
        comparison,
        artifact: equivocationArtifactStatusOf({ ...x, comparison_status: comparison }),
      };
    }),
  };
}

/**
 * Drop the runtime label, and compare `covered` as the SET it is. Each mirror declares its surfaces
 * in its own order; requiring one order would make the parity claim about declaration style rather
 * than about behaviour, and the first run of this test failed on exactly that.
 */
const comparable = ({ runtime, covered, ...rest }) => ({ ...rest, covered: [...covered].sort() });

test("[5s-t28] the vectors are not trivial — every interesting verdict occurs", () => {
  // Agreement about easy cases is agreement about nothing. The vector set must reach every relation
  // and every ancestry verdict, or three runtimes could match while all three were wrong.
  const node = runNodeCore(PARITY_VECTORS);
  assert.deepEqual([...new Set(node.compatibility_relation)].sort(), [
    "compatible",
    "incompatible",
    "refused:COMPARISON_SET_INSUFFICIENT",
    "same_checkpoint",
  ]);
  assert.deepEqual([...new Set(node.ancestry)].sort(), ["invalid", "proven", "unprovable"]);
  assert.ok(
    node.quorum_arithmetic.some((t) => t.met),
    "no vector meets a quorum"
  );
  assert.ok(
    node.quorum_arithmetic.some((t) => !t.ok),
    "no vector is refused"
  );
});

test("[5s-t28] PORTABLE (WHATWG WebCrypto) matches the Node core, byte for byte", async () => {
  const node = runNodeCore(PARITY_VECTORS);
  const portable = await runPortable(PARITY_VECTORS);
  assert.equal(
    canonicalJson(comparable(portable)),
    canonicalJson(comparable(node)),
    "the portable mirror disagrees with the core"
  );
});

test("[5s-t28] PYTHON matches the Node core, byte for byte", () => {
  // No existence check: a runtime that fails to launch reddens here rather than vanishing.
  const out = execFileSync("python3", [PYTHON], {
    input: JSON.stringify(PARITY_VECTORS),
    encoding: "utf8",
  });
  const python = JSON.parse(out);
  const node = runNodeCore(PARITY_VECTORS);
  assert.equal(
    canonicalJson(comparable(python)),
    canonicalJson(comparable(node)),
    "the python mirror disagrees with the core"
  );
});

test("[5s-t28] all three runtimes cover exactly the manifest's surfaces", async () => {
  const portable = await runPortable(PARITY_VECTORS);
  const python = JSON.parse(
    execFileSync("python3", [PYTHON], { input: JSON.stringify(PARITY_VECTORS), encoding: "utf8" })
  );
  for (const [name, covered] of [
    ["portable", portable.covered],
    ["python", python.covered],
    ["exported", COVERED_SURFACES],
  ]) {
    const coverage = checkCoverage(covered);
    assert.equal(coverage.ok, true, `${name}: missing ${coverage.missing} extra ${coverage.extra}`);
  }
});

test("[5s-t28] the portable mirror uses NO Node built-ins — it is genuinely portable", () => {
  // The claim is API equivalence with a browser. A `node:` import would make that false while the
  // test kept passing, because it runs under Node either way.
  const source = readFileSync("tools/simurgh-attestation/stage5s/browser/vwq-portable.mjs", "utf8");
  assert.ok(!/from "node:/.test(source), "the portable mirror imports a Node built-in");
  assert.ok(/crypto\.subtle\.digest/.test(source), "it does not use WebCrypto at all");
});

// ------------------------------------------------------------------ the browser split

test("[5s-t28] the browser capture is present or TYPED ABSENT — never implied", () => {
  const record = JSON.parse(readFileSync(BROWSER_CAPTURE, "utf8"));
  assert.equal(record.schema, "simurgh.vwq.browser-capture.v1");
  assert.ok(
    ["captured", "not_captured_driver_absent", "not_captured_launch_failed"].includes(record.state),
    `unknown browser state ${record.state}`
  );
  if (record.state !== "captured") {
    assert.equal(record.results, null, "an absent capture carries results from somewhere");
    // And it says, in the artifact, that nothing stands in for it.
    assert.match(record.non_claim, /No browser executed/);
    assert.match(record.non_claim, /is not browser execution/);
  }
});

test("[5s-t28] the CI lane never calls itself browser execution", () => {
  // The one substitution that would make the split cosmetic: reporting the Node run as a browser
  // result. Checked over the source of both files that could do it.
  for (const path of [
    "tools/simurgh-attestation/stage5s/browser/vwq-portable.mjs",
    "tools/simurgh-attestation/stage5s/browser/runHeadless.mjs",
  ]) {
    const code = readFileSync(path, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert.ok(
      !/browser_verified|ran_in_browser|browser_execution:\s*true/.test(code),
      `${path} claims browser execution`
    );
  }
});
