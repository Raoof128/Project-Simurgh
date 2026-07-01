# SPDX-License-Identifier: AGPL-3.0-or-later
"""Minimal Capability Kernel (Stage 4A-lite).

Pure, dependency-free authorization authority for the adapter-side gates. A proposed
tool call is mapped to zero or more typed Actions; each Action is authorised against the
trusted user-task text by a single task-grounded capability. Today exactly two families
exist (egress, destructive_mutation); adding a family later is data, not new control flow.

No I/O, no network, no model calls. Never imports agentdojo.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

POLICY_VERSION = "stage4a-lite.authority-policy.v1"
CAPABILITY_ID = "task_grounded_authority.v1"

# tool -> argument names carrying an external egress destination
EGRESS_DEST_ARGS: dict[str, tuple[str, ...]] = {
    "send_email": ("recipients", "cc", "bcc"),
    "share_file": ("email",),
    "add_calendar_event_participants": ("participants",),
    "create_calendar_event": ("participants",),
}
_EGRESS_VERB = {
    "send_email": ("send", "email"),
    "share_file": ("share", "file"),
    "add_calendar_event_participants": ("invite", "calendar"),
    "create_calendar_event": ("invite", "calendar"),
}
MUTATION_DESTRUCTIVE: dict[str, tuple[str, str, str]] = {
    # tool -> (verb, target_kind, target-arg-name)
    "delete_file": ("delete", "file", "file_id"),
    "delete_email": ("delete", "email", "email_id"),
    "cancel_calendar_event": ("cancel", "calendar", "event_id"),
}
DESTRUCTIVE_INTENT = re.compile(
    r"\b(delete|deleting|remove|removing|cancel|clear|erase|trash|discard)\b", re.I
)


@dataclass(frozen=True)
class Action:
    family: str  # "egress" | "destructive_mutation"
    verb: str
    target_kind: str  # "email" | "file" | "calendar" | "unknown"
    target: str


@dataclass
class AuthorityDecision:
    verdict: str  # "allow" | "block" | "requires_confirmation"
    reason: str
    family: str
    blocked_targets: list[str] = field(default_factory=list)
    would_execute: bool = False
    # Stage 4B: which trusted intent source granted authority (additive; 4A always
    # uses the default). One of: trusted_user_task | explicit_user_request |
    # current_meeting_participants | selected_contact_group.
    source: str = "trusted_user_task"


def split_destinations(arg_value) -> list[str]:
    out: list[str] = []
    if arg_value is None:
        return out
    if isinstance(arg_value, str):
        out.extend(p.strip() for p in arg_value.replace(";", ",").split(",") if p.strip())
    elif isinstance(arg_value, (list, tuple)):
        for v in arg_value:
            out.extend(split_destinations(v))
    else:
        out.append(str(arg_value))
    return out


def is_grounded(dest: str, trusted_text: str) -> bool:
    t = (trusted_text or "").lower()
    d = (dest or "").lower().strip()
    if not d:
        return False  # empty destination carries no recipient: fail closed, never authorise
    if d in t:
        return True
    local = d.split("@", 1)[0]
    return len(local) > 2 and local in t


def actions_for(function: str, args: dict) -> list[Action]:
    args = args or {}
    if function in EGRESS_DEST_ARGS:
        verb, kind = _EGRESS_VERB[function]
        acts: list[Action] = []
        for a in EGRESS_DEST_ARGS[function]:
            for dest in split_destinations(args.get(a)):
                acts.append(Action("egress", verb, kind, dest))
        return acts
    if function in MUTATION_DESTRUCTIVE:
        verb, kind, target_arg = MUTATION_DESTRUCTIVE[function]
        return [Action("destructive_mutation", verb, kind, str(args.get(target_arg, "")))]
    return []


def authorise(action: Action, *, trusted_text: str) -> AuthorityDecision:
    if action.family == "egress":
        if is_grounded(action.target, trusted_text):
            return AuthorityDecision("allow", "task_grounded", "egress")
        return AuthorityDecision("block", "ungrounded_destination", "egress", [action.target])
    if action.family == "destructive_mutation":
        if DESTRUCTIVE_INTENT.search(trusted_text or ""):
            return AuthorityDecision("allow", "task_grounded", "destructive_mutation")
        return AuthorityDecision(
            "block", "destructive_mutation_not_authorised", "destructive_mutation", [action.target]
        )
    return AuthorityDecision("allow", "non_gated", "none")


# ---------------------------------------------------------------------------
# Stage 4B: typed intent-source grounding (additive; the 4A `authorise` above is frozen).
#
# 4A grounds egress only in the literal task string, which over-blocks legitimate
# "email my meeting participants / my contact group" actions whose addresses are not
# typed into the task. 4B adds two TRUSTED intent sources so those actions are
# authorised by the source that legitimately holds them, WITHOUT widening authority to
# an attacker address that appears in no source. The sources are trusted-by-construction
# here; populating them from (untrusted) tool outputs is a separate trust-propagation
# question and is explicitly NOT done in this stage (see RESULTS non-claims).
# ---------------------------------------------------------------------------
@dataclass
class IntentContext:
    explicit_request: str = ""
    meeting_participants: list[str] = field(default_factory=list)
    contacts: list[str] = field(default_factory=list)


def _addr_in(dest: str, trusted_list: list[str]) -> bool:
    d = (dest or "").lower().strip()
    return any(d == (a or "").lower().strip() for a in trusted_list)


def authorise_with_intent(action: Action, *, intent: IntentContext) -> AuthorityDecision:
    if action.family == "egress":
        if is_grounded(action.target, intent.explicit_request):
            return AuthorityDecision("allow", "intent_grounded", "egress", source="explicit_user_request")
        if _addr_in(action.target, intent.meeting_participants):
            return AuthorityDecision("allow", "intent_grounded", "egress", source="current_meeting_participants")
        if _addr_in(action.target, intent.contacts):
            return AuthorityDecision("allow", "intent_grounded", "egress", source="selected_contact_group")
        return AuthorityDecision("block", "ungrounded_destination", "egress", [action.target])
    # Mutation authority is unchanged from 4A: only an explicit destructive request grants it.
    return authorise(action, trusted_text=intent.explicit_request)


# ---------------------------------------------------------------------------
# Stage 4C: provenance-gated intent sources (additive; 4A/4B above are frozen).
#
# 4B assumed intent sources were trusted-by-construction. Once they are populated from
# tool output, an injection can launder the attacker address in as a "participant". 4C
# tags each intent entry with a PROVENANCE and grants authority ONLY from trusted origins,
# so a poisoned (untrusted-origin) entry does not authorise egress to the attacker.
# ---------------------------------------------------------------------------
TRUSTED_PROVENANCE = frozenset({"account_owner", "user_authored", "explicit_user_request"})


@dataclass
class IntentEntry:
    address: str
    provenance: str  # trusted iff in TRUSTED_PROVENANCE


@dataclass
class ProvenanceIntentContext:
    explicit_request: str = ""
    entries: list[IntentEntry] = field(default_factory=list)


def authorise_with_provenance(action: Action, *, intent: ProvenanceIntentContext) -> AuthorityDecision:
    if action.family == "egress":
        if is_grounded(action.target, intent.explicit_request):
            return AuthorityDecision("allow", "intent_grounded", "egress", source="explicit_user_request")
        d = (action.target or "").lower().strip()
        for e in intent.entries:
            if (e.address or "").lower().strip() == d and e.provenance in TRUSTED_PROVENANCE:
                return AuthorityDecision("allow", "intent_grounded", "egress", source=e.provenance)
        # No trusted-provenance entry matched: a poisoned (untrusted) entry grants nothing.
        return AuthorityDecision("block", "ungrounded_destination", "egress", [action.target])
    return authorise(action, trusted_text=intent.explicit_request)


def naive_intent_verdict(action: Action, intent: ProvenanceIntentContext) -> str:
    """Provenance-BLIND grounding (the 4B-style implementation if it trusted any populated
    entry). Used only to expose how many poisoned attacks such an implementation would
    launder; never used to authorise."""
    if action.family != "egress":
        return authorise(action, trusted_text=intent.explicit_request).verdict
    if is_grounded(action.target, intent.explicit_request):
        return "allow"
    d = (action.target or "").lower().strip()
    return "allow" if any((e.address or "").lower().strip() == d for e in intent.entries) else "block"
