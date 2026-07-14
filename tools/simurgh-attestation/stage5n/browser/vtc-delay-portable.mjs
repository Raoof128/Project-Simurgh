// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — browser portable CORE (Option 3). Re-derives the deterministic digests with the synchronous
// SHA-256 (crypto.subtle is async-per-call, unusable for the chain; run in a Web Worker). It NEVER emits a
// normative raw 0 — anchor + signature verification (RFC-3161/OTS/Rekor/Ed25519) require Node/Python. The
// return always carries normative_verdict_available:false so a UI cannot mistake a partial check for full.
import { sha256Bytes } from "./sha256-sync.mjs";

const enc = (s) => new TextEncoder().encode(s);
const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
const NUL = new Uint8Array([0]);

// Canonical JSON identical to the shared Node canonicaliser (recursively sorted keys, no whitespace).
function canonical(v) {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(v);
}
function hDS(tag, bytes) {
  const t = enc(tag);
  const m = new Uint8Array(t.length + 1 + bytes.length);
  m.set(t, 0);
  m.set(NUL, t.length);
  m.set(bytes, t.length + 1);
  return toHex(sha256Bytes(m));
}
const hdsObject = (tag, obj) => hDS(tag, enc(canonical(obj)));

const DS = {
  seed: "simurgh.vtc_delay.seed.v1",
  x0: "simurgh.vtc_delay.x0.v1",
  step: "simurgh.vtc_delay.step.v1",
  decision: "simurgh.vtc_delay.decision.v1",
  output: "simurgh.vtc_delay.output.v1",
  policy: "simurgh.vtc_delay.policy.v1",
};

function runChainSync(seedHex, T, cadence) {
  const st = enc(DS.step);
  let x = sha256Bytes(concat(enc(DS.x0), NUL, fromHex(seedHex)));
  for (let i = 1; i <= T; i++) {
    const ib = new Uint8Array(8);
    new DataView(ib.buffer).setBigUint64(0, BigInt(i), false);
    x = sha256Bytes(concat(st, NUL, ib, x));
    void cadence;
  }
  return toHex(x);
}
function concat(...arrs) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

// portableCoreVerify(env, { runChain }) -> portable status. Deterministic digest subset only.
export function portableCoreVerify(env, opts = {}) {
  const checks = {};
  checks.policy_digest_ok = hdsObject(DS.policy, env.delay_policy) === env.delay_policy_digest;
  checks.decision_digest_ok = hdsObject(DS.decision, env.decision_body) === env.decision_digest;
  const seed = hdsObject(DS.seed, {
    run_id: env.run_id,
    D_in: env.D_in,
    start_token_digest: env.start_token_digest,
    delay_policy_digest: env.delay_policy_digest,
  });
  checks.seed_ok = env.delay_proof?.seed === seed;
  if (opts.runChain) {
    const terminal = runChainSync(
      seed,
      env.delay_policy.iteration_count_T,
      env.delay_policy.checkpoint_cadence
    );
    checks.terminal_ok = terminal === env.delay_proof.terminal_value;
  }
  const D_out = hdsObject(DS.output, {
    run_id: env.run_id,
    D_in: env.D_in,
    decision_digest: env.decision_digest,
    delay_policy_digest: env.delay_policy_digest,
    start_token_digest: env.start_token_digest,
    iteration_count: env.delay_policy.iteration_count_T,
    terminal_value: env.delay_proof.terminal_value,
  });
  checks.output_commitment_ok = env.D_out === D_out;

  return {
    status: "portable_core_verified",
    normative_verdict_available: false, // anchors + signatures require Node/Python
    requires_anchor_verifier: "node_or_python",
    core_checks: checks,
    core_all_ok: Object.values(checks).every(Boolean),
    non_claim:
      "portable core proves digest/chain conformance only; NOT anchoring, signatures, or a normative raw 0",
  };
}

export { hdsObject as _hdsObject, runChainSync as _runChainSync };
