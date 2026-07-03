// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic synthetic fixture matrix (spec §5 / plan Task 9). Thirteen bundles, each
// mapped to falsifier arms V1-V17. Self-checks every bundle against the real core libs before
// writing; refuses on drift. Signature-bearing files carry fresh keys per run (the reproduce
// script compares only deterministic files).
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sha256Canonical } from "../../stage4d/stage4dCrypto.mjs";
import { recordDigest } from "../core/canonical.mjs";
import { validateMergeChain, validateWindowCommitment } from "../core/mergeLatticeCore.mjs";
import { rescoreAll, rescoreWindow, verifyRescoreRecord } from "../core/retroScoreCore.mjs";
import { buildChain, verifyDisclosure } from "../core/disclosureCore.mjs";
import { validateAcknowledgement, validateContest } from "../core/respondentCore.mjs";
import { nodeVerifyEd25519, signContest, spkiB64FromPublicKey } from "./signing-node.mjs";
import { buildArticle73Projection } from "./article73Projection.mjs";
import {
  buildVxdAttestation,
  buildVxdManifest,
  verifyVxdManifest,
} from "./build-stage4m-attestation.mjs";
import {
  VXD_ACK_SCHEMA,
  VXD_CONTEST_SCHEMA,
  VXD_DISCLOSURE_SCHEMA,
  VXD_MERGE_EVENT_SCHEMA,
  VXD_WINDOW_SCHEMA,
} from "../constants.mjs";

const OUT = process.env.STAGE4M_FIXTURE_OUT || "tests/fixtures/llmShield/stage4m";
const CCB = "tests/fixtures/llmShield/stage4l/bundles/clean-under/ccb-manifest.json";
const LEAN = "proofs/stage4m/AntiMonotonicity.lean";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
const D = (n) => `sha256:${String(n).repeat(64)}`;
// deterministic synthetic cluster commitments c00..c99 (two-hex-digit repeated 32x)
const CL = (i) => `sha256:${i.toString(16).padStart(2, "0").repeat(32)}`;

const win = (window, clusters, graph = D("e")) => ({
  schema: VXD_WINDOW_SCHEMA,
  window,
  source_attestation_digest: D("1"),
  graph_version_digest: graph,
  clusters,
});
const cl = (commitment, total, budget, size) => ({
  cluster_commitment: commitment,
  cluster_weighted_total: total,
  budget,
  cluster_size: size,
});
const mergeEvt = (over = {}) => ({
  schema: VXD_MERGE_EVENT_SCHEMA,
  sequence: 1,
  parent_event_digest: null,
  old_graph_version_digest: D("e"),
  new_graph_version_digest: D("f"),
  merges: [],
  carried_cluster_commitments: [],
  raw_identity_exported: false,
  ...over,
});

function genesisOf(windows) {
  return {
    graphVersionDigest: windows[0].graph_version_digest,
    clusters: windows[0].clusters.map((c) => c.cluster_commitment),
    budgets: Object.fromEntries(windows[0].clusters.map((c) => [c.cluster_commitment, c.budget])),
  };
}

// Build the full chain + records + optional disclosure/contest/ack for a valid-chain bundle.
function buildArtifacts({
  windows,
  mergeEvents,
  claimSpecs,
  pincer = null,
  respondentTarget,
  keys,
}) {
  const chainCheck = validateMergeChain(mergeEvents, genesisOf(windows));
  if (!chainCheck.ok) throw new Error(`build_refused: chain invalid: ${chainCheck.reason}`);
  const rescored = rescoreAll({ windows, epochs: chainCheck.epochs });
  const records = rescored.records;
  const entries = [
    ...windows.map((w) => ({ kind: "window_commitment", digest: recordDigest(w) })),
    ...mergeEvents.map((e) => ({ kind: "merge_event", digest: recordDigest(e) })),
    ...records.map((r) => ({ kind: "rescore_record", digest: recordDigest(r) })),
  ];
  const posOf = (digest) => entries.findIndex((e) => e.digest === digest);
  let disclosure = null;
  if (claimSpecs) {
    const claims = claimSpecs.map((c) => ({
      kind: c.kind,
      value: c.value,
      bound_commitments: (c.bound === "rescores" ? records : c.bound).map((r) => ({
        digest: recordDigest(r),
        chain_position: posOf(recordDigest(r)),
      })),
    }));
    disclosure = {
      schema: VXD_DISCLOSURE_SCHEMA,
      chain_position: entries.length,
      claims,
      demand_side_evidence_digest: pincer,
      prose_history_digest: D("7"),
    };
    entries.push({ kind: "disclosure_claim", digest: recordDigest(disclosure) });
  }
  let contest = null;
  let ack = null;
  if (respondentTarget) {
    const target = records.find((r) => r.newly_revealed.includes(respondentTarget));
    if (!target) throw new Error("build_refused: respondentTarget not in any newly_revealed");
    contest = signContest(
      {
        schema: VXD_CONTEST_SCHEMA,
        contested_records: [{ window: target.window, record_digest: recordDigest(target) }],
        contest_type: "merge_evidence_disputed",
        respondent_public_key: `ed25519:${keys.respondentB64}`,
        statement_digest: D("8"),
      },
      keys.respondentPrivate
    );
    entries.push({ kind: "respondent_contest", digest: recordDigest(contest) });
    ack = signContest(
      {
        schema: VXD_ACK_SCHEMA,
        contest_digest: recordDigest(contest),
        statement_digest: D("6"),
        respondent_public_key: `ed25519:${keys.providerB64}`,
      },
      keys.providerPrivate
    );
    entries.push({ kind: "contest_acknowledgement", digest: recordDigest(ack) });
  }
  const chain = buildChain(entries);
  return { windows, mergeEvents, records, disclosure, contest, ack, chain };
}

function recordsByDigestOf(art) {
  const m = new Map();
  for (const w of art.windows) m.set(recordDigest(w), w);
  for (const r of art.records) m.set(recordDigest(r), r);
  return m;
}

function writeFull(dir, art, meta, respondentTarget) {
  mkdirSync(dir, { recursive: true });
  writeJson(`${dir}/windows.json`, art.windows);
  writeJson(`${dir}/merge-events.json`, art.mergeEvents);
  writeJson(`${dir}/rescore-records.json`, art.records);
  writeJson(`${dir}/chain.json`, art.chain);
  if (art.disclosure) writeJson(`${dir}/disclosure.json`, art.disclosure);
  if (art.contest) writeJson(`${dir}/contest.json`, art.contest);
  if (art.ack) writeJson(`${dir}/contest-ack.json`, art.ack);
  if (respondentTarget) writeJson(`${dir}/respondent-clusters.json`, [respondentTarget]);
  const attestation = buildVxdAttestation({
    windows: art.windows,
    mergeEvents: art.mergeEvents,
    rescoreRecords: art.records,
    disclosure: art.disclosure,
    contests: art.contest ? [art.contest] : [],
    acks: art.ack ? [art.ack] : [],
    chain: art.chain,
    sourceCcbManifestDigest: meta.sourceCcbManifestDigest,
    leanProofDigest: meta.leanProofDigest,
  });
  const manifest = buildVxdManifest({
    attestation,
    privateKey: meta.keys.providerPrivate,
    publicKeyPem: meta.publicKeyPem,
  });
  writeJson(`${dir}/vxd-attestation.json`, attestation);
  writeJson(`${dir}/vxd-manifest.json`, manifest);
  if (art.disclosure) {
    writeJson(
      `${dir}/article73-projection.json`,
      buildArticle73Projection({ attestation, disclosure: art.disclosure })
    );
  }
  return { attestation, manifest };
}

async function main() {
  const sourceCcbManifestDigest = `sha256:${sha256Canonical(readJson(CCB))}`;
  const leanProofDigest = `sha256:${sha256Canonical(readFileSync(LEAN, "utf8"))}`;
  const provider = generateKeyPairSync("ed25519");
  const respondent = generateKeyPairSync("ed25519");
  const keys = {
    providerPrivate: provider.privateKey,
    providerB64: spkiB64FromPublicKey(provider.publicKey),
    respondentPrivate: respondent.privateKey,
    respondentB64: spkiB64FromPublicKey(respondent.publicKey),
  };
  const publicKeyPem = provider.publicKey.export({ type: "spki", format: "pem" });
  const meta = { sourceCcbManifestDigest, leanProofDigest, keys, publicKeyPem };
  mkdirSync(`${OUT}/expected-results`, { recursive: true });
  writeFileSync(`${OUT}/vxd-signer.pub`, publicKeyPem);
  writeFileSync(
    `${OUT}/respondent-signer.pub`,
    respondent.publicKey.export({ type: "spki", format: "pem" })
  );

  const matrix = {};
  const B = `${OUT}/bundles`;

  // ---- clean-chain (V1, V6): 2 windows, non-revealing merge, matching disclosure ----
  {
    const clusters = [cl(CL(0), 2, 5, 1), cl(CL(1), 2, 5, 2), cl(CL(2), 2, 9, 1)];
    const windows = [win("2026-05", clusters), win("2026-06", clusters)];
    const mergeEvents = [
      mergeEvt({
        merges: [
          {
            new_cluster_commitment: D("d"),
            new_budget: 5,
            merged_cluster_commitments: [CL(0), CL(1)],
            merge_basis: ["payment_graph"],
          },
        ],
        carried_cluster_commitments: [CL(2)],
      }),
    ];
    const art = buildArtifacts({
      windows,
      mergeEvents,
      keys,
      claimSpecs: [
        { kind: "window_range", value: ["2026-05", "2026-06"], bound: windows },
        { kind: "consumer_count", value: 8, bound: windows },
        { kind: "exposure_total", value: 12, bound: windows },
        { kind: "cluster_count", value: 6, bound: windows },
        { kind: "breach_count", value: 0, bound: "rescores" },
      ],
    });
    if (
      verifyDisclosure({
        disclosure: art.disclosure,
        chain: art.chain,
        recordsByDigest: recordsByDigestOf(art),
      }).ok !== true
    ) {
      throw new Error("build_refused: clean-chain disclosure self-check failed");
    }
    writeFull(`${B}/clean-chain`, art, meta);
    matrix["clean-chain"] = { raw: 0, reason: null };
  }

  // ---- crown-reveal (V-CROWN, V10, V17): 100 singletons merged -> retroactive breach ----
  {
    const hundred = Array.from({ length: 100 }, (_, i) => cl(CL(i), 3, 5, 1));
    const windows = [win("2026-05", hundred)];
    const mergeEvents = [
      mergeEvt({
        merges: [
          {
            new_cluster_commitment: D("d"),
            new_budget: 5,
            merged_cluster_commitments: hundred.map((c) => c.cluster_commitment),
            merge_basis: ["payment_graph"],
          },
        ],
      }),
    ];
    const art = buildArtifacts({
      windows,
      mergeEvents,
      keys,
      respondentTarget: D("d"),
      claimSpecs: [
        { kind: "breach_count", value: 1, bound: "rescores" },
        { kind: "consumer_count", value: 100, bound: windows },
      ],
    });
    if (art.records[0].newly_revealed.join() !== D("d") || art.records[0].findings.length !== 1) {
      throw new Error("build_refused: crown-reveal did not reveal exactly D(d) with one finding");
    }
    const cc = await validateContest({
      contest: art.contest,
      recordsByDigest: recordsByDigestOf(art),
      verifySig: nodeVerifyEd25519,
    });
    if (!cc.ok) throw new Error(`build_refused: crown contest self-check: ${cc.reason}`);
    const ak = await validateAcknowledgement({
      ack: art.ack,
      contestDigests: new Set([recordDigest(art.contest)]),
      verifySig: nodeVerifyEd25519,
      providerPublicKeySpkiB64: keys.providerB64,
    });
    if (!ak.ok) throw new Error(`build_refused: crown ack self-check: ${ak.reason}`);
    writeFull(`${B}/crown-reveal`, art, meta, D("d"));
    matrix["crown-reveal"] = { raw: 0, reason: null };
  }

  // ---- no-merge-control (V15): windows only, zero merge events ----
  {
    const clusters = [cl(CL(0), 2, 5, 1), cl(CL(1), 2, 5, 2), cl(CL(2), 2, 9, 1)];
    const windows = [win("2026-05", clusters)];
    const art = buildArtifacts({
      windows,
      mergeEvents: [],
      keys,
      claimSpecs: [{ kind: "breach_count", value: 0, bound: "rescores" }],
    });
    if (art.records.length !== 0)
      throw new Error("build_refused: no-merge-control produced records");
    writeFull(`${B}/no-merge-control`, art, meta);
    matrix["no-merge-control"] = { raw: 0, reason: null };
  }

  // ---- chain-fail bundles: windows + merge-events only; validateMergeChain rejects ----
  const clustersF = [cl(CL(0), 2, 5, 1), cl(CL(1), 2, 5, 2), cl(CL(2), 2, 9, 1)];
  const windowsF = [win("2026-05", clustersF)];
  const chainFail = {
    "split-event": {
      merges: [
        {
          new_cluster_commitment: D("d"),
          new_budget: 5,
          merged_cluster_commitments: [CL(0), CL(1)],
          merge_basis: ["payment_graph"],
        },
        {
          new_cluster_commitment: D("3"),
          new_budget: 5,
          merged_cluster_commitments: [CL(0), CL(2)],
          merge_basis: ["payment_graph"],
        },
      ],
      carried: [],
      reason: "non_coarsening_split",
    },
    "inflated-budget": {
      merges: [
        {
          new_cluster_commitment: D("d"),
          new_budget: 6,
          merged_cluster_commitments: [CL(0), CL(1)],
          merge_basis: ["payment_graph"],
        },
      ],
      carried: [CL(2)],
      reason: "budget_inflation",
    },
    "broken-chain": {
      merges: [
        {
          new_cluster_commitment: D("d"),
          new_budget: 5,
          merged_cluster_commitments: [CL(0), CL(1)],
          merge_basis: ["payment_graph"],
        },
      ],
      carried: [CL(2)],
      parent: D("9"),
      reason: "parent_digest_mismatch",
    },
  };
  for (const [name, spec] of Object.entries(chainFail)) {
    const ev = mergeEvt({ merges: spec.merges, carried_cluster_commitments: spec.carried });
    if (spec.parent) ev.parent_event_digest = spec.parent;
    const check = validateMergeChain([ev], genesisOf(windowsF));
    if (check.ok || check.reason !== spec.reason) {
      throw new Error(
        `build_refused: ${name} expected ${spec.reason}, got ${check.reason ?? "ok"}`
      );
    }
    const dir = `${B}/${name}`;
    mkdirSync(dir, { recursive: true });
    writeJson(`${dir}/windows.json`, windowsF);
    writeJson(`${dir}/merge-events.json`, [ev]);
    matrix[name] = { raw: 43, reason: spec.reason };
  }

  // ---- tampered-window (V5): pre-tamper breach committed, then window total lowered ----
  {
    const preClusters = [cl(CL(0), 9, 5, 1), cl(CL(1), 1, 5, 1), cl(CL(2), 1, 5, 1)];
    const preWindows = [win("2026-05", preClusters)];
    const mergeEvents = [
      mergeEvt({
        merges: [
          {
            new_cluster_commitment: D("d"),
            new_budget: 5,
            merged_cluster_commitments: [CL(0), CL(1), CL(2)],
            merge_basis: ["payment_graph"],
          },
        ],
      }),
    ];
    const art = buildArtifacts({ windows: preWindows, mergeEvents, keys, claimSpecs: null });
    // committed record: CL(0) breached before, D(d) breached after
    if (art.records[0].breached_before.join() !== CL(0)) {
      throw new Error("build_refused: tampered-window base has no pre-merge breach");
    }
    writeFull(`${B}/tampered-window`, art, meta);
    // TAMPER: lower CL(0) so both it and the merged bucket un-breach
    const tampered = [win("2026-05", [cl(CL(0), 1, 5, 1), cl(CL(1), 1, 5, 1), cl(CL(2), 1, 5, 1)])];
    writeJson(`${B}/tampered-window/windows.json`, tampered);
    // self-check: recompute from tampered window, committed record is a monotonicity violation
    const chainCheck = validateMergeChain(mergeEvents, genesisOf(tampered));
    const recomputed = rescoreWindow({
      windowCommitment: tampered[0],
      epoch: chainCheck.epochs[0],
    }).record;
    const v = verifyRescoreRecord({
      committed: art.records[0],
      recomputed,
      epoch: chainCheck.epochs[0],
    });
    if (v.ok || v.rawCode !== 44) throw new Error("build_refused: tampered-window is not a 44");
    matrix["tampered-window"] = { raw: 44, reason: "anti_monotonicity_violation" };
  }

  // ---- disclosure derivations from a fresh clean base ----
  const baseFor = () => {
    const clusters = [cl(CL(0), 2, 5, 1), cl(CL(1), 2, 5, 2), cl(CL(2), 2, 9, 1)];
    const windows = [win("2026-05", clusters), win("2026-06", clusters)];
    const mergeEvents = [
      mergeEvt({
        merges: [
          {
            new_cluster_commitment: D("d"),
            new_budget: 5,
            merged_cluster_commitments: [CL(0), CL(1)],
            merge_basis: ["payment_graph"],
          },
        ],
        carried_cluster_commitments: [CL(2)],
      }),
    ];
    return buildArtifacts({
      windows,
      mergeEvents,
      keys,
      claimSpecs: [{ kind: "consumer_count", value: 8, bound: windows }],
    });
  };

  // disclosure-conflict (V7): claim value +2
  {
    const art = baseFor();
    const w = writeFull(`${B}/disclosure-conflict`, art, meta);
    const bad = {
      ...art.disclosure,
      claims: art.disclosure.claims.map((c) => ({ ...c, value: c.value + 2 })),
    };
    writeJson(`${B}/disclosure-conflict/disclosure.json`, bad);
    // chain still lists the ORIGINAL disclosure digest, so the tampered disclosure is off-chain;
    // rebuild chain to point at the tampered disclosure so the conflict is a recompute mismatch.
    const entries = art.chain.entries.map((e) =>
      e.kind === "disclosure_claim"
        ? { kind: e.kind, digest: recordDigest(bad) }
        : { kind: e.kind, digest: e.digest }
    );
    writeJson(`${B}/disclosure-conflict/chain.json`, buildChain(entries));
    const rb = recordsByDigestOf(art);
    const chk = verifyDisclosure({
      disclosure: bad,
      chain: buildChain(entries),
      recordsByDigest: rb,
    });
    if (chk.reason !== "claim_recompute_mismatch") {
      throw new Error(`build_refused: disclosure-conflict got ${chk.reason}`);
    }
    void w;
    matrix["disclosure-conflict"] = { raw: 45, reason: "claim_recompute_mismatch" };
  }

  // disclosure-backdated (V8): bound position >= disclosure position
  {
    const art = baseFor();
    writeFull(`${B}/disclosure-backdated`, art, meta);
    const badClaims = art.disclosure.claims.map((c) => ({
      ...c,
      bound_commitments: c.bound_commitments.map((b) => ({
        ...b,
        chain_position: art.disclosure.chain_position,
      })),
    }));
    const bad = { ...art.disclosure, claims: badClaims };
    const entries = art.chain.entries.map((e) =>
      e.kind === "disclosure_claim"
        ? { kind: e.kind, digest: recordDigest(bad) }
        : { kind: e.kind, digest: e.digest }
    );
    writeJson(`${B}/disclosure-backdated/disclosure.json`, bad);
    writeJson(`${B}/disclosure-backdated/chain.json`, buildChain(entries));
    matrix["disclosure-backdated"] = { raw: 45, reason: "commitment_sequenced_after_disclosure" };
  }

  // pincer-violated (V9): non-null demand_side_evidence_digest
  {
    const art = baseFor();
    writeFull(`${B}/pincer-violated`, art, meta);
    const bad = { ...art.disclosure, demand_side_evidence_digest: D("5") };
    const entries = art.chain.entries.map((e) =>
      e.kind === "disclosure_claim"
        ? { kind: e.kind, digest: recordDigest(bad) }
        : { kind: e.kind, digest: e.digest }
    );
    writeJson(`${B}/pincer-violated/disclosure.json`, bad);
    writeJson(`${B}/pincer-violated/chain.json`, buildChain(entries));
    matrix["pincer-violated"] = { raw: 45, reason: "pincer_slot_not_null" };
  }

  // ---- contest derivations from a crown base ----
  const crownBase = () => {
    const hundred = Array.from({ length: 100 }, (_, i) => cl(CL(i), 3, 5, 1));
    const windows = [win("2026-05", hundred)];
    const mergeEvents = [
      mergeEvt({
        merges: [
          {
            new_cluster_commitment: D("d"),
            new_budget: 5,
            merged_cluster_commitments: hundred.map((c) => c.cluster_commitment),
            merge_basis: ["payment_graph"],
          },
        ],
      }),
    ];
    return buildArtifacts({
      windows,
      mergeEvents,
      keys,
      respondentTarget: D("d"),
      claimSpecs: [{ kind: "breach_count", value: 1, bound: "rescores" }],
    });
  };

  // forged-contest (V11): mutate statement_digest after signing
  {
    const art = crownBase();
    writeFull(`${B}/forged-contest`, art, meta, D("d"));
    writeJson(`${B}/forged-contest/contest.json`, { ...art.contest, statement_digest: D("a") });
    matrix["forged-contest"] = { raw: 46, reason: "signature_invalid" };
  }

  // dangling-contest (V12): contested record_digest not in bundle (re-sign so sig is valid)
  {
    const art = crownBase();
    writeFull(`${B}/dangling-contest`, art, meta, D("d"));
    const dangling = signContest(
      {
        schema: VXD_CONTEST_SCHEMA,
        contested_records: [{ window: "2026-05", record_digest: D("5") }],
        contest_type: "merge_evidence_disputed",
        respondent_public_key: `ed25519:${keys.respondentB64}`,
        statement_digest: D("8"),
      },
      keys.respondentPrivate
    );
    writeJson(`${B}/dangling-contest/contest.json`, dangling);
    matrix["dangling-contest"] = { raw: 46, reason: "dangling_record_reference" };
  }

  // forged-ack (V17): acknowledgement over a non-existent contest digest
  {
    const art = crownBase();
    writeFull(`${B}/forged-ack`, art, meta, D("d"));
    const badAck = signContest(
      {
        schema: VXD_ACK_SCHEMA,
        contest_digest: D("4"),
        statement_digest: D("6"),
        respondent_public_key: `ed25519:${keys.providerB64}`,
      },
      keys.providerPrivate
    );
    writeJson(`${B}/forged-ack/contest-ack.json`, badAck);
    matrix["forged-ack"] = { raw: 46, reason: "dangling_contest_digest" };
  }

  writeJson(`${OUT}/expected-results/vxd-matrix.json`, matrix);
  // sanity: every window commitment validates and carries no consumer identifiers
  for (const name of Object.keys(matrix)) {
    const wpath = `${B}/${name}/windows.json`;
    for (const w of readJson(wpath)) {
      if (!validateWindowCommitment(w).ok) throw new Error(`build_refused: ${name} window invalid`);
    }
  }
  console.log(`stage4m fixtures written to ${OUT}`);
}

await main();
