# SPDX-License-Identifier: AGPL-3.0-or-later
"""Real-service conditional-write, response-loss and reconciliation evidence."""

import argparse
import asyncio
import hashlib
import json
import sys
import tempfile
from pathlib import Path

from simurgh_durable.store import FIELDS, canonical, parse_json
from simurgh_durable.study import manifest as durable_manifest
from simurgh_sdk import langgraph_adapter, openai_adapter
from simurgh_sdk.study import check_versions

from .connector import Connector, initialize
from .network import local_sockets_only
from .service import VERSION, RedisService
from .transport import DropReply, request
from .worker import run_workers

ROOT = Path(__file__).resolve().parents[3]
ACTION = {
    "id": "a1",
    "run": "r1",
    "principal": "alice",
    "tenant": "team",
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
    "cached_retry",
    "lost_reply",
    "pre_send_drop",
    *("denied_" + f for f in sorted(FIELDS)),
    "malformed_action",
    "conflicting_effect",
    "missing_effect",
    "service_restart",
    "concurrent_retries",
    "non_idempotent_control",
    *("sdk_" + name for name in ADAPTERS),
)


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def manifest():
    result = durable_manifest()
    own = ROOT / "tools/assurance-redis"
    paths = list(own.rglob("*.py")) + [
        own / "install-redis.sh",
        own / "source-lock.json",
        ROOT / "docs/assurance/durable/evidence/report.json",
    ]
    result.update(
        {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in paths
        }
    )
    return dict(sorted(result.items()))


def state(connector, endpoint):
    observation = connector.observe()
    return {
        "observation": observation,
        "ledger": connector.ledger(),
        "keys": request(endpoint, ["DBSIZE"]),
    }


async def sdk_case(framework, connector, service):
    runs, observations, runtime = [], [], []

    async def execute(action):
        row = run_workers(connector.store.root, service.socket, [action])[0]
        runs.append(row)
        return row["result"]

    async def observe():
        result = connector.observe()
        observations.append(result)
        return result

    for _ in range(2):
        runtime.append(await ADAPTERS[framework]([ACTION], execute, observe))
    require(
        len(runs) == 2 and len({r["pid"] for r in runs}) == 2,
        "sdk_workers_not_distinct",
    )
    require(
        observations
        == [
            {"available": True, "effects": []},
            {"available": True, "effects": [{"action": ACTION}]},
        ],
        "native_pause_effect_mismatch",
    )
    for index, entry in enumerate(runtime):
        require(
            entry["interruptions"] == entry["resumptions"] == 1
            and entry["tool_results"] == [runs[index]["result"]]
            and entry["pause_observations"] == [observations[index]],
            "native_lifecycle_mismatch",
        )
    require(
        [r["result"]["effectCreated"] for r in runs] == [True, False],
        "sdk_duplicate_effect",
    )
    return {
        "distinctWorkers": 2,
        "runtime": runtime,
        "attempts": [r["result"] for r in runs],
        "after": state(connector, service.socket),
    }


def case(case_id, root, service):
    connector = Connector(root, service.socket)
    if case_id == "cached_retry":
        first = connector.execute(ACTION)
        second = Connector(root, service.socket).execute(ACTION)
        require(
            first["disposition"] == "created" and second["disposition"] == "replayed",
            "cached_retry_failed",
        )
        result = {
            "attempts": [first, second],
            "after": state(connector, service.socket),
        }
        require(
            result["after"]["keys"] == 1
            and result["after"]["ledger"] == {"intents": 1, "receipts": 1},
            "duplicate_effect",
        )
        return result
    if case_id in ("lost_reply", "pre_send_drop"):
        before_send = case_id == "pre_send_drop"
        with DropReply(service.socket, before_send=before_send) as proxy:
            attempt = Connector(root, proxy.socket).execute(ACTION)
        require(
            attempt.get("outcome") == "unknown" and attempt["effectCreated"] is None,
            "response_loss_hidden",
        )
        require(
            proxy.command[0] == b"SET"
            and proxy.reply == (None if before_send else b"OK"),
            "fault_not_applied_at_declared_boundary",
        )
        before = state(connector, service.socket)
        require(
            before["keys"] == int(not before_send)
            and before["ledger"] == {"intents": 1, "receipts": 0},
            "wrong_ambiguity_state",
        )
        with DropReply(service.socket, forward=True) as recovery:
            retry = Connector(root, recovery.socket).execute(ACTION)
        require(recovery.command[0] == b"GET", "recovery_resent_write")
        if before_send:
            require(
                retry.get("reason") == "pending_effect_absent",
                "absence_laundered_as_success",
            )
        else:
            require(
                retry.get("disposition") == "recovered"
                and retry["effectCreated"] is False,
                "recovery_failed",
            )
        return {
            "upstreamReply": None if proxy.reply is None else proxy.reply.decode(),
            "attempt": attempt,
            "beforeRecovery": before,
            "recoveryCommand": "GET",
            "retry": retry,
            "after": state(connector, service.socket),
        }
    if case_id.startswith("denied_") or case_id == "malformed_action":
        action = (
            {**ACTION, "extra": True}
            if case_id == "malformed_action"
            else {**ACTION, case_id.removeprefix("denied_"): "changed"}
        )
        attempt = connector.execute(action)
        after = state(connector, service.socket)
        require(
            attempt["status"] == "denied"
            and after["keys"] == 0
            and after["ledger"] == {"intents": 0, "receipts": 0},
            "unauthorized_effect",
        )
        return {"attempt": attempt, "after": after}
    if case_id in ("conflicting_effect", "missing_effect"):
        connector.execute(ACTION)
        key = connector.key(ACTION)
        if case_id == "missing_effect":
            request(service.socket, ["DEL", key])
        else:
            request(service.socket, ["SET", key, "conflict"])
        before = request(service.socket, ["GET", key])
        attempt = connector.execute(ACTION)
        after = state(connector, service.socket)
        require(
            attempt.get("outcome") == "unknown"
            and not after["observation"]["available"],
            "damaged_effect_accepted",
        )
        require(
            request(service.socket, ["GET", key]) == before,
            "damaged_effect_overwritten",
        )
        return {"attempt": attempt, "after": after}
    if case_id == "service_restart":
        connector.execute(ACTION)
        killed = service.kill()
        require(killed == -9, "server_kill_not_injected")
        unavailable = connector.observe()
        attempt = connector.execute(ACTION)
        require(
            not unavailable["available"] and attempt.get("outcome") == "unknown",
            "service_outage_hidden",
        )
        service.start()
        retry = connector.execute(ACTION)
        require(retry.get("disposition") == "replayed", "aof_restart_lost_effect")
        return {
            "killedExit": killed,
            "unavailable": unavailable,
            "attempt": attempt,
            "retry": retry,
            "after": state(connector, service.socket),
        }
    if case_id == "concurrent_retries":
        rows = run_workers(root, service.socket, [ACTION] * 8)
        require(len({r["pid"] for r in rows}) == 8, "workers_not_distinct")
        results = sorted((r["result"] for r in rows), key=canonical)
        require(
            all(r["status"] == "executed" for r in results),
            "concurrent_completion_failed",
        )
        creators = sum(r["effectCreated"] for r in results)
        after = state(connector, service.socket)
        require(
            creators == after["keys"] == 1
            and after["ledger"] == {"intents": 1, "receipts": 1},
            "concurrent_duplicate",
        )
        return {
            "distinctWorkers": 8,
            "creators": creators,
            "attempts": results,
            "after": after,
        }
    if case_id == "non_idempotent_control":
        with DropReply(service.socket) as proxy:
            try:
                request(proxy.socket, ["RPUSH", "control", "effect"])
            except OSError:
                pass
            else:
                raise RuntimeError("response_was_not_lost")
        require(proxy.reply == 1, "control_first_effect_missing")
        require(
            request(service.socket, ["RPUSH", "control", "effect"]) == 2,
            "control_retry_not_applied",
        )
        count = request(service.socket, ["LLEN", "control"])
        require(count == 2, "control_not_exploited")
        return {
            "firstUpstreamReply": 1,
            "listElements": count,
            "scope": "Purpose-built RPUSH retry control; distinct from conditional SET semantics.",
        }
    if case_id.startswith("sdk_"):
        return asyncio.run(sdk_case(case_id.removeprefix("sdk_"), connector, service))
    raise ValueError("unknown_case")


def run_study():
    versions = check_versions()
    rows = []
    with local_sockets_only():
        for case_id in CASE_IDS:
            with tempfile.TemporaryDirectory(prefix="sr-study-") as directory:
                root = Path(directory) / "ledger"
                initialize(root, AUTHORITY)
                with RedisService(Path(directory) / "redis") as service:
                    rows.append({"id": case_id, **case(case_id, root, service)})
    require(
        len(rows) == 19 and len({r["id"] for r in rows}) == 19, "invalid_case_inventory"
    )
    return {
        "schema": "simurgh.assurance-redis.v1",
        "scope": "Actual local Redis service, conditional record writes and GET-only reconciliation; no hosted service, power-loss or distributed exactly-once claim.",
        "redisVersion": VERSION,
        "frameworkVersions": versions,
        "sourceManifest": manifest(),
        "cases": rows,
    }


def verify_report(report):
    if (
        type(report) is not dict
        or set(report)
        != {
            "schema",
            "scope",
            "redisVersion",
            "frameworkVersions",
            "sourceManifest",
            "cases",
        }
        or report["schema"] != "simurgh.assurance-redis.v1"
        or canonical(report["sourceManifest"]) != canonical(manifest())
        or type(report["cases"]) is not list
        or len(report["cases"]) != 19
    ):
        raise ValueError("report_mismatch: shape, sources or inventory")
    if canonical(report) != canonical(run_study()):
        raise ValueError("report_mismatch: fresh service execution")
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
                or Path(tempfile.mkdtemp(prefix="redis-report-")) / "report.json"
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
                "Verified: complete Redis connector report matches fresh service execution and source hashes."
            )
    except (OSError, ValueError, RuntimeError) as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
