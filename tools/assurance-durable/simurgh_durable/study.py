# SPDX-License-Identifier: AGPL-3.0-or-later
"""Named process-crash, replay, concurrency and SDK executor-restart experiments."""

import argparse
import asyncio
import hashlib
import json
import signal
import sqlite3
import sys
import tempfile
from pathlib import Path

from simurgh_sdk import langgraph_adapter, openai_adapter
from simurgh_sdk.network import deny_network
from simurgh_sdk.study import check_versions

from .process import run_workers
from .store import CRASH_POINTS, FIELDS, Store, canonical, initialize, parse_json

ROOT = Path(__file__).resolve().parents[3]
ACTION = {
    "id": "a1",
    "run": "run-1",
    "principal": "alice",
    "tenant": "team-1",
    "operation": "write",
    "resource": "patch",
    "content": "approved",
    "policyRevision": "v1",
}
AUTHORITY = {"revision": "v1", "actions": [ACTION]}
ADAPTERS = {
    "openai-agents": openai_adapter.run_actions,
    "langgraph": langgraph_adapter.run_actions,
}
CASE_IDS = (
    "durable_restart",
    "volatile_restart",
    "concurrent_same",
    "concurrent_distinct",
    *("crash_" + point for point in CRASH_POINTS),
    "changed_retry_after_crash",
    "authority_replacement",
    *("denied_" + field for field in sorted(FIELDS)),
    "malformed_action",
    "missing_effect",
    "corrupt_effect",
    "missing_database",
    "corrupt_database",
    "lock_timeout",
    *("sdk_restart_" + framework for framework in ADAPTERS),
)


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def manifest():
    paths = list((ROOT / "tools/assurance-durable").rglob("*.py"))
    paths += list((ROOT / "tools/assurance-sdk").rglob("*.py"))
    paths += list((ROOT / "tools/assurance-lab").glob("*.mjs"))
    paths += [
        ROOT / "tools/assurance-sdk" / name
        for name in ("bridge.mjs", "requirements.in", "requirements.lock")
    ]
    paths += [
        ROOT / "docs/assurance/evidence/report.json",
        ROOT / "docs/assurance/sdk/evidence/report.json",
    ]
    return {
        str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(paths)
    }


def inspect(root):
    store = Store(root)
    observation = store.snapshot()
    try:
        receipts = len(store.receipts())
    except (ValueError, OSError, sqlite3.Error):
        receipts = None
    return {
        "observation": observation,
        "effectCount": len(observation["effects"])
        if observation["available"]
        else None,
        "receiptCount": receipts,
        "physicalFiles": len(list((Path(root) / "effects").iterdir())),
    }


def attempt(root, action=ACTION, **kwargs):
    result = run_workers(root, [{"action": action}], **kwargs)[0]
    require(result["returncode"] == 0, "unexpected_execution_failure")
    return result


def run_local_cases(directory):
    rows = []

    def fresh(name, authority=AUTHORITY):
        path = directory / name
        initialize(path, authority)
        return path

    root = fresh("durable_restart")
    runs = [attempt(root), attempt(root)]
    require(len({r["pid"] for r in runs}) == 2, "restart_not_exercised")
    state = inspect(root)
    require(
        state["effectCount"] == state["receiptCount"] == 1, "duplicate_after_restart"
    )
    require(
        [r["result"]["effectCreated"] for r in runs] == [True, False],
        "invalid_restart_disposition",
    )
    rows.append(
        {
            "id": "durable_restart",
            "distinctWorkers": 2,
            "attempts": [r["result"] for r in runs],
            "after": state,
        }
    )

    root = fresh("volatile_restart")
    runs = [attempt(root, volatile=True), attempt(root, volatile=True)]
    effects = [
        parse_json(path.read_bytes())
        for path in sorted((root / "volatile-effects").iterdir())
    ]
    require(
        len({r["pid"] for r in runs}) == 2 and effects == [{"action": ACTION}] * 2,
        "volatile_control_not_exploited",
    )
    rows.append(
        {
            "id": "volatile_restart",
            "distinctWorkers": 2,
            "after": {"effectCount": len(effects), "effects": effects},
            "attempts": [r["result"] for r in runs],
        }
    )

    for case_id, actions in (
        ("concurrent_same", [ACTION]),
        ("concurrent_distinct", [ACTION, {**ACTION, "id": "a2", "resource": "report"}]),
    ):
        root = fresh(case_id, {"revision": "v1", "actions": actions})
        runs = run_workers(
            root, [{"action": actions[index % len(actions)]} for index in range(8)]
        )
        require(
            len({r["pid"] for r in runs}) == 8
            and all(r["returncode"] == 0 for r in runs),
            "concurrent_execution_failed",
        )
        creators = sum(r["result"]["effectCreated"] for r in runs)
        state = inspect(root)
        require(
            creators == state["effectCount"] == state["receiptCount"] == len(actions),
            "concurrent_duplicate_or_lost_work",
        )
        # Scheduler identity is intentionally omitted; sorted outcomes preserve multiplicity.
        results = sorted((r["result"] for r in runs), key=canonical)
        rows.append(
            {
                "id": case_id,
                "distinctWorkers": 8,
                "creators": creators,
                "attempts": results,
                "after": state,
            }
        )

    for point in CRASH_POINTS:
        root = fresh("crash_" + point)
        killed = run_workers(root, [{"action": ACTION, "crashAt": point}])[0]
        require(
            killed["returncode"] == -signal.SIGKILL and killed["result"] is None,
            "crash_not_injected",
        )
        before = inspect(root)
        require(
            before["effectCount"] == int(point != "before_publish")
            and before["receiptCount"] == int(point == "after_commit"),
            "wrong_crash_boundary",
        )
        retry = attempt(root)
        after = inspect(root)
        disposition = (
            "created"
            if point == "before_publish"
            else "replayed"
            if point == "after_commit"
            else "recovered"
        )
        require(
            retry["pid"] != killed["pid"]
            and retry["result"]["disposition"] == disposition,
            "wrong_recovery",
        )
        require(
            after["effectCount"] == after["receiptCount"] == 1, "crash_replay_failed"
        )
        rows.append(
            {
                "id": "crash_" + point,
                "killedExit": killed["returncode"],
                "before": before,
                "retry": retry["result"],
                "after": after,
            }
        )

    root = fresh("changed_retry_after_crash")
    killed = run_workers(root, [{"action": ACTION, "crashAt": "after_publish"}])[0]
    require(killed["returncode"] == -signal.SIGKILL, "crash_not_injected")
    denied = attempt(root, {**ACTION, "content": "substituted"})["result"]
    require(
        denied["status"] == "denied" and inspect(root)["receiptCount"] == 0,
        "changed_recovery_accepted",
    )
    recovered = attempt(root)["result"]
    require(recovered["disposition"] == "recovered", "legitimate_recovery_lost")
    rows.append(
        {
            "id": "changed_retry_after_crash",
            "denied": denied,
            "retry": recovered,
            "after": inspect(root),
        }
    )

    root = fresh("authority_replacement")
    try:
        initialize(root, {"revision": "v1", "actions": [{**ACTION, "content": "late"}]})
    except ValueError as error:
        require(str(error) == "store_not_empty", "wrong_reinitialization_failure")
    else:
        raise RuntimeError("authority_replaced")
    denied = attempt(root, {**ACTION, "content": "late"})["result"]
    require(denied["status"] == "denied", "late_grant_accepted")
    rows.append(
        {
            "id": "authority_replacement",
            "initialization": "refused",
            "attempt": denied,
            "after": inspect(root),
        }
    )

    for field in sorted(FIELDS):
        root = fresh("denied_" + field)
        result = attempt(root, {**ACTION, field: "changed"})["result"]
        state = inspect(root)
        require(
            result["status"] == "denied"
            and state["effectCount"] == state["receiptCount"] == 0,
            "binding_not_enforced",
        )
        rows.append({"id": "denied_" + field, "attempt": result, "after": state})
    root = fresh("malformed_action")
    result = attempt(root, {**ACTION, "extra": "field"})["result"]
    require(result["status"] == "denied", "malformed_action_accepted")
    rows.append({"id": "malformed_action", "attempt": result, "after": inspect(root)})

    for case_id in (
        "missing_effect",
        "corrupt_effect",
        "missing_database",
        "corrupt_database",
    ):
        root = fresh(case_id)
        if case_id.endswith("effect"):
            attempt(root)
            path = next((root / "effects").iterdir())
        else:
            path = root / "state.sqlite3"
        if case_id.startswith("missing"):
            path.unlink()
        else:
            path.write_bytes(b"corrupt")
        before = inspect(root)
        failed = run_workers(root, [{"action": ACTION}])[0]
        after = inspect(root)
        require(
            failed["returncode"] == 1 and failed["result"]["status"] == "error",
            "storage_failure_hidden",
        )
        require(
            not after["observation"]["available"] and before == after,
            "storage_failure_reexecuted",
        )
        rows.append(
            {
                "id": case_id,
                "attempt": failed["result"],
                "before": before,
                "after": after,
            }
        )

    root = fresh("lock_timeout")
    connection = sqlite3.connect(root / "state.sqlite3", isolation_level=None)
    try:
        connection.execute("BEGIN IMMEDIATE")
        try:
            Store(root, timeout=0.02).execute(ACTION)
        except sqlite3.OperationalError as error:
            require("locked" in str(error), "wrong_lock_failure")
        else:
            raise RuntimeError("lock_bypassed")
    finally:
        connection.close()
    state = inspect(root)
    require(
        state["effectCount"] == state["receiptCount"] == 0, "lock_failure_wrote_effect"
    )
    rows.append(
        {
            "id": "lock_timeout",
            "attempt": {"status": "error", "reason": "database_locked"},
            "after": state,
        }
    )
    return rows


async def run_sdk_cases(directory):
    rows = []
    for framework, adapter in ADAPTERS.items():
        root = directory / ("sdk_restart_" + framework)
        initialize(root, AUTHORITY)
        runs, observations, runtime = [], [], []

        async def execute(action, target=root, captured=runs):
            result = attempt(target, action)
            captured.append(result)
            return result["result"]

        async def observe(target=root, captured=observations):
            result = Store(target).snapshot()
            captured.append(result)
            return result

        for _ in range(2):
            runtime.append(await adapter([ACTION], execute, observe))
        require(
            len(runs) == 2 and len({r["pid"] for r in runs}) == 2,
            "sdk_restart_not_exercised",
        )
        require(
            observations
            == [
                {"available": True, "effects": []},
                {"available": True, "effects": [{"action": ACTION}]},
            ],
            "effect_before_native_approval",
        )
        for index, result in enumerate(runtime):
            require(
                result["interruptions"] == result["resumptions"] == 1
                and result["tool_results"] == [runs[index]["result"]]
                and result["pause_observations"] == [observations[index]],
                "sdk_callback_evidence_changed",
            )
        require(
            [r["result"]["effectCreated"] for r in runs] == [True, False],
            "sdk_retry_duplicated",
        )
        state = inspect(root)
        require(
            state["effectCount"] == state["receiptCount"] == 1,
            "sdk_retry_lost_or_duplicated",
        )
        rows.append(
            {
                "id": "sdk_restart_" + framework,
                "distinctWorkers": 2,
                "runtime": runtime,
                "attempts": [r["result"] for r in runs],
                "after": state,
            }
        )
    return rows


def run_study():
    versions = check_versions()
    with (
        deny_network(),
        tempfile.TemporaryDirectory(prefix="simurgh-durable-study-") as directory,
    ):
        rows = run_local_cases(Path(directory))
        rows.extend(asyncio.run(run_sdk_cases(Path(directory))))
    require(
        tuple(row["id"] for row in rows) == CASE_IDS and len(set(CASE_IDS)) == 26,
        "case_inventory_changed",
    )
    return {
        "schema": "simurgh.assurance-durable.v1",
        "scope": "Local process crashes and cooperative workers; idempotent file sink; no power-loss or distributed exactly-once claim.",
        "frameworkVersions": versions,
        "sourceManifest": manifest(),
        "cases": rows,
    }


def verify_report(report):
    if (
        type(report) is not dict
        or set(report)
        != {"schema", "scope", "frameworkVersions", "sourceManifest", "cases"}
        or report["schema"] != "simurgh.assurance-durable.v1"
        or canonical(report["sourceManifest"]) != canonical(manifest())
        or type(report["cases"]) is not list
        or len(report["cases"]) != len(CASE_IDS)
    ):
        raise ValueError("report_mismatch: shape, inventory or sources")
    if canonical(report) != canonical(run_study()):
        raise ValueError("report_mismatch: fresh execution")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("run")
    create.add_argument("--out", type=Path)
    verify = commands.add_parser("verify")
    verify.add_argument("report", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "run":
            path = (
                args.out
                or Path(tempfile.mkdtemp(prefix="simurgh-durable-report-"))
                / "report.json"
            )
            if path.exists():
                raise FileExistsError("output_exists")
            report = run_study()
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x") as stream:
                json.dump(report, stream, indent=2, allow_nan=False)
                stream.write("\n")
            print(json.dumps({"report": str(path), "cases": len(report["cases"])}))
        else:
            if args.report.stat().st_size > 2_000_000:
                raise ValueError("report_too_large")
            verify_report(parse_json(args.report.read_bytes()))
            print(
                "Verified: complete durability report matches fresh process experiments and source hashes."
            )
    except (ValueError, RuntimeError, OSError, sqlite3.Error) as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
