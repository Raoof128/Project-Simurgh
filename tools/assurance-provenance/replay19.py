"""Phase 19j: the proposals captured in 19h and 19i dispatched through the frozen Phase 17
pipeline (P19-REPLAY01). Linux x86_64 in the hash-locked venv only.

19h and 19i recorded what models proposed and executed nothing. Here every recorded
``send_report`` call is handed to ``tools/assurance-model-composed/trial.py::run_branch``, the
frozen function Phase 17 used, in the task's own state, once behind the composed controls and
once behind the credential gateway alone. What comes back is whether an effect landed at the
receiver. The frozen chain is imported, never edited; this is the replay use the Phase 19
declaration reserves for it.
"""

import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path

import capture19
import capture19local as local
import evidence
import evidence19h
import evidence19i
import inject19
import projection

ROOT = projection.ROOT
CONTROLS = ("composed", "credential_only")
LANES = ("19h", "19i")
SPLITS = projection.SPLITS


def host_can_replay():
    return evidence.host_can_replay()


FROZEN = (
    "tools/assurance-model-composed/trial.py",
    "tools/assurance-model-composed/contract.py",
)


class Frozen:
    """The frozen Phase 17 trial and parser. Importing them needs the hash-locked set."""

    def __init__(self):
        sys.path.insert(0, str(ROOT / "tools/assurance-model-composed"))
        import contract  # noqa: E402
        import trial  # noqa: E402

        self.run_branch = trial.run_branch
        self.parse = contract.parse


def inputs():
    """Lane -> the committed pack's root and its transcripts, read through the root check."""
    out = {}
    for lane, ev in (("19h", evidence19h), ("19i", evidence19i)):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        files = projection.read_pack(ev.DOCS / "evidence.zip", root)
        ids = (
            [m["id"] for m in local.MODELS]
            if lane == "19h"
            else list(inject19.MODEL_IDS)
        )
        out[lane] = {
            "root": root,
            "transcripts": {i: projection.loads(files[ev.member(i)]) for i in ids},
        }
    return out


def generations(lane, model_id, rows):
    """Each generation of one model in one lane as (schedule row, case, proposal), read the
    way its own lane reads it."""
    spec = local.model(model_id)
    if lane == "19h":
        tasks = {t["id"]: t for t in capture19.tasks()}
        sched = local.schedule()
        read = lambda row: local.parse(  # noqa: E731
            local.decode(spec["wire"], row["raw"]), row["truncated"]
        )
        case_for = lambda s: tasks[s["task_id"]]  # noqa: E731
    else:
        cases = {c["id"]: c for c in inject19.cases()}
        sched = inject19.schedule()
        read = lambda row: inject19.read(spec, row["raw"], row["truncated"])  # noqa: E731
        case_for = lambda s: cases[s["task_id"]]  # noqa: E731
    if len(rows) != len(sched):
        raise ValueError("transcript_inventory")
    for s, row in zip(sched, rows):
        if row.get("index") != s["index"] or row.get("prompt_digest") != s["digest"]:
            raise ValueError("transcript_binding:" + str(s["index"]))
        yield s, case_for(s), read(row), row


def dispatch(engine, case, trial, control, generation, proposal):
    work = Path(tempfile.mkdtemp(prefix="p19j-"))
    try:
        row, _ = engine.run_branch(
            case, trial, control, generation, proposal, work / "branch"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return {
        "dispatched": True,
        "status": row["status"],
        "new_effects": len(row["new_effects"]),
    }


def replay(sources=None, *, engine=None, log=None):
    """One row per generation. A proposal that is not a call never reaches a gate and is not
    dispatched; its split follows from the proposal alone. ``engine`` is the frozen pipeline
    unless a test supplies a stand-in."""
    if engine is None:
        if not host_can_replay():
            raise RuntimeError("replay_requires_linux_x86_64")
        engine = Frozen()
    sources = inputs() if sources is None else sources
    rows = []
    for lane in LANES:
        for model_id, transcript in sources[lane]["transcripts"].items():
            spec = local.model(model_id)
            for s, case, proposal, row in generations(lane, model_id, transcript):
                # the re-stated parser must agree with the frozen one on every output
                theirs = engine.parse(
                    local.decode(spec["wire"], row["raw"]), row["truncated"]
                )
                if lane == "19h" and theirs != proposal:
                    raise ValueError("parser_disagreement:" + str(s["index"]))
                generation = f"{lane}:{model_id}:{s['index']}"
                branches = {}
                for control in CONTROLS:
                    if proposal["status"] == "call":
                        b = dispatch(
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
                        "lane": lane,
                        "model": model_id,
                        "index": s["index"],
                        "task_id": s["task_id"],
                        "state": case["state"],
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


def summarise(rows):
    """Per lane and model: what the models proposed, and what each control let land."""
    out = {}
    for lane in LANES:
        for model_id in sorted({r["model"] for r in rows if r["lane"] == lane}):
            sub = [r for r in rows if r["lane"] == lane and r["model"] == model_id]
            restricted = [r for r in sub if r["state"] != "active"]
            active = [r for r in sub if r["state"] == "active"]
            entry = {
                "generations": len(sub),
                "restricted": {
                    "generations": len(restricted),
                    "sends_proposed": sum(
                        1 for r in restricted if r["proposal"] == "call"
                    ),
                },
                "active": {
                    "generations": len(active),
                    "sends_proposed": sum(1 for r in active if r["proposal"] == "call"),
                    "exact_sends_proposed": sum(1 for r in active if r["exact"]),
                },
                "controls": {},
            }
            for control in CONTROLS:
                counts = Counter(r["branches"][control]["split"] for r in sub)
                entry["controls"][control] = {
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
                        1
                        for r in active
                        if r["branches"][control]["split"] == "admitted_active"
                    ),
                }
            out[lane + ":" + model_id] = entry
    return out
