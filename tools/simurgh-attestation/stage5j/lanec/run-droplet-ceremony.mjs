// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C independent-party ceremony runner (for the droplet team). Generates ALL keys
// with YOUR entropy, builds a raw-0 5I coverage bundle over the REAL Claude Opus 4.6 Sabotage Risk
// Report PUBLIC structure, then a full VRC rating-contest bundle on top (ratings, contest events,
// responses, one concurrence, one rebuttal), self-verifies raw 0 (public + audit) under our verifier,
// and writes a VERIFY-ONLY pack. We ingest without your private keys — your verifier key is DISTINCT
// from ours, which is the point. This is over the PUBLIC structure only: NOT rsp compliance, does not
// observe the confidential report or Anthropic's real panel, and the ratings are the droplet party's
// own independent assessments (not attributed to METR or Anthropic).
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname, isAbsolute } from "node:path";
import { fingerprint, signContent } from "../core/signatures.mjs";
import { domainDigest, artifactDigest, canonicalJson } from "../core/digests.mjs";
import { DOMAINS } from "../constants.mjs";
import { computeProjections, projectionRoot } from "../core/projections.mjs";
import { contestLayerRoot } from "../core/roots.mjs";
import { verifyVrc } from "../node/adapter.mjs";
import { buildSignedBundle as vpcBuild } from "../../stage5i/node/buildSignedBundle.mjs";
import { derivePartition } from "../../stage5i/lanec/build-real-coverage.mjs";

function key(subject) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

const SCALE_CONTENT = {
  rating_scale_id: "vrc-sev-5",
  rating_scale_version: "1",
  severity_direction: "higher_is_more_severe",
  ordinal_ranks: { none: 0, low: 1, medium: 2, high: 3, critical: 4 },
  comparable_dimensions: ["overall_risk"],
};
const DIM = "overall_risk";

export function runVrcDropletCeremony() {
  // 5I-shape keys for the embedded coverage bundle + VRC-specific ledger/scale/verifier keys.
  const keys5i = {
    producer: key("droplet-evidence-producer"),
    grantIssuer: key("droplet-panel-coordinator"),
    affIssuer: key("droplet-affiliation-authority"),
    verifier: key("droplet-5i-verifier"),
    reviewers: [key("droplet-reviewer-A"), key("droplet-reviewer-B")],
  };
  const hostA = key("droplet-reviewer-A-host");
  const hostB = key("droplet-reviewer-B-host");
  const ledger = key("droplet-vrc-ledger-authority");
  const scale = key("droplet-vrc-scale-authority");
  const vrcVerifier = key("droplet-vrc-verifier");

  // 1. Real Opus 4.6 public structure → a raw-0 5I coverage bundle.
  const pc = derivePartition();
  const sections = pc.sections;
  const ids = sections.map((s) => s.section_id);
  const mid = Math.ceil(ids.length / 2);
  const panel = [
    {
      i: 0,
      hostFp: hostA.id.key_fingerprint,
      lineage: "sha256:droplet-lineage-A",
      sec: ids.slice(0, mid + 1),
    },
    {
      i: 1,
      hostFp: hostB.id.key_fingerprint,
      lineage: "sha256:droplet-lineage-B",
      sec: ids.slice(mid - 1),
    },
  ];
  const { bundle: vpc_bundle, external_config: vpc_external_config } = vpcBuild(keys5i, {
    sections,
    panel,
    campaign_id: "vrc-lanec-droplet-opus46",
  });

  // 2. Derive S, C(r), producer identity from the verified 5I bundle.
  const att = vpc_bundle.attestation.content;
  const producer = vpc_bundle.partition.content.producer_principal;
  const S = vpc_bundle.partition.content.sections.map((s) =>
    typeof s === "string" ? s : s.section_id
  );
  const cov = vpc_bundle.coverage_receipts.map((c) => ({
    id: c.content.reviewer_principal.key_fingerprint,
    sections: c.content.evaluated_sections,
  }));
  const RA = cov[0].id;
  const RB = cov[1].id;
  const reviewerPriv = {
    [RA]: keys5i.reviewers[0].privatePem,
    [RB]: keys5i.reviewers[1].privatePem,
  };
  const covOf = { [RA]: new Set(cov[0].sections), [RB]: new Set(cov[1].sections) };

  const scaleDigest = domainDigest(DOMAINS.scale, SCALE_CONTENT);
  const rating_scale = {
    content: SCALE_CONTENT,
    scale_authority: scale.id.key_fingerprint,
    signature: signContent(scale.privatePem, DOMAINS.scale, SCALE_CONTENT),
  };

  // Ledger-sequenced epoch tickets.
  let epoch = 0;
  let prevTicket = null;
  const epoch_tickets = [];
  const ticket = (entry_type, entry_digest) => {
    epoch += 1;
    const content = {
      ledger_epoch: epoch,
      previous_epoch_ticket_digest: prevTicket,
      entry_type,
      entry_digest,
      ledger_id: "vrc-droplet-ledger",
    };
    const epoch_ticket_digest = domainDigest(DOMAINS.epoch_ticket, content);
    epoch_tickets.push({
      content,
      epoch_ticket_digest,
      signature: signContent(ledger.privatePem, DOMAINS.epoch_ticket, content),
    });
    prevTicket = epoch_ticket_digest;
  };

  const mkEntry = (domain, privatePem, chain_subject, base) => {
    const content = {
      chain_subject,
      revision: 0,
      supersedes_digest: null,
      rating_scale_digest: scaleDigest,
      dimension_id: DIM,
      ledger_epoch: epoch + 1,
      ...base,
    };
    const entry_digest = domainDigest(domain, content);
    ticket(
      domain === DOMAINS.reviewer_rating ? "reviewer_rating" : "producer_rating",
      entry_digest
    );
    return { content, entry_digest, signature: signContent(privatePem, domain, content) };
  };

  // Deterministic plan: producer rates every section "low"; reviewers rate covered sections "low"
  // (uncontested) except designated divergent/abstain pairs. Divergent = producer(low) < reviewer(high).
  const RAonly = ids.slice(0, mid - 1);
  const RBonly = ids.slice(mid + 1);
  const divA = RAonly[2]; // → concurrence
  const divA2 = RAonly[4]; // → response only
  const divB = RBonly[2]; // → rebuttal
  const abstainSec = RBonly[3]; // → non_comparable
  const divergent = new Map([
    [`${divA}:${RA}`, true],
    [`${divA2}:${RA}`, true],
    [`${divB}:${RB}`, true],
  ]);

  const producer_ratings = S.map((s) =>
    mkEntry(DOMAINS.producer_rating, keys5i.producer.privatePem, `producer:${s}`, {
      section_id: s,
      value_kind: "ordinal",
      value: "low",
    })
  );
  const prodBy = Object.fromEntries(producer_ratings.map((e) => [e.content.section_id, e]));

  const reviewer_ratings = [];
  for (const [rid, secs] of Object.entries(covOf)) {
    for (const s of secs) {
      const pairKey = `${s}:${rid}`;
      const abstain = s === abstainSec && rid === RB;
      const base = abstain
        ? { section_id: s, reviewer_id: rid, value_kind: "not_assessed" }
        : {
            section_id: s,
            reviewer_id: rid,
            value_kind: "ordinal",
            value: divergent.has(pairKey) ? "high" : "low",
          };
      reviewer_ratings.push(
        mkEntry(DOMAINS.reviewer_rating, reviewerPriv[rid], `reviewer:${s}:${rid}`, base)
      );
    }
  }
  const revBy = (s, r) =>
    reviewer_ratings.find((e) => e.content.section_id === s && e.content.reviewer_id === r);

  const mkContest = (s, r) => {
    const content = {
      section_id: s,
      reviewer_id: r,
      producer_rating_digest: prodBy[s].entry_digest,
      reviewer_rating_digest: revBy(s, r).entry_digest,
      rating_scale_digest: scaleDigest,
      ledger_epoch: epoch + 1,
    };
    const contest_event_digest = domainDigest(DOMAINS.contest_event, content);
    ticket("contest_event", contest_event_digest);
    return { content, contest_event_digest };
  };
  const ceA = mkContest(divA, RA);
  const ceA2 = mkContest(divA2, RA);
  const ceB = mkContest(divB, RB);
  const contest_history = [ceA, ceA2, ceB];

  const mkResponse = (ce) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      response_body_digest: domainDigest(DOMAINS.producer_response, { s: ce.content.section_id }),
      ledger_epoch: epoch + 1,
    };
    const response_digest = domainDigest(DOMAINS.producer_response, content);
    ticket("producer_response", response_digest);
    return {
      content,
      response_digest,
      signature: signContent(keys5i.producer.privatePem, DOMAINS.producer_response, content),
    };
  };
  const producer_responses = [mkResponse(ceA), mkResponse(ceA2), mkResponse(ceB)];

  const mkConc = (ce, r) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      reviewer_id: r,
      concurrence_claim: "accepts_producer_response",
      concurrence_epoch: epoch + 1,
    };
    const concurrence_digest = domainDigest(DOMAINS.concurrence, content);
    ticket("concurrence", concurrence_digest);
    return {
      content,
      concurrence_digest,
      signature: signContent(reviewerPriv[r], DOMAINS.concurrence, content),
    };
  };
  const concurrences = [mkConc(ceA, RA)];

  const mkReb = (ce, r) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      reviewer_id: r,
      rebuttal_claim: "maintains_dissent",
      rebuttal_epoch: epoch + 1,
    };
    const rebuttal_digest = domainDigest(DOMAINS.rebuttal, content);
    ticket("rebuttal", rebuttal_digest);
    return {
      content,
      rebuttal_digest,
      signature: signContent(reviewerPriv[r], DOMAINS.rebuttal, content),
    };
  };
  const reviewer_rebuttals = [mkReb(ceB, RB)];

  const projections = computeProjections({
    rating_scale: { content: SCALE_CONTENT },
    producer_ratings,
    reviewer_ratings,
    contest_history,
    concurrences,
  });
  projections.projection_root = projectionRoot(projections);

  const required_reviewer_pairs = [];
  for (const [rid, secs] of Object.entries(covOf))
    for (const s of secs) required_reviewer_pairs.push(`${s}:${rid}`);
  const rating_obligation_root = artifactDigest({
    required_reviewer_pairs: required_reviewer_pairs.sort(),
    required_producer_sections: [...S].sort(),
  });

  const bundle = {
    schema_version: "vrc.v1",
    vpc_ref: {
      vpc_bundle_digest: artifactDigest(att),
      panel_subject_root: att.panel_subject_root,
      panel_evidence_root: att.panel_evidence_root,
      partition_digest: att.partition_digest,
    },
    producer_ref: {
      producer_identity_digest: producer.producer_identity_digest,
      producer_key_fingerprint: producer.key_fingerprint,
    },
    ledger_authority: ledger.id.key_fingerprint,
    rating_scale,
    rating_obligation_root,
    epoch_tickets,
    reviewer_ratings,
    producer_ratings,
    contest_history,
    producer_responses,
    concurrences,
    reviewer_rebuttals,
    projections,
    external_registry_anchor: null,
    universe_commitment_anchor: null,
    review_window_binding: null,
    campaign_composition_root: null,
  };
  const cfg = {
    policy: { profile_id: "vrc-test-v1", min_reviewers: 1, require_two_sided_equality: true },
    verifier_key_pin: { key_fingerprint: vrcVerifier.id.key_fingerprint },
    vpc_bundle,
    vpc_external_config,
    key_registry: {
      [producer.key_fingerprint]: keys5i.producer.id.public_key_pem,
      [RA]: keys5i.reviewers[0].id.public_key_pem,
      [RB]: keys5i.reviewers[1].id.public_key_pem,
      [ledger.id.key_fingerprint]: ledger.id.public_key_pem,
      [scale.id.key_fingerprint]: scale.id.public_key_pem,
      [vrcVerifier.id.key_fingerprint]: vrcVerifier.id.public_key_pem,
    },
  };

  const pub = verifyVrc(bundle, cfg, { tier: "public" });
  const aud = verifyVrc(bundle, cfg, { tier: "audit" });
  return {
    bundle,
    cfg,
    pub,
    aud,
    sections: S.length,
    verifierFp: vrcVerifier.id.key_fingerprint,
    divergences: contest_history.length,
    contestLayerRoot: contestLayerRoot(bundle),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const outArg = argv.includes("--out")
    ? argv[argv.indexOf("--out") + 1]
    : "stage5j-droplet-output";
  const outDir = isAbsolute(outArg) ? outArg : join(process.cwd(), outArg);
  const { bundle, cfg, pub, aud, sections, verifierFp, divergences, contestLayerRoot } =
    runVrcDropletCeremony();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "bundle.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(outDir, "external-config.json"), canonicalJson(cfg) + "\n");
  // The digest to (optionally) anchor for the externally_anchored rung — see README "true 9.5" section.
  writeFileSync(join(outDir, "ANCHOR_ME.txt"), contestLayerRoot + "\n");
  const result = {
    public_raw: pub.raw,
    audit_raw: aud.raw,
    sections_total: sections,
    reviewer_pairs: bundle.reviewer_ratings.length,
    divergences,
    verifier_key_fingerprint: verifierFp,
    contest_layer_root: contestLayerRoot,
    independence_rung: "distinct_key_only",
    note: "Independent-party VRC rating-contest ceremony over the Opus 4.6 PUBLIC structure. NOT rsp compliance; ratings are the droplet party's own independent assessments (not METR/Anthropic); does not observe the confidential report. For the externally_anchored rung, anchor contest_layer_root with cosign (see README).",
  };
  writeFileSync(join(outDir, "ceremony-result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(
    `VRC Lane C ceremony: public=${pub.raw} audit=${aud.raw} sections=${sections} divergences=${divergences} verifier=${verifierFp.slice(0, 20)}… rung=distinct_key_only`
  );
  if (pub.raw !== 0 || aud.raw !== 0) {
    console.error(
      `CEREMONY DID NOT VERIFY (public=${pub.raw} audit=${aud.raw}) — send ceremony-result.json and report this.`
    );
    process.exit(1);
  }
  console.log(
    `Wrote ${outDir}/{bundle.json,external-config.json,ceremony-result.json}. Send those THREE files back (NEVER any *.pem).`
  );
}
