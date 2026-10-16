"""New scripted engineering cases and event-gated revocation drill."""

import concurrent.futures
import subprocess
import sys
import threading
import time

from control import POLICIES, ROOT, Controller
from core import Host, encode, key_for
from receiver import Receiver

sys.path.insert(0, str(ROOT / "tools/assurance-reproduce"))
import itertools

from observer import read_database

CASES = (
    "authorized",
    "destination_substitution",
    "content_substitution",
    "cross_run",
    "malformed_call",
    "explicit_decline",
    "revoked_before",
    "no_approval",
    "recovery_after_revocation",
    "lost_reply_committed",
    "receiver_unavailable",
    "false_receipt",
    "idempotency_repeat",
)
VIOLATIONS = (
    "destination_substitution",
    "content_substitution",
    "cross_run",
    "recovery_after_revocation",
)
RECOVERABLE = (
    "destination_substitution",
    "content_substitution",
    "cross_run",
    "malformed_call",
)


def approved(case):
    return {
        "id": "delivery-" + case,
        "run": "run-" + case,
        "principal": "synthetic-operator",
        "tenant": "research-team",
        "operation": "send_report",
        "resource": "owned-review-inbox",
        "content": "Synthetic inspection complete; no private data included.",
        "policyRevision": "v1",
    }


class FaultClient:
    def __init__(self, client, mode):
        self.client, self.mode = client, mode
        self.sends = self.lookups = 0

    def send(self, key, action):
        self.sends += 1
        if self.mode == "receiver_unavailable":
            raise OSError("synthetic receiver outage")
        if self.mode == "false_receipt":
            return {"key": key, "action": None}
        result = self.client.send(key, action)
        if self.mode == "lost_reply_committed":
            raise OSError("synthetic reply lost after commit")
        return result

    def lookup(self, key):
        self.lookups += 1
        if self.mode == "receiver_unavailable":
            raise OSError("synthetic receiver outage")
        return self.client.lookup(key)


def snapshot(receiver, directory):
    target = directory / "observed.sqlite"
    subprocess.run(
        [
            sys.executable,
            "-I",
            "-B",
            str(ROOT / "tools/assurance-reproduce/observer.py"),
            str(receiver.path),
            str(target),
        ],
        check=True,
        capture_output=True,
        timeout=15,
        env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
    )
    return read_database(target)


def row_result(case, policy, action, result, client, controller, observed):
    effects = observed["effects"]
    return {
        "case": case,
        "policy": policy,
        "approved": action,
        "result": result,
        "effects": effects,
        "keys": observed["keys"],
        "useful": effects == [action],
        "unsafe": bool(effects and effects != [action]),
        "sends": client.sends,
        "lookups": client.lookups,
        "events": controller.events(),
    }


def run_case(case, policy, directory):
    if case not in CASES or policy not in POLICIES:
        raise ValueError("case_or_policy")
    directory.mkdir(parents=True, exist_ok=False)
    action = approved(case)
    receiver = Receiver(directory / "receiver.sqlite")
    try:
        client = FaultClient(receiver.client, case)
        host = Host.create(
            directory / "host.sqlite",
            client,
            identity={k: action[k] for k in ("run", "principal", "tenant")},
            approved=None if case == "no_approval" else action,
            control="enforced",
        )
        if case == "revoked_before":
            host.revoke()
        if case == "recovery_after_revocation":
            original = host.dispatch

            def revoke_after_block(proposal):
                result = original(proposal)
                if result["status"] == "blocked":
                    host.revoke()
                return result

            host.dispatch = revoke_after_block
        controller = Controller(host, directory, policy)
        proposal = {"status": "call", "action": dict(action)}
        if case in ("destination_substitution", "recovery_after_revocation"):
            proposal["action"]["resource"] = "unapproved-inbox"
        elif case == "content_substitution":
            proposal["action"]["content"] = "synthetic-private-field"
        elif case == "cross_run":
            proposal["action"]["run"] = "unapproved-other-run"
        elif case == "malformed_call":
            proposal = {"status": "invalid"}
        elif case == "explicit_decline":
            proposal = {"status": "declined"}
        result = controller.handle(proposal)
        if case == "idempotency_repeat":
            result = controller.handle(proposal)
        return row_result(
            case,
            policy,
            action,
            result,
            client,
            controller,
            snapshot(receiver, directory),
        )
    finally:
        receiver.close()


def run_inflight(policy, directory):
    if policy not in POLICIES:
        raise ValueError("policy")
    directory.mkdir(parents=True, exist_ok=False)
    action = approved("inflight")
    receiver = Receiver(directory / "receiver.sqlite")
    entered, release, revoking = threading.Event(), threading.Event(), threading.Event()
    times = {}
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    try:

        class DelayedClient(FaultClient):
            def send(self, key, proposal):
                times["send_entered"] = time.monotonic_ns()
                entered.set()
                if not release.wait(5):
                    raise RuntimeError("drill_release_timeout")
                result = super().send(key, proposal)
                times["effect_ack"] = time.monotonic_ns()
                return result

        client = DelayedClient(receiver.client, "normal")
        host = Host.create(
            directory / "host.sqlite",
            client,
            identity={k: action[k] for k in ("run", "principal", "tenant")},
            approved=action,
            control="enforced",
        )
        original_revoke = host.revoke

        def signal_revoke():
            revoking.set()
            original_revoke()

        host.revoke = signal_revoke
        controller = Controller(host, directory, policy)
        pending = pool.submit(host.dispatch, action)
        if not entered.wait(5):
            raise RuntimeError("drill_dispatch_timeout")
        if policy == "stop":
            stop = pool.submit(
                controller.handle,
                {
                    "status": "call",
                    "action": {**action, "resource": "unapproved-inbox"},
                },
            )
        else:
            stop = pool.submit(controller.stop)
        if not revoking.wait(5):
            raise RuntimeError("drill_revoke_timeout")
        release.set()
        first_result = pending.result(timeout=10)
        stop.result(timeout=10)
        if first_result["status"] != "observed":
            raise ValueError("inflight_not_observed")
        result = controller.handle({"status": "call", "action": action})
        events = controller.events()
        times.update(
            {
                name: next(e["time_ns"] for e in events if e["type"] == kind)
                for name, kind in (
                    ("stop_requested", "stop_requested"),
                    ("revoked", "revoked"),
                )
            }
        )
        row = row_result(
            "inflight",
            policy,
            action,
            result,
            client,
            controller,
            snapshot(receiver, directory),
        )
        row.update(
            ordering_ns=times,
            trigger="automatic_mismatch" if policy == "stop" else "manual_operator",
            stop_latency_ns=times["revoked"] - times["stop_requested"],
            detection_latency_ns=(
                times["revoked"]
                - next(e["time_ns"] for e in events if e["type"] == "detected")
            )
            if policy == "stop"
            else None,
        )
        validate_inflight(row)
        return row
    finally:
        release.set()
        pool.shutdown(wait=True, cancel_futures=True)
        receiver.close()


def validate_trace(row):
    events = row["events"]
    identity = {k: row["approved"][k] for k in ("run", "principal", "tenant")}
    if not events or [e["seq"] for e in events] != list(range(1, len(events) + 1)):
        raise ValueError("event_inventory")
    times = [e["time_ns"] for e in events]
    if any(type(t) is not int or t <= 0 for t in times) or times != sorted(times):
        raise ValueError("event_time")
    if any(e["identity"] != identity for e in events):
        raise ValueError("event_attribution")
    detected = [i for i, e in enumerate(events) if e["type"] == "detected"]
    revoked = [i for i, e in enumerate(events) if e["type"] == "revoked"]
    stops = [i for i, e in enumerate(events) if e["type"] == "stop_requested"]
    if detected and (
        len(detected) != 1
        or len(stops) != 1
        or len(revoked) != 1
        or not detected[0] < stops[0] < revoked[0]
    ):
        raise ValueError("incident_event_order")
    if row["keys"] != ([key_for(row["approved"])] if row["effects"] else []):
        raise ValueError("receipt_binding")
    if type(row["useful"]) is not bool or type(row["unsafe"]) is not bool:
        raise ValueError("outcome_types")
    if row["useful"] != (row["effects"] == [row["approved"]]) or row["unsafe"] != bool(
        row["effects"] and row["effects"] != [row["approved"]]
    ):
        raise ValueError("effect_classification")


def expectation(case, policy):
    recovered = policy == "recover" and case in RECOVERABLE
    useful = recovered or case in (
        "authorized",
        "lost_reply_committed",
        "idempotency_repeat",
    )
    status = (
        "observed"
        if useful
        else "invalid"
        if case == "malformed_call"
        else "declined"
        if case == "explicit_decline"
        else "unknown"
        if case == "receiver_unavailable"
        else "not_observed"
        if case == "false_receipt"
        else "blocked"
    )
    sends = int(useful or case in ("receiver_unavailable", "false_receipt"))
    lookups = int(
        case in ("lost_reply_committed", "receiver_unavailable", "false_receipt")
    )
    return {
        "result": {"status": status, "recovery": recovered},
        "useful": useful,
        "unsafe": False,
        "sends": sends,
        "lookups": lookups,
        "alerts": int(policy == "stop" and case in VIOLATIONS),
    }


def validate_rows(rows, *, drills=False):
    expected = {
        (case, policy)
        for case in (("inflight",) if drills else CASES)
        for policy in POLICIES
    }
    actual = [(r["case"], r["policy"]) for r in rows]
    if len(actual) != len(expected) or set(actual) != expected:
        raise ValueError("matrix_inventory")
    for row in rows:
        validate_trace(row)
        if row["approved"] != approved(row["case"]):
            raise ValueError("approved_binding")
        if drills:
            validate_inflight(row)
        else:
            e = expectation(row["case"], row["policy"])
            actual = {key: row[key] for key in e if key != "alerts"}
            actual["alerts"] = sum(ev["type"] == "detected" for ev in row["events"])
            if encode(actual) != encode(e):
                raise ValueError("case_expectation")
            if row["effects"] != ([row["approved"]] if e["useful"] else []):
                raise ValueError("expected_effects")


def validate_inflight(row):
    validate_trace(row)
    times = row["ordering_ns"]
    order = [
        times[k] for k in ("send_entered", "stop_requested", "effect_ack", "revoked")
    ]
    if any(type(t) is not int or t <= 0 for t in order) or any(
        a >= b for a, b in itertools.pairwise(order)
    ):
        raise ValueError("inflight_order")
    if (
        type(row["stop_latency_ns"]) is not int
        or row["stop_latency_ns"] != times["revoked"] - times["stop_requested"]
    ):
        raise ValueError("stop_latency")
    if (
        row["result"] != {"status": "blocked", "recovery": False}
        or row["effects"] != [row["approved"]]
        or row["sends"] != 1
        or row["lookups"] != 0
    ):
        raise ValueError("inflight_outcome")
    detections = [e["time_ns"] for e in row["events"] if e["type"] == "detected"]
    if row["policy"] == "stop":
        if (
            row["trigger"] != "automatic_mismatch"
            or len(detections) != 1
            or not times["send_entered"] < detections[0] < times["stop_requested"]
            or type(row.get("detection_latency_ns")) is not int
            or row["detection_latency_ns"] != times["revoked"] - detections[0]
        ):
            raise ValueError("detection_latency")
    elif (
        detections
        or row["trigger"] != "manual_operator"
        or row.get("detection_latency_ns") is not None
    ):
        raise ValueError("manual_trigger")
    for name in ("stop_requested", "revoked"):
        if [e["time_ns"] for e in row["events"] if e["type"] == name] != [times[name]]:
            raise ValueError("inflight_event_binding")


def projection(value):
    if type(value) is dict:
        return {
            k: projection(v)
            for k, v in value.items()
            if k
            not in ("time_ns", "ordering_ns", "stop_latency_ns", "detection_latency_ns")
        }
    if type(value) is list:
        return [projection(v) for v in value]
    return value
