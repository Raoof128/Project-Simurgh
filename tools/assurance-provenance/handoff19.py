"""Phase 19f: outside-operator handoff package (design §6 row 19f, ``IOU-19-OPERATOR``).

Renders the handoff document from the committed receipts, states the expected fields an outside
operator must reproduce, compares a returned receipt field by field, and reports the IOU status.
Nothing here runs a lane; the replay is the operator's.
"""

import argparse
import hashlib
import json
from pathlib import Path

import projection

ROOT = projection.ROOT
DOCS = ROOT / "docs/research/provenance-phase-19f"
RECEIPTS_DIR = DOCS / "operator-receipts"
# P19-OPERATOR01: each returned receipt gets a recomputable review beside it.
REVIEWS_DIR = DOCS / "operator-reviews"
REVIEW_SCHEMA = "simurgh-outside-operator-review-v1"
# What 19b, 19g and the lane tests must be able to import (the frozen successor chain imports
# `openai` at module load); a byte-identical subset of the SDK lock.
VERIFY_LOCK = ROOT / "tools/assurance-provenance/requirements-verify.lock"
VERIFY_LOCK_REL = "tools/assurance-provenance/requirements-verify.lock"
# Beyond the verifies, what only some hosts can exercise.
REPLAY_ITEM = "19a --replay"
LEAN_ITEM = "19b Lean closure"
EXCLUDED = ("tree_state", "host", "replay")
# A lane's ``kind`` is a function of its replay result (``receipt_for`` in each evidence module),
# and the replay is host-dependent, so the expected kind follows the operator's own replay rather
# than the author's. 19a's committed receipt is the unreplayed kind; 19j's, 19l's and 19p's are
# the replayed kind (P19-OPERATOR02, 05), so those also name what a host that cannot replay prints.
REPLAY_CHAINED_KIND = {
    "19a": "frozen_replay_chained",
    "19j": "frozen_replay_recomputed",
    "19l": "frozen_replay_recomputed",
    "19p": "frozen_replay_recomputed",
}
STRUCTURE_ONLY_KIND = {
    "19j": "structure_checked",
    "19l": "structure_checked",
    "19p": "structure_checked",
}


def replay_item(pid):
    return pid + " --replay"


def _replayed(receipt):
    replay = receipt.get("replay")
    return type(replay) is dict and replay.get("result") == "verified"


# Host-dependent receipt fields, reported with the operator's value and never compared
# (P19-REPAIR05: the handoff said so before the comparator did). Dotted paths name nested fields.
HOST_DEPENDENT = {
    "19d": {
        "unix_sockets_reachable": "which daemon sockets a host still exposes inside the namespace is the host's",
        "unix_socket_egress_eliminated": "follows unix_sockets_reachable on the operator's host",
    },
}
# 19b's Lean checks run on the operator's host; where `lean` is absent the receipt reports them
# null and closure false for that host. Only then are these four reported, not compared; with Lean
# present every 19b field is compared.
LEAN_ABSENT_FIELDS = {
    "lean.type_checked_on_this_host": "lean absent on the operator's host",
    "lean.differential_passed_on_this_host": "lean absent on the operator's host",
    "closed_by.lean_differential_passed_on_this_host": "lean absent on the operator's host",
    "phase_19b_closed": "closure needs the Lean differential on the operator's host; lean was absent",
}
PHASES = (
    {
        "id": "19a",
        "module": "evidence.py",
        "docs": "docs/research/provenance-phase-19a",
        "host": "any host with Python 3.12; on Linux x86_64 inside the hash-locked venv add --replay",
        "time": "under a minute; about three minutes with --replay",
    },
    {
        "id": "19b",
        "module": "evidence19b.py",
        "docs": "docs/research/provenance-phase-19b",
        "host": "any host with Python 3.12 and the verify set (Host recipes); the Lean differential test needs lean 4.15 on the path",
        "time": "three to eight minutes (the lanes re-execute)",
    },
    {
        "id": "19c",
        "module": "evidence19c.py",
        "docs": "docs/research/provenance-phase-19c",
        "host": "any host with Python 3.12",
        "time": "a few seconds",
    },
    {
        "id": "19d",
        "module": "evidence19d.py",
        "docs": "docs/research/provenance-phase-19d",
        "host": "Linux with user and network namespaces (sudo or a privileged container); refuses elsewhere with host_cannot_namespace",
        "time": "a few seconds",
    },
    {
        "id": "19e",
        "module": "evidence19e.py",
        "docs": "docs/research/provenance-phase-19e",
        "host": "any host with Python 3.12",
        "time": "a few seconds",
    },
    {
        "id": "19g",
        "module": "evidence19g.py",
        "docs": "docs/research/provenance-phase-19g",
        "host": "any host with Python 3.12 and the verify set (Host recipes)",
        "time": "a few seconds",
    },
    {
        "id": "19h",
        "module": "evidence19h.py",
        "docs": "docs/research/provenance-phase-19h",
        "host": "any host with Python 3.12; no model is run",
        "time": "a few seconds",
    },
    {
        "id": "19i",
        "module": "evidence19i.py",
        "docs": "docs/research/provenance-phase-19i",
        "host": "any host with Python 3.12; no model is run",
        "time": "a few seconds",
    },
    {
        "id": "19j",
        "module": "evidence19j.py",
        "docs": "docs/research/provenance-phase-19j",
        "host": "any host with Python 3.12; on Linux x86_64 inside the hash-locked venv add --replay",
        "time": "a few seconds; about ten minutes with --replay on a two-core server",
    },
    {
        "id": "19k",
        "module": "evidence19k.py",
        "docs": "docs/research/provenance-phase-19k",
        "host": "any host with Python 3.12; no model is run",
        "time": "a few seconds",
    },
    {
        "id": "19l",
        "module": "evidence19l.py",
        "docs": "docs/research/provenance-phase-19l",
        "host": "any host with Python 3.12; on Linux x86_64 inside the hash-locked venv add --replay",
        "time": "a few seconds; about thirty minutes with --replay on a two-core server",
    },
    {
        "id": "19m",
        "module": "evidence19m.py",
        "docs": "docs/research/provenance-phase-19m",
        "host": "any host with Python 3.12; no model is run",
        "time": "a few seconds",
    },
    {
        "id": "19n",
        "module": "evidence19n.py",
        "docs": "docs/research/provenance-phase-19n",
        "host": "any host with Python 3.12; no model is run",
        "time": "a few seconds",
    },
    {
        "id": "19o",
        "module": "evidence19o.py",
        "docs": "docs/research/provenance-phase-19o",
        "host": "any host with Python 3.12; no model is run, no network and no key are needed",
        "time": "a few seconds",
    },
    {
        "id": "19p",
        "module": "evidence19p.py",
        "docs": "docs/research/provenance-phase-19p",
        "host": "any host with Python 3.12; on Linux x86_64 inside the hash-locked venv add --replay",
        "time": "a few seconds; about twelve minutes with --replay on a two-core server",
    },
)
NUMBER_WORDS = {6: "six", 11: "eleven", 12: "twelve", 14: "fourteen", 15: "fifteen"}


def phase(pid):
    for p in PHASES:
        if p["id"] == pid:
            return p
    raise KeyError(pid)


def committed_receipt(pid):
    return json.loads((ROOT / phase(pid)["docs"] / "receipt.json").read_text())


def committed_root(pid):
    return (ROOT / phase(pid)["docs"] / "ROOT.sha256").read_text().strip()


def expected_fields(pid):
    return {k: v for k, v in committed_receipt(pid).items() if k not in EXCLUDED}


def expected_for(pid, receipt):
    want = expected_fields(pid)
    if pid in REPLAY_CHAINED_KIND and _replayed(receipt):
        want["kind"] = REPLAY_CHAINED_KIND[pid]
    elif pid in STRUCTURE_ONLY_KIND:
        want["kind"] = STRUCTURE_ONLY_KIND[pid]
    return want


def _lean_absent(receipt):
    lean = receipt.get("lean")
    return type(lean) is dict and lean.get("type_checked_on_this_host") is None


def host_dependent(pid, receipt):
    """Dotted field -> reason, for the fields the operator's receipt reports but the comparator
    does not compare on this phase and this host."""
    fields = dict(HOST_DEPENDENT.get(pid, {}))
    if pid == "19b" and _lean_absent(receipt):
        fields.update(LEAN_ABSENT_FIELDS)
    return fields


def _lookup(obj, path):
    for part in path.split("."):
        if type(obj) is not dict or part not in obj:
            return False, None
        obj = obj[part]
    return True, obj


def _without(obj, paths):
    out = json.loads(json.dumps(obj))
    for path in paths:
        parts = path.split(".")
        node = out
        for part in parts[:-1]:
            node = node.get(part) if type(node) is dict else None
            if node is None:
                break
        if type(node) is dict:
            node.pop(parts[-1], None)
    return out


def not_compared(pid, receipt):
    """What the operator's receipt says for every field this comparison does not check, with the
    reason. Printed next to the discrepancies so nothing is waived silently."""
    out = {}
    for path, reason in host_dependent(pid, receipt).items():
        present, got = _lookup(receipt, path)
        out[path] = {
            "got": got if present else None,
            "present": present,
            "reason": reason,
        }
    return out


def check(pid, receipt):
    """Every field that differs from, is missing against, or is absent from the committed receipt
    (an unexpected field is a discrepancy too, P19-REPAIR03), the host-dependent fields of
    ``host_dependent`` left out of both sides."""
    out = []
    skipped = host_dependent(pid, receipt)
    want_all = _without(expected_for(pid, receipt), skipped)
    receipt = _without(receipt, skipped)
    for key, want in want_all.items():
        if key not in receipt:
            out.append({"field": key, "expected": want, "got": None, "kind": "missing"})
        elif projection.wire(receipt[key]) != projection.wire(want):
            out.append(
                {"field": key, "expected": want, "got": receipt[key], "kind": "differs"}
            )
    for key in sorted(receipt):
        if key not in want_all and key not in EXCLUDED:
            out.append(
                {
                    "field": key,
                    "expected": None,
                    "got": receipt[key],
                    "kind": "unexpected",
                }
            )
    return out


def discrepancy_template():
    return {
        "schema": "simurgh-outside-operator-receipt-v1",
        "operator": "<name or handle; not the author>",
        "machine": {"os": "", "arch": "", "python": "", "lean": "absent or version"},
        "commit": "<the published commit the operator cloned>",
        "files_received_from_author": [],
        "phases": {
            p["id"]: {
                "command_run": "",
                "verifier_output": "<the JSON the verifier printed, verbatim>",
                "discrepancies": "<output of: python -B tools/assurance-provenance/handoff19.py check "
                + p["id"]
                + " <receipt.json>  (a JSON object: discrepancies, not_compared)>",
                "refused": "<host_cannot_namespace or similar, if the verifier refused>",
            }
            for p in PHASES
        },
        "note": "<anything that did not match the handoff document, in the operator's words>",
        "signature": "<a signed line, or the operator's e-mail header, naming the above>",
    }


def review_path(receipt_path):
    return REVIEWS_DIR / (Path(receipt_path).stem + ".review.json")


def outside_items():
    return sorted(
        [p["id"] for p in PHASES]
        + [replay_item(pid) for pid in REPLAY_CHAINED_KIND]
        + [LEAN_ITEM]
    )


def review(raw):
    """The author's review of a returned receipt, recomputed from its bytes alone.

    Per phase the comparator is rerun on the operator's verbatim verifier output; nothing the
    operator reports about their own comparison is taken at its word. ``not_exercised`` lists what
    this receipt leaves unreplayed: a phase it does not contain, a refused or discrepant phase, a
    frozen replay that was not run, 19b's Lean closure. The review establishes what the returned
    outputs say, never who produced them."""
    receipt = json.loads(raw)
    phases, missing = {}, []
    returned = receipt.get("phases") if type(receipt.get("phases")) is dict else {}
    for p in PHASES:
        pid = p["id"]
        if pid not in returned:
            # the receipt predates the lane, or the operator was not asked for it
            phases[pid] = {"result": "not_in_receipt"}
            missing.append(pid)
            if pid in REPLAY_CHAINED_KIND:
                missing.append(replay_item(pid))
            continue
        entry = returned.get(pid) if type(returned.get(pid)) is dict else {}
        try:
            out = json.loads(entry.get("verifier_output") or "")
        except ValueError:
            out = None
        if type(out) is not dict:
            phases[pid] = {"result": "refused", "refused": entry.get("refused", "")}
            missing.append(pid)
            if pid in REPLAY_CHAINED_KIND:
                missing.append(replay_item(pid))
            continue
        mine = {
            "discrepancies": check(pid, out),
            "not_compared": not_compared(pid, out),
        }
        try:
            theirs = json.loads(entry.get("discrepancies") or "")
        except ValueError:
            theirs = None
        ok = out.get("verified") is True and not mine["discrepancies"]
        phases[pid] = {
            "result": "verified" if ok else "discrepant",
            "discrepancies": mine["discrepancies"],
            "not_compared": mine["not_compared"],
            "operator_comparator_matches": theirs == mine,
            "root_matches": out.get("manifest_sha256") == committed_root(pid),
            "tree_state_is_commit": out.get("tree_state") == receipt.get("commit"),
        }
        if not ok:
            missing.append(pid)
        if pid in REPLAY_CHAINED_KIND and not _replayed(out):
            missing.append(replay_item(pid))
        if pid == "19b" and _lean_absent(out):
            missing.append(LEAN_ITEM)
    return {
        "schema": REVIEW_SCHEMA,
        "receipt_sha256": hashlib.sha256(raw).hexdigest(),
        "operator": receipt.get("operator"),
        "commit": receipt.get("commit"),
        "machine": receipt.get("machine"),
        "phases": phases,
        "not_exercised": sorted(missing),
        "custody": "as the operator states it in the receipt's note; not established by this review",
    }


def _receipts():
    return sorted(
        p
        for p in RECEIPTS_DIR.glob("*.json")
        if p.is_file() and p.name != "discrepancy-template.json"
    )


def _committed_review(path):
    """The review beside a receipt, or None unless it equals the recomputation."""
    try:
        saved = json.loads(review_path(path).read_text())
        return saved if saved == review(path.read_bytes()) else None
    except (OSError, ValueError):
        return None


def status():
    paths = _receipts()
    reviews = [_committed_review(p) for p in paths]
    done = [r for r in reviews if r is not None]
    outstanding = set(outside_items())
    for r in done:
        outstanding &= set(r["not_exercised"])
    if not paths:
        state = "owed"
    elif len(done) < len(paths):
        state = "receipt_received_not_yet_reviewed"
    else:
        state = "reviewed_discrepancies_published"
    return {
        "iou": "IOU-19-OPERATOR",
        "status": state,
        "operator_receipts": [p.name for p in paths],
        "not_yet_replayed_outside": sorted(outstanding),
        "note": "a received receipt does not pay the IOU; the review and the published discrepancies do, for what the receipt exercised; what no reviewed receipt exercised stays owed",
    }


def status_lines():
    s = status()
    head = "Generated by `tools/assurance-provenance/handoff19.py render`; the test asserts this file equals the"
    if s["status"] == "owed":
        return [
            head,
            "render. Status: `IOU-19-OPERATOR` is owed until a receipt is reviewed and its discrepancies published.",
        ]
    if s["status"] == "receipt_received_not_yet_reviewed":
        return [
            head,
            "render. Status: a receipt is received and not yet reviewed; `IOU-19-OPERATOR` is owed.",
        ]
    left = ", ".join(s["not_yet_replayed_outside"])
    return [
        head,
        f"render. Status: {len(s['operator_receipts'])} outside receipt(s) reviewed, every discrepancy published under",
        "`operator-reviews/`. Not yet replayed outside the author's custody, and still owed under `IOU-19-OPERATOR`:",
        f"{left}."
        if left
        else "nothing; every item has been exercised by a reviewed receipt.",
    ]


def render():
    lines = [
        "# Outside-operator handoff: Phase 19 packs",
        "",
        *status_lines(),
        "",
        "## What you are being asked to do",
        "",
        f"Clone the published commit onto a machine the author has never touched, run {NUMBER_WORDS[len(PHASES)]} verify commands,",
        "and send back what they printed. You receive no file from the author other than this repository.",
        "If anything in this document does not match what you see, that mismatch is the result we want.",
        "",
        "## Custody rules",
        "",
        "- Clone from the published remote at the commit named in the request. Do not accept a zip, a",
        "  patch or a pack file from the author.",
        "- Edit nothing. If a command fails, record the failure and move on.",
        "- Run each command from the repository root with a Python 3.12 interpreter you installed.",
        "- Return the verifier's JSON output verbatim per phase, and a short note naming your OS,",
        "  architecture, Python version, Lean version if any, and the commit.",
        "",
        "## Host recipes",
        "",
        "- 19b, 19g and the test suite import the frozen successor chain, which imports `openai` when it",
        "  loads. No model is called (every receipt says `model_inference: false`), but a bare Python 3.12",
        "  exits with `ModuleNotFoundError: No module named 'openai'` before verifying anything. Install the",
        "  verify set first, a hash-locked subset of the SDK lock, and run those commands with its interpreter:",
        "  `python -m venv .venv-verify && .venv-verify/bin/pip install --require-hashes --only-binary=:all:",
        f"  -r {VERIFY_LOCK_REL}`. Installed and run on Linux x86_64 and macOS arm64;",
        "  its wheels also resolve for macOS x86_64. 19a, 19c, 19d, 19e, 19h, 19i, 19j, 19k, 19l, 19m, 19n, 19o and 19p",
        "  need nothing beyond the standard library unless `--replay` is added.",
        "- 19a, 19j, 19l and 19p with `--replay` (Linux x86_64 only: the full set has no macOS x86_64 wheel for `cryptography`,",
        "  so it is not a substitute for the verify set there): create a venv and install the hash-locked set:",
        "  `python -m venv .venv && .venv/bin/pip install --require-hashes --only-binary=:all:",
        "  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock`, then",
        "  `.venv/bin/python -B tools/replay-preflight/preflight.py` must print `preflight passed`. The",
        "  clone needs full history (`git clone`, not a tarball): the replay checks the Phase 17 freeze commit.",
        "  19j, 19l and 19p dispatch every recorded `send_report` call through the frozen pipeline again and",
        "  compare the whole report; without `--replay` they check the pack's structure against the lanes",
        "  it replays and print `kind: structure_checked`.",
        "- 19h, 19i and 19k hold model outputs captured on Apple Silicon. Their verifiers recompute every",
        "  outcome and statistic from the committed outputs and run no model; they cannot tell whether an",
        "  output is what a model produced. Recapturing is not part of this handoff.",
        "- 19b: Lean 4.15.0 on PATH (`proofs/phase19/lean-toolchain`) for the Lean fields. On Linux x86_64",
        "  `bash scripts/install-elan-toolchain proofs/phase19/lean-toolchain` installs elan and the pinned",
        "  toolchain, and falls back to a sha256-pinned GitHub release tarball when `releases.lean-lang.org`",
        "  is down; elsewhere `elan` installs it. Without Lean the receipt reports",
        "  `lean.type_checked_on_this_host` and `lean.differential_passed_on_this_host` as `null`,",
        "  `closed_by.lean_differential_passed_on_this_host: false` and `phase_19b_closed: false` for your",
        "  host; the comparator then lists those four under `not_compared` with the reason instead of",
        "  comparing them, and 19b closure is verified only on a host with Lean. Every other 19b field is",
        "  compared either way. `tests/test_evidence19b.py` asserts closure only where `lean` is on the path.",
        "- 19d: a Linux host where `unshare --user --map-root-user --net true` succeeds and `setpriv` exists.",
        "  Run it, and the namespace tests, with an interpreter an unmapped uid can execute (`/usr/bin/python3`,",
        "  or a venv outside a private home directory): inside `unshare --map-root-user` every uid but yours",
        "  is unmapped, and a venv under a `0750` home fails with `worker_failed:126 … Permission denied`.",
        "  Expect the verifier to list which well-known Unix sockets your host still exposes inside the",
        "  hardened namespace (`unix_sockets_reachable`, and `unix_socket_egress_eliminated` with it); that",
        "  list is yours and the comparator reports it under `not_compared`, never as a discrepancy.",
        "",
        "## What the comparator does and does not check",
        "",
        "`handoff19.py check` compares every receipt field except `tree_state`, `host` and `replay` with the",
        "committed receipt and flags a missing, differing or unexpected field. It prints a JSON object:",
        "`discrepancies` (that list) and `not_compared` (the host-dependent fields it left out, with your",
        "value and the reason: for 19d the two socket fields; for 19b the four Lean-dependent fields, and",
        "only when your receipt says Lean was absent). Nothing else is waived. It cannot see whether the",
        "`--replay` run happened: a receipt whose `replay.result` says `verified` is taken at its word and",
        "then expected to read `kind: frozen_replay_chained` (19a) or `frozen_replay_recomputed` (19j, 19l, 19p).",
        "Your verbatim verifier output and your note are what make that claim checkable; the comparator",
        "alone does not.",
        "",
        "## Phases",
        "",
    ]
    for p in PHASES:
        lines += [
            f"### {p['id']}",
            "",
            f"Host: {p['host']}. Time: {p['time']}.",
            "",
            "```sh",
            f"python -B tools/assurance-provenance/{p['module']} verify \\",
            f"  {p['docs']}/evidence.zip \\",
            f'  --expected-root "$(cat {p["docs"]}/ROOT.sha256)"',
            "```",
            "",
            f"Expected root: `{committed_root(p['id'])}`.",
            "",
            "Expected receipt fields (host-dependent fields `tree_state`, `host` and `replay` are not compared):",
            "",
            "```json",
            json.dumps(expected_fields(p["id"]), indent=2, sort_keys=True),
            "```",
            "",
        ]
        if p["id"] in STRUCTURE_ONLY_KIND:
            lines += [
                f"The committed receipt was produced with `--replay`. Without it `kind` reads "
                f"`{STRUCTURE_ONLY_KIND[p['id']]}`;",
                "the comparator expects whichever matches your own `replay.result`.",
                "",
            ]
        elif p["id"] in REPLAY_CHAINED_KIND:
            lines += [
                f"With `--replay`, a receipt whose `replay.result` is `verified` reads `kind`: "
                f"`{REPLAY_CHAINED_KIND[p['id']]}`;",
                "the comparator expects that pairing, and the committed `kind` otherwise.",
                "",
            ]
    lines += [
        "## Tests",
        "",
        "```sh",
        "cd tools/assurance-provenance && python -m unittest discover -s tests -v",
        "```",
        "",
        "Run it with the verify-set interpreter (Host recipes); a bare Python 3.12 fails at import.",
        "About thirty minutes on a laptop or a hosted runner, sixty to ninety minutes on a small server. The",
        "Lean differential test and the 19d namespace tests skip, not pass, where their host requirement is",
        "unmet, and `test_evidence19b` asserts 19b closure only where `lean` is on the path; the receipt you",
        "return should say which skipped and whether Lean was present.",
        "",
        "## Returning the receipt",
        "",
        "Fill `docs/research/provenance-phase-19f/discrepancy-template.json` and send it back. The author will",
        "run the comparator on each phase and publish every discrepancy, including none:",
        "",
        "```sh",
        "python -B tools/assurance-provenance/handoff19.py check 19b <your-19b-receipt.json>",
        "```",
        "",
        "An empty `discrepancies` list is no discrepancy; `not_compared` is published with it. Your file",
        "will be committed under",
        "`docs/research/provenance-phase-19f/operator-receipts/` unchanged, with your name as you give it.",
        "The author's review, recomputed from your file by `handoff19.py review`, is committed beside it under",
        "`operator-reviews/`; your note is published as you wrote it.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("render")
    sub.add_parser("template")
    sub.add_parser("status")
    rev = sub.add_parser("review")
    rev.add_argument("receipt", type=Path)
    chk = sub.add_parser("check")
    chk.add_argument("phase")
    chk.add_argument("receipt", type=Path)
    args = parser.parse_args()
    if args.command == "render":
        print(render(), end="")
    elif args.command == "template":
        print(json.dumps(discrepancy_template(), indent=2, sort_keys=True))
    elif args.command == "status":
        print(json.dumps(status(), indent=2, sort_keys=True))
    elif args.command == "review":
        print(json.dumps(review(args.receipt.read_bytes()), indent=2, sort_keys=True))
    else:
        receipt = json.loads(args.receipt.read_text())
        print(
            json.dumps(
                {
                    "discrepancies": check(args.phase, receipt),
                    "not_compared": not_compared(args.phase, receipt),
                },
                indent=2,
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
