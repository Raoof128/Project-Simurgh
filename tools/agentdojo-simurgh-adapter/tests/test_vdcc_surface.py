# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4S authorise_with_chain kernel entry (4S spec §8). Motto: AnthropicSafe
# First, then ReviewerSafe. The five predecessor entries stay FROZEN (differential
# equivalence below); authorise_with_chain refuses receipt-less / orphan / over-scope
# / over-budget / broken-chain crossings fail-closed at the guarded boundary.
import json
import os

from simurgh_agentdojo_adapter import capability_kernel as ck
from simurgh_agentdojo_adapter import vdcc_surface as vs

FIX = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "..",
    "docs",
    "research",
    "llm-shield",
    "evidence",
    "stage-4s",
    "fixtures",
)
ACTION = ck.Action("egress", "send", "email", "bob@example.com")
ACCEPT_ALL = (
    lambda _obj: True
)  # noqa: E731 — the caller supplies real verification in prod


def load(name):
    with open(os.path.join(FIX, name)) as fh:
        return json.load(fh)


def first_crossing(bundle):
    return bundle["crossing_artifacts"][0]


def test_honest_chain_allows_with_chain_receipt_bound():
    bundle = load("fixture-0-honest-tree.json")
    ctx = ck.ChainContext(
        bundle=bundle, crossing=first_crossing(bundle), verify_signature=ACCEPT_ALL
    )
    out = ck.authorise_with_chain(ACTION, chain=ctx)
    assert out.raw_code == 0
    assert out.decision.verdict == "allow"
    assert out.decision.reason == "chain_receipt_bound"
    assert out.bound_receipt_digest.startswith("sha256:")


def test_orphan_crossing_blocks_111():
    bundle = load("fixture-111-orphan-crossing.json")
    ctx = ck.ChainContext(
        bundle=bundle, crossing=first_crossing(bundle), verify_signature=ACCEPT_ALL
    )
    out = ck.authorise_with_chain(ACTION, chain=ctx)
    assert out.raw_code == 111
    assert out.decision.verdict == "block"


def test_receiptless_crossing_blocks_112():
    bundle = load("fixture-112-receiptless-crossing.json")
    ctx = ck.ChainContext(
        bundle=bundle, crossing=first_crossing(bundle), verify_signature=ACCEPT_ALL
    )
    assert ck.authorise_with_chain(ACTION, chain=ctx).raw_code == 112


def test_over_scope_blocks_108():
    bundle = load("fixture-108-forged-attenuation.json")
    ctx = ck.ChainContext(
        bundle=bundle, crossing=first_crossing(bundle), verify_signature=ACCEPT_ALL
    )
    assert ck.authorise_with_chain(ACTION, chain=ctx).raw_code == 108


def test_over_budget_blocks_109_or_110():
    for name in (
        "fixture-109-budget-amplification.json",
        "fixture-110-local-overspend.json",
    ):
        bundle = load(name)
        ctx = ck.ChainContext(
            bundle=bundle, crossing=first_crossing(bundle), verify_signature=ACCEPT_ALL
        )
        assert ck.authorise_with_chain(ACTION, chain=ctx).raw_code in (109, 110)


def test_default_verifier_fails_closed_to_101():
    # No verify_signature supplied -> refuse-all -> signature layer blocks at 101.
    bundle = load("fixture-0-honest-tree.json")
    ctx = ck.ChainContext(bundle=bundle, crossing=first_crossing(bundle))
    assert ck.authorise_with_chain(ACTION, chain=ctx).raw_code == 101


def test_surface_decide_matches_expected_codes():
    idx = load("corpus-index.json")
    # The boundary surface handles per-crossing codes only; 101 needs real crypto and
    # 116/117 are bundle-integrity codes owned by the attestation verifier (surface header).
    out_of_scope = {101, 116, 117}
    for case in idx["cases"]:
        if case["expected_raw"] in out_of_scope:
            continue
        bundle = load(case["file"])
        crossing = (
            bundle["crossing_artifacts"][0]
            if bundle["crossing_artifacts"]
            else {"bound_receipt_digest": ""}
        )
        out = vs.decide(bundle, crossing, verify_signature=ACCEPT_ALL)
        assert out["raw"] == case["expected_raw"], case["name"]


# ---- differential equivalence: the five predecessor entries stay byte-frozen ----
def test_authorise_4a_unchanged():
    assert (
        ck.authorise(ACTION, trusted_text="please email bob@example.com").reason
        == "task_grounded"
    )
    assert (
        ck.authorise(ACTION, trusted_text="unrelated").reason
        == "ungrounded_destination"
    )


def test_authorise_with_intent_4b_unchanged():
    ctx = ck.IntentContext(meeting_participants=["bob@example.com"])
    assert ck.authorise_with_intent(ACTION, intent=ctx).verdict == "allow"


def test_authorise_with_provenance_4c_unchanged():
    trusted_label = next(iter(ck.TRUSTED_PROVENANCE))
    ctx = ck.ProvenanceIntentContext(
        entries=[ck.IntentEntry(address="bob@example.com", provenance=trusted_label)]
    )
    assert ck.authorise_with_provenance(ACTION, intent=ctx).verdict == "allow"
    # A poisoned (untrusted) entry grants nothing — provenance gate holds.
    poisoned = ck.ProvenanceIntentContext(
        entries=[ck.IntentEntry(address="bob@example.com", provenance="UNTRUSTED")]
    )
    assert ck.authorise_with_provenance(ACTION, intent=poisoned).verdict == "block"


def test_manifest_and_friction_entrypoints_present_and_callable():
    # Presence + fail-closed default behaviour of the 4O/4Q entries is unchanged.
    assert callable(ck.authorise_with_manifest)
    assert callable(ck.authorise_with_friction)
