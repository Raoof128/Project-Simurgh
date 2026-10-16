"""Owned-service phase 6 fixtures; no provider requests or model inference."""

import base64
import concurrent.futures
import hashlib
import hmac
import sqlite3
import subprocess
import sys
import threading
import time
from pathlib import Path

from signals import ROOT, SignalGate

sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import Host, encode, key_for
from receiver import Receiver
from workflow import native_delivery

sys.path.insert(0, str(ROOT / "tools/assurance-reproduce"))
from observer import connection, read_database
from reproduce import wire

POLICIES = ("local_only", "integrated")
CASES = (
    "authorized",
    "block_before",
    "stream_block_after",
    "alert_before",
    "delayed_alert_after",
    "duplicate_alert",
    "wrong_response",
    "lookup_unavailable",
    "null_reason",
    "paused_false",
    "forged_signature",
    "expired_signature",
    "monitor_missing",
    "monitor_expired",
    "monitor_restored_no_approval",
    "operator_restart",
    "stale_restart",
    "provider_restart_denied",
    "pending_restart",
    "unrelated_error",
    "unknown_effect",
)
ALLOW = {
    "authorized",
    "wrong_response",
    "forged_signature",
    "expired_signature",
    "operator_restart",
    "unrelated_error",
}
PRIOR_EFFECT = {"stream_block_after", "delayed_alert_after", "inflight"}
SECRET = b"phase6-public-synthetic-webhook-key"
OPERATOR = b"phase6-public-synthetic-operator-key"


def read_storage(path):
    """Complete normalized logical controller contents, including schemas.

    The fixture uses a fixed monotonic clock/boot, so none of these fields need
    exclusion from fresh replay. This does not attest SQLite's physical layout.
    """
    db = connection(path)
    try:
        tables = ("config", "decisions", "events", "inbox", "state")
        schema = db.execute(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name"
        ).fetchall()
        if [(kind, name) for kind, name, _ in schema] != [
            ("table", name) for name in tables
        ]:
            raise ValueError("controller_schema")
        return {
            "schema": [list(row) for row in schema],
            "tables": {
                name: [
                    list(row)
                    for row in db.execute(f'SELECT * FROM "{name}" ORDER BY 1')
                ]
                for name in tables
            },
        }
    finally:
        db.close()


def action_for(case):
    return {
        "id": "action-" + case,
        "run": "run-" + case,
        "principal": "fixture-operator",
        "tenant": "fixture-tenant",
        "operation": "send_report",
        "resource": "owned-inbox",
        "content": "Synthetic authorized report: " + case,
        "policyRevision": "v1",
    }


def signed(
    event_id="evt_fixture", alert_id="alert_fixture", *, forged=False, expired=False
):
    raw = encode(
        {
            "object": "event",
            "id": event_id,
            "type": "safety.alert.created",
            "created_at": 1700000000,
            "data": {"id": alert_id},
        }
    )
    stamp = str(int(time.time()) - (1000 if expired else 0))
    signature = base64.b64encode(
        hmac.digest(
            OPERATOR if forged else SECRET,
            f"{event_id}.{stamp}.{raw}".encode(),
            "sha256",
        )
    ).decode()
    return raw, {
        "webhook-id": event_id,
        "webhook-timestamp": stamp,
        "webhook-signature": "v1," + signature,
    }


class Fixture:
    def __init__(self, case, policy, path):
        self.case, self.policy, self.path = case, policy, Path(path)
        self.path.mkdir(parents=True, exist_ok=False)
        self.action = action_for(case)
        self.receiver = Receiver(self.path / "receiver.sqlite")
        self.host = Host.create(
            self.path / "host.sqlite",
            self.receiver.client,
            identity={k: self.action[k] for k in ("run", "principal", "tenant")},
            approved=self.action,
            control="enforced",
        )
        self.now, self.lookups, self.rejected = 100.0, 0, 0
        self.detail = {
            "id": "alert_fixture",
            "response_id": "resp_fixture",
            "request_id": "req_fixture",
            "request_paused": True,
            "reason": "synthetic concern",
        }
        self.gate = SignalGate.create(
            self.path / "gate.sqlite",
            self.host,
            project="proj_fixture",
            response_id="resp_fixture",
            request_id="req_fixture",
            webhook_secret="whsec_" + base64.b64encode(SECRET).decode(),
            operator_key=OPERATOR,
            lookup=self.lookup,
            clock=lambda: self.now,
            boot_id="fixture-boot",
        )
        self.attempts = 0
        self.initial = None

    def lookup(self, alert_id):
        self.lookups += 1
        if self.detail is None:
            raise OSError("synthetic alert lookup outage / wrong-project credentials")
        return self.detail

    def token(self, nonce):
        payload = {
            "scope": self.gate.scope,
            "revision": self.gate.state()["revision"],
            "expires": self.now + 30,
            "nonce": nonce,
        }
        return {
            "payload": payload,
            "signature": hmac.new(
                OPERATOR, encode(payload).encode(), hashlib.sha256
            ).hexdigest(),
        }

    def activate(self):
        self.gate.heartbeat()
        if not self.gate.restart(self.token("initial")):
            raise ValueError("fixture_activation")

    def provider(self):
        if self.policy == "integrated":
            self.gate.provider_error(
                "misalignment_policy_violation", response_id="resp_fixture"
            )

    def alert(self, **kwargs):
        if self.policy == "integrated":
            try:
                return self.gate.receive(*signed(**kwargs))
            except ValueError:
                self.rejected += 1
                return "rejected"
        return "ignored"

    def deliver(self):
        self.attempts += 1
        return native_delivery(
            self.gate if self.policy == "integrated" else self.host,
            self.action,
            self.path,
        )

    def finish(self, result, order=None):
        subprocess.run(
            [
                sys.executable,
                "-I",
                "-B",
                str(ROOT / "tools/assurance-reproduce/observer.py"),
                str(self.receiver.path),
                str(self.path / "observed.sqlite"),
            ],
            check=True,
            capture_output=True,
            timeout=15,
            env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        with sqlite3.connect(self.gate.path) as source:
            target = sqlite3.connect(self.path / "control.sqlite")
            try:
                source.backup(target)
            finally:
                target.close()
        observation = read_database(self.path / "observed.sqlite")
        row = dict(
            case=self.case,
            policy=self.policy,
            result=result,
            initial=self.initial,
            events=self.gate.events(),
            state=self.gate.state(),
            lookup_attempts=self.lookups,
            rejected_webhooks=self.rejected,
            delivery_attempts=self.attempts,
            order=order or [],
            storage=read_storage(self.path / "control.sqlite"),
            **observation,
        )
        (self.path / "row.json").write_bytes(wire(row))
        return row


def run_case(case, policy, path):
    f = Fixture(case, policy, path)
    try:
        if case != "monitor_missing":
            f.activate()
        if case in ("stream_block_after", "delayed_alert_after"):
            f.initial = f.deliver()
        if case in ("block_before", "stream_block_after", "provider_restart_denied"):
            f.provider()
        elif case in (
            "alert_before",
            "delayed_alert_after",
            "duplicate_alert",
            "wrong_response",
            "lookup_unavailable",
            "null_reason",
            "paused_false",
            "pending_restart",
        ):
            if case == "wrong_response":
                f.detail.update(
                    response_id="other_response", request_id="other_request"
                )
            if case in ("lookup_unavailable", "pending_restart"):
                f.detail = None
            if case == "null_reason":
                f.detail["reason"] = None
            if case == "paused_false":
                f.detail["request_paused"] = False
            f.alert()
            if case == "duplicate_alert":
                f.alert()
        elif case in ("forged_signature", "expired_signature"):
            f.alert(
                forged=case == "forged_signature", expired=case == "expired_signature"
            )
        elif case in (
            "monitor_expired",
            "monitor_restored_no_approval",
            "operator_restart",
            "stale_restart",
        ):
            old = f.token("old-review")
            f.now += 31
            if case != "monitor_expired":
                f.gate.heartbeat()
            if case == "operator_restart":
                f.gate.restart(f.token("fresh-review"))
            if case == "stale_restart":
                f.gate.restart(old)
        elif case == "unrelated_error":
            f.gate.provider_error("rate_limit_exceeded", response_id="resp_fixture")
        elif case == "unknown_effect":

            class Unavailable:
                def send(self, *args):
                    raise OSError("synthetic receiver outage")

            f.host.client = Unavailable()
        if case in ("provider_restart_denied", "pending_restart"):
            f.gate.heartbeat()
            f.gate.restart(f.token("restart-attempt"))
        return f.finish(f.deliver())
    finally:
        f.receiver.close()


def run_inflight(policy, path):
    f = Fixture("inflight", policy, path)
    entered, release, latch, finish_revoke = [threading.Event() for _ in range(4)]
    original = f.host.client
    order = []

    class HeldSend:
        def send(self, key, action):
            order.append("send_entered")
            entered.set()
            if not release.wait(10):
                raise OSError("fixture send barrier timeout")
            result = original.send(key, action)
            order.append("effect_committed")
            return result

    f.host.client = HeldSend()
    revoke = f.host.revoke

    def held_revoke():
        # Called only after the durable stop latch. Separate acknowledgement from latch.
        order.append("stop_latched")
        latch.set()
        if not finish_revoke.wait(10):
            raise OSError("fixture revoke barrier timeout")
        revoke()

    f.host.revoke = held_revoke
    try:
        f.activate()
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            sending = pool.submit(f.deliver)
            try:
                if not entered.wait(10):
                    raise ValueError("missing_inflight_send")
                if policy == "integrated":
                    stopping = pool.submit(f.provider)
                    if not latch.wait(10):
                        raise ValueError("missing_stop_latch")
                else:
                    order.append("signal_ignored")
                    stopping = None
                release.set()
                f.initial = sending.result(timeout=15)
                finish_revoke.set()
                if stopping is not None:
                    stopping.result(timeout=15)
            finally:
                release.set()
                finish_revoke.set()
        return f.finish(f.deliver(), order)
    finally:
        f.receiver.close()


def expected(case, policy):
    if case == "unknown_effect":
        return "unknown", 0
    if policy == "local_only" or case in ALLOW:
        return "observed", 1
    return "blocked", int(case in PRIOR_EFFECT)


def validate(rows):
    identities = [(r["case"], r["policy"]) for r in rows]
    required = {(c, p) for c in (*CASES, "inflight") for p in POLICIES}
    if len(identities) != len(required) or set(identities) != required:
        raise ValueError("row_inventory")
    for row in rows:
        case, policy = row["case"], row["policy"]
        status, count = expected(case, policy)
        action = action_for(case)
        if (
            row["result"]["status"] != status
            or row["result"]["native_interrupted"] is not True
            or row["result"]["worker"] != {"path_denied": True, "socket_denied": True}
            or row["effects"] != ([action] if count else [])
            or row["keys"] != ([key_for(action)] if count else [])
            or row["delivery_attempts"] != (2 if case in PRIOR_EFFECT else 1)
        ):
            raise ValueError("case_outcome:" + case + ":" + policy)
        if [e["seq"] for e in row["events"]] != list(range(1, len(row["events"]) + 1)):
            raise ValueError("event_order")
        if any(
            e["identity"] != {k: action[k] for k in ("run", "principal", "tenant")}
            for e in row["events"]
        ):
            raise ValueError("event_identity")
        if policy == "integrated":
            kinds = [e["type"] for e in row["events"]]
            if "stop_latched" in kinds:
                index = kinds.index("stop_latched")
                if "dispatch_admitted" in kinds[index + 1 :]:
                    raise ValueError("post_stop_admission")
            if (
                case in ("lookup_unavailable", "pending_restart")
                and row["state"]["pending"] != 1
            ):
                raise ValueError("lost_unknown_alert")
            if (
                case in ("forged_signature", "expired_signature")
                and row["rejected_webhooks"] != 1
            ):
                raise ValueError("signature_not_rejected")
            if case == "duplicate_alert" and row["lookup_attempts"] != 1:
                raise ValueError("duplicate_lookup")
        if case == "inflight":
            middle = "stop_latched" if policy == "integrated" else "signal_ignored"
            if row["order"] != ["send_entered", middle, "effect_committed"]:
                raise ValueError("inflight_order")


def execute(directory):
    directory.mkdir(parents=True, exist_ok=False)
    rows, files = [], {}
    for case in (*CASES, "inflight"):
        for policy in POLICIES:
            name = case + "-" + policy
            child = directory / name
            row = (
                run_inflight(policy, child)
                if case == "inflight"
                else run_case(case, policy, child)
            )
            rows.append(row)
            for filename in ("observed.sqlite", "control.sqlite"):
                files["snapshots/" + name + "-" + filename] = (
                    child / filename
                ).read_bytes()
    validate(rows)
    return rows, files
