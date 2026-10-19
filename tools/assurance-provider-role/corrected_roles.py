# ruff: noqa: E402
"""Separate declared correction: application authority uses the developer role."""

import argparse
import re
import subprocess
import sys
import tempfile
import urllib.request
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-transfer"))
from transfer import (
    Budget,
    OpenAI,
    NoRedirect,
    RESERVE,
    WORKFLOWS,
    request,
    decode,
    sha,
    workflow_inputs,
    workflow_second,
    transition,
    workflow_dispatch,
    workflow_replay,
)
from transfer_deps import composed, wire, loads, write_pack
from transfer_study import check_protocol, check_call, check_raw, read_pack

DOCS = ROOT / "docs/research/provider-role-phase-17b"


def first_input(case):
    rows = workflow_inputs(case)
    rows[1]["role"] = "developer"
    return rows


def second_input(case, first):
    rows = workflow_second(case, first)
    rows[1]["role"] = "developer"
    rows[-1]["role"] = "developer"
    return rows


class CorrectiveBudget(Budget):
    def reserve(self, identity):
        if len(self.ids) >= 16 or RESERVE * (64 + len(self.ids) + 1) > Decimal("1"):
            raise ValueError("combined_budget")
        return super().reserve(identity)


class CorrectedClient(OpenAI):
    def __init__(self, key, directory):
        self.key = key
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=False)
        self.budget = CorrectiveBudget(self.directory / "budget.jsonl")
        self.opener = urllib.request.build_opener(NoRedirect())


def sources():
    return [
        *sorted(
            str(p.relative_to(ROOT))
            for p in (ROOT / "tools/assurance-provider-role").rglob("*.py")
        ),
        "docs/research/provider-role-phase-17b/DESIGN.md",
        "docs/research/provider-role-phase-17b/baseline.json",
    ]


def freeze(base):
    ledger = (base / "api/budget.jsonl").read_bytes()
    rows = [loads(x) for x in ledger.splitlines()]
    if (
        len(rows) != 64
        or [r["attempt"] for r in rows] != list(range(1, 65))
        or len({r["id"] for r in rows}) != 64
        or any(r["reserved_usd"] != str(RESERVE) for r in rows)
    ):
        raise ValueError("original_budget_inventory")
    original = (base / "workflows.json").read_bytes()
    cap = loads(original)
    if [r["case"] for r in cap["rows"]] != list(WORKFLOWS):
        raise ValueError("original_workflows")
    baseline = {
        "freeze_commit": cap["metadata"]["freeze_commit"],
        "ledger_sha256": sha(ledger),
        "workflows_sha256": sha(original),
        "original_attempts": 64,
    }
    (DOCS / "baseline.json").write_bytes(wire(baseline))
    (DOCS / "protocol.json").write_bytes(
        wire(
            {
                "schema": "simurgh-host-role-v1",
                "sources": {n: sha((ROOT / n).read_bytes()) for n in sources()},
                "base_protocol_sha256": sha(
                    (
                        ROOT / "docs/research/transfer-phase-17/protocol.json"
                    ).read_bytes()
                ),
                "maximum_new_attempts": 16,
            }
        )
    )


def check(commit):
    if not re.fullmatch("[0-9a-f]{40}", commit):
        raise ValueError("freeze_commit")
    p = loads((DOCS / "protocol.json").read_bytes())
    baseline = loads((DOCS / "baseline.json").read_bytes())
    check_protocol(baseline["freeze_commit"])
    if (
        p["schema"] != "simurgh-host-role-v1"
        or set(p["sources"]) != set(sources())
        or p["maximum_new_attempts"] != 16
        or p["base_protocol_sha256"]
        != sha((ROOT / "docs/research/transfer-phase-17/protocol.json").read_bytes())
    ):
        raise ValueError("role_protocol")
    for n, h in p["sources"].items():
        if sha((ROOT / n).read_bytes()) != h:
            raise ValueError("role_source_binding")
    for n in [*sources(), str((DOCS / "protocol.json").relative_to(ROOT))]:
        if (
            subprocess.check_output(["git", "show", commit + ":" + n], cwd=ROOT)
            != (ROOT / n).read_bytes()
        ):
            raise ValueError("role_source_not_frozen")
    return baseline


def capture(out, base, key_file):
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    baseline = check(commit)
    ledger = (base / "api/budget.jsonl").read_bytes()
    original = (base / "workflows.json").read_bytes()
    if (
        sha(ledger) != baseline["ledger_sha256"]
        or sha(original) != baseline["workflows_sha256"]
    ):
        raise ValueError("baseline_changed")
    keys = re.findall(r"sk-[A-Za-z0-9_-]{20,}", key_file.read_text())
    if len(keys) != 1:
        raise ValueError("key_shape")
    out.mkdir(parents=True, exist_ok=False)
    client = CorrectedClient(keys[0], out / "api")
    cap = {
        "metadata": {
            "freeze_commit": commit,
            "protocol_sha256": sha((DOCS / "protocol.json").read_bytes()),
        },
        "rows": [],
    }
    files = {}
    try:
        for case in WORKFLOWS:
            f = composed.Fixture(
                "transfer-" + case, "composed", out / "fixtures" / case
            )
            try:
                first = client.call(
                    "corrected-" + case + "-read", request(first_input(case), read=True)
                )
                transition(f, case)
                second = None
                if (
                    first["status"] == "received"
                    and decode(first["response"], read=True)["status"] == "read"
                ):
                    second = client.call(
                        "corrected-" + case + "-decision",
                        request(second_input(case, first["response"])),
                    )
                proposal = (
                    decode(second["response"])
                    if second and second["status"] == "received"
                    else {"status": "generation_error"}
                )
                row, raw = workflow_dispatch(f, case, proposal)
                cap["rows"].append(dict(row, first=first, second=second))
                files.update(raw)
                (out / "capture.json").write_bytes(wire(cap))
                print(case, row["status"], flush=True)
            finally:
                f.service.close()
    finally:
        client.close()
    files.update(
        {
            "capture.json": wire(cap),
            "budget.jsonl": (out / "api/budget.jsonl").read_bytes(),
            "original-budget.jsonl": ledger,
            "original-workflows.json": original,
        }
    )
    if any(keys[0].encode() in b for b in files.values()):
        raise ValueError("credential_in_evidence")
    result = verify(files)
    files["report.json"] = wire(result)
    root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(root + "\n")
    (out / "report.json").write_bytes(wire(result))
    print("verified corrected workflow", root, flush=True)


def verify(files):
    files = dict(files)
    saved = loads(files.pop("report.json")) if "report.json" in files else None
    cap = loads(files.pop("capture.json"))
    baseline = check(cap["metadata"]["freeze_commit"])
    if cap["metadata"]["protocol_sha256"] != sha((DOCS / "protocol.json").read_bytes()):
        raise ValueError("protocol_binding")
    if (
        sha(files.pop("original-budget.jsonl")) != baseline["ledger_sha256"]
        or sha(files.pop("original-workflows.json")) != baseline["workflows_sha256"]
    ):
        raise ValueError("original_evidence_binding")
    ledger = [loads(x) for x in files.pop("budget.jsonl").splitlines()]
    if [r["case"] for r in cap["rows"]] != list(WORKFLOWS):
        raise ValueError("workflow_inventory")
    inventory = set()
    calls = []
    with tempfile.TemporaryDirectory(prefix="role-replay-") as td:
        for row in cap["rows"]:
            case = row["case"]
            first = row["first"]
            second = row["second"]
            check_call(
                first,
                request(first_input(case), read=True),
                "corrected-" + case + "-read",
            )
            calls.append(first)
            valid = (
                first["status"] == "received"
                and decode(first["response"], read=True)["status"] == "read"
            )
            if valid != (second is not None):
                raise ValueError("roundtrip_inventory")
            if second:
                check_call(
                    second,
                    request(second_input(case, first["response"])),
                    "corrected-" + case + "-decision",
                )
                calls.append(second)
            proposal = (
                decode(second["response"])
                if second and second["status"] == "received"
                else {"status": "generation_error"}
            )
            if wire(row["proposal"]) != wire(proposal):
                raise ValueError("proposal_binding")
            inventory.update(
                check_raw(row, files, f"snapshots/{case}-", Path(td) / "raw")
            )
            fresh, _ = workflow_replay(case, proposal, Path(td) / case)
            if wire(fresh) != wire(
                {k: v for k, v in row.items() if k not in ("first", "second")}
            ):
                raise ValueError("fresh_role_replay")
    if set(files) != inventory:
        raise ValueError("snapshot_inventory")
    if (
        not 8 <= len(calls) <= 16
        or ledger != [c["attempt"] for c in calls]
        or ledger
        != [
            {"attempt": i + 1, "id": c["id"], "reserved_usd": str(RESERVE)}
            for i, c in enumerate(calls)
        ]
    ):
        raise ValueError("corrective_budget")
    usages = [c["response"]["usage"] for c in calls if c["status"] == "received"]
    result = {
        "schema": "simurgh-host-role-report-v1",
        "rows": [
            {
                "case": r["case"],
                "proposal": r["proposal"]["status"],
                "status": r["status"],
                "new_effects": len(r["new_effects"]),
                "prior_effects": len(r["before_effects"]),
            }
            for r in cap["rows"]
        ],
        "attempts": len(calls),
        "total_attempts_including_original": 64 + len(calls),
        "total_reserved_usd": str(RESERVE * (64 + len(calls))),
        "input_tokens": sum(u["input_tokens"] for u in usages),
        "output_tokens": sum(u["output_tokens"] for u in usages),
        "conservative_estimated_usd": sum(
            u["input_tokens"] * 0.20 + u["output_tokens"] * 0.75 for u in usages
        )
        / 1e6,
    }
    if saved is not None and wire(saved) != wire(result):
        raise ValueError("role_report_mismatch")
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["freeze", "capture", "verify", "demo"])
    p.add_argument("--base", type=Path)
    p.add_argument("--out", type=Path)
    p.add_argument("--key-file", type=Path)
    p.add_argument("--archive", type=Path)
    p.add_argument("--expected-root")
    a = p.parse_args()
    if a.command == "freeze":
        freeze(a.base)
    elif a.command == "capture":
        capture(a.out, a.base, a.key_file)
    else:
        result = verify(read_pack(a.archive, a.expected_root))
        if a.command == "demo":
            for row in result["rows"]:
                print(
                    row["case"],
                    row["status"],
                    "new effects:",
                    row["new_effects"],
                    "prior:",
                    row["prior_effects"],
                )
        else:
            print(wire(result).decode(), end="")


if __name__ == "__main__":
    main()
