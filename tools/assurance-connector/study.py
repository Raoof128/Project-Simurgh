"""Recomputable scripted engineering experiment, never a model benchmark."""

import argparse
import hashlib
import signal
import sqlite3
import subprocess
import sys
import tempfile
from importlib.metadata import version
from pathlib import Path

from core import CONTROLS, Host, decode, encode
from receiver import Receiver
from workflow import native_delivery

ROOT = Path(__file__).resolve().parents[2]
PROTOCOL = ROOT / "docs/research/connector-phase-2/protocol.json"
CASE_IDS = (
    "useful_summary",
    "useful_archive",
    "cross_tenant",
    "principal_spoof",
    "cross_run",
    "unapproved_destination",
    "approved_channel_secret",
    "discovered_credential",
    "stale_revision",
    "missing_approval",
    "revoked",
    "extra_argument",
    "native_rejection",
)
RECOVERY_IDS = (
    "kill_before_send",
    "kill_after_commit",
    "receiver_unavailable",
    "retry_after_revoke",
)


def base_action():
    return {
        "id": "report-1",
        "run": "run-1",
        "principal": "analyst-1",
        "tenant": "team-1",
        "operation": "send_report",
        "resource": "review-inbox",
        "content": "Approved public summary.",
        "policyRevision": "v1",
    }


def identity():
    return {k: base_action()[k] for k in ("run", "principal", "tenant")}


def observed(path):
    with sqlite3.connect(path) as db:
        return [
            decode(row[0])
            for row in db.execute("SELECT payload FROM inbox ORDER BY key")
        ]


def sources():
    paths = list(Path(__file__).parent.rglob("*.py")) + [
        PROTOCOL,
        ROOT / "tools/assurance-isolation/simurgh_isolation/kernel.py",
        ROOT / "tools/assurance-isolation/simurgh_isolation/__init__.py",
        ROOT / "tools/assurance-workflow/simurgh_workflow/native.py",
        ROOT / "tools/assurance-workflow/simurgh_workflow/__init__.py",
        ROOT / "tools/assurance-sdk/requirements.lock",
        ROOT / "tools/assurance-workflow/requirements.lock",
    ]
    return {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(paths)
    }


def recovery():
    # This child is an experiment fixture. No production fault flags are exposed.
    code = """
import os,signal,sys,json
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from core import Host
from receiver import Client
from workflow import native_delivery
class Killed(Client):
    def send(self,key,action):
        if sys.argv[5] == "after":
            super().send(key,action)
        os.kill(os.getpid(),signal.SIGKILL)
host=Host(sys.argv[2],Killed(sys.argv[3],sys.stdin.readline().strip()))
native_delivery(host,json.loads(sys.argv[4]),Path(sys.argv[2]).parent)
"""
    rows = []
    with tempfile.TemporaryDirectory(prefix="sc-recovery-") as directory:
        root = Path(directory)
        receiver = Receiver(root / "inbox.sqlite")
        try:
            host = Host.create(
                root / "host.sqlite",
                receiver.client,
                identity=identity(),
                approved=base_action(),
                control="enforced",
            )
            for stage, case, count, expected in (
                ("before", RECOVERY_IDS[0], 0, "not_observed"),
                ("after", RECOVERY_IDS[1], 1, "observed"),
            ):
                if stage == "after":
                    host = Host.create(
                        root / "after.sqlite",
                        receiver.client,
                        identity=identity(),
                        approved=base_action(),
                        control="enforced",
                    )
                child = subprocess.run(
                    [
                        sys.executable,
                        "-I",
                        "-B",
                        "-c",
                        code,
                        str(Path(__file__).parent),
                        str(host.path),
                        receiver.client.url,
                        encode(base_action()),
                        stage,
                    ],
                    input=receiver.client.token + "\n",
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
                )
                if child.returncode != -signal.SIGKILL or child.stderr:
                    raise ValueError("kill_probe_failed")
                host = Host(host.path, receiver.client)
                pending = host.dispatch(base_action())["status"]
                result = host.reconcile(base_action())["status"]
                effects = observed(receiver.path)
                if pending != "unknown" or result != expected or len(effects) != count:
                    raise ValueError("recovery_mismatch")
                rows.append(
                    {
                        "case": case,
                        "status": result,
                        "before_reconcile": pending,
                        "signal": "SIGKILL",
                        "via_native_sdk": True,
                        "effects": effects,
                    }
                )
            receiver.close()
            result = host.reconcile(base_action())["status"]
            if result != "unknown":
                raise ValueError("unknown_laundered")
            rows.append(
                {
                    "case": RECOVERY_IDS[2],
                    "status": result,
                    "effects": observed(receiver.path),
                }
            )
            host.revoke()
            result = host.dispatch(base_action(), retry=True)["status"]
            if result != "blocked" or len(observed(receiver.path)) != 1:
                raise ValueError("revoked_retry")
            rows.append(
                {
                    "case": RECOVERY_IDS[3],
                    "status": result,
                    "effects": observed(receiver.path),
                }
            )
        finally:
            receiver.close()
    return rows


def run():
    protocol = decode(PROTOCOL.read_text())
    if (
        protocol["controls"] != list(CONTROLS)
        or [c["id"] for c in protocol["cases"]] != list(CASE_IDS)
        or protocol["recovery_cases"] != list(RECOVERY_IDS)
    ):
        raise ValueError("protocol_inventory_mismatch")
    rows = []
    totals = {c: {"useful": 0, "unauthorized": 0} for c in CONTROLS}
    for case in protocol["cases"]:
        for control in CONTROLS:
            with tempfile.TemporaryDirectory(prefix="sc-matrix-") as directory:
                root = Path(directory)
                receiver = Receiver(root / "inbox.sqlite")
                try:
                    action = base_action() | case["changes"]
                    approved = action if case["grant"] == "match" else base_action()
                    if case["grant"] == "none":
                        approved = None
                    host = Host.create(
                        root / "host.sqlite",
                        receiver.client,
                        identity=identity(),
                        approved=approved,
                        control=control,
                    )
                    if case["grant"] == "revoked":
                        host.revoke()
                    result = native_delivery(
                        host, action, root, decision=case["decision"]
                    )
                    effects = observed(receiver.path)
                    expected = case["expected"][control]
                    if (
                        result["status"] != expected
                        or effects != ([action] if expected == "observed" else [])
                        or (root / "forbidden").exists()
                    ):
                        raise ValueError("case_mismatch:" + case["id"] + ":" + control)
                    if case["kind"] in ("useful", "unauthorized"):
                        totals[control][case["kind"]] += len(effects)
                    rows.append(
                        {
                            "case": case["id"],
                            "kind": case["kind"],
                            "control": control,
                            "result": result,
                            "effects": effects,
                        }
                    )
                finally:
                    receiver.close()
    return {
        "schema": protocol["schema"],
        "sources": sources(),
        "rows": rows,
        "totals": totals,
        "recovery": recovery(),
        "model_prevention_rate": None,
        "dependencies": {
            p: version(p)
            for p in (
                "openai-agents",
                "openai",
                "langgraph",
                "langgraph-checkpoint-sqlite",
            )
        },
        "limitations": [
            "scripted proposals",
            "synthetic identities",
            "trusted SDK and bootstrap",
            "same-host observer",
            "Linux x86_64 only",
            "local connector contract",
        ],
    }


def save(path, report):
    with Path(path).open("x") as target:
        target.write(encode(report) + "\n")


def verify(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 1048576:
        raise ValueError("invalid_report_file")
    report = decode(path.read_text()) if path.stat().st_size <= 16384 else None
    # Reports exceed the RPC limit; retain duplicate-key and finite parsing.
    if report is None:
        import json

        from core import unique

        report = json.loads(
            path.read_text(),
            object_pairs_hook=unique,
            parse_constant=lambda _: (_ for _ in ()).throw(ValueError("nonfinite")),
        )
    if encode(report) != encode(run()):
        raise ValueError("report_mismatch")
    return True


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--out", type=Path)
    group.add_argument("--verify", type=Path)
    args = parser.parse_args()
    if args.verify:
        verify(args.verify)
        print("Verified 39 matrix rows and four recovery observations.")
    else:
        report = run()
        save(args.out, report)
        print(encode(report["totals"]))


if __name__ == "__main__":
    main()
