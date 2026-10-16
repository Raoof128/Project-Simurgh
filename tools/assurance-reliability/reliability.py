"""Bounded native concurrency and actual process interruption schedules."""

import math
import multiprocessing
import queue
import sqlite3
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from reliability_deps import composed, native_delivery, observe, paths_for, wire

CASES = (
    "authorized_reopen",
    "parallel_retry",
    "parallel_siblings",
    "queued_stop",
    "update_process_kill",
    "lost_ack_reopen",
)
CONTROLS = ("credential_only", "composed")
REPETITIONS = tuple(range(5))


def routes_for(case):
    return (
        ["a"]
        if case == "authorized_reopen"
        else ["a"] * 4
        if case == "parallel_retry"
        else ["a", "b", "a", "b"]
    )


def fixture_name(case, repetition):
    return "phase13-" + case + "-" + str(repetition)


def kill_update(fixture):
    context = multiprocessing.get_context("fork")
    parent, child = context.Pipe(duplex=False)

    def target():
        parent.close()
        fixture.reopen()

        def hold():
            child.send("held")
            threading.Event().wait(30)

        fixture.pipe.update(hold)

    process = context.Process(target=target)
    process.start()
    child.close()
    try:
        if not parent.poll(10) or parent.recv() != "held":
            raise RuntimeError("update_hold_handshake")
        process.kill()
        process.join(5)
        if process.is_alive() or process.exitcode != -9:
            raise RuntimeError("update_kill_failed")
        return process.exitcode
    finally:
        if process.is_alive():
            process.kill()
            process.join(5)
        parent.close()
        process.close()


def run_case(case, repetition, control, directory):
    if (
        case not in CASES
        or type(repetition) is not int
        or repetition not in REPETITIONS
        or control not in CONTROLS
    ):
        raise ValueError("fixture_identity")
    directory = Path(directory)
    f = composed.Fixture(fixture_name(case, repetition), control, directory)
    started = time.perf_counter()
    now = lambda: time.perf_counter() - started
    transition = None
    initial = None
    try:
        if case == "lost_ack_reopen":
            f.service.drop_next()
            initial = f.deliver("a")
            if initial["status"] != "unknown":
                raise ValueError("initial_unknown")
        if case == "update_process_kill":
            begin = now()
            code = kill_update(f)
            transition = {"start": begin, "end": now(), "exit_code": code}
        f.reopen()
        with (
            composed.connection(f.service.path) as source,
            sqlite3.connect(directory / "service-before.sqlite") as target,
        ):
            source.backup(target)
        ready = queue.Queue()
        release = threading.Event()
        routes = routes_for(case)

        def worker(index, route):
            queued = now()
            ready.put(index)
            if not release.wait(15):
                raise RuntimeError("release_timeout")
            begin = now()
            native = None
            error = None
            try:
                target = (
                    f.pipe.resume(f.actor)
                    if control == "composed"
                    else f.pipe.gateways[route]
                )
                path = directory / ("call-" + str(index))
                path.mkdir()
                native = native_delivery(target, f.actions[route], path)
            except (OSError, ValueError, RuntimeError) as exc:
                error = type(exc).__name__
            return {
                "index": index,
                "route": route,
                "queued": queued,
                "started": begin,
                "finished": now(),
                "native": native,
                "error": error,
            }

        with ThreadPoolExecutor(max_workers=len(routes)) as pool:
            futures = [pool.submit(worker, i, r) for i, r in enumerate(routes)]
            try:
                if {ready.get(timeout=10) for _ in routes} != set(range(len(routes))):
                    raise ValueError("queue_inventory")
                if case == "queued_stop":
                    begin = now()
                    if control == "composed":
                        f.pipe.update(f.pipe.stop)
                    transition = {"start": begin, "end": now(), "exit_code": None}
            finally:
                release.set()
            calls = [future.result(timeout=30) for future in futures]
        f.service.close()
        row = {
            "case": case,
            "repetition": repetition,
            "control": control,
            "calls": calls,
            "initial": initial,
            "transition": transition,
            **observe(directory),
        }
        paths = paths_for(directory)
        paths["service-before"] = directory / "service-before.sqlite"
        files = {
            f"snapshots/{case}-{repetition}-{control}-{kind}.sqlite": path.read_bytes()
            for kind, path in paths.items()
        }
        for secret in (
            composed.secret(f.case, "admin"),
            composed.secret(f.case, "credential"),
            f.client.secret,
        ):
            if any(secret.encode() in raw for raw in [wire(row), *files.values()]):
                raise ValueError("bearer_in_evidence")
        (directory / "row.json").write_bytes(wire(row))
        return row, files
    finally:
        f.service.close()


def native_valid(native):
    return (
        type(native) is dict
        and set(native) == {"status", "native_interrupted", "worker"}
        and native["native_interrupted"] is True
        and native["worker"] == {"path_denied": True, "socket_denied": True}
    )


def validate_row(row):
    case = row["case"]
    rep = row["repetition"]
    control = row["control"]
    if (
        case not in CASES
        or type(rep) is not int
        or rep not in REPETITIONS
        or control not in CONTROLS
    ):
        raise ValueError("row_identity")
    routes = routes_for(case)
    if len(row["calls"]) != len(routes):
        raise ValueError("call_inventory")
    for i, (call, route) in enumerate(zip(row["calls"], routes)):
        if (
            set(call)
            != {"index", "route", "queued", "started", "finished", "native", "error"}
            or call["index"] != i
            or call["route"] != route
            or call["error"] is not None
            or not native_valid(call["native"])
        ):
            raise ValueError("call_schema")
        times = [call[k] for k in ("queued", "started", "finished")]
        if (
            any(type(v) not in (int, float) or not math.isfinite(v) for v in times)
            or not 0 <= times[0] <= times[1] <= times[2]
        ):
            raise ValueError("call_timing")
    states = Counter(c["native"]["status"] for c in row["calls"])
    enforced = control == "composed"
    if case == "authorized_reopen":
        expected = {"observed": 1}
        effects = 1
    elif case == "parallel_retry":
        expected = {"observed": 4}
        effects = 1
    elif case == "parallel_siblings":
        expected = {"observed": 2, "blocked": 2} if enforced else {"observed": 4}
        effects = 1 if enforced else 2
    elif case in ("queued_stop", "update_process_kill"):
        expected = {"blocked": 4} if enforced else {"observed": 4}
        effects = 0 if enforced else 2
    else:
        expected = (
            {"unknown": 2, "blocked": 2} if enforced else {"unknown": 2, "observed": 2}
        )
        effects = 0 if enforced else 1
    if states != Counter(expected) or len(row["new_effects"]) != effects:
        raise ValueError("schedule_outcomes")
    initial = case == "lost_ack_reopen"
    if (
        len(row["before_effects"]) != int(initial)
        or (
            initial
            and (
                not native_valid(row["initial"])
                or row["initial"]["status"] != "unknown"
            )
        )
        or (not initial and row["initial"] is not None)
    ):
        raise ValueError("initial_effect")
    actions = composed.actions_for(fixture_name(case, rep))
    all_effects = row["effects"]
    if (
        len(all_effects) != effects + int(initial)
        or row["effect_count"] != len(all_effects)
        or len({e["key"] for e in all_effects}) != len(all_effects)
    ):
        raise ValueError("effect_inventory")
    for e in all_effects + row["before_effects"] + row["new_effects"]:
        if e["action"] not in actions.values() or e["credential_id"] != "c1":
            raise ValueError("effect_action")
    old = {e["key"] for e in row["before_effects"]}
    if [e for e in all_effects if e["key"] not in old] != row["new_effects"]:
        raise ValueError("effect_attribution")
    validate_durable_state(row, actions)
    if row["held"] != (case == "update_process_kill"):
        raise ValueError("hold_state")
    trans = row["transition"]
    if case in ("queued_stop", "update_process_kill"):
        if (
            type(trans) is not dict
            or set(trans) != {"start", "end", "exit_code"}
            or any(
                type(trans[k]) not in (int, float) or not math.isfinite(trans[k])
                for k in ("start", "end")
            )
            or not 0 <= trans["start"] <= trans["end"]
        ):
            raise ValueError("transition")
        if case == "update_process_kill" and trans["exit_code"] != -9:
            raise ValueError("process_exit")
        if case == "update_process_kill" and trans["end"] > min(
            c["queued"] for c in row["calls"]
        ):
            raise ValueError("kill_queue_order")
        if case == "queued_stop" and (
            trans["exit_code"] is not None
            or max(c["queued"] for c in row["calls"]) > trans["start"]
            or trans["end"] > min(c["started"] for c in row["calls"])
        ):
            raise ValueError("queue_stop_order")
    elif trans is not None:
        raise ValueError("unexpected_transition")


def validate_durable_state(row, actions):
    """Cross-check retained routes, reservations and transition state, not only totals."""
    case = row["case"]
    enforced = row["control"] == "composed"
    effects = {e["action"]["id"]: e for e in row["effects"]}
    if len(effects) != len(row["effects"]):
        raise ValueError("duplicate_effect_route")
    if case in ("authorized_reopen", "parallel_retry") and set(effects) != {"a"}:
        raise ValueError("effect_route")
    if case == "lost_ack_reopen" and (
        row["before_effects"] != [effects.get("a")]
        or set(effects) != ({"a"} if enforced else {"a", "b"})
    ):
        raise ValueError("initial_route")
    leaf = {
        route: "unknown"
        if case == "lost_ack_reopen" and route == "a"
        else "observed"
        if route in effects
        else None
        for route in actions
    }
    if row["leaf_status"] != leaf:
        raise ValueError("leaf_outcome")
    for call in row["calls"]:
        if call["native"]["status"] != (leaf[call["route"]] or "blocked"):
            raise ValueError("route_outcome")
    storage = row["storage"]
    attempts = []
    if enforced:
        if case == "queued_stop":
            actual = storage["context"]["tables"]["attempts"]
            if len(actual) != 1 or actual[0][0] not in actions:
                raise ValueError("stop_reservation")
            attempts = [[actual[0][0], "child", "blocked"]]
        else:
            attempts = [[route, "child", leaf[route]] for route in sorted(effects)]
    if storage["context"]["tables"]["attempts"] != attempts:
        raise ValueError("durable_reservation")
    events = ["update_started", "update_completed"] * 2
    if case == "update_process_kill":
        events += ["update_started"] + (["dispatch_held"] * 4 if enforced else [])
    if case == "queued_stop" and enforced:
        events += ["update_started", "update_completed"]
    if storage["pipeline"]["tables"]["events"] != [
        [i + 1, kind] for i, kind in enumerate(events)
    ]:
        raise ValueError("pipeline_events")
    stopped = case == "queued_stop" and enforced
    for route in actions:
        intents = []
        if route in effects:
            effect = effects[route]
            if effect["session_id"] != "s1":
                raise ValueError("effect_session")
            intents = [[effect["key"], composed.encode(actions[route]), leaf[route]]]
        if storage[route + "-gateway"]["tables"]["intents"] != intents:
            raise ValueError("gateway_intent")
        state = (
            [[2, 1, 1, 130.0, 100.0, "fixture-boot"]]
            if stopped
            else [[1, 0, 0, 130.0, 100.0, "fixture-boot"]]
        )
        if storage[route + "-signal"]["tables"]["state"] != state:
            raise ValueError("signal_state")


def execute(directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    rows = []
    files = {}
    for rep in REPETITIONS:
        for case in CASES:
            for control in CONTROLS:
                row, raw = run_case(
                    case, rep, control, directory / f"{case}-{rep}-{control}"
                )
                rows.append(row)
                files.update(raw)
    return rows, files
