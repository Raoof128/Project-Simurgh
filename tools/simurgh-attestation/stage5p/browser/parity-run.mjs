// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs the portable surface against the Node-generated vectors, in a REAL browser.
import {
  AXES,
  leqV,
  joinV,
  compareStrength,
  deriveSubjectId,
  evidenceReplayIdentity,
} from "./vsi-portable.mjs";

const out = document.getElementById("out");
const fail = [];
try {
  // The vectors are inlined at build time by the test harness (no fetch — CSP forbids egress and
  // a file:// fetch would be an outbound request the reviewer cannot audit).
  const v = JSON.parse(document.getElementById("vectors").textContent);
  for (const row of v.pairs) {
    const a = v.vectors[row.a],
      b = v.vectors[row.b];
    if (leqV(a, b) !== row.leq) fail.push(`leq ${row.a}/${row.b}`);
    if (JSON.stringify(joinV(a, b)) !== JSON.stringify(row.join))
      fail.push(`join ${row.a}/${row.b}`);
    if (compareStrength(a, b) !== row.rel) fail.push(`rel ${row.a}/${row.b}`);
  }
  const encoder = new TextEncoder();
  for (const s of v.subjects) {
    const got = await deriveSubjectId(s.ns, encoder.encode(s.text));
    if (got !== s.subject_id) fail.push(`subject ${s.ns}/${s.text}: ${got} != ${s.subject_id}`);
  }
  const rid = await evidenceReplayIdentity({
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
  });
  if (rid !== v.replays[0].replay_identity)
    fail.push(`replay ${rid} != ${v.replays[0].replay_identity}`);

  const checks = v.pairs.length * 3 + v.subjects.length + 1;
  out.textContent = JSON.stringify({
    runtime: "browser",
    axes: AXES.length,
    checks,
    failures: fail,
    ok: fail.length === 0,
  });
} catch (err) {
  out.textContent = JSON.stringify({ runtime: "browser", ok: false, error: String(err) });
}
