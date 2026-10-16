"""Native composed lifecycle matrix; owned fixtures and no model inference."""

import base64
import hashlib
import hmac
import sys
import time
from pathlib import Path

from composition import ROOT, Pipeline, encode, restart_token
from core import decode
from transport import Service
from workflow import native_delivery

sys.path.insert(0, str(ROOT / "tools/assurance-reproduce"))
from observer import connection
from reproduce import wire

sys.path.insert(0, str(Path(__file__).resolve().parent))

CASES = (
    "authorized_child",
    "authorized_grandchild",
    "signal_stop",
    "pending_alert",
    "expired_monitor",
    "operator_restart",
    "restart_after_credential_revoke",
    "ancestor_revoke",
    "source_change",
    "omitted_failure",
    "shared_budget",
    "unknown_then_sibling",
    "credential_revoke",
    "credential_expiry",
    "session_cancel",
    "lost_ack",
    "stop_after_delivery",
    "revocation_outage",
    "interrupted_transition",
    "forged_summary",
)
POLICIES = ("credential_only", "composed")
TABLES = {
    "service": ("credentials", "effects", "events", "sessions", "state"),
    "pipeline": ("config", "events", "state"),
    "context": ("attempts", "config", "events", "facts", "grants", "state"),
}
for route in ("a", "b"):
    TABLES[route + "-port"] = ("binding", "policy")
    TABLES[route + "-gateway"] = ("config", "events", "intents", "state")
    TABLES[route + "-signal"] = ("config", "decisions", "events", "inbox", "state")
SECRET = b"phase9-public-webhook-fixture-key"
OPERATOR = b"phase9-public-operator-fixture-key"


def secret(case, role):
    return hashlib.sha256(("public-phase9:" + case + ":" + role).encode()).hexdigest()


def actions_for(case):
    return {
        k: {
            "id": k,
            "run": "phase9-" + case,
            "principal": "alice",
            "tenant": "tenant-a",
            "operation": "send_report",
            "resource": "inbox",
            "content": "Synthetic report " + case + " " + k,
            "policyRevision": "v1",
        }
        for k in ("a", "b")
    }


def read_storage(path, kind):
    db = connection(path)
    try:
        schema = db.execute(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name"
        ).fetchall()
        tables = TABLES[kind]
        if [(t, n) for t, n, _ in schema] != [
            ("table", n) for n in tables
        ] or db.execute("PRAGMA quick_check").fetchall() != [("ok",)]:
            raise ValueError("raw_schema")
        return {
            "schema": [list(r) for r in schema],
            "tables": {
                n: [list(r) for r in db.execute(f'SELECT * FROM "{n}" ORDER BY 1')]
                for n in tables
            },
        }
    finally:
        db.close()


def observe(paths):
    storage = {k: read_storage(paths[k], k) for k in TABLES}
    if storage["pipeline"]["tables"]["state"] not in ([[0]], [[1]]):
        raise ValueError("pipeline_state")
    effects = [
        {"key": k, "action": decode(a), "credential_id": c, "session_id": s}
        for k, a, c, s in storage["service"]["tables"]["effects"]
    ]
    return {
        "storage": storage,
        "effects": effects,
        "effect_count": len(effects),
        "held": bool(storage["pipeline"]["tables"]["state"][0][0]),
        "leaf_status": {
            k: (
                storage[k + "-gateway"]["tables"]["intents"][0][2]
                if storage[k + "-gateway"]["tables"]["intents"]
                else None
            )
            for k in ("a", "b")
        },
    }


def signed(route):
    event = "event-" + route
    raw = encode(
        {
            "object": "event",
            "id": event,
            "type": "safety.alert.created",
            "created_at": 1700000000,
            "data": {"id": "alert-" + route},
        }
    )
    stamp = str(int(time.time()))
    signature = base64.b64encode(
        hmac.digest(SECRET, f"{event}.{stamp}.{raw}".encode(), "sha256")
    ).decode()
    return raw, {
        "webhook-id": event,
        "webhook-timestamp": stamp,
        "webhook-signature": "v1," + signature,
    }


class Fixture:
    def __init__(self, case, policy, path):
        self.case, self.policy, self.path = case, policy, Path(path)
        self.path.mkdir(parents=True, exist_ok=False)
        self.service = Service(
            self.path / "service.sqlite",
            "continuous",
            admin_key=secret(case, "admin"),
            issuer="issuer-" + case,
        )
        try:
            credential = self.service.issue(
                "c1",
                "alice",
                "tenant-a",
                "inbox",
                200,
                secret=secret(case, "credential"),
            )
            self.client = self.service.login(credential)
            self.now, self.detail_available = 100.0, True
            self.actions = actions_for(case)
            self.args = {
                "actions": self.actions,
                "client": self.client,
                "revoker": self.service.revoke,
                "task": "task-" + case,
                "source": "v1",
                "registry": {
                    name: {"parent": parent, "task": "task-" + case}
                    for name, parent in [("child", "root"), ("grandchild", "child")]
                },
                "webhook_secret": "whsec_" + base64.b64encode(SECRET).decode(),
                "operator_key": OPERATOR,
                "lookup": self.lookup,
                "clock": lambda: self.now,
                "boot": "fixture-boot",
            }
            self.pipe = Pipeline.create(self.path / "controls", **self.args)
            self.pipe.update(lambda: self.activate("initial"))
            root = self.pipe.resume("root")
            if not self.pipe.update(
                lambda: root.context.delegate(
                    "child", ["a"] if case == "forged_summary" else ["a", "b"]
                )
            ):
                raise ValueError("fixture_delegate")
            self.actor = "child"
            if case == "authorized_grandchild":
                child = self.pipe.resume("child")
                if not self.pipe.update(
                    lambda: child.context.delegate("grandchild", ["a"])
                ):
                    raise ValueError("fixture_grandchild")
                self.actor = "grandchild"
            self.initial, self.retry = None, None
            self.calls = 0
        except BaseException:
            self.service.close()
            raise

    def lookup(self, alert):
        if not self.detail_available:
            raise OSError("fixture lookup outage")
        route = alert[-1]
        return {
            "id": alert,
            "response_id": "response-" + route,
            "request_id": "request-" + route,
            "request_paused": True,
            "reason": "synthetic concern",
        }

    def activate(self, nonce):
        for route, signal in self.pipe.signals.items():
            signal.heartbeat()
            if not signal.restart(
                restart_token(signal, OPERATOR, self.now, nonce + "-" + route)
            ):
                raise ValueError("fixture_activation")

    def deliver(self, route="a", summary=None):
        self.calls += 1
        native = self.path / ("native-" + str(self.calls))
        native.mkdir()
        target = (
            self.pipe.resume(self.actor, summary=summary)
            if self.policy == "composed"
            else self.pipe.gateways[route]
        )
        return native_delivery(target, self.actions[route], native)

    def alert(self):
        for route, signal in self.pipe.signals.items():
            signal.receive(*signed(route))

    def reopen(self):
        self.pipe = Pipeline(self.path / "controls", **self.args)


def run_case(case, policy, path):
    f = Fixture(case, policy, path)
    composed = policy == "composed"
    try:
        route = (
            "b"
            if case in ("shared_budget", "unknown_then_sibling", "forged_summary")
            else "a"
        )
        if case in ("shared_budget", "unknown_then_sibling", "stop_after_delivery"):
            if case == "unknown_then_sibling":
                f.service.drop_next()
            f.initial = f.deliver()
        if case in ("credential_revoke", "restart_after_credential_revoke"):
            f.service.revoke("c1")
        if case == "credential_expiry":
            f.service.advance(200)
        if case == "session_cancel":
            f.service.cancel(f.client.session_id)
        if case == "revocation_outage":
            f.service.close()
        if composed and case in (
            "signal_stop",
            "stop_after_delivery",
            "revocation_outage",
        ):
            f.pipe.update(f.alert if case == "signal_stop" else f.pipe.stop)
        if composed and case == "pending_alert":
            f.detail_available = False
            f.pipe.update(f.alert)
        if composed and case in (
            "expired_monitor",
            "operator_restart",
            "restart_after_credential_revoke",
        ):
            f.now = 131.0
            if case != "expired_monitor":
                f.pipe.update(lambda: f.activate("operator-restart"))
        if composed and case == "ancestor_revoke":
            f.pipe.update(lambda: f.pipe.context.revoke("root"))
        if composed and case == "source_change":
            f.pipe.update(lambda: f.pipe.context.change_source("v2"))
        if composed and case == "omitted_failure":
            f.pipe.update(
                lambda: f.pipe.context.record_fact(
                    "failure", "required input absent", blocking=True
                )
            )
        if composed and case == "interrupted_transition":

            def partial():
                f.pipe.signals["a"].heartbeat()
                raise RuntimeError("fixture interrupted multi-control update")

            try:
                f.pipe.update(partial)
            except RuntimeError:
                pass
            f.reopen()
        if case == "lost_ack":
            f.service.drop_next()
        summary = None
        if composed and case in ("omitted_failure", "forged_summary"):
            summary = dict(f.pipe.context.projection(), note="untrusted fixture note")
            if case == "omitted_failure":
                summary["facts"] = []
            else:
                for grant in summary["grants"]:
                    if grant["actor"] == "child":
                        grant["actions"] = ["a", "b"]
        result = f.deliver(route, summary)
        if case == "lost_ack":
            f.reopen()
            f.retry = f.deliver()
        f.service.close()
        paths = {
            k: f.path / "service.sqlite"
            if k == "service"
            else f.path / "controls" / (k + ".sqlite")
            for k in TABLES
        }
        row = dict(
            case=case,
            policy=policy,
            result=result,
            initial=f.initial,
            retry=f.retry,
            **observe(paths),
        )
        files = {
            f"snapshots/{case}-{policy}-{k}.sqlite": p.read_bytes()
            for k, p in paths.items()
        }
        for token in (
            secret(case, "admin"),
            secret(case, "credential"),
            f.client.secret,
        ):
            if any(token.encode() in raw for raw in [wire(row), *files.values()]):
                raise ValueError("bearer_in_evidence")
        (f.path / "row.json").write_bytes(wire(row))
        return row, files
    finally:
        f.service.close()


def expected(case, policy):
    if case == "lost_ack":
        return "unknown", 1
    if policy == "credential_only":
        if case in (
            "credential_revoke",
            "credential_expiry",
            "session_cancel",
            "restart_after_credential_revoke",
        ):
            return "denied", 0
        if case == "revocation_outage":
            return "unknown", 0
        return "observed", 2 if case in ("shared_budget", "unknown_then_sibling") else 1
    if case in (
        "authorized_child",
        "authorized_grandchild",
        "operator_restart",
        "stop_after_delivery",
    ):
        return "observed", 1
    return "blocked", int(case in ("shared_budget", "unknown_then_sibling"))


def validate(rows):
    if [(r["case"], r["policy"]) for r in rows] != [
        (c, p) for c in CASES for p in POLICIES
    ]:
        raise ValueError("matrix_inventory")
    for r in rows:
        status, count = expected(r["case"], r["policy"])
        if r["result"]["status"] != status or r["effect_count"] != count:
            raise ValueError("case_outcome:" + r["case"] + ":" + r["policy"])
        for effect in r["effects"]:
            if effect["action"] not in actions_for(r["case"]).values():
                raise ValueError("unexpected_effect")
        for result in (r["result"], r["initial"], r["retry"]):
            if result is not None and (
                result["native_interrupted"] is not True
                or result["worker"] != {"path_denied": True, "socket_denied": True}
            ):
                raise ValueError("native_boundary")
        if r["case"] == "lost_ack" and (
            r["retry"] is None or r["retry"]["status"] != "unknown"
        ):
            raise ValueError("unknown_retry")
        if r["case"] != "lost_ack" and r["retry"] is not None:
            raise ValueError("unexpected_retry")
        prior = r["case"] in (
            "shared_budget",
            "unknown_then_sibling",
            "stop_after_delivery",
        )
        if (r["initial"] is not None) != prior:
            raise ValueError("initial_inventory")
        if r["case"] == "unknown_then_sibling" and r["initial"]["status"] != "unknown":
            raise ValueError("initial_unknown")


def execute(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    rows, files = [], {}
    for case in CASES:
        for policy in POLICIES:
            row, raw = run_case(case, policy, output / (case + "-" + policy))
            rows.append(row)
            files.update(raw)
    validate(rows)
    return rows, files
