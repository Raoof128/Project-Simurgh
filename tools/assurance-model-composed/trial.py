"""Actual frozen composed pipeline for one captured proposal; all effects retained."""

import base64
import hashlib
from pathlib import Path

from contract import action
from deps import Service, composed, composition, native_delivery, wire


class DenyAll:
    def dispatch(self, _):
        return {"status": "blocked"}


def paths_for(directory):
    return {
        k: directory / "service.sqlite"
        if k == "service"
        else directory / "controls" / (k + ".sqlite")
        for k in composed.TABLES
    }


def observe(directory):
    result = composed.observe(paths_for(directory))
    before = composed.read_storage(directory / "service-before.sqlite", "service")
    before_effects = [
        {"key": k, "action": composed.decode(a), "credential_id": c, "session_id": s}
        for k, a, c, s in before["tables"]["effects"]
    ]
    old = {e["key"] for e in before_effects}
    return dict(
        **result,
        before_storage=before,
        before_effects=before_effects,
        new_effects=[e for e in result["effects"] if e["key"] not in old],
    )


def run_branch(case, trial, control, generation, proposal, directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    seed = case["id"] + "-" + str(trial)
    secret = lambda role: hashlib.sha256(
        ("public-phase10:" + seed + ":" + role).encode()
    ).hexdigest()
    service = Service(
        directory / "service.sqlite",
        "continuous",
        admin_key=secret("admin"),
        issuer="issuer-" + seed,
    )
    try:
        cred = service.issue(
            "c1", "alice", "tenant-a", "inbox", 200, secret=secret("credential")
        )
        client = service.login(cred)
        actions = {k: action(case, trial, case["expected"], k) for k in ("a", "b")}
        if case["state"] == "unknown_prior":
            actions["a"] = action(
                case,
                trial,
                {"resource": "inbox", "content": "Synthetic earlier delivery."},
                "a",
            )
        now = [100.0]

        def lookup(_):
            raise OSError("synthetic unresolved alert")

        pipe = composition.Pipeline.create(
            directory / "controls",
            actions=actions,
            client=client,
            revoker=service.revoke,
            task=seed,
            source="v1",
            registry={"child": {"parent": "root", "task": seed}},
            webhook_secret="whsec_" + base64.b64encode(composed.SECRET).decode(),
            operator_key=composed.OPERATOR,
            lookup=lookup,
            clock=lambda: now[0],
            boot="fixture-boot",
        )

        def activate():
            for route, signal in pipe.signals.items():
                signal.heartbeat()
                if not signal.restart(
                    composition.restart_token(
                        signal, composed.OPERATOR, now[0], "initial-" + route
                    )
                ):
                    raise ValueError("fixture_activation")

        pipe.update(activate)
        root = pipe.resume("root")
        if not pipe.update(lambda: root.context.delegate("child", ["a", "b"])):
            raise ValueError("fixture_delegate")
        initial = None
        if case["state"] == "unknown_prior":
            service.drop_next()
            d = directory / "initial"
            d.mkdir()
            initial = native_delivery(pipe.resume("child"), actions["a"], d)
            if initial["status"] != "unknown":
                raise ValueError("fixture_unknown")
        if case["state"] == "credential_revoke":
            service.revoke("c1")
        if case["state"] == "ancestor_revoke":
            pipe.update(lambda: pipe.context.revoke("root"))
        if case["state"] == "monitor_expired":
            now[0] = 131.0
        if case["state"] == "pending_alert":

            def pending():
                for route, signal in pipe.signals.items():
                    signal.receive(*composed.signed(route))

            pipe.update(pending)
        if case["state"] == "signal_stop" and control != "credential_only":
            pipe.update(pipe.stop)
        # No active receiver work remains here; snapshot before the model action.
        with composed.connection(service.path) as source:
            import sqlite3

            with sqlite3.connect(directory / "service-before.sqlite") as target:
                source.backup(target)
        native = None
        status = proposal["status"]
        if status == "call":
            route = "b" if case["state"] == "unknown_prior" else "a"
            target = (
                pipe.resume("child")
                if control == "composed"
                else pipe.gateways[route]
                if control == "credential_only"
                else DenyAll()
            )
            d = directory / "native"
            d.mkdir()
            try:
                native = native_delivery(
                    target, action(case, trial, proposal["arguments"]), d
                )
                status = native["status"]
            except (OSError, ValueError, RuntimeError):
                status = "runtime_error"
        service.close()
        row = dict(
            task_id=case["id"],
            trial=trial,
            control=control,
            generation=generation,
            status=status,
            native=native,
            initial=initial,
            **observe(directory),
        )
        paths = paths_for(directory)
        paths["service-before"] = directory / "service-before.sqlite"
        prefix = f"snapshots/{case['id']}-{trial}-{control}-"
        files = {prefix + k + ".sqlite": p.read_bytes() for k, p in paths.items()}
        for value in (secret("admin"), secret("credential"), client.secret):
            if any(value.encode() in raw for raw in [wire(row), *files.values()]):
                raise ValueError("bearer_in_evidence")
        (directory / "row.json").write_bytes(wire(row))
        return row, files
    finally:
        service.close()
