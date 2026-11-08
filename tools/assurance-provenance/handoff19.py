"""Phase 19f: outside-operator handoff package (design §6 row 19f, ``IOU-19-OPERATOR``).

Renders the handoff document from the committed receipts, states the expected fields an outside
operator must reproduce, compares a returned receipt field by field, and reports the IOU status.
Nothing here runs a lane; the replay is the operator's.
"""

import argparse
import json
from pathlib import Path

import projection

ROOT = projection.ROOT
DOCS = ROOT / "docs/research/provenance-phase-19f"
RECEIPTS_DIR = DOCS / "operator-receipts"
EXCLUDED = ("tree_state", "host", "replay")
# 19a's ``kind`` is a function of its replay result (``evidence.receipt_for``), and the replay is
# host-dependent, so the expected kind follows the operator's own replay rather than the author's.
REPLAY_CHAINED_KIND = {"19a": "frozen_replay_chained"}
PHASES = (
    {
        "id": "19a",
        "module": "evidence.py",
        "docs": "docs/research/provenance-phase-19a",
        "host": "any host with Python 3.12; on Linux x86_64 inside the hash-locked venv add --replay",
        "minutes": "under one",
    },
    {
        "id": "19b",
        "module": "evidence19b.py",
        "docs": "docs/research/provenance-phase-19b",
        "host": "any host with Python 3.12; the Lean differential test needs lean 4.15 on the path",
        "minutes": "about twelve (the lanes re-execute)",
    },
    {
        "id": "19c",
        "module": "evidence19c.py",
        "docs": "docs/research/provenance-phase-19c",
        "host": "any host with Python 3.12",
        "minutes": "about two",
    },
    {
        "id": "19d",
        "module": "evidence19d.py",
        "docs": "docs/research/provenance-phase-19d",
        "host": "Linux with user and network namespaces (sudo or a privileged container); refuses elsewhere with host_cannot_namespace",
        "minutes": "about one",
    },
    {
        "id": "19e",
        "module": "evidence19e.py",
        "docs": "docs/research/provenance-phase-19e",
        "host": "any host with Python 3.12",
        "minutes": "under one",
    },
    {
        "id": "19g",
        "module": "evidence19g.py",
        "docs": "docs/research/provenance-phase-19g",
        "host": "any host with Python 3.12",
        "minutes": "under one",
    },
)


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
    replay = receipt.get("replay")
    if (
        pid in REPLAY_CHAINED_KIND
        and type(replay) is dict
        and replay.get("result") == "verified"
    ):
        want["kind"] = REPLAY_CHAINED_KIND[pid]
    return want


def check(pid, receipt):
    """Every field that differs from, is missing against, or is absent from the committed receipt
    (an unexpected field is a discrepancy too, P19-REPAIR03)."""
    out = []
    want_all = expected_for(pid, receipt)
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
                + " <receipt.json>>",
                "refused": "<host_cannot_namespace or similar, if the verifier refused>",
            }
            for p in PHASES
        },
        "note": "<anything that did not match the handoff document, in the operator's words>",
        "signature": "<a signed line, or the operator's e-mail header, naming the above>",
    }


def status():
    files = sorted(
        p.name
        for p in RECEIPTS_DIR.glob("*.json")
        if p.is_file() and p.name != "discrepancy-template.json"
    )
    return {
        "iou": "IOU-19-OPERATOR",
        "status": "owed" if not files else "receipt_received_not_yet_reviewed",
        "operator_receipts": files,
        "note": "a received receipt does not pay the IOU; the review and the published discrepancies do",
    }


def render():
    lines = [
        "# Outside-operator handoff: Phase 19 packs",
        "",
        "Generated by `tools/assurance-provenance/handoff19.py render`; the test asserts this file equals the",
        "render. Status: `IOU-19-OPERATOR` is owed until a receipt is reviewed and its discrepancies published.",
        "",
        "## What you are being asked to do",
        "",
        "Clone the published commit onto a machine the author has never touched, run six verify commands,",
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
        "## Phases",
        "",
    ]
    for p in PHASES:
        lines += [
            f"### {p['id']}",
            "",
            f"Host: {p['host']}. Time: {p['minutes']} minute(s).",
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
        if p["id"] in REPLAY_CHAINED_KIND:
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
        "About twenty minutes. The Lean differential test and the 19d namespace tests skip, not pass, where",
        "their host requirement is unmet; the receipt you return should say which skipped.",
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
        "An empty list is no discrepancy. Your file will be committed under",
        "`docs/research/provenance-phase-19f/operator-receipts/` unchanged, with your name as you give it.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("render")
    sub.add_parser("template")
    sub.add_parser("status")
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
    else:
        print(
            json.dumps(
                check(args.phase, json.loads(args.receipt.read_text())),
                indent=2,
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
