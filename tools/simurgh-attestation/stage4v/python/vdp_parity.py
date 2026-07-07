# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4V VDP decision-core parity (stdlib only). Motto: AnthropicSafe First, then ReviewerSafe.
#
# Reproduces the PUBLIC-TIER contest evaluation: 4T capsule pre-verify (via vic_parity,
# public tier — no 134/146) -> 151 schema -> 153/154 binding -> 155..158 census ->
# 159 payload -> conflict map -> 160 compare, plus the contest outcome envelope.
# Excludes 152 (Ed25519 signature) and the signature/subpoena fixtures — Node is
# authoritative for raw 152 (signed non-claim).
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "stage4t", "python"))
import vic_parity  # noqa: E402

TEMPLATE_REGIMES = ["gpai_art55", "art73_high_risk_draft"]
ABSENCE = {"not_derivable", "requires_human_input"}
RAW_CONTENT_KEYS = {
    "judgment_text", "raw_prose", "provider_notes", "operator_summary",
    "prompt", "transcript", "note", "text", "body",
}
KIND_EVIDENCE_SOURCE = {
    "stage4s_chain_verdict": "stage4s_chain_bundle",
    "kernel_block_record": "kernel_decision_records",
    "epoch_range": "stage4s_chain_bundle",
    "participant_count": "stage4s_chain_bundle",
    "consent_manifest_scope": "stage4o_consent_manifests",
    "stage4u_asr": "stage4u_attestation_ref",
    "stage4n_beat_index": "stage4n_temporal_anchor",
}
PARTITIONS = vic_parity.PARTITIONS
VDP_OUTCOME_SCHEMA = "simurgh.vdp.contest_outcome.v1"
VDP_CONFLICT_MAP_SCHEMA = "simurgh.vdp.conflict_map.v1"
VDP_COUNTER_CAPSULE_SCHEMA = "simurgh.vdp.counter_capsule.v1"
ANCHOR_KEY = "meta/evidence_anchored_at_beat"


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(value):
    return "sha256:" + hashlib.sha256(canonical_json(value).encode()).hexdigest()


def merkle_root_sorted(digests):
    return vic_parity.merkle_root_sorted(digests)


def recompute(kind, artifact):
    if kind == "epoch_range":
        return artifact["range"]
    if kind == "participant_count":
        return len(artifact.get("participants", []))
    if kind == "kernel_block_record":
        return len([d for d in artifact.get("decisions", []) if d["decision"] == "blocked"])
    if kind == "stage4s_chain_verdict":
        return artifact["recorded_verdict"]
    if kind == "consent_manifest_scope":
        return artifact["scope"]
    if kind == "stage4u_asr":
        return artifact["attack_success_rate"]
    if kind == "stage4n_beat_index":
        return artifact["beat_index"]
    return None


def artifacts_index(cc):
    return {record_digest(a): a for a in cc.get("respondent_evidence_artifacts", [])}


def contest_tuples(cc):
    out = [{"regime": c["regime"], "section_id": c["section_id"]} for c in cc.get("contests", [])]
    if cc.get("anchor_contest"):
        out.append({"regime": "meta", "section_id": "evidence_anchored_at_beat"})
    return out


def contested_section_set_digest(tuples):
    ordered = sorted(tuples, key=lambda t: json.dumps([t["regime"], t["section_id"]]))
    return record_digest(ordered)


def key_string(t):
    return t["regime"] + "/" + t["section_id"]


def derive_section_status(contest, cls, operator_value, artifacts):
    if cls is None:
        return {"status": "DISPUTE_FAILED", "subreason": "section_not_contestable"}
    if contest["verb"] == "dispute_as_judgment":
        return {"status": "DISPUTE_RECORDED"}
    if contest["verb"] == "agree" and cls in ABSENCE:
        return {"status": "DISPUTE_FAILED", "subreason": "section_not_contestable"}
    artifact = artifacts.get(contest.get("evidence_digest"))
    expected_kind = KIND_EVIDENCE_SOURCE.get(contest.get("recompute_kind"))
    kind_ok = artifact is not None and expected_kind is not None and artifact.get("kind") == expected_kind
    if not kind_ok:
        return {"status": "DISPUTE_FAILED", "subreason": "recompute_failed"}
    recomputed = recompute(contest["recompute_kind"], artifact)
    if contest["verb"] == "agree":
        if canonical_json(recomputed) == canonical_json(operator_value):
            return {"status": "AGREED", "respondent_value": recomputed}
        return {"status": "DISPUTE_FAILED", "subreason": "recompute_failed"}
    if canonical_json(recomputed) != canonical_json(contest["claimed_value"]):
        return {"status": "DISPUTE_FAILED", "subreason": "recompute_failed"}
    if cls in ABSENCE:
        return {"status": "ABSENCE_REBUTTED", "respondent_value": contest["claimed_value"]}
    if canonical_json(contest["claimed_value"]) == canonical_json(operator_value):
        return {"status": "AGREED", "respondent_value": contest["claimed_value"]}
    return {"status": "CONFLICT_PROVEN", "respondent_value": contest["claimed_value"]}


def derive_conflict_map(capsule_bundle, cc):
    capsule = capsule_bundle["content"]
    artifacts = artifacts_index(cc)
    op_by_key = {p["regime"] + "/" + p["section_id"]: p for p in capsule.get("projected_sections", [])}
    sections = []
    for contest in cc.get("contests", []):
        key = key_string(contest)
        cls = PARTITIONS.get(contest["regime"], {}).get(contest["section_id"])
        op = op_by_key.get(key)
        derived = derive_section_status(contest, cls, op.get("value") if op else None, artifacts)
        entry = {"key": key, "verb": contest["verb"], "operator_class": cls if cls is not None else None}
        if op is not None and "value" in op:
            entry["operator_value"] = op["value"]
        entry.update(derived)
        sections.append(entry)

    anchor_status = None
    if cc.get("anchor_contest"):
        s = derive_section_status(
            cc["anchor_contest"], "evidence_backed",
            capsule.get("evidence_anchored_at_beat", {}).get("value"), artifacts,
        )
        anchor_status = {"key": ANCHOR_KEY}
        anchor_status.update(s)

    contested = {key_string(t) for t in contest_tuples(cc)}
    uncontested = sorted(
        k for r in PARTITIONS for k in [r + "/" + s for s in PARTITIONS[r]] if k not in contested
    )
    rescore = [
        {"key": s["key"], "note": "review_signal_not_automatic_rewrite"}
        for s in sections
        if s["status"] == "ABSENCE_REBUTTED"
    ]
    out = {
        "schema": VDP_CONFLICT_MAP_SCHEMA,
        "binding": cc.get("binding"),
        "respondent_role": cc.get("respondent_role"),
        "sections": sections,
    }
    if anchor_status is not None:
        out["anchor_status"] = anchor_status
    out["uncontested_sections"] = uncontested
    out["partition_rescore_signals"] = rescore
    return out


VDP_VERBS = ["agree", "dispute_by_recomputation", "dispute_as_judgment"]
RESPONDENT_ROLES = ["provider", "deployer", "third_party", "unspecified"]
TOP_LEVEL_KEYS = {
    "schema", "respondent_role", "binding", "contests", "anchor_contest", "filed_at_beat",
    "respondent_census", "respondent_evidence_artifacts", "non_claims", "respondent_key_digest",
    "signature",
}
RECOMPUTE_CONTEST_KEYS = {"regime", "section_id", "verb", "claimed_value", "recompute_kind", "evidence_digest"}
JUDGMENT_CONTEST_KEYS = {"regime", "section_id", "verb", "judgment_text_digest"}
DIGEST_RE = __import__("re").compile(r"^sha256:[0-9a-f]{64}$")


def contest_shape_error(c):
    if not isinstance(c, dict):
        return 151
    if c.get("verb") not in VDP_VERBS:
        return 151
    if (not isinstance(c.get("regime"), str) or not isinstance(c.get("section_id"), str)
            or not c["regime"] or not c["section_id"] or "/" in c["regime"] or "/" in c["section_id"]):
        return 151
    allowed = JUDGMENT_CONTEST_KEYS if c["verb"] == "dispute_as_judgment" else RECOMPUTE_CONTEST_KEYS
    for k in c:
        if k in RAW_CONTENT_KEYS:
            continue
        if k not in allowed:
            return 151
    if c["verb"] != "dispute_as_judgment":
        if c.get("claimed_value") is None or not isinstance(c.get("recompute_kind"), str) \
                or not DIGEST_RE.match(c.get("evidence_digest") or ""):
            return 151
    return None


def schema_check(cc):
    if not isinstance(cc, dict) or cc.get("schema") != VDP_COUNTER_CAPSULE_SCHEMA:
        return 151
    for k in cc:
        if k in RAW_CONTENT_KEYS:
            continue
        if k not in TOP_LEVEL_KEYS:
            return 151
    if cc.get("respondent_role") not in RESPONDENT_ROLES:
        return 151
    if not isinstance(cc.get("contests"), list) or len(cc["contests"]) == 0:
        return 151
    group = list(cc["contests"])
    if cc.get("anchor_contest"):
        group.append(cc["anchor_contest"])
    if cc.get("filed_at_beat"):
        group.append(cc["filed_at_beat"])
    for c in group:
        e = contest_shape_error(c)
        if e:
            return e
    if not isinstance(cc.get("respondent_census", {}).get("items"), list):
        return 151
    return None


def binding_check(cc, capsule_bundle):
    tuples = contest_tuples(cc)
    b = cc.get("binding") or {}
    exp = {
        "capsule_root": capsule_bundle["content"]["capsule_root"],
        "attestation_digest": capsule_bundle["attestation_digest"],
        "capsule_schema_version": "simurgh.vic.capsule.v1",
        "capsule_signing_key_fingerprint": b.get("capsule_signing_key_fingerprint"),
    }
    # fingerprint is a public-key digest; the parity lane does not recompute keys, so it
    # trusts the presented fingerprint (Node is authoritative for signature-bound checks).
    for f in ["capsule_root", "attestation_digest", "capsule_schema_version"]:
        if b.get(f) != exp[f]:
            return 153
    keys = [key_string(t) for t in tuples]
    if len(set(keys)) != len(keys):
        return 154
    if b.get("contested_section_set_digest") != contested_section_set_digest(tuples):
        return 154
    return None


def census_check(cc, capsule_epoch):
    manifest = cc.get("respondent_census", {})
    by_digest = artifacts_index(cc)
    for item in manifest.get("items", []):
        art = by_digest.get(item["digest"])
        if art is None or record_digest(art) != item["digest"]:
            return 155
    listed = {i["digest"] for i in manifest.get("items", [])}
    for d in by_digest:
        if d not in listed:
            return 156
    roots = merkle_root_sorted([record_digest(i) for i in manifest.get("items", [])])
    if roots != manifest.get("census_root"):
        return 157
    for item in manifest.get("items", []):
        if item["epoch"] != capsule_epoch:
            return 158
    refs = set()
    for c in list(cc.get("contests", [])) + \
            ([cc["anchor_contest"]] if cc.get("anchor_contest") else []) + \
            ([cc["filed_at_beat"]] if cc.get("filed_at_beat") else []):
        if isinstance(c.get("evidence_digest"), str):
            refs.add(c["evidence_digest"])
    for d in refs:
        if d not in listed:
            return 156
    return None


def payload_check(cc):
    for k in cc:
        if k in RAW_CONTENT_KEYS:
            return 159
    group = list(cc.get("contests", []))
    if cc.get("anchor_contest"):
        group.append(cc["anchor_contest"])
    if cc.get("filed_at_beat"):
        group.append(cc["filed_at_beat"])
    for c in group:
        for k in c:
            if k in RAW_CONTENT_KEYS:
                return 159
        if c["verb"] == "dispute_as_judgment" and not DIGEST_RE.match(c.get("judgment_text_digest") or ""):
            return 159
    return None


def evaluate_contest(capsule_bundle, cc, expected_conflict_map=None):
    reverify = vic_parity.evaluate_capsule(capsule_bundle)
    envelope_base = {
        "schema": VDP_OUTCOME_SCHEMA,
        "capsule_reverify_result": reverify,
        "filed_at_beat_status": "not_supplied",
    }
    if reverify != 0:
        env = dict(envelope_base)
        env["result"] = {"refused": True, "raw": reverify}
        return reverify, env

    for raw in [schema_check(cc), binding_check(cc, capsule_bundle),
                census_check(cc, capsule_bundle["content"]["epoch"]), payload_check(cc)]:
        if raw:
            env = dict(envelope_base)
            env["result"] = {"refused": True, "raw": raw}
            return raw, env

    m = derive_conflict_map(capsule_bundle, cc)
    if expected_conflict_map is not None and record_digest(expected_conflict_map) != record_digest(m):
        env = dict(envelope_base)
        env["result"] = {"refused": True, "raw": 160}
        return 160, env

    filed = "not_supplied"
    if cc.get("filed_at_beat"):
        s = derive_section_status(
            cc["filed_at_beat"], "evidence_backed",
            cc["filed_at_beat"].get("claimed_value"), artifacts_index(cc),
        )
        filed = "VERIFIED" if s["status"] == "AGREED" else "FAILED"
    env = dict(envelope_base)
    env["filed_at_beat_status"] = filed
    env["result"] = m
    return 0, env


if __name__ == "__main__":
    doc = json.load(open(sys.argv[1]))
    excluded = {"signature-invalid", "subpoena-capsule-tampered"}
    ref = doc["reference_capsule_bundle"]
    out = []
    for case in doc["cases"]:
        if case["name"] in excluded:
            continue
        bundle = case.get("capsule_override", ref)
        exp_map = (case.get("eval_opts") or {}).get("expectedConflictMap")
        raw, env = evaluate_contest(bundle, case["counter_capsule"], exp_map)
        out.append({"name": case["name"], "raw": raw, "envelope_digest": record_digest(env)})
    print(json.dumps(out))
