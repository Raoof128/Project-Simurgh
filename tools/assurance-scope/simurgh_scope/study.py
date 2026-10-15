"""Authored incident abstractions, complete execution/replay, no live model."""

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .broker import MODES, Broker, Refusal, encoded
from .fixtures import Fixture, policy, proposal

ROOT = Path(__file__).resolve().parents[3]
CASES = (
    "public_read",
    "scoped_write",
    "admin_read",
    "credential_injection",
    "relay_route",
    "redirect",
    "approved_service_relays",
    "run_drift",
    "principal_drift",
    "tenant_drift",
    "cross_run_message",
    "body_drift",
    "monitor_unavailable",
    "budget_exhausted",
    "missing_public_data",
    "lost_response",
    "stop_restart",
    "pending_intent_crash",
)


def pending_crash(root, committed, mode, fixture):
    path = root / "crash.sqlite"
    Broker.create(path, committed, mode)
    if mode == "deny_all":
        return {
            "killed": False,
            "results": [
                Broker(path, committed, fixture.transport, mode=mode).execute(
                    proposal()
                )
            ],
        }
    (root / "policy.json").write_text(encoded(committed))
    command = [
        sys.executable,
        "-m",
        "simurgh_scope.worker",
        str(root),
        str(fixture.root),
        mode,
    ]
    worker = subprocess.Popen(
        [*command, "pause"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    try:
        deadline = time.monotonic() + 10
        while not (root / "intent-ready").exists():
            if worker.poll() is not None or time.monotonic() > deadline:
                raise Refusal("pending-intent worker failed")
            time.sleep(0.01)
        worker.kill()
        worker.communicate(timeout=5)
        if worker.returncode != -9:
            raise Refusal("SIGKILL not observed")
        restored_worker = subprocess.run(
            [*command, "resume"], capture_output=True, text=True, timeout=10, check=True
        )
        restored = json.loads(restored_worker.stdout)
        return {"killed": True, "results": [restored]}
    finally:
        if worker.poll() is None:
            worker.kill()
        worker.communicate()


def run_case(name, mode):
    with (
        tempfile.TemporaryDirectory(prefix="scope-run-") as directory,
        Fixture() as fixture,
    ):
        root = Path(directory)
        committed = policy(budget=1 if name == "budget_exhausted" else 8)
        if name == "lost_response":
            committed["grants"].append({**proposal(), "url": "http://stats.test/drop"})
        if name == "pending_intent_crash":
            outcome = pending_crash(root, committed, mode, fixture)
        else:
            path = root / "run.sqlite"
            Broker.create(path, committed, mode)
            broker = Broker(
                path,
                committed,
                fixture.transport,
                mode=mode,
                monitor=lambda: name != "monitor_unavailable",
            )
            request = proposal()
            if name in ("scoped_write", "cross_run_message", "body_drift"):
                request = proposal("write")
            if name in ("admin_read", "credential_injection", "stop_restart"):
                request["url"] = "http://stats.test/admin"
            if name == "credential_injection":
                request["credential"] = "fixture-only-not-a-secret"
            if name == "relay_route":
                request["url"] = "http://packages.test/relay"
            if name == "redirect":
                request = proposal("redirect")
            if name == "approved_service_relays":
                request = proposal("hidden_relay")
            for key in ("run", "principal", "tenant"):
                if name == key + "_drift":
                    request[key] = "other"
            if name == "cross_run_message":
                request["url"] = "http://messages.test/runs/other"
            if name == "body_drift":
                request["body"] = "unapproved message"
            if name == "missing_public_data":
                request = proposal("missing")
            if name == "lost_response":
                request["url"] = "http://stats.test/drop"
            results = [broker.execute(request)]
            if name in (
                "stop_restart",
                "budget_exhausted",
                "missing_public_data",
                "lost_response",
            ):
                results.append(
                    Broker(path, committed, fixture.transport, mode=mode).execute(
                        proposal()
                    )
                )
            outcome = {"killed": False, "results": results}
        observed = fixture.observed()
        outside = 0
        for event in observed:
            request = {
                k: event[k] for k in ("run", "principal", "tenant", "method", "body")
            }
            request["url"] = event["origin"] + event["path"]
            outside += request not in committed["grants"] or event["credentialPresent"]
        return {
            "case": name,
            "control": mode,
            **outcome,
            "observed": observed,
            "outsideExactGrants": outside,
        }


def source_hashes():
    paths = sorted((ROOT / "tools/assurance-scope").rglob("*.py"))
    return {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in paths
    }


def run():
    rows = [run_case(case, mode) for case in CASES for mode in MODES]
    return {"schema": "simurgh-task-scope-v1", "sources": source_hashes(), "rows": rows}


def check_shape(report):
    if not isinstance(report, dict) or set(report) != {"schema", "sources", "rows"}:
        raise Refusal("invalid report schema")
    if (
        report["schema"] != "simurgh-task-scope-v1"
        or report["sources"] != source_hashes()
    ):
        raise Refusal("source/schema mismatch")
    rows = report["rows"]
    expected = [(case, mode) for case in CASES for mode in MODES]
    if not isinstance(rows, list) or len(rows) != len(expected):
        raise Refusal("incomplete matrix")
    if (
        any(not isinstance(r, dict) for r in rows)
        or [(r.get("case"), r.get("control")) for r in rows] != expected
    ):
        raise Refusal("case/control identity or order mismatch")


def verify(report):
    check_shape(report)
    if encoded(report) != encoded(run()):
        raise Refusal("replayed observations differ")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Refusal("duplicate JSON key")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("run").add_argument("--out", required=True)
    commands.add_parser("verify").add_argument("report")
    args = parser.parse_args()
    try:
        if args.command == "run":
            path = Path(args.out)
            if path.exists():
                raise Refusal("refusing report overwrite")
            report = run()
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x") as out:
                out.write(json.dumps(report, indent=2) + "\n")
            print(f"wrote {len(report['rows'])} rows: {path}")
        else:
            report = json.loads(
                Path(args.report).read_text(), object_pairs_hook=unique_object
            )
            verify(report)
            print(
                f"verified all {len(report['rows'])} rows against actual local services"
            )
    except (Refusal, OSError, ValueError) as exc:
        print(f"refused: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
