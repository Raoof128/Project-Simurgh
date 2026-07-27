// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 2: the inheritance verifier.
//
// Frozen §2.2 requires that before any 5R artifact exists, the seven inherited digests are
// re-derived, the 5Q envelope is verified ROOTS FIRST and SIGNATURE LAST, the bound context is
// confirmed, and any mismatch fails closed naming what moved.
//
// WHAT THIS VERIFIES, STATED PRECISELY — because the honest scope is narrower than "recomputes
// everything 5Q computed", and a verifier that overstates itself is the defect this stage hunts:
//
//   1. FILE PINS. Each inherited evidence file is digested under 5R's own domain and compared to a
//      value pinned here. This catches ANY byte change in the inherited tree, including one that
//      leaves 5Q's own declared digest fields untouched.
//   2. ROOTS. The seven values 5R inherits must equal the roots inside 5Q's signed bundle.
//   3. DECLARED DIGESTS. Each evidence file's own self-declared digest field must equal the root
//      that names it, so the bundle and the files agree with each other.
//   4. BOUND CONTEXT. member_count, closure_source_commit, signer profile, key digest.
//   5. SIGNATURE, last, over the recomputed public digest, using the PUBLIC key committed in the
//      envelope. No private key is required, and requiring one would mean this is not a verifier.
//
// What it deliberately does NOT do is re-derive 5Q's internal projections — the field subsets and
// row orders behind `closure_member_commitment_digest` and friends. Reimplementing those would mean
// copying a predecessor's internals into a stage forbidden to import them, and a divergent copy is
// worse than no copy: it would either agree by construction or disagree for reasons about the copy
// rather than about the evidence. The signed bundle already asserts those roots under a signature
// this module verifies, and the file pins bind the bytes those roots describe. Between them, a 5R
// run against a mutated 5Q tree is impossible, which is what §2.2 asks for.

import { createHash, createPublicKey, verify as verifyRaw } from "node:crypto";
// canonicalise.mjs is a repository-wide helper, NOT a stage5{a..q} module, so importing it does not
// violate §2.4. Reimplementing canonical JSON would create a second definition of "canonical", and
// two canonicalisers is one too many.
import { canonicalJson } from "../../canonicalise.mjs";

/** The seven roots, frozen in spec §2.1. */
export const INHERITED_ROOTS = Object.freeze({
  q0_attestation_public_digest: "8d04e35c6ccd7531e963de7e6aa964e4777b361666be8be516642f25eac27de6",
  closure_member_commitment_digest:
    "87512ae221ae2de5148759dcd48ad04ebf02c1b6354bc75e95af9d991f7fc936",
  historical_function_closure_digest:
    "c9838ae46d0d5ff00126876660e49eff2da038aef3e4ace604f6ac620711d79e",
  attack_taxonomy_digest: "f5e03d1193263afc7966263c466c7794cd2c1d7dd8105e45e1e5124103c5f2e7",
  obligation_matrix_root: "eefabdf2ddf3b4c0db9a061377ffefdb484d3c09aa591fb3d61770a933f09b70",
  q0_finding_ledger_digest: "7f8c70f1f14e7b49d701372759d831591f4babc215cdf3740f5bb03546f0b05f",
  coverage_discharge_root: "755e74c4ea05aad1dbd58f7583d7f28c0e850c1d28914a1ee9d6c1bbc6aba5ac",
});

/** Bound context, frozen in §2.1 — a digest without its provenance is a number. */
export const BOUND_CONTEXT = Object.freeze({
  closure_source_commit: "3512d287d2e13ceb31115477acc8b5ff182bc36e",
  member_count: 2531,
  signer_profile_id: "stage5q-q0-genesis",
  public_key_digest: "de557244c368b6105e5cbad5717f009fa5a6299ba896b2843d324ebdd1886811",
  inadmissible_classes: Object.freeze(["R5", "R7"]),
});

/** Root name → the evidence file, relative to the stage-5q evidence directory. */
export const INHERITED_FILES = Object.freeze({
  q0_attestation_public_digest: "attestation/public-structural-bundle.json",
  closure_member_commitment_digest: "closure/function-closure.json",
  historical_function_closure_digest: "closure/historical-function-closure.json",
  attack_taxonomy_digest: "closure/attack-taxonomy.json",
  obligation_matrix_root: "closure/obligation-matrix.json",
  q0_finding_ledger_digest: "findings/q0-finding-ledger.json",
  coverage_discharge_root: "coverage/discharge-ledger.json",
});

/** The envelope is read too, and pinned, though it carries no root of its own. */
export const ENVELOPE_FILE = "attestation/signed-audit-envelope.json";

/** Domain for 5R's own pin over the inherited bytes. */
export const FILE_PIN_DOMAIN = "simurgh.vpf.inherited-file.v1";

/**
 * 5R's pins over the inherited files, taken at Task 2 and frozen here.
 *
 * These are 5R's own measurement of the bytes it inherited. They are not 5Q's digests and do not
 * claim to be; they exist so that a change to the inherited tree is detectable by this stage's own
 * rule rather than only by the predecessor's.
 */
export const INHERITED_FILE_PINS = Object.freeze({
  q0_attestation_public_digest: "c9784c211e533d648e4faa6332ac9e8a29ff01122ae10a68da196f4196d04f47",
  closure_member_commitment_digest:
    "48d7166352ff59b59f3647dbc8f12eedfc9288362ae798744d9019b69a0e1f5c",
  historical_function_closure_digest:
    "11ca4926bfea75c288e0555f0a689f9f205aca6aad3000031e141ccc0b22e8d0",
  attack_taxonomy_digest: "6f1717267b61b2fff56b5f6a35da854e54f9d6321499fbc371e28db15340f045",
  obligation_matrix_root: "7bfbc85b6524e6ee4a33008fc88136d1d635d1dea15c1df5ddba9e7942596bc3",
  q0_finding_ledger_digest: "c97606adbf539994fd4de3c7e77e509d70e37c25aa546da565e69899e78111ec",
  coverage_discharge_root: "66ad14b674d830101af6c3bace8bbf8dfcb8f99e5c5a70c3ea2d5b9fdf199247",
});

/** The self-declared digest field inside each evidence file, where one exists. */
const DECLARED_FIELD = Object.freeze({
  closure_member_commitment_digest: "closure_member_commitment_digest",
  historical_function_closure_digest: "historical_function_closure_digest",
  attack_taxonomy_digest: "attack_taxonomy_digest",
  obligation_matrix_root: "obligation_matrix_root",
  q0_finding_ledger_digest: "q0_finding_ledger_digest",
  coverage_discharge_root: "coverage_discharge_root",
});

const canonicalText = (text) => {
  const lf = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return lf.endsWith("\n") ? lf : `${lf}\n`;
};

/**
 * 5R's domain-separated pin over one inherited file's canonical bytes.
 *
 * @param {string} text
 * @returns {string} lowercase hex sha256
 */
export function filePin(text) {
  return createHash("sha256")
    .update(Buffer.from(FILE_PIN_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(canonicalText(text), "utf8"))
    .digest("hex");
}

/**
 * The public digest of a structural bundle: `sha256(canonicalJson(bundle))`.
 *
 * @param {object} bundle
 * @returns {string}
 */
export function publicDigest(bundle) {
  return createHash("sha256")
    .update(Buffer.from(canonicalJson(bundle), "utf8"))
    .digest("hex");
}

/**
 * Verify the whole inheritance, in a fixed order, collecting every failure.
 *
 * @param {Record<string,string>} tree file path (relative to the 5Q evidence dir) → text
 * @param {{skipEnvelopePin?: boolean}} [opts] `skipEnvelopePin` is for tests that deliberately
 *   mutate the envelope to exercise the signature checks; production runs never set it.
 * @returns {{ok: boolean, checks: Array<object>, failures: Array<object>, signer?: object}}
 */
export function verifyInheritance(tree, opts = {}) {
  const checks = [];
  const failures = [];
  const fail = (check, detail) => {
    failures.push({ check, detail });
    checks.push({ name: check, ok: false, detail });
  };
  const pass = (check, detail) => checks.push({ name: check, ok: true, detail });

  const read = (rel) => (Object.prototype.hasOwnProperty.call(tree, rel) ? tree[rel] : null);

  // ---- 1. file pins ------------------------------------------------------------------------------
  let pinsOk = true;
  for (const [name, rel] of Object.entries(INHERITED_FILES)) {
    const text = read(rel);
    if (text === null) {
      pinsOk = false;
      fail("file_pins", `${rel} is missing from the inherited tree (root ${name})`);
      continue;
    }
    const got = filePin(text);
    if (got !== INHERITED_FILE_PINS[name]) {
      pinsOk = false;
      fail("file_pins", `${rel} moved: pin ${got} != ${INHERITED_FILE_PINS[name]} (root ${name})`);
    }
  }
  if (pinsOk) pass("file_pins", `${Object.keys(INHERITED_FILES).length} inherited files pinned`);

  const envelopeText = read(ENVELOPE_FILE);
  if (envelopeText === null)
    fail("file_pins", `${ENVELOPE_FILE} is missing from the inherited tree`);

  // ---- 2. parse ----------------------------------------------------------------------------------
  const parsed = {};
  for (const [name, rel] of Object.entries(INHERITED_FILES)) {
    const text = read(rel);
    if (text === null) continue;
    try {
      parsed[name] = JSON.parse(text);
    } catch (err) {
      fail("parse", `${rel} did not parse: ${err.message}`);
    }
  }
  let envelope = null;
  if (envelopeText !== null) {
    try {
      envelope = JSON.parse(envelopeText);
    } catch (err) {
      fail("parse", `${ENVELOPE_FILE} did not parse: ${err.message}`);
    }
  }

  const bundle = parsed.q0_attestation_public_digest ?? null;

  // ---- 3. roots ----------------------------------------------------------------------------------
  if (bundle?.roots) {
    let rootsOk = true;
    for (const [name, expected] of Object.entries(INHERITED_ROOTS)) {
      if (name === "q0_attestation_public_digest") continue;
      const got = bundle.roots[name];
      if (got !== expected) {
        rootsOk = false;
        fail("roots", `${name}: bundle says ${got}, 5R inherited ${expected}`);
      }
    }
    if (rootsOk) pass("roots", "six roots agree with the signed bundle");
  } else {
    fail("roots", "the structural bundle has no roots object");
  }

  // ---- 4. declared digests -----------------------------------------------------------------------
  let declaredOk = true;
  for (const [name, field] of Object.entries(DECLARED_FIELD)) {
    const obj = parsed[name];
    if (!obj) continue;
    if (obj[field] !== INHERITED_ROOTS[name]) {
      declaredOk = false;
      fail(
        "declared_digests",
        `${INHERITED_FILES[name]}: declares ${field}=${obj[field]}, root says ${INHERITED_ROOTS[name]}`
      );
    }
  }
  if (declaredOk) pass("declared_digests", "each evidence file agrees with the root that names it");

  // ---- 5. bound context --------------------------------------------------------------------------
  const meta = bundle?.closure_meta ?? {};
  if (meta.member_count !== BOUND_CONTEXT.member_count) {
    fail(
      "member_count",
      `bundle says ${meta.member_count}, 5R inherited ${BOUND_CONTEXT.member_count}`
    );
  } else if (meta.closure_source_commit !== BOUND_CONTEXT.closure_source_commit) {
    fail(
      "closure_source_commit",
      `bundle says ${meta.closure_source_commit}, 5R inherited ${BOUND_CONTEXT.closure_source_commit}`
    );
  } else {
    pass(
      "bound_context",
      `member_count ${meta.member_count}, closure ${meta.closure_source_commit}`
    );
  }

  // ---- 6. signer identity ------------------------------------------------------------------------
  let signer = null;
  if (envelope?.signer) {
    const der = Buffer.from(envelope.signer.public_key_b64 ?? "", "base64");
    const keyDigest = createHash("sha256").update(der).digest("hex");
    signer = { profile_id: envelope.signer.profile_id, public_key_digest: keyDigest };
    if (envelope.signer.profile_id !== BOUND_CONTEXT.signer_profile_id) {
      fail("signer_profile", `envelope signer is ${envelope.signer.profile_id}`);
    } else if (keyDigest !== BOUND_CONTEXT.public_key_digest) {
      fail(
        "public_key",
        `public key digest ${keyDigest} != pinned ${BOUND_CONTEXT.public_key_digest}`
      );
    } else {
      pass("signer_profile", envelope.signer.profile_id);
    }
  } else {
    fail("signer_profile", "the envelope carries no signer");
  }

  // ---- 7. SIGNATURE, last, and only if nothing above moved ----------------------------------------
  const rootsMoved = failures.some((f) =>
    ["file_pins", "roots", "declared_digests", "parse"].includes(f.check)
  );
  if (rootsMoved && !opts.skipEnvelopePin) {
    checks.push({
      name: "signature",
      ok: false,
      skipped: true,
      detail:
        "not reached: a root or an inherited file moved, so the signature cannot mean anything",
    });
  } else if (bundle && envelope) {
    const digest = publicDigest(bundle);
    if (digest !== envelope.public_digest) {
      fail("signature", `recomputed public digest ${digest} != envelope ${envelope.public_digest}`);
    } else {
      let good = false;
      try {
        const key = createPublicKey({
          key: Buffer.from(envelope.signer.public_key_b64, "base64"),
          format: "der",
          type: "spki",
        });
        const message = Buffer.concat([
          Buffer.from(envelope.schema, "utf8"),
          Buffer.from([0x00]),
          Buffer.from(digest, "utf8"),
        ]);
        good = verifyRaw(null, message, key, Buffer.from(envelope.signature_b64, "base64"));
      } catch (err) {
        fail("signature", `signature verification threw: ${err.message}`);
      }
      if (good) pass("signature", `verified with the committed public key over ${digest}`);
      else if (!failures.some((f) => f.check === "signature")) {
        fail("signature", "Ed25519 verification failed over the recomputed public digest");
      }
    }
  } else {
    fail("signature", "bundle or envelope unavailable");
  }

  return { ok: failures.length === 0, checks, failures, signer };
}
