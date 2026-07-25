// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — cross-runtime parity: Node == stdlib Python == a REAL headless browser.
//
// Three independent implementations of the same byte-geometry. The point is not redundancy, it is
// that a reviewer with any ONE of the three can recompute a 5P subject id, a replay identity and the
// whole comparator without trusting the other two.
//
// HONEST SKIP RULE, inherited from 5O: when no browser is present the browser lane SKIPS EXPLICITLY
// and never reports a parity PASS. Node's WebCrypto is not evidence about a real browser, and a
// green tick earned by running the same engine twice would be worse than no tick at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import {
  AXES,
  AXIS_VALUES,
  leqV,
  joinV,
  compareStrength,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";
import { deriveSubjectId } from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";
import { evidenceReplayIdentity } from "../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const S5P = join(ROOT, "tools/simurgh-attestation/stage5p");
const VECTORS = JSON.parse(readFileSync(join(S5P, "python/parity-vectors.json"), "utf8"));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("the vector file was generated from the AUTHORITATIVE Node surface, and still matches it", () => {
  // Guards the whole lane: if the vectors drifted from Node, Python and the browser would agree
  // with each other about something Node no longer does.
  assert.deepEqual(VECTORS.axes, [...AXES]);
  for (const ax of AXES) assert.deepEqual(VECTORS.axis_values[ax], [...AXIS_VALUES[ax]]);
  for (const row of VECTORS.pairs) {
    const a = VECTORS.vectors[row.a];
    const b = VECTORS.vectors[row.b];
    assert.equal(leqV(a, b), row.leq);
    assert.deepEqual(joinV(a, b), row.join);
    assert.equal(compareStrength(a, b), row.rel);
  }
  for (const s of VECTORS.subjects) {
    assert.equal(deriveSubjectId(s.ns, Buffer.from(s.text, "utf8")), s.subject_id);
  }
});

test("the vector set is exhaustive over the product space, not a sample", () => {
  const expected = AXES.reduce((n, ax) => n * AXIS_VALUES[ax].length, 1);
  assert.equal(VECTORS.vectors.length, expected, "every vector in the space must be present");
  assert.equal(VECTORS.pairs.length, expected * expected, "every ORDERED pair must be present");
  assert.equal(VECTORS.pairs.length, 576);
});

test("a NON-ASCII subject is in the vector set — encoding is where runtimes diverge", () => {
  const nonAscii = VECTORS.subjects.find((s) => /[^\x00-\x7F]/.test(s.text));
  assert.ok(nonAscii, "parity over ASCII only would miss the failure mode that actually happens");
  assert.equal(
    deriveSubjectId(nonAscii.ns, Buffer.from(nonAscii.text, "utf8")),
    nonAscii.subject_id
  );
});

test("PARITY — stdlib Python reproduces every value byte for byte", () => {
  const out = execFileSync("python3", [join(S5P, "python/vsi_parity.py")], { encoding: "utf8" });
  assert.match(out, /Node == stdlib Python/);
  assert.match(out, /on 1734 checks/);
});

test("PARITY — a REAL headless browser reproduces every value byte for byte", (t) => {
  if (!existsSync(CHROME)) {
    // Explicit skip. Never a silent pass, and never Node's WebCrypto standing in for a browser.
    t.skip("no Chrome present — the browser lane is SKIPPED, not assumed");
    return;
  }
  const work = mkdtempSync(join(tmpdir(), "s5p-browser-"));
  // Inline the vectors: CSP forbids all egress, so the page must not fetch anything, not even
  // a sibling file. A verifier that can make a request is not offline by construction.
  const html = readFileSync(join(S5P, "browser/index.html"), "utf8").replace(
    '<pre id="out">running…</pre>',
    `<script type="application/json" id="vectors">${JSON.stringify(VECTORS)}</script>\n<pre id="out">running…</pre>`
  );
  writeFileSync(join(work, "index.html"), html);
  for (const f of ["vsi-portable.mjs", "parity-run.mjs"]) {
    writeFileSync(join(work, f), readFileSync(join(S5P, "browser", f)));
  }

  const dom = execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--allow-file-access-from-files",
      "--virtual-time-budget=8000",
      "--dump-dom",
      `file://${join(work, "index.html")}`,
    ],
    { encoding: "utf8", timeout: 90_000, stdio: ["ignore", "pipe", "ignore"] }
  );

  const m = dom.match(/<pre id="out">(.*?)<\/pre>/s);
  assert.ok(m, `the browser produced no result block:\n${dom.slice(0, 400)}`);
  const result = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  assert.equal(result.runtime, "browser");
  assert.deepEqual(result.failures, [], "the browser disagreed with Node");
  assert.equal(result.ok, true);
  assert.equal(result.checks, VECTORS.pairs.length * 3 + VECTORS.subjects.length + 1);
});

test("the portable surface carries NO trust decision — B11 holds in the browser too", () => {
  // Scan CODE, not prose. The first version matched the module's own comment explaining that it
  // performs no signature verification — a gate that a file cannot describe its own scope without
  // failing is a gate that will be deleted rather than fixed.
  const code = readFileSync(join(S5P, "browser/vsi-portable.mjs"), "utf8")
    .split("\n")
    .filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")
    )
    .join("\n");
  for (const forbidden of [
    "verify(",
    "createVerify",
    "trusted",
    "signature",
    "fetch(",
    "XMLHttpRequest",
  ]) {
    assert.ok(
      !code.includes(forbidden),
      `the portable surface must not make trust decisions: found ${forbidden}`
    );
  }
  // ...and it must still do the work it IS for, or "no trust decisions" would be trivially true.
  const src = readFileSync(join(S5P, "browser/vsi-portable.mjs"), "utf8");
  assert.ok(src.includes("crypto.subtle.digest"), "PREMISE: the portable surface must hash");
  assert.ok(src.includes("export function compareStrength"));
});

test("the browser page forbids ALL egress by CSP, checked statically", () => {
  const html = readFileSync(join(S5P, "browser/index.html"), "utf8");
  // Read the POLICY, not the page. The first version matched the HTML comment that explains why no
  // connect-src is granted — it would have failed on a correct page and passed on a page whose
  // comment happened to be silent, which is exactly backwards.
  const policy = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(policy, "the page must carry a CSP meta tag");
  assert.match(policy[1], /default-src 'none'/);
  assert.ok(
    !/connect-src/.test(policy[1]),
    `no outbound fetch/XHR/WebSocket may be permitted, got: ${policy[1]}`
  );
  assert.ok(!/'unsafe-inline'/.test(policy[1]), "inline script would defeat the audit");
});

test("all three runtimes keep the prefixed-token defect DEAD", () => {
  // 5O's quarantined measurement defect: sha256Hex returning `sha256:<hex>`. Any runtime that
  // reintroduced the prefix would silently break every digest comparison across the stage.
  for (const s of VECTORS.subjects) assert.ok(!s.subject_id.startsWith("sha256:"));
  assert.match(VECTORS.replays[0].replay_identity, /^[0-9a-f]{64}$/);
  const py = readFileSync(join(S5P, "python/vsi_parity.py"), "utf8");
  assert.ok(py.includes("hexdigest()"), "python must produce bare hex");
  const browser = readFileSync(join(S5P, "browser/vsi-portable.mjs"), "utf8");
  assert.ok(!browser.includes('"sha256:"'), "the browser must produce bare hex");
});

test("the replay identity's EXCLUSION survives all three runtimes", () => {
  // Adding a profile must not change the identity, or S2.C4 goes blind in that runtime.
  const base = {
    claim: {
      principal: {
        type: "simurgh.vsi.principal.v1",
        kind: "account",
        namespace_id: "simurgh.synthetic.subject.v1",
        subject_id: "a".repeat(64),
      },
    },
    evidence_digest: "c".repeat(64),
    submission_digest_binding: "d".repeat(64),
    signature: "ab12",
    type: "simurgh.vsi.resolver_evidence.v1",
    profile_id: "simurgh.synthetic.registry.v1",
    asserted_strength_delta: {
      binding: "unbound",
      resolution: "provider_asserted",
      continuity: "ephemeral",
      role: "unproven",
    },
  };
  const stronger = {
    ...base,
    profile_id: "simurgh.synthetic.role-authority.v1",
    asserted_strength_delta: { ...base.asserted_strength_delta, continuity: "durable" },
  };
  assert.equal(evidenceReplayIdentity(base), evidenceReplayIdentity(stronger));
  assert.equal(evidenceReplayIdentity(base), VECTORS.replays[0].replay_identity);
});
