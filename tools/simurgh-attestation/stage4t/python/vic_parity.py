# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4T VIC decision-core parity (stdlib only). Motto: AnthropicSafe First, then ReviewerSafe.
#
# Reproduces the VIC frozen check order for the NON-SIGNATURE, NON-ENGINE-RERUN
# layers (public-tier semantics):
#   133 schema (non-signature parts) -> 135/136/137 template -> 138/139/140/145 census
#   -> 141/142 projection -> 143/144 suppression -> 147 seal -> 148/149 views
# Code 134 (Ed25519 signature) and 146 (cross-stage engine rerun) are out of scope
# here and excluded from the parity set, exactly as JS public-tier evaluation treats them.
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(HERE, "..", "template")

TEMPLATE_REGIMES = ["gpai_art55", "art73_high_risk_draft"]
PARTITION_CLASSES = ["evidence_backed", "not_derivable", "requires_human_input"]
RECOMPUTE_KINDS = [
    "stage4s_chain_verdict",
    "kernel_block_record",
    "epoch_range",
    "participant_count",
    "consent_manifest_scope",
    "stage4u_asr",
    "stage4n_beat_index",
]

PARTITIONS = {
    "gpai_art55": {
        "incident_dates": "evidence_backed",
        "resulting_harm": "requires_human_input",
        "chain_of_events": "evidence_backed",
        "model_involved": "requires_human_input",
        "evidence_available": "not_derivable",
        "serious_incident_response": "evidence_backed",
        "recommendation": "requires_human_input",
        "root_cause_analysis": "requires_human_input",
        "post_market_monitoring_patterns": "not_derivable",
        "submitter_information": "requires_human_input",
    },
    "art73_high_risk_draft": {
        "admin_authority": "requires_human_input",
        "report_dates_classification": "evidence_backed",
        "submitter_information": "requires_human_input",
        "system_categorisation": "requires_human_input",
        "system_description": "requires_human_input",
        "incident_nature": "requires_human_input",
        "users_affected": "evidence_backed",
        "remedial_actions": "evidence_backed",
        "initial_reporter": "requires_human_input",
        "provider_preliminary_comments": "requires_human_input",
        "cause_investigation": "requires_human_input",
        "general_comments": "not_derivable",
    },
}
PARTITION_RECOMPUTE_KIND = {
    "gpai_art55": {
        "incident_dates": "epoch_range",
        "chain_of_events": "stage4s_chain_verdict",
        "serious_incident_response": "kernel_block_record",
    },
    "art73_high_risk_draft": {
        "report_dates_classification": "epoch_range",
        "users_affected": "participant_count",
        "remedial_actions": "kernel_block_record",
    },
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
NON_CLAIMS = [
    "not_a_legal_compliance_certification",
    "not_a_serious_incident_classification",
    "not_a_harm_causation_finding",
    "not_a_legal_filing_or_submission",
    "not_a_cross_run_or_fleet_completeness_claim",
    "not_pricing_or_actuarial_advice",
    "not_a_claim_the_incident_was_prevented_by_this_stage",
]

VIC_CAPSULE_SCHEMA = "simurgh.vic.capsule.v1"
VIC_CAPSULE_BUNDLE_SCHEMA = "simurgh.vic.capsule_bundle.v1"


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(value):
    return "sha256:" + hashlib.sha256(canonical_json(value).encode()).hexdigest()


def sha256_hex(s):
    return hashlib.sha256(s.encode()).hexdigest()


def merkle_root_sorted(digests):
    if not digests:
        return "sha256:" + sha256_hex("vxd-empty")
    level = sorted(digests)
    while len(level) > 1:
        nxt = []
        i = 0
        while i < len(level):
            if i + 1 == len(level):
                nxt.append(level[i])
            else:
                nxt.append("sha256:" + sha256_hex(level[i] + "|" + level[i + 1]))
            i += 2
        level = nxt
    return level[0]


def load_templates():
    files = {
        "gpai_art55": "gpai-art55-template.snapshot.json",
        "art73_high_risk_draft": "art73-draft-template.snapshot.json",
    }
    out = {}
    for regime, fn in files.items():
        with open(os.path.join(TEMPLATE_DIR, fn)) as f:
            out[regime] = json.load(f)
    return out


def section_commitment(section, salt):
    return record_digest({"salt": salt, "section": section})


def recompute(kind, artifact):
    if kind == "epoch_range":
        return artifact["range"]
    if kind == "participant_count":
        return len(artifact.get("participants", []))
    if kind == "kernel_block_record":
        return len([d for d in artifact.get("decisions", []) if d["decision"] == "blocked"])
    if kind == "stage4s_chain_verdict":  # public-tier: read the recorded verdict
        return artifact["recorded_verdict"]
    if kind == "consent_manifest_scope":
        return artifact["scope"]
    if kind == "stage4u_asr":
        return artifact["attack_success_rate"]
    if kind == "stage4n_beat_index":
        return artifact["beat_index"]
    raise ValueError("unknown kind")


def evaluate_capsule(bundle, eval_opts=None):
    eval_opts = eval_opts or {}
    partitions = eval_opts.get("partitions", PARTITIONS)
    templates = load_templates()

    # ---- 133 schema (non-signature parts) ----
    if not isinstance(bundle, dict) or bundle.get("schema") != VIC_CAPSULE_BUNDLE_SCHEMA:
        return 133
    c = bundle.get("content")
    if not isinstance(c, dict) or c.get("schema") != VIC_CAPSULE_SCHEMA:
        return 133
    bindings = c.get("template_bindings", [])
    if len(bindings) != len(TEMPLATE_REGIMES):
        return 133
    if len({b["regime"] for b in bindings}) != len(TEMPLATE_REGIMES):
        return 133
    for b in bindings:
        if b["regime"] not in TEMPLATE_REGIMES:
            return 133
    for s in c.get("projected_sections", []):
        if s["regime"] not in TEMPLATE_REGIMES:
            return 133
        if s.get("class") == "evidence_backed" and s.get("recompute_kind") not in RECOMPUTE_KINDS:
            return 133
    if not isinstance(c.get("evidence_manifest", {}).get("items"), list):
        return 133
    if c.get("non_claims") != NON_CLAIMS:
        return 133

    # ---- 135/136/137 template pinning ----
    for regime in TEMPLATE_REGIMES:
        binding = next((b for b in bindings if b["regime"] == regime), None)
        snap = templates[regime]
        if (
            binding is None
            or binding["template_snapshot_digest"] != record_digest(snap)
            or binding["partition_digest"] != record_digest(partitions[regime])
        ):
            return 135
        snap_ids = {s["section_id"] for s in snap["sections"]}
        part_ids = set(partitions[regime].keys())
        if snap_ids != part_ids:
            return 136
        for s in snap["sections"]:
            if partitions[regime][s["section_id"]] not in PARTITION_CLASSES:
                return 136
        for p in c.get("projected_sections", []):
            if p["regime"] == regime and p["section_id"] not in snap_ids:
                return 137

    # ---- 138/139/140/145 census ----
    artifacts = c.get("evidence_artifacts", [])
    by_digest = {record_digest(a): a for a in artifacts}
    manifest = c["evidence_manifest"]
    for item in manifest["items"]:
        art = by_digest.get(item["digest"])
        if art is None or record_digest(art) != item["digest"]:
            return 138
    listed = {i["digest"] for i in manifest["items"]}
    for d in by_digest:
        if d not in listed:
            return 139
    if merkle_root_sorted([record_digest(i) for i in manifest["items"]]) != manifest["census_root"]:
        return 140
    for item in manifest["items"]:
        if item["epoch"] != c["epoch"]:
            return 145

    # ---- (146 cross-stage: out of scope for public-tier parity) ----

    # ---- 141/142 projection ----
    def check_field(field):
        art = by_digest.get(field.get("evidence_digest"))
        if art is None:
            return 141
        rec = recompute(field["recompute_kind"], art)
        if canonical_json(rec) != canonical_json(field["value"]):
            return 142
        return None

    for ps in c.get("projected_sections", []):
        if ps.get("class") != "evidence_backed":
            continue
        r = check_field(ps)
        if r:
            return r
    if c.get("evidence_anchored_at_beat"):
        r = check_field(c["evidence_anchored_at_beat"])
        if r:
            return r

    # ---- 143/144 suppression ----
    present_kinds = {i["kind"] for i in manifest["items"]}
    projected_by_key = {f"{p['regime']}/{p['section_id']}": p for p in c.get("projected_sections", [])}
    for regime in partitions:
        for section_id, cls in partitions[regime].items():
            if cls != "evidence_backed":
                continue
            projected = projected_by_key.get(f"{regime}/{section_id}")
            if not projected:
                continue
            source_kind = KIND_EVIDENCE_SOURCE[PARTITION_RECOMPUTE_KIND[regime][section_id]]
            if source_kind not in present_kinds:
                continue
            if projected.get("class") == "not_derivable":
                return 143
            if projected.get("class") == "requires_human_input":
                return 144

    # ---- 147 seal ----
    reseal = record_digest(
        {"schema": bundle["schema"], "content": json.loads(canonical_json(bundle["content"]))}
    )
    if bundle.get("attestation_digest") != reseal:
        return 147

    # ---- 148/149 views ----
    commitments = [
        {"key": f"{s['regime']}/{s['section_id']}", "commitment": None}
        for s in c.get("projected_sections", [])
    ]
    # commitments require salts (from section_commitments carried in the capsule)
    commit_by_key = {sc["key"]: sc["commitment"] for sc in c.get("section_commitments", [])}
    for view in eval_opts.get("views", []):
        root = merkle_root_sorted([sc["commitment"] for sc in c.get("section_commitments", [])])
        if view["capsule_root"] != root:
            return 148
        for d in view["disclosed"]:
            expected = commit_by_key.get(d["key"])
            if expected is None or section_commitment(d["section"], d["salt"]) != expected:
                return 148
        covered = {d["key"] for d in view["disclosed"]} | set(view["redactions"]["keys"])
        if covered != set(commit_by_key.keys()):
            return 149
        if view["redactions"]["count"] != len(view["redactions"]["keys"]):
            return 149
        for i, key in enumerate(view["redactions"]["keys"]):
            if view["redactions"]["commitments"][i] != commit_by_key.get(key):
                return 149

    return 0


if __name__ == "__main__":
    case = json.load(open(sys.argv[1]))
    bundle = case.get("bundle", case)
    eval_opts = case.get("eval_opts", {})
    print(evaluate_capsule(bundle, eval_opts))
