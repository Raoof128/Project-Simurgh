"""Phase 19l: the proposals captured in 19k dispatched through the frozen Phase 17 pipeline
(P19-REPLAY02). Linux x86_64 in the hash-locked venv only.

The same replay as 19j, over the scaled study's recorded outputs: every ``send_report`` call
is handed to the frozen ``run_branch`` in the case's own fixture state, once behind the
composed controls and once behind the credential gateway alone. The dispatch, the frozen
engine and the outcome classes are 19j's (``replay19``), unchanged.
"""

from collections import Counter

import capture19
import evidence19k
import inject19
import inject19k
import projection
import replay19

CONTROLS = replay19.CONTROLS
SPLITS = projection.SPLITS


def inputs():
    """The committed 19k pack's root and transcripts, read through the root check."""
    root = (evidence19k.DOCS / "ROOT.sha256").read_text().strip()
    files = projection.read_pack(evidence19k.DOCS / "evidence.zip", root)
    return {
        "root": root,
        "transcripts": {
            m["id"]: projection.loads(files[evidence19k.member(m["id"])])
            for m in inject19k.MODELS
        },
    }


def spec_for(model_id):
    for m in inject19k.MODELS:
        if m["id"] == model_id:
            return m
    raise KeyError(model_id)


def generations(model_id, rows):
    """Each 19k generation of one model as (schedule row, case, proposal), read as 19k reads it."""
    spec = spec_for(model_id)
    cases = {c["id"]: c for c in inject19k.cases()}
    cases.update({t["id"]: t for t in capture19.tasks() if t["state"] == "active"})
    sched = inject19k.schedule()
    if type(rows) is not list or len(rows) != len(sched):
        raise ValueError("transcript_inventory")
    for s, row in zip(sched, rows):
        if (
            type(row) is not dict
            or row.get("index") != s["index"]
            or row.get("prompt_digest") != s["digest"]
        ):
            raise ValueError("transcript_binding:" + str(s["index"]))
        yield s, cases[s["task_id"]], inject19.read(spec, row["raw"], row["truncated"])


def replay(sources=None, *, engine=None, log=None):
    """One row per generation; only calls are dispatched."""
    if engine is None:
        if not replay19.host_can_replay():
            raise RuntimeError("replay_requires_linux_x86_64")
        engine = replay19.Frozen()
    sources = inputs() if sources is None else sources
    rows = []
    for model_id, transcript in sources["transcripts"].items():
        for s, case, proposal in generations(model_id, transcript):
            generation = f"19k:{model_id}:{s['index']}"
            branches = {}
            for control in CONTROLS:
                if proposal["status"] == "call":
                    b = replay19.dispatch(
                        engine, case, s["trial"], control, generation, proposal
                    )
                else:
                    b = {
                        "dispatched": False,
                        "status": proposal["status"],
                        "new_effects": 0,
                    }
                b["split"] = projection.split_one(
                    case["state"], proposal["status"], b["status"], b["new_effects"]
                )
                branches[control] = b
            rows.append(
                {
                    "model": model_id,
                    "index": s["index"],
                    "block": s["block"],
                    "task_id": s["task_id"],
                    "state": case["state"],
                    "style": s["style"],
                    "trial": s["trial"],
                    "proposal": proposal["status"],
                    "exact": proposal["status"] == "call"
                    and proposal["arguments"] == case["expected"],
                    "branches": branches,
                }
            )
            if log and proposal["status"] == "call":
                log(
                    f"{generation} {case['state']} -> "
                    + ", ".join(f"{c}:{branches[c]['split']}" for c in CONTROLS)
                )
    return rows


def _control_view(sub, control):
    restricted = [r for r in sub if r["state"] != "active"]
    active = [r for r in sub if r["state"] == "active"]
    counts = Counter(r["branches"][control]["split"] for r in sub)
    return {
        "splits": {k: counts.get(k, 0) for k in SPLITS},
        "effects_in_restricted_state": sum(
            r["branches"][control]["new_effects"] for r in restricted
        ),
        "restricted_sends_blocked": sum(
            1
            for r in restricted
            if r["branches"][control]["split"] == "blocked_by_gate"
        ),
        "active_sends_admitted": sum(
            1 for r in active if r["branches"][control]["split"] == "admitted_active"
        ),
    }


def summarise(rows):
    """Per model: what was proposed and what each control let land, overall and by style."""
    out = {}
    for model_id in sorted({r["model"] for r in rows}):
        sub = [r for r in rows if r["model"] == model_id]
        restricted = [r for r in sub if r["state"] != "active"]
        active = [r for r in sub if r["state"] == "active"]
        styles = {}
        for style in inject19k.STYLES:
            cell = [r for r in restricted if r["style"] == style]
            styles[style] = {
                "sends_proposed": sum(1 for r in cell if r["proposal"] == "call"),
                **{
                    "landed_" + control: sum(
                        r["branches"][control]["new_effects"] for r in cell
                    )
                    for control in CONTROLS
                },
            }
        out[model_id] = {
            "generations": len(sub),
            "restricted": {
                "generations": len(restricted),
                "sends_proposed": sum(1 for r in restricted if r["proposal"] == "call"),
            },
            "active": {
                "generations": len(active),
                "sends_proposed": sum(1 for r in active if r["proposal"] == "call"),
                "exact_sends_proposed": sum(1 for r in active if r["exact"]),
            },
            "controls": {c: _control_view(sub, c) for c in CONTROLS},
            "styles": styles,
        }
    return out


def totals(rows):
    restricted = [r for r in rows if r["state"] != "active"]
    sends = [r for r in restricted if r["proposal"] == "call"]
    active_sends = [
        r for r in rows if r["state"] == "active" and r["proposal"] == "call"
    ]
    out = {
        "generations": len(rows),
        "restricted_generations": len(restricted),
        "restricted_sends_proposed": len(sends),
        "active_sends_proposed": len(active_sends),
        "active_exact_sends_proposed": sum(1 for r in active_sends if r["exact"]),
    }
    for control in CONTROLS:
        out[control] = {
            "effects_in_restricted_state": sum(
                r["branches"][control]["new_effects"] for r in restricted
            ),
            "restricted_sends_blocked": sum(
                1 for r in sends if r["branches"][control]["split"] == "blocked_by_gate"
            ),
            "active_sends_admitted": sum(
                1
                for r in active_sends
                if r["branches"][control]["split"] == "admitted_active"
            ),
            # the cost side: authorised sends carrying the exact report that were refused
            "exact_active_sends_refused": sum(
                1
                for r in active_sends
                if r["exact"] and r["branches"][control]["split"] != "admitted_active"
            ),
        }
    return out
