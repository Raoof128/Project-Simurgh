// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S Lane A deterministic fixture builder (4S spec §12, §13). Motto:
// AnthropicSafe First, then ReviewerSafe. Loads the committed INSECURE_FIXTURE_ONLY
// keys and emits one bundle per reachable raw code plus an honest GREEN tree.
// Ed25519 signatures are deterministic (RFC 8032), so re-running is byte-stable.
//
// REACHABILITY (honest, spec §11): the corpus covers 0 and 100-117 EXCEPT 104.
// 104 (cycle) cannot be produced by a well-formed content-addressed bundle — a
// child's digest depends on its parent's, so a parent-pointer loop has no fixed
// point (see treeCore header). 104 and 118 are exercised by unit tests over the
// real detection code (treeCore hand-crafted index / chainCore typed wrapper).
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  keyDigest,
  buildHopReceipt,
  dualSign,
  signFanout,
  signCrossing,
  assembleChainBundle,
} from "../core/receiptBuilder.mjs";
import { receiptDigest } from "../core/treeCore.mjs";
import { buildFanoutCommitment } from "../core/fanoutCore.mjs";
import { SCHEMAS, ROOT_SENTINEL } from "../constants.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4s/test-keys");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const EPOCH = "win-2026-07-06";
const RUN = "run-4s";

function loadKey(name) {
  const priv = crypto.createPrivateKey(
    readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`))
  );
  const pub = crypto.createPublicKey(priv);
  const pem = pub.export({ type: "spki", format: "pem" }).toString();
  return { privateKey: priv, pem, digest: keyDigest(pem) };
}

const KEYS = {
  root: loadKey("root"),
  a: loadKey("agent-a"),
  b: loadKey("agent-b"),
  c: loadKey("agent-c"),
  evil: loadKey("evil"),
};

// Honest chain root->A, root->B, A->C, then per-spec mutations. Mirrors the
// chainCore adversarial matrix but with deterministic committed keys.
function build(spec = {}) {
  const pki = {};
  for (const k of Object.values(KEYS)) pki[k.digest] = k.pem;
  const mkR = (o, dPriv, ePriv) => dualSign(buildHopReceipt(o), dPriv, ePriv);

  const root = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: ROOT_SENTINEL,
      parentReceiptDigest: null,
      delegatorKeyDigest: KEYS.root.digest,
      delegateeKeyDigest: KEYS.root.digest,
      scope: spec.rootScope ?? ["calendar.read", "mail.read", "mail.send"],
      budgetAllocated: spec.rootBudget ?? 10,
      spineRefs: spec.rootSpine ?? { custody_4p: null, consent_4o: null, friction_4q: null },
    },
    KEYS.root.privateKey,
    KEYS.root.privateKey
  );
  const rd = receiptDigest(root);
  const bIsRoot = spec.bAsRoot === true;

  const a = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: KEYS.root.digest,
      delegateeKeyDigest: KEYS.a.digest,
      scope: spec.aScope ?? ["mail.read", "mail.send"],
      budgetAllocated: spec.aBudget ?? 4,
    },
    KEYS.root.privateKey,
    KEYS.a.privateKey
  );
  const b = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: bIsRoot ? ROOT_SENTINEL : rd,
      parentReceiptDigest: bIsRoot ? null : rd,
      delegatorKeyDigest: bIsRoot ? KEYS.b.digest : KEYS.root.digest,
      delegateeKeyDigest: KEYS.b.digest,
      scope: spec.bScope ?? ["mail.read"],
      budgetAllocated: spec.bBudget ?? 4,
    },
    bIsRoot ? KEYS.b.privateKey : KEYS.root.privateKey,
    KEYS.b.privateKey
  );
  const ad = receiptDigest(a);
  const bd = receiptDigest(b);
  const c = mkR(
    {
      epoch: spec.cEpoch ?? EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: spec.cRootDigest ?? rd,
      parentReceiptDigest: spec.cParent ?? ad,
      delegatorKeyDigest: KEYS.a.digest,
      delegateeKeyDigest: KEYS.c.digest,
      scope: spec.cScope ?? ["mail.read"],
      budgetAllocated: spec.cBudget ?? 2,
    },
    KEYS.a.privateKey,
    KEYS.c.privateKey
  );
  const cd = receiptDigest(c);

  const treeReceipts = [root, a, b, c];

  // Island node (null parent, NON-sentinel root digest) -> unreachable (105).
  // Hand-built (not buildHopReceipt) because that helper forces ROOT_SENTINEL for
  // any null-parent receipt, which would make this a second sentinel root (102).
  if (spec.islandNode) {
    const isleUnsigned = {
      schema: SCHEMAS.HOP_RECEIPT,
      epoch: EPOCH,
      run_id: RUN,
      window_id: "w1",
      root_receipt_digest: rd, // NON-sentinel: not counted as THE root
      parent_receipt_digest: null,
      delegator_key_digest: KEYS.evil.digest,
      delegatee_key_digest: KEYS.evil.digest,
      scope: ["mail.read"],
      budget_allocated: 1,
      spine_refs: { custody_4p: null, consent_4o: null, friction_4q: null },
      signature_delegator: "",
      signature_delegatee: "",
    };
    treeReceipts.push(dualSign(isleUnsigned, KEYS.evil.privateKey, KEYS.evil.privateKey));
  }

  // Hidden child (uncounted) -> 106.
  let dd = null;
  if (spec.hiddenChild) {
    const d = mkR(
      {
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        rootReceiptDigest: rd,
        parentReceiptDigest: rd,
        delegatorKeyDigest: KEYS.root.digest,
        delegateeKeyDigest: KEYS.evil.digest,
        scope: ["mail.read"],
        budgetAllocated: 1,
      },
      KEYS.root.privateKey,
      KEYS.evil.privateKey
    );
    dd = receiptDigest(d);
    treeReceipts.push(d);
  }

  const detached = [];
  let detachedDigest = null;
  if (spec.withDetached) {
    const det = mkR(
      {
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        rootReceiptDigest: rd,
        parentReceiptDigest: rd,
        delegatorKeyDigest: KEYS.a.digest,
        delegateeKeyDigest: KEYS.evil.digest,
        scope: ["mail.read"],
        budgetAllocated: 1,
      },
      KEYS.a.privateKey,
      KEYS.evil.privateKey
    );
    detached.push(det);
    detachedDigest = receiptDigest(det);
  }

  const fo = (node, children, key) =>
    signFanout(
      buildFanoutCommitment({
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        delegatorKeyDigest: key.digest,
        nodeReceiptDigest: node,
        childReceiptDigests: children,
      }),
      key.privateKey
    );
  const rootChildren = spec.rootChildren ? spec.rootChildren({ ad, bd, dd }) : [ad, bd];
  const fanouts = [];
  if (!bIsRoot) fanouts.push(fo(rd, rootChildren, KEYS.root));
  else fanouts.push(fo(rd, [ad], KEYS.root), fo(bd, [], KEYS.b));
  fanouts.push(fo(ad, [cd], KEYS.a), fo(bd, [], KEYS.b), fo(cd, [], KEYS.c));
  if (dd) fanouts.push(fo(dd, [], KEYS.evil));

  const bound = spec.crossingBound
    ? spec.crossingBound({ rd, ad, bd, cd, detached: detachedDigest })
    : cd;
  const signKey = KEYS[spec.crossingSignKey ?? "c"];
  const crossing = signCrossing(
    {
      schema: SCHEMAS.CROSSING_ARTIFACT,
      epoch: spec.crossingEpoch ?? EPOCH,
      run_id: RUN,
      crossing_kind: "tool_execution",
      bound_receipt_digest: bound,
      requested_scope: spec.crossingScope ?? ["mail.read"],
      spend: spec.crossingSpend ?? 1,
      payload_digest: "sha256:" + "c".repeat(64),
      signature_actor: "",
    },
    signKey.privateKey
  );

  const bundle = assembleChainBundle({
    epoch: EPOCH,
    runId: RUN,
    treeReceipts,
    detachedReceipts: detached,
    fanouts,
    crossings: [crossing],
    publicKeyIndex: pki,
    spineIndex: spec.spineIndex ?? [],
  });
  if (spec.postAssemble) spec.postAssemble(bundle);
  return bundle;
}

// name, expected raw, spec.
const CASES = [
  ["honest-tree", 0, {}],
  [
    "missing-signature-field",
    100,
    { postAssemble: (b) => delete b.tree_receipts[1].signature_delegatee },
  ],
  [
    "single-signature-hop",
    101,
    { postAssemble: (b) => (b.tree_receipts[1].signature_delegatee = "") },
  ],
  ["dual-sentinel-root", 102, { bAsRoot: true }],
  ["parent-digest-mismatch", 103, { cParent: "sha256:" + "9".repeat(64) }],
  ["unreachable-island", 105, { islandNode: true }],
  ["hidden-child", 106, { hiddenChild: true }],
  ["fanout-set-swap", 107, { rootChildren: ({ ad }) => [ad, "sha256:" + "f".repeat(64)] }],
  ["forged-attenuation", 108, { aScope: ["admin.all", "mail.read"] }],
  ["budget-amplification", 109, { aBudget: 6, bBudget: 6 }],
  ["local-overspend", 110, { crossingSpend: 3 }],
  [
    "orphan-crossing",
    111,
    { withDetached: true, crossingBound: ({ detached }) => detached, crossingSignKey: "evil" },
  ],
  ["receiptless-crossing", 112, { crossingBound: () => "" }],
  ["split-brain", 113, { cParent: null, postAssemble: null }],
  ["epoch-replay", 114, { cEpoch: "win-1999-01-01" }],
  ["root-replay", 115, { cRootDigest: "sha256:" + "e".repeat(64) }],
  [
    "spine-ref-mismatch",
    116,
    { rootSpine: { custody_4p: "sha256:" + "d".repeat(64), consent_4o: null, friction_4q: null } },
  ],
  [
    "merkle-bundle-mismatch",
    117,
    {
      // Append a validly-signed detached receipt AFTER the merkle root was sealed:
      // every earlier phase stays green; only the sealed artifact set drifted.
      postAssemble: (b) => {
        const rd = receiptDigest(b.tree_receipts[0]);
        const det = dualSign(
          buildHopReceipt({
            epoch: EPOCH,
            runId: RUN,
            windowId: "w1",
            rootReceiptDigest: rd,
            parentReceiptDigest: rd,
            delegatorKeyDigest: KEYS.a.digest,
            delegateeKeyDigest: KEYS.evil.digest,
            scope: ["mail.read"],
            budgetAllocated: 1,
          }),
          KEYS.a.privateKey,
          KEYS.evil.privateKey
        );
        b.detached_receipts.push(det);
      },
    },
  ],
];

// Split-brain needs a hand-built second receipt with the same delegatee under B.
function buildSplitBrain() {
  const pki = {};
  for (const k of Object.values(KEYS)) pki[k.digest] = k.pem;
  const mkR = (o, dPriv, ePriv) => dualSign(buildHopReceipt(o), dPriv, ePriv);
  const root = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: ROOT_SENTINEL,
      parentReceiptDigest: null,
      delegatorKeyDigest: KEYS.root.digest,
      delegateeKeyDigest: KEYS.root.digest,
      scope: ["mail.read"],
      budgetAllocated: 10,
    },
    KEYS.root.privateKey,
    KEYS.root.privateKey
  );
  const rd = receiptDigest(root);
  const a = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: KEYS.root.digest,
      delegateeKeyDigest: KEYS.a.digest,
      scope: ["mail.read"],
      budgetAllocated: 4,
    },
    KEYS.root.privateKey,
    KEYS.a.privateKey
  );
  const b = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: KEYS.root.digest,
      delegateeKeyDigest: KEYS.b.digest,
      scope: ["mail.read"],
      budgetAllocated: 4,
    },
    KEYS.root.privateKey,
    KEYS.b.privateKey
  );
  const ad = receiptDigest(a);
  const bd = receiptDigest(b);
  // Same delegatee (c) claimed under both A and B.
  const c1 = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: ad,
      delegatorKeyDigest: KEYS.a.digest,
      delegateeKeyDigest: KEYS.c.digest,
      scope: ["mail.read"],
      budgetAllocated: 1,
    },
    KEYS.a.privateKey,
    KEYS.c.privateKey
  );
  const c2 = mkR(
    {
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: bd,
      delegatorKeyDigest: KEYS.b.digest,
      delegateeKeyDigest: KEYS.c.digest,
      scope: ["mail.read"],
      budgetAllocated: 1,
    },
    KEYS.b.privateKey,
    KEYS.c.privateKey
  );
  const fo = (node, children, key) =>
    signFanout(
      buildFanoutCommitment({
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        delegatorKeyDigest: key.digest,
        nodeReceiptDigest: node,
        childReceiptDigests: children,
      }),
      key.privateKey
    );
  const fanouts = [
    fo(rd, [ad, bd], KEYS.root),
    fo(ad, [receiptDigest(c1)], KEYS.a),
    fo(bd, [receiptDigest(c2)], KEYS.b),
    fo(receiptDigest(c1), [], KEYS.c),
    fo(receiptDigest(c2), [], KEYS.c),
  ];
  return assembleChainBundle({
    epoch: EPOCH,
    runId: RUN,
    treeReceipts: [root, a, b, c1, c2],
    detachedReceipts: [],
    fanouts,
    crossings: [],
    publicKeyIndex: pki,
    spineIndex: [],
  });
}

export function buildAllFixtures(outDir = OUTDIR) {
  const dir = isAbsolute(outDir) ? outDir : join(ROOT, outDir);
  mkdirSync(dir, { recursive: true });
  const index = { schema: "simurgh.vdcc_corpus_index.v1", epoch: EPOCH, cases: [] };
  for (const [name, expected, spec] of CASES) {
    const bundle = name === "split-brain" ? buildSplitBrain() : build(spec);
    const file = `fixture-${expected}-${name}.json`;
    writeFileSync(join(dir, file), canonicalJson(bundle) + "\n");
    index.cases.push({ name, file, expected_raw: expected });
  }
  writeFileSync(join(dir, "corpus-index.json"), canonicalJson(index) + "\n");
  return index;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const idx = buildAllFixtures();
  console.error(`stage4s fixtures: wrote ${idx.cases.length} cases + corpus-index.json`);
}
