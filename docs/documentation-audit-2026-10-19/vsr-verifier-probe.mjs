// Documentation-only, offline API-boundary observations. Run from repository root.
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { buildCoverageLedger } from "../../tools/simurgh-attestation/stage5q/core/coverageLedger.mjs";
import { obligationId } from "../../tools/simurgh-attestation/stage5q/core/obligations.mjs";
import {
  makePremiseReceipt,
  verifyPremise,
} from "../../tools/simurgh-attestation/stage5q/core/premiseReceipt.mjs";
import { admissibility } from "../../tools/simurgh-attestation/stage5q/core/harness.mjs";
import {
  driftFor,
  classifyStep,
} from "../../tools/simurgh-attestation/stage5q/core/censusGate.mjs";
import {
  evaluateTransition,
  FROZEN_BLOCK_DIGEST,
} from "../../tools/simurgh-attestation/stage5q/core/transition.mjs";
import {
  buildPublicBundle,
  ROOT_NAMES,
  publicDigest,
  signingInput,
  verifyAttestation,
} from "../../tools/simurgh-attestation/stage5q/core/attestation.mjs";
const results = [];
const record = (name, observed, expected) => {
  assert.deepEqual(observed, expected, name);
  results.push({ name, observed });
};
const id = "5q:synthetic:member";
const cell = {
  function_id: id,
  attack_class: "R1",
  applicability: "obligated",
  omission_reason: null,
  obligation_id: obligationId({ functionId: id, attackClass: "R1" }),
};
const discharge = {
  ...cell,
  pack_id: "synthetic",
  discharge_status: "attacked_pass",
  finding_ids: [],
};
record(
  "empty coverage universe certifies",
  buildCoverageLedger({ members: [], cells: [], discharges: [] }).l1_certified,
  true
);
record(
  "single supplied cell without admissibility certifies",
  buildCoverageLedger({ members: [{ function_id: id }], cells: [cell], discharges: [discharge] })
    .l1_certified,
  true
);
record(
  "explicit inadmissibility rejects",
  buildCoverageLedger({
    members: [{ function_id: id }],
    cells: [cell],
    discharges: [discharge],
    admissibility: admissibility([]),
  }).l1_certified,
  false
);
const fixture = Buffer.from(
  JSON.stringify({ signature_valid: true, signed_object_digest: "a", presented_object_digest: "b" })
);
const receipt = makePremiseReceipt({
  pack_id: "synthetic",
  closure_digest: "unbound",
  target_function_id: id,
  fixture_digest: createHash("sha256").update(fixture).digest("hex"),
  predicate_id: "signatureValidWrongObject",
});
record(
  "asserted signature premise passes",
  verifyPremise(receipt, { readFixture: () => fixture }).ok,
  true
);
record(
  "changed receipt identity and digest pass",
  verifyPremise(
    { ...receipt, pack_id: "different", target_function_id: "another", receipt_digest: "invalid" },
    { readFixture: () => fixture }
  ).ok,
  true
);
record(
  "changed fixture bytes reject",
  verifyPremise(receipt, { readFixture: () => Buffer.from("{}") }).ok,
  false
);
record(
  "arbitrary detector and noncryptographic mutation digest admit R1",
  admissibility([
    {
      mutant_id: "M1",
      baseline_exit: 0,
      mutated_exit: 73,
      restored_exit: 0,
      mutation_applied: true,
      mutation_reverted: true,
      baseline_command: "assertion",
      mutated_command: "assertion",
      restored_command: "assertion",
      mutation_digest: "not-a-digest",
      detecting_pack_id: "unrelated-R16",
    },
  ]).isAdmissible("R1"),
  true
);
record(
  "suffix matching hides second proof path",
  driftFor({ enumerated_items: ["A.lean"], universe_items: ["one/A.lean", "two/A.lean"] }).drifted,
  false
);
record(
  "discovery token in comment classifies step",
  classifyStep({ run: "node --test\n# find" }).enumeration_style,
  "self_extending"
);
const transition = evaluateTransition({
  attestation: { verified: true, roots_recomputed: true, inadmissible_classes: [], root_count: 0 },
  coverage: { member_count: 1, statused: 1, duplicated: 0 },
  ledger: { chain_ok: true, record_count: 0 },
  frozenBlockDigest: FROZEN_BLOCK_DIGEST,
  manifestResults: [{ command: "unrelated", ok: true }],
});
record("asserted transition and one unrelated command authorize", transition.q1_authorised, true);
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const der = publicKey.export({ type: "spki", format: "der" });
const roots = Object.fromEntries(ROOT_NAMES.map((n) => [n, "a".repeat(64)]));
const bundle = buildPublicBundle({
  roots,
  closureMeta: {
    member_count: 1,
    closure_source_commit: "synthetic",
    parser: { name: "synthetic", version: "0", integrity: "synthetic" },
  },
  inadmissibleClasses: [],
  signer: {
    profile_id: "synthetic",
    expected_public_key_digest: createHash("sha256").update(der).digest("hex"),
  },
});
// Present a different key in the envelope, but verify with the independent injected key.
const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" });
bundle.expected_public_key_digest = createHash("sha256").update(other).digest("hex");
const digest = publicDigest(bundle);
const envelope = {
  public_digest: digest,
  signer: { public_key_b64: other.toString("base64") },
  signature_b64: sign(null, signingInput(digest), privateKey).toString("base64"),
};
record(
  "injected verification key need not equal presented key",
  verifyAttestation({ bundle, envelope, recomputedRoots: roots, publicKey }).ok,
  true
);
record(
  "bad attestation signature rejects",
  verifyAttestation({
    bundle,
    envelope: { ...envelope, signature_b64: "AA==" },
    recomputedRoots: roots,
    publicKey,
  }).ok,
  false
);
console.log(
  JSON.stringify(
    {
      scope:
        "Offline synthetic direct-module observations; no production artifact altered; not a full campaign replay.",
      results,
    },
    null,
    2
  )
);
