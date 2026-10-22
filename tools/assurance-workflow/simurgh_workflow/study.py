# SPDX-License-Identifier: AGPL-3.0-or-later
"""Native persisted approval workflows across application SIGKILL and restart."""

import argparse
import hashlib
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

from simurgh_durable.store import canonical, parse_json
from simurgh_redis.connector import Connector
from simurgh_redis.network import local_sockets_only
from simurgh_redis.service import VERSION, RedisService
from simurgh_redis.study import manifest as redis_manifest
from simurgh_redis.transport import request

from .process import pause_and_kill, resume_many
from .workflow import Workflow, check_versions, initialize

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
FRAMEWORKS = ("openai-agents", "langgraph")
SCENARIOS = (
    "approved_restart",
    "rejected_restart",
    "revoked_while_paused",
    "revision_while_paused",
    "checkpoint_tamper",
    "checkpoint_missing",
    "version_mismatch",
    "post_effect_crash",
    "concurrent_resumes",
    "completed_effect_loss",
    "conflicting_decision",
    "checkpoint_substitution",
)
CASE_IDS = tuple(
    f"{framework}/{scenario}" for framework in FRAMEWORKS for scenario in SCENARIOS
)


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def manifest():
    result = redis_manifest()
    own = ROOT / "tools/assurance-workflow"
    paths = list(own.rglob("*.py")) + [
        own / "requirements.in",
        own / "requirements.lock",
        ROOT / "docs/assurance/redis/evidence/report.json",
    ]
    result.update(
        {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in paths
        }
    )
    return dict(sorted(result.items()))


def state(root, endpoint):
    connector = Connector(root / "effect", endpoint)
    return {
        "workflow": Workflow(root, endpoint).stats(),
        "ledger": connector.ledger(),
        "observation": connector.observe(),
        "keys": request(endpoint, ["DBSIZE"]),
    }


def run_case(framework, scenario, directory, service):
    root = directory / "workflow"
    initialize(root, framework, ACTION)
    flow = Workflow(root, service.socket)
    pause = pause_and_kill(root, service.socket)
    before = state(root, service.socket)
    require(
        before
        == {
            "workflow": {"phase": "paused", "decision": None, "callbacks": 0},
            "ledger": {"intents": 0, "receipts": 0},
            "observation": {"available": True, "effects": []},
            "keys": 0,
        },
        "effect_before_approval",
    )
    attempts = []
    extra = {}

    def resume(decision="approve", **kwargs):
        rows = resume_many(root, service.socket, decision, **kwargs)
        attempts.extend(rows)
        return rows

    if scenario == "approved_restart":
        first = resume()[0]["result"]
        again = resume()[0]["result"]
        require(
            first["status"] == again["status"] == "completed"
            and first["toolResult"]["effectCreated"]
            and again["cached"]
            and again["toolResult"] is None,
            "approved_restart_failed",
        )
    elif scenario == "rejected_restart":
        first = resume("reject")[0]["result"]
        again = resume("reject")[0]["result"]
        require(
            first["status"] == again["status"] == "rejected"
            and first["toolResult"] is None
            and again["cached"],
            "rejection_failed",
        )
    elif scenario in ("revoked_while_paused", "revision_while_paused"):
        if scenario == "revoked_while_paused":
            flow.change_policy(revoked=True)
        else:
            flow.change_policy(revision="v2")
        result = resume()[0]["result"]
        require(
            result["status"] == "denied"
            and result["toolResult"]["reason"]
            == (
                "revoked" if scenario == "revoked_while_paused" else "revision_changed"
            ),
            "stale_authorization_accepted",
        )
    elif scenario in (
        "checkpoint_tamper",
        "checkpoint_missing",
        "version_mismatch",
        "checkpoint_substitution",
    ):
        path = root / "checkpoint.bin"
        if scenario == "checkpoint_tamper":
            path.write_bytes(path.read_bytes() + b"changed")
        elif scenario == "checkpoint_missing":
            path.unlink()
        elif scenario == "version_mismatch":
            with sqlite3.connect(root / "workflow.sqlite3") as connection:
                connection.execute("UPDATE workflow SET version='wrong'")
        else:
            donor = directory / "donor"
            initialize(
                donor,
                framework,
                {**ACTION, "run": "other-run", "principal": "other-principal"},
            )
            Workflow(donor, service.socket).pause()
            replacement = (donor / "checkpoint.bin").read_bytes()
            require(replacement != path.read_bytes(), "substitution_not_applied")
            path.write_bytes(replacement)
            extra["differentNativeCheckpoint"] = True
        result = resume()[0]["result"]
        reason = (
            "version_mismatch"
            if scenario == "version_mismatch"
            else "FileNotFoundError"
            if scenario == "checkpoint_missing"
            else "checkpoint_integrity"
        )
        require(
            result == {"status": "refused", "reason": reason},
            "invalid_checkpoint_accepted",
        )
    elif scenario == "post_effect_crash":
        crashed = resume(crash_after_effect=True)[0]
        require(
            crashed["exit"] == -9 and crashed["result"] is None,
            "post_effect_kill_failed",
        )
        extra["afterCrash"] = state(root, service.socket)
        require(
            extra["afterCrash"]["keys"] == 1
            and extra["afterCrash"]["workflow"]
            == {"phase": "paused", "decision": "approve", "callbacks": 1},
            "wrong_crash_boundary",
        )
        result = resume()[0]["result"]
        require(
            result["status"] == "completed"
            and result["toolResult"]["disposition"] == "replayed"
            and not result["toolResult"]["effectCreated"],
            "effect_repeated_after_crash",
        )
    elif scenario == "concurrent_resumes":
        rows = resume(count=4)
        require(len({r["pid"] for r in rows}) == 4, "workers_not_distinct")
        require(
            all(r["result"]["status"] == "completed" for r in rows)
            and sum(not r["result"]["cached"] for r in rows) == 1,
            "concurrent_dispatch_repeated",
        )
        attempts.sort(key=lambda row: canonical(row["result"]))
    elif scenario == "completed_effect_loss":
        require(
            resume()[0]["result"]["status"] == "completed", "initial_completion_failed"
        )
        request(
            service.socket,
            ["DEL", Connector(root / "effect", service.socket).key(ACTION)],
        )
        require(resume()[0]["result"]["status"] == "unknown", "missing_effect_hidden")
    elif scenario == "conflicting_decision":
        require(
            resume()[0]["result"]["status"] == "completed", "initial_completion_failed"
        )
        require(
            resume("reject")[0]["result"]
            == {"status": "refused", "reason": "decision_conflict"},
            "decision_replaced",
        )
    else:
        raise ValueError("unknown_scenario")
    after = state(root, service.socket)
    expected_callbacks = (
        2
        if scenario == "post_effect_crash"
        else 0
        if scenario
        in (
            "rejected_restart",
            "checkpoint_tamper",
            "checkpoint_missing",
            "version_mismatch",
            "checkpoint_substitution",
        )
        else 1
    )
    expected_effects = int(
        scenario
        in (
            "approved_restart",
            "post_effect_crash",
            "concurrent_resumes",
            "conflicting_decision",
        )
    )
    require(
        after["workflow"]["callbacks"] == expected_callbacks
        and after["keys"] == expected_effects,
        "wrong_callback_or_effect_count",
    )
    if scenario == "completed_effect_loss":
        require(not after["observation"]["available"], "lost_effect_observation_hidden")
    else:
        require(
            after["observation"]
            == {
                "available": True,
                "effects": [{"action": ACTION}] if expected_effects else [],
            },
            "wrong_observed_effects",
        )
    require(
        len({pause["pid"], *(row["pid"] for row in attempts)}) == 1 + len(attempts),
        "application_process_reused",
    )
    return {
        "id": f"{framework}/{scenario}",
        "pause": {"exit": pause["exit"], "result": pause["result"]},
        "before": before,
        "freshProcesses": True,
        "attempts": [{"exit": r["exit"], "result": r["result"]} for r in attempts],
        **extra,
        "after": after,
    }


def run_study():
    versions = check_versions()
    rows = []
    with local_sockets_only():
        for framework in FRAMEWORKS:
            for scenario in SCENARIOS:
                with tempfile.TemporaryDirectory(prefix="sw-study-") as temporary:
                    directory = Path(temporary)
                    with RedisService(directory / "redis") as service:
                        rows.append(run_case(framework, scenario, directory, service))
    require(
        tuple(row["id"] for row in rows) == CASE_IDS and len(rows) == 24,
        "invalid_case_inventory",
    )
    return {
        "schema": "simurgh.assurance-workflow.v1",
        "scope": "Single approval/tool workflow restored from a trusted native approval checkpoint after application SIGKILL; same-host Redis effect, scripted proposals, no arbitrary workflow or distributed exactly-once claim.",
        "frameworkVersions": versions,
        "redisVersion": VERSION,
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
            "frameworkVersions",
            "redisVersion",
            "sourceManifest",
            "cases",
        }
        or report["schema"] != "simurgh.assurance-workflow.v1"
        or canonical(report["sourceManifest"]) != canonical(manifest())
        or type(report["cases"]) is not list
        or len(report["cases"]) != 24
    ):
        raise ValueError("report_mismatch: shape, sources or inventory")
    if canonical(report) != canonical(run_study()):
        raise ValueError("report_mismatch: fresh workflow execution")
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
                or Path(tempfile.mkdtemp(prefix="workflow-report-")) / "report.json"
            )
            if path.exists():
                raise FileExistsError("output_exists")
            report = run_study()
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x") as stream:
                stream.write(json.dumps(report, indent=2, allow_nan=False) + "\n")
            print(json.dumps({"report": str(path), "cases": len(report["cases"])}))
        else:
            if args.report.stat().st_size > 2_000_000:
                raise ValueError("report_too_large")
            verify_report(parse_json(args.report.read_bytes()))
            print(
                "Verified: complete persisted workflow report matches fresh application processes and source hashes."
            )
    except (OSError, ValueError, RuntimeError) as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
