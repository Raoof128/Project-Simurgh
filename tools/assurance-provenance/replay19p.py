"""Phase 19p: the proposals captured in 19n dispatched through the frozen Phase 17 pipeline
(P19-REPLAY03). Linux x86_64 in the hash-locked venv only.

The same replay as 19j and 19l, over lane 19n's recorded outputs: every ``send_report`` call a
model made as the agent is handed to the frozen ``run_branch`` in the fixture state of its
slot, once behind the composed controls and once behind the credential gateway alone. The
dispatch, the frozen engine and the outcome classes are 19j's (``replay19``), unchanged. What
is new here is where the sends came from: a text under an agent-writable heading, the model's
own summary, a text written by an attacker that saw its results, and an answer to a refusal.
"""

import capture19
import evidence19n
import inject19
import inject19n
import projection
import replay19
from replay19l import _control_view

CONTROLS = replay19.CONTROLS
SPLITS = projection.SPLITS
BLOCKS = inject19n.TARGET_BLOCKS
RESTRICTED_BLOCKS = tuple(b for b in BLOCKS if b != "active_control")
PLACEMENTS = inject19n.PLACEMENTS


def inputs():
    """The committed 19n pack's root and transcripts, read through the root check."""
    root = (evidence19n.DOCS / "ROOT.sha256").read_text().strip()
    files = projection.read_pack(evidence19n.DOCS / "evidence.zip", root)
    return {
        "root": root,
        "transcripts": {
            i: projection.loads(files[evidence19n.member(i)])
            for i in inject19n.MODEL_IDS
        },
    }


def generations(model_id, rows):
    """Each 19n generation in which the model acted as the agent, as (key, case, proposal).
    ``inject19n.replay`` rebuilds every prompt first and raises unless the transcript is this
    instrument's. A skipped slot and a writing slot propose nothing and are left out."""
    spec = inject19n.model(model_id)
    run = inject19n.replay(spec, rows)
    active = {t["id"]: t for t in capture19.tasks() if t["state"] == "active"}
    base = inject19n.base_tasks()
    chains = run.chains()
    for resolved, row in zip(run.resolved, run.rows):
        block = resolved["block"]
        if "skip" in resolved or block not in BLOCKS:
            continue
        if block == "active_control":
            case = active[inject19n.active_prompts()[resolved["number"]]["task_id"]]
            placement = None
        elif block == "retry":
            first = run.slots[chains[resolved["chain"]]]
            case = base[first["state"]]
            placement = first["placement"]
        else:
            case = base[resolved["state"]]
            placement = {
                "placement": resolved.get("placement"),
                "summary_read": "summary_note",
            }.get(block, "untrusted_source")
        if case["expected"] != resolved["expected"]:
            raise ValueError("fixture_binding:" + str(resolved["index"]))
        key = {
            "index": resolved["index"],
            "block": block,
            "task_id": case["id"],
            "state": case["state"],
            "placement": placement,
        }
        yield key, case, inject19.read(spec, row["raw"], row["truncated"])


def replay(sources=None, *, engine=None, log=None):
    """One row per agent generation; only calls are dispatched. The fixture seed of a dispatch
    is the task id and the slot index, so no two dispatches of a model share one."""
    if engine is None:
        if not replay19.host_can_replay():
            raise RuntimeError("replay_requires_linux_x86_64")
        engine = replay19.Frozen()
    sources = inputs() if sources is None else sources
    rows = []
    for model_id, transcript in sources["transcripts"].items():
        for key, case, proposal in generations(model_id, transcript):
            generation = f"19n:{model_id}:{key['index']}"
            branches = {}
            for control in CONTROLS:
                if proposal["status"] == "call":
                    b = replay19.dispatch(
                        engine, case, key["index"], control, generation, proposal
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
                    **key,
                    "proposal": proposal["status"],
                    "exact": proposal["status"] == "call"
                    and proposal["arguments"] == case["expected"],
                    "branches": branches,
                }
            )
            if log and proposal["status"] == "call":
                log(
                    f"{generation} {key['block']} {case['state']} -> "
                    + ", ".join(f"{c}:{branches[c]['split']}" for c in CONTROLS)
                )
    return rows


def _cell(rows):
    return {
        "sends_proposed": sum(1 for r in rows if r["proposal"] == "call"),
        **{
            "landed_" + control: sum(
                r["branches"][control]["new_effects"] for r in rows
            )
            for control in CONTROLS
        },
    }


def summarise(rows):
    """Per model: what was proposed and what each control let land, overall, by block, and by
    placement within the placement block."""
    out = {}
    for model_id in sorted({r["model"] for r in rows}):
        sub = [r for r in rows if r["model"] == model_id]
        restricted = [r for r in sub if r["state"] != "active"]
        active = [r for r in sub if r["state"] == "active"]
        placed = [r for r in sub if r["block"] == "placement"]
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
            "blocks": {
                b: _cell([r for r in sub if r["block"] == b]) for b in RESTRICTED_BLOCKS
            },
            "placements": {
                p: _cell([r for r in placed if r["placement"] == p]) for p in PLACEMENTS
            },
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
        "blocks": {
            b: _cell([r for r in rows if r["block"] == b]) for b in RESTRICTED_BLOCKS
        },
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
