// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 attestation contract (Task 20).
//
// BYTE-STABILITY AND SIGNING ARE SEPARATE ARTIFACTS, and the split is not stylistic (gauntlet
// P0-15). An earlier design declared the attestation byte-stable while its Ed25519 key was
// ephemeral. Those cannot both hold: a fresh key yields a different public key and a different
// signature every run. Deriving the key deterministically would restore byte-stability and is
// prohibited — Stage 5P proved a derived key forgeable by anyone who can read the source.
//
//     public_structural_bundle    DETERMINISTIC. Ten roots, the §13 non-claims, closure metadata.
//                                 NO signature, NO raw public key, NO timestamp. A reviewer
//                                 REPRODUCES these bytes and compares them.
//
//     signed_audit_envelope       NOT byte-reproducible, and does not claim to be. The signature,
//                                 the signer's public key, the time. A reviewer VERIFIES this.
//
// THE BUNDLE BINDS ITS SIGNER WITHOUT EMBEDDING THE KEY (second gauntlet A2). It carries
// `signer_profile_id` and `expected_public_key_digest`; the actual key lives in exactly one
// committed place, the signer profile. Three copies of a public key is three chances to disagree.
//
// NO TIMESTAMP IN THE DETERMINISTIC BUNDLE (gauntlet P2-18). Any `created_at` breaks byte identity
// on the second run, and time belongs to the thing that is verified rather than reproduced.
//
// VERIFICATION ORDER IS NORMATIVE:
//
//     recompute the roots → rebuild the bundle → recompute public_digest → verify the signature
//
// A verifier that checks the signature first and the roots never is the exact failure this order
// exists to prevent: a valid signature over stale claims verifies perfectly and means nothing.

import { createHash, verify as verifyRaw } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";

export const PUBLIC_SCHEMA = "simurgh.vsr.q0.public.v1";
export const ENVELOPE_SCHEMA = "simurgh.vsr.q0.envelope.v1";
export const ROTATION_SCHEMA = "simurgh.vsr.q0.key-rotation.v1";

/**
 * THE TEN ROOTS. Exact keys, all ten required, no extras.
 *
 * This is ten, not the seven originally ruled, and the growth is called out rather than absorbed:
 * Annex A2 renamed one and clarified another, A3 added the historical closure, A4 added the
 * obligation matrix, and the second gauntlet added `q0_attack_result_root`. A root list that grows
 * without announcement is how an attestation quietly stops covering what it claims to cover.
 */
export const ROOT_NAMES = Object.freeze([
  "attack_pack_root",
  "attack_taxonomy_digest",
  "closure_member_commitment_digest",
  "coverage_discharge_root",
  "historical_function_closure_digest",
  "mutation_receipt_root",
  "obligation_matrix_root",
  "q0_attack_result_root",
  "q0_finding_ledger_digest",
  "release_tag_closure_digest",
]);

/**
 * `q0_attack_result_root` closes a real hole (second gauntlet A3).
 *
 * `attack_pack_root` commits pack DEFINITIONS and premises; findings live in the ledger; member
 * statuses live in coverage. The OBSERVED RESULTS OF CLEAN PACKS were rooted by nothing — so a
 * clean tray or campaign report could be edited, or deleted outright, without moving a single
 * attestation root. In a stage whose headline non-claim is "zero findings is not a security
 * result", the zero-finding evidence was the one artifact nobody committed.
 */
export const ATTACK_RESULT_DOMAIN = "simurgh.vsr.q0-attack-result.v1";
export const MUTATION_ROOT_DOMAIN = "simurgh.vsr.mutation-receipt-root.v1";
export const PACK_ROOT_DOMAIN = "simurgh.vsr.attack-pack-root.v1";

/** The §13 non-claims, frozen and published verbatim. */
export const KNOWN_LIMITATIONS = Object.freeze(
  [
    "not proof that Stage 5 has no vulnerabilities",
    "not exhaustive over all possible attacks",
    "not production penetration testing",
    "not proof that signed evidence is ground truth",
    "not proof of real-world identity, execution or human deliberation",
    "complete only over the frozen function, tag and attack closure",
    "historical environmental failure is not evidence of security",
    "zero discovered findings is not itself a security result",
    "the red team and the blue team are the same party, which is a ceiling no internal rigour removes",
  ].sort()
);

const domainDigest = (domain, value) =>
  createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(canonicalJson(value), "utf8"))
    .digest("hex");

export const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Root over the observed results of every tray and campaign.
 *
 * Deliberately over the RESULT-BEARING fields, not the whole file: a tray also carries the target
 * list and the omission table, which are already rooted through the closure and the obligation
 * matrix. Rooting them twice would make an edit to either look like two different problems.
 */
export function attackResultRoot({ trays, campaigns }) {
  const trayRows = [...trays]
    .map((t) => ({
      tray_id: t.tray_id,
      closure_digest: t.closure_digest,
      attack_pack_ids: [...(t.attack_pack_ids ?? [])].sort(),
      finding_ids: [...(t.finding_ids ?? [])].sort(),
      coverage_statuses: t.coverage_statuses ?? {},
      positive_path_result: t.positive_path_result?.result ?? null,
      summary: t.summary,
      // Every per-cell observation. This is the zero-finding evidence: without it a clean row can
      // be deleted and no root moves.
      observations: (t.obligation_receipts ?? [])
        .filter((r) => r.discharge_status !== null)
        .map((r) => [r.function_id, r.attack_class, r.observed_outcome, r.discharge_status])
        .sort((a, b) => a.join("|").localeCompare(b.join("|"))),
    }))
    .sort((a, b) => a.tray_id.localeCompare(b.tray_id));

  const campaignRows = [...campaigns]
    .map((c) => ({
      campaign_id: c.campaign_id,
      summary: c.summary,
      findings: Array.isArray(c.findings) ? c.findings.length : 0,
      // Campaigns are heterogeneous by design (head/seam carry `results`, historical carries
      // `records`, fable5 carries `captures`). The root reads whichever is present rather than
      // assuming one shape — and records WHICH, so a campaign that changed shape is visible.
      result_shape: c.results
        ? "results"
        : c.records
          ? "records"
          : c.captures
            ? "captures"
            : "none",
      result_count: (c.results ?? c.records ?? c.captures ?? []).length,
    }))
    .sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));

  return domainDigest(ATTACK_RESULT_DOMAIN, { trays: trayRows, campaigns: campaignRows });
}

/** Root over the Task 12 mutation receipts — the green→red→green witnesses L4 depends on. */
export function mutationReceiptRoot(receipts) {
  const rows = [...receipts]
    .map((r) => ({
      mutant_id: r.mutant_id,
      attack_class: r.attack_class,
      target_function_id: r.target_function_id,
      baseline_exit: r.baseline_exit,
      mutated_exit: r.mutated_exit,
      restored_exit: r.restored_exit,
      mutation_digest: r.mutation_digest ?? null,
    }))
    .sort((a, b) => a.mutant_id.localeCompare(b.mutant_id));
  return domainDigest(MUTATION_ROOT_DOMAIN, rows);
}

/**
 * Root over the pack DEFINITIONS and their premise receipts — never over their verdicts.
 *
 * The verdicts belong to `q0_attack_result_root`. Keeping them apart is what makes "the packs were
 * these" and "the packs found this" two separately falsifiable statements.
 */
export function attackPackRoot(packResults) {
  const families = [...(packResults.families ?? [])]
    .map((f) => ({
      pack_id: f.pack_id,
      family_id: f.family_id,
      attack_class: f.attack_class,
      categories: [...f.categories].sort(),
      intent: f.intent,
    }))
    .sort((a, b) => a.pack_id.localeCompare(b.pack_id));
  const premises = [...(packResults.discharges ?? [])]
    .map((d) => [d.function_id, d.attack_class, d.pack_id, d.premise_receipt_digest])
    .sort((a, b) => a.join("|").localeCompare(b.join("|")));
  return domainDigest(PACK_ROOT_DOMAIN, { families, premises });
}

/**
 * Build the deterministic public bundle. Exact keys, nothing else.
 *
 * Throws on a missing or malformed root rather than emitting a bundle with a hole in it. An
 * attestation that can be built over nine roots is an attestation whose tenth claim is decorative.
 */
export function buildPublicBundle({ roots, closureMeta, inadmissibleClasses, signer }) {
  const missing = ROOT_NAMES.filter((name) => !/^[0-9a-f]{64}$/.test(roots?.[name] ?? ""));
  if (missing.length > 0) {
    throw new Error(
      `refusing to build the public bundle: ${missing.length} root(s) missing or not 64-hex — ` +
        `${missing.join(", ")}. A bundle with a hole in it makes its tenth claim decorative.`
    );
  }
  const extra = Object.keys(roots).filter((name) => !ROOT_NAMES.includes(name));
  if (extra.length > 0) {
    throw new Error(`the root list is EXACT; unexpected root(s): ${extra.join(", ")}`);
  }
  if (!Array.isArray(inadmissibleClasses)) {
    throw new Error(
      "inadmissible_classes is required and is an ARRAY — empty when none, never absent. An " +
        "absent field and an empty one must not look the same."
    );
  }
  if (!signer?.profile_id || !/^[0-9a-f]{64}$/.test(signer?.expected_public_key_digest ?? "")) {
    throw new Error("the bundle binds its signer by profile id and public-key DIGEST");
  }

  return {
    schema: PUBLIC_SCHEMA,
    stage_id: "5q",
    roots: Object.fromEntries(ROOT_NAMES.map((name) => [name, roots[name]])),
    known_limitations: [...KNOWN_LIMITATIONS],
    closure_meta: {
      member_count: closureMeta.member_count,
      closure_source_commit: closureMeta.closure_source_commit,
      parser: {
        name: closureMeta.parser.name,
        version: closureMeta.parser.version,
        integrity: closureMeta.parser.integrity,
      },
    },
    inadmissible_classes: [...inadmissibleClasses].sort(),
    signer_profile_id: signer.profile_id,
    expected_public_key_digest: signer.expected_public_key_digest,
  };
}

/** `sha256(canonicalJson(public_structural_bundle))`. */
export function publicDigest(bundle) {
  return sha256Hex(Buffer.from(canonicalJson(bundle), "utf8"));
}

/** The bytes the signature covers: `UTF8(envelope schema) || 0x00 || public_digest`. */
export function signingInput(digestHex) {
  return Buffer.concat([
    Buffer.from(ENVELOPE_SCHEMA, "utf8"),
    Buffer.from([0x00]),
    Buffer.from(digestHex, "utf8"),
  ]);
}

/**
 * Verify an attestation, IN THE NORMATIVE ORDER.
 *
 * `recomputeRoots` is supplied by the caller and must return the roots derived from the evidence on
 * disk. It is a parameter rather than an import so this function cannot be satisfied by the bundle
 * describing itself: the roots have to come from somewhere else or the check is a tautology.
 */
export function verifyAttestation({ bundle, envelope, recomputedRoots, publicKey }) {
  const steps = [];
  const fail = (step, reason) => {
    steps.push({ step, ok: false, reason });
    return { ok: false, steps };
  };

  // 1. THE ROOTS, FIRST. A signature over stale claims verifies perfectly.
  const drifted = ROOT_NAMES.filter((name) => bundle?.roots?.[name] !== recomputedRoots?.[name]);
  if (drifted.length > 0) {
    return fail(
      "roots_recompute",
      `${drifted.length} root(s) do not recompute from the evidence: ${drifted.join(", ")}`
    );
  }
  steps.push({ step: "roots_recompute", ok: true, reason: `all ${ROOT_NAMES.length} roots agree` });

  // 2. The bundle's own shape.
  if (bundle.schema !== PUBLIC_SCHEMA) return fail("bundle_schema", `saw ${bundle.schema}`);
  const missingLimitations = KNOWN_LIMITATIONS.filter((l) => !bundle.known_limitations.includes(l));
  if (missingLimitations.length > 0) {
    return fail(
      "limitations_complete",
      `${missingLimitations.length} §13 non-claim(s) absent: ${missingLimitations[0]}`
    );
  }
  steps.push({
    step: "limitations_complete",
    ok: true,
    reason: "every §13 non-claim is published",
  });

  // 3. The digest, recomputed from the bundle's bytes.
  const digest = publicDigest(bundle);
  if (envelope?.public_digest !== digest) {
    return fail(
      "public_digest",
      `envelope says ${envelope?.public_digest}, bytes hash to ${digest}`
    );
  }
  steps.push({ step: "public_digest", ok: true, reason: digest });

  // 4. The signer the BUNDLE named must be the signer the ENVELOPE presents.
  const presentedDigest = sha256Hex(Buffer.from(envelope?.signer?.public_key_b64 ?? "", "base64"));
  if (presentedDigest !== bundle.expected_public_key_digest) {
    return fail(
      "signer_binding",
      "the envelope presents a key the deterministic bundle did not expect — a valid signature by " +
        "the wrong party is still the wrong party"
    );
  }
  steps.push({ step: "signer_binding", ok: true, reason: bundle.signer_profile_id });

  // 5. And only now, the signature.
  let signatureOk = false;
  try {
    signatureOk = verifyRaw(
      null,
      signingInput(digest),
      publicKey,
      Buffer.from(envelope.signature_b64, "base64")
    );
  } catch (error) {
    return fail("signature", `verification threw: ${String(error.message).slice(0, 120)}`);
  }
  if (!signatureOk) return fail("signature", "the signature does not verify over the digest");
  steps.push({ step: "signature", ok: true, reason: "ed25519 over the domain-separated digest" });

  return { ok: true, steps };
}

/**
 * Validate a key-rotation chain from the genesis key to the presented one.
 *
 * A Q1 append signed by a key with no committed link to the Q0 signer is INDISTINGUISHABLE FROM A
 * FORGERY (gauntlet P0-16), and 5Q of all stages cannot ship that. An EMPTY chain is valid and
 * means "no rotation has happened" — which is the honest state today. Manufacturing a rotation
 * event so the chain looks longer would be fabricating history in a stage about fabricated
 * execution reality.
 */
export function verifyRotationChain({ genesisKeyB64, chain, presentedKeyB64 }) {
  if (!Array.isArray(chain))
    return { ok: false, reason: "the chain is a list, absent is not empty" };
  if (chain.length === 0) {
    return presentedKeyB64 === genesisKeyB64
      ? { ok: true, reason: "no rotation; the presented key IS the genesis key", links: 0 }
      : { ok: false, reason: "a key that is not the genesis key, with no rotation linking it" };
  }
  let current = genesisKeyB64;
  for (const [i, link] of chain.entries()) {
    if (link.schema !== ROTATION_SCHEMA) return { ok: false, reason: `link ${i}: wrong schema` };
    if (link.from_public_key_b64 !== current) {
      return { ok: false, reason: `link ${i}: does not continue from the current key` };
    }
    // The OUTGOING key signs the rotation. A rotation signed by the incoming key would let anyone
    // holding any key declare themselves the successor.
    let ok = false;
    try {
      ok = verifyRaw(
        null,
        Buffer.concat([
          Buffer.from(ROTATION_SCHEMA, "utf8"),
          Buffer.from([0x00]),
          Buffer.from(link.to_public_key_b64, "utf8"),
        ]),
        {
          key: Buffer.from(link.from_public_key_b64, "base64"),
          format: "der",
          type: "spki",
        },
        Buffer.from(link.signature_b64, "base64")
      );
    } catch {
      ok = false;
    }
    if (!ok) return { ok: false, reason: `link ${i}: not signed by the outgoing key` };
    current = link.to_public_key_b64;
  }
  return current === presentedKeyB64
    ? {
        ok: true,
        reason: `chain of ${chain.length} rotation(s) reaches the presented key`,
        links: chain.length,
      }
    : { ok: false, reason: "the chain does not end at the presented key" };
}
