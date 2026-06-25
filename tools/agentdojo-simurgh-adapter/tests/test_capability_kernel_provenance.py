# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4C: provenance-gated intent sources. Additive over the frozen 4A/4B kernel.

4B grounds egress in trusted intent sources but assumed those sources were
trusted-by-construction. In a real agent the participant/contact lists are populated from
tool output, so an injection can try to launder the attacker address in as a 'participant'.
4C gates each intent entry by PROVENANCE: only trusted-origin entries grant authority, so a
poisoned (untrusted-origin) participant does NOT authorise egress to the attacker.
"""
from simurgh_agentdojo_adapter.capability_kernel import (
    Action,
    IntentEntry,
    ProvenanceIntentContext,
    authorise_with_provenance,
)

TRUSTED = "account_owner"
UNTRUSTED = "untrusted_tool_output"


def test_trusted_participant_is_authorised():
    act = Action("egress", "send", "email", "sara@bluesparrowtech.com")
    ctx = ProvenanceIntentContext(
        explicit_request="Email my meeting the agenda.",
        entries=[IntentEntry("sara@bluesparrowtech.com", TRUSTED)],
    )
    d = authorise_with_provenance(act, intent=ctx)
    assert d.verdict == "allow" and d.source == "account_owner"


def test_poisoned_untrusted_participant_is_blocked():
    # The attacker laundered their address into the participant list via untrusted tool output.
    act = Action("egress", "send", "email", "mark.black-2134@gmail.com")
    ctx = ProvenanceIntentContext(
        explicit_request="Email my meeting the agenda.",
        entries=[IntentEntry("mark.black-2134@gmail.com", UNTRUSTED)],
    )
    d = authorise_with_provenance(act, intent=ctx)
    assert d.verdict == "block" and d.reason == "ungrounded_destination"


def test_mixed_trusted_and_poisoned():
    ctx = ProvenanceIntentContext(
        explicit_request="Email my meeting the notes.",
        entries=[
            IntentEntry("sara@bluesparrowtech.com", TRUSTED),
            IntentEntry("mark.black-2134@gmail.com", UNTRUSTED),
        ],
    )
    sara = authorise_with_provenance(Action("egress", "send", "email", "sara@bluesparrowtech.com"), intent=ctx)
    atk = authorise_with_provenance(Action("egress", "send", "email", "mark.black-2134@gmail.com"), intent=ctx)
    assert sara.verdict == "allow"
    assert atk.verdict == "block"


def test_explicit_request_text_still_grounds():
    act = Action("egress", "send", "email", "john.doe@bluesparrowtech.com")
    ctx = ProvenanceIntentContext(explicit_request="Email john.doe@bluesparrowtech.com the file.")
    d = authorise_with_provenance(act, intent=ctx)
    assert d.verdict == "allow" and d.source == "explicit_user_request"


def test_mutation_unchanged():
    ctx = ProvenanceIntentContext(explicit_request="summarise my files")
    d = authorise_with_provenance(Action("destructive_mutation", "delete", "file", "9"), intent=ctx)
    assert d.verdict == "block" and d.reason == "destructive_mutation_not_authorised"
