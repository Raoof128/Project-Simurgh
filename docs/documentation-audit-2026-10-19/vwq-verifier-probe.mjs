import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const load = (p) => import(`${root}/tools/simurgh-attestation/stage5s/${p}.mjs`);
const { evaluate } = await load("core/verify");
const { cleanBundle, baseBundle, checkpoint, view, comparisonManifest } =
  await load("fixtures/bundle");
const { keyFor } = await load("fixtures/keys");
const { checkpointBodyDigest } = await load("core/canonical");
const { externalCorroborationStatusOf } = await load("core/status");
const { verifyCapture } = await load("node/verifyCapture");
const { buildBody, signAttestation, verifyAttestation, REQUIRED_BINDINGS } =
  await load("node/attestation");
const { checkManifests } = await load("node/ceremony/runCeremony");
const { DECLARED_INPUTS, ROLES } = await load("node/ceremony/roles");
const rows = [];
function run(id, b, expected) {
  const r = evaluate(b);
  assert.equal(r.exit_code, expected);
  rows.push({
    id,
    exit_code: r.exit_code,
    statuses: r.statuses,
    relations: r.relations,
    artifact_present: !!r.equivocation_artifact,
  });
  return r;
}
run("clean_fixture_with_placeholder_witness_and_receiver_signatures", cleanBundle(), 0);
run("fork_positive_control", baseBundle(), 0);
let b = cleanBundle();
b.views[0].checkpoint.producer_signature = "invalid";
assert.notEqual(evaluate(b).exit_code, 0);
rows.push({ id: "invalid_producer_signature_refused", exit_code: evaluate(b).exit_code });
b = cleanBundle();
const cp = checkpoint({ history_root: "root-c" });
b.views.push(view(cp, ["w-a", "w-b"], []));
b.comparison_manifest = comparisonManifest(b.views.map((v) => v.checkpoint));
assert.equal(
  run("third_conflicting_view_ignored", b, 0).statuses.comparison_status,
  "no_conflict_in_committed_comparison_set"
);
b = cleanBundle();
const stranger = checkpoint({}, "stranger");
b.views = [view(stranger, ["w-a", "w-b"], ["r-a"]), view(stranger, ["w-a", "w-b"], ["r-b"])];
b.committed.producer_public_key_pem = keyFor("stranger").pem;
b.comparison_manifest = comparisonManifest([stranger]);
run("substitute_signer_keep_old_key_digest_labels", b, 0);
b = cleanBundle();
delete b.committed.c1_roots;
delete b.committed.protocol_version;
delete b.committed.producer_key_digest;
run("optional_committed_bindings_absent", b, 0);
b = cleanBundle();
for (const v of b.views)
  for (const s of [...v.witness_statements, ...v.carried_by]) delete s.checkpoint_envelope_digest;
run("statement_and_receipt_envelope_bindings_absent", b, 0);
b = cleanBundle();
b.comparison_manifest.input_envelope_digests = ["unrelated"];
b.comparison_manifest.views = ["unrelated"];
run("clean_manifest_does_not_contain_views", b, 0);
b = cleanBundle();
const a = checkpoint({ epoch: 7, predecessor: "real-old", history_root: "root-a" }),
  z = checkpoint({ epoch: 8, predecessor: "unrelated-real-parent", history_root: "root-z" });
b.views = [view(a, ["w-a", "w-b"], ["r-a"]), view(z, ["w-a", "w-b"], ["r-b"])];
b.comparison_manifest = comparisonManifest([a, z]);
b.committed.chain = [
  { body_digest: checkpointBodyDigest(a), epoch: 7, predecessor: null },
  { body_digest: checkpointBodyDigest(z), epoch: 8, predecessor: checkpointBodyDigest(a) },
];
assert.equal(run("asserted_chain_overrides_signed_predecessor", b, 0).relations[0], "compatible");
const corroboration = externalCorroborationStatusOf({
  policy: {
    minimum_distinct_mechanisms: 1,
    permitted_ecology_classes: ["made_up"],
    required_envelope_digest: "x",
  },
  anchors: [
    { external_anchor_class: "made_up", covered_envelope_digest: "x", inclusion_verified: true },
  ],
});
assert.equal(corroboration, "satisfied");
rows.push({ id: "unknown_asserted_anchor_satisfies_status_helper", result: corroboration });
const dir = mkdtempSync(join(tmpdir(), "simurgh-vwq-doc-audit-"));
try {
  for (const cls of ["rfc3161", "rekor", "made_up", "bitcoin_ots"]) {
    const content = "abcd\n";
    writeFileSync(
      join(dir, "token"),
      cls === "rfc3161" ? Buffer.concat([Buffer.from([0x30]), Buffer.alloc(255)]) : "not a proof"
    );
    writeFileSync(join(dir, "input"), content);
    writeFileSync(
      join(dir, "lane-c-capture.json"),
      JSON.stringify({
        schema: "simurgh.vwq.lane-c-capture.v1",
        anchor_witness_weight: 0,
        witness_independence_status_effect: "none",
        lane_c_state: "captured",
        submitted_digest: "abcd",
        mechanisms: [
          {
            external_anchor_class: cls,
            outcome: "captured",
            artifact: "token",
            anchored_file: "input",
            anchored_file_content: content,
            anchored_value: "sha256:" + createHash("sha256").update(content).digest("hex"),
          },
        ],
      })
    );
    const r = verifyCapture(dir);
    assert.equal(r.ok, true);
    rows.push({ id: `fake_${cls}_capture_accepted`, result: r });
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
const facts = Object.fromEntries(REQUIRED_BINDINGS.map((k) => [k, "asserted"]));
facts.compared_checkpoint_envelope_digests = [];
facts.quorum_status_by_envelope_digest = {};
const body = buildBody(facts);
const pem = keyFor("stranger").privateKey.export({ type: "pkcs8", format: "pem" });
const envelope = signAttestation(body, pem);
const r = verifyAttestation(envelope, keyFor("stranger").pem, { tier: "audit" });
assert.equal(r.ok, true);
rows.push({ id: "audit_tier_accepts_signed_assertions_without_rebuilding_evidence", result: r });
const transcript = {
  roles: Object.fromEntries(
    ROLES.map((role) => [
      role,
      { manifest: { declared_inputs: DECLARED_INPUTS[role], consumed_input_digests: {} } },
    ])
  ),
};
const mr = checkManifests(transcript);
assert.equal(mr.ok, true);
rows.push({ id: "empty_consumption_map_passes_manifest_check", result: mr });
console.log(
  JSON.stringify(
    {
      schema: "simurgh.documentation_probe.v1",
      scope:
        "Offline synthetic Stage 5S boundary checks; no network, inference or runtime changes.",
      cases: rows,
    },
    null,
    2
  )
);
