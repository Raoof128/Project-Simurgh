"""Native scripted credential lifecycle study; public deterministic fixture keys only."""

import hashlib
import sys
from dataclasses import replace
from pathlib import Path

from gateway import Gateway, Vault
from service import POLICIES, ROOT, decode
from transport import Credential, Service, rpc
from workflow import native_delivery

sys.path.insert(0, str(ROOT / "tools/assurance-reproduce"))
from observer import connection
from reproduce import wire

CASES = (
    "authorized",
    "vault_delete_existing",
    "vault_delete_new",
    "rotation_existing",
    "rotation_new",
    "rotate_revoke_old",
    "rotate_revoke_new",
    "credential_expiry",
    "session_expiry",
    "wrong_identity",
    "wrong_tenant",
    "wrong_scope",
    "forged_credential",
    "forged_session",
    "unauthorized_admin",
    "remote_revoke",
    "local_revoke",
    "revocation_outage",
    "lost_ack",
    "receiver_outage",
    "revoked_login",
    "cancel_session",
    "cancel_session_new",
)
OBSERVED = {
    "authorized",
    "vault_delete_existing",
    "rotation_existing",
    "rotation_new",
    "rotate_revoke_new",
    "unauthorized_admin",
    "cancel_session_new",
}
SNAPSHOT_ONLY = {"credential_expiry", "rotate_revoke_old", "remote_revoke"}
BLOCKED = {
    "vault_delete_new",
    "forged_credential",
    "local_revoke",
    "revocation_outage",
    "revoked_login",
}
UNKNOWN = {"lost_ack", "receiver_outage"}
TABLES = {
    "service": ("credentials", "effects", "events", "sessions", "state"),
    "gateway": ("config", "events", "intents", "state"),
}


def fixture_secret(case, role):
    return hashlib.sha256(("public-phase8:" + case + ":" + role).encode()).hexdigest()


def action_for(case):
    action = {
        "id": "action-" + case,
        "run": "run-" + case,
        "principal": "alice",
        "tenant": "tenant-a",
        "operation": "send_report",
        "resource": "inbox",
        "content": "Synthetic authorized report: " + case,
        "policyRevision": "v1",
    }
    if case == "wrong_identity":
        action["principal"] = "mallory"
    if case == "wrong_tenant":
        action["tenant"] = "tenant-b"
    if case == "wrong_scope":
        action["resource"] = "other-inbox"
    return action


def read_storage(path, kind):
    db = connection(path)
    try:
        schema = db.execute(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name"
        ).fetchall()
        if [(t, n) for t, n, _ in schema] != [
            ("table", n) for n in TABLES[kind]
        ] or db.execute("PRAGMA quick_check").fetchall() != [("ok",)]:
            raise ValueError("database_schema")
        return {
            "schema": [list(r) for r in schema],
            "tables": {
                n: [list(r) for r in db.execute(f'SELECT * FROM "{n}" ORDER BY 1')]
                for n in TABLES[kind]
            },
        }
    finally:
        db.close()


def observe(service_path, gateway_path):
    service = read_storage(service_path, "service")
    gateway = read_storage(gateway_path, "gateway")
    effects = [
        {"key": k, "action": decode(a), "credential_id": c, "session_id": s}
        for k, a, c, s in service["tables"]["effects"]
    ]
    state = gateway["tables"]["state"]
    if len(state) != 1:
        raise ValueError("gateway_state")
    _, stopped, revocation, seq = state[0]
    return {
        "storage": {"service": service, "gateway": gateway},
        "effects": effects,
        "gateway_state": {
            "stopped": bool(stopped),
            "revocation": revocation,
            "ack_seq": seq,
        },
    }


def run_case(case, policy, path):
    path.mkdir(parents=True, exist_ok=False)
    service = Service(
        path / "service.sqlite",
        policy,
        admin_key=fixture_secret(case, "admin"),
        issuer="issuer-" + case,
    )
    transitions = []
    retry = None
    try:
        cred = service.issue(
            "c1", "alice", "tenant-a", "inbox", 200, secret=fixture_secret(case, "c1")
        )
        vault = Vault()
        vault.put("provider", cred)
        old = vault.snapshot("provider")
        client = service.login(old)
        if case in {"vault_delete_existing", "vault_delete_new"}:
            vault.delete("provider")
            transitions.append({"kind": "vault_deleted"})
            if case == "vault_delete_new":
                try:
                    vault.snapshot("provider")
                except KeyError:
                    client = None
                    transitions.append({"kind": "new_environment_missing_credential"})
                else:
                    raise ValueError("vault_delete_failed")
        if case in {
            "rotation_existing",
            "rotation_new",
            "rotate_revoke_old",
            "rotate_revoke_new",
        }:
            replacement = service.issue(
                "c2",
                "alice",
                "tenant-a",
                "inbox",
                300,
                secret=fixture_secret(case, "c2"),
            )
            vault.put("provider", replacement)
            transitions.append({"kind": "vault_rotated", "credential_id": "c2"})
            if case.startswith("rotate_revoke"):
                transitions.append(service.revoke("c1"))
            if case in {"rotation_new", "rotate_revoke_new"}:
                client = service.login(vault.snapshot("provider"))
        if case == "credential_expiry":
            transitions.append(service.advance(200))
        if case == "session_expiry":
            transitions.append(service.advance(700))
        if case == "forged_credential":
            client = service.login(
                Credential("c1", "forged-credential-not-a-real-token")
            )
        if case == "forged_session":
            client = replace(client, secret="forged-session-bearer-with-32-characters")
        if case == "unauthorized_admin":
            transitions.append(
                rpc(
                    service.url, "/admin/revoke", {"credential_id": "c1"}, client.secret
                )
            )
        if case in {"remote_revoke", "revoked_login"}:
            transitions.append(service.revoke("c1"))
            if case == "revoked_login":
                client = service.login(old)
        if case in {"cancel_session", "cancel_session_new"}:
            transitions.append(service.cancel(client.session_id))
            if case == "cancel_session_new":
                client = service.login(old)
        action = action_for(case)
        gate = Gateway.create(path / "gateway.sqlite", client, action)
        if case == "local_revoke":
            transitions.append(gate.revoke(service.revoke))
        if case in {"receiver_outage", "revocation_outage"}:
            service.close()
            if case == "revocation_outage":
                transitions.append(gate.revoke(service.revoke))
        if case == "lost_ack":
            transitions.append(service.drop_next())
        directory = path / "native"
        directory.mkdir()
        result = native_delivery(gate, action, directory)
        if case == "lost_ack":
            gate = Gateway(path / "gateway.sqlite", client)
            directory = path / "native-retry"
            directory.mkdir()
            retry = native_delivery(gate, action, directory)
        service.close()
        row = {
            "case": case,
            "policy": policy,
            "transitions": transitions,
            "result": result,
            "retry": retry,
            **observe(path / "service.sqlite", path / "gateway.sqlite"),
        }
        (path / "row.json").write_bytes(wire(row))
        files = {
            f"snapshots/{case}-{policy}-{k}.sqlite": (
                path / (k + ".sqlite")
            ).read_bytes()
            for k in TABLES
        }
        # All fixture bearer values are intentionally public, but omit them from evidence anyway.
        secrets = [fixture_secret(case, r) for r in ("admin", "c1", "c2")]
        if client:
            secrets.append(client.secret)
        if any(
            secret.encode() in raw
            for secret in secrets
            for raw in [wire(row), *files.values()]
        ):
            raise ValueError("bearer_in_evidence")
        return row, files
    finally:
        service.close()


def expected(case, policy):
    if case in UNKNOWN:
        return "unknown"
    if case in BLOCKED:
        return "blocked"
    if case in OBSERVED or (policy == "session_snapshot" and case in SNAPSHOT_ONLY):
        return "observed"
    return "denied"


def validate(rows):
    if type(rows) is not list or [(r.get("case"), r.get("policy")) for r in rows] != [
        (c, p) for c in CASES for p in POLICIES
    ]:
        raise ValueError("matrix_inventory")
    for row in rows:
        c, p = row["case"], row["policy"]
        status = expected(c, p)
        count = int(status == "observed" or c == "lost_ack")
        if row["result"]["status"] != status or len(row["effects"]) != count:
            raise ValueError("case_outcome")
        for effect in row["effects"]:
            if effect["action"] != action_for(c):
                raise ValueError("unexpected_effect")
        for result in (row["result"], row["retry"]):
            if result is not None and (
                result["native_interrupted"] is not True
                or result["worker"] != {"path_denied": True, "socket_denied": True}
            ):
                raise ValueError("native_boundary")
        if c == "lost_ack":
            if row["retry"] is None or row["retry"]["status"] != "unknown":
                raise ValueError("unknown_retry")
        elif row["retry"] is not None:
            raise ValueError("unexpected_retry")
        if c == "revocation_outage" and row["gateway_state"] != {
            "stopped": True,
            "revocation": "unknown",
            "ack_seq": None,
        }:
            raise ValueError("false_revoke_ack")
        if c == "local_revoke" and row["gateway_state"]["revocation"] != "acknowledged":
            raise ValueError("missing_ack")


def execute(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    rows = []
    files = {}
    for case in CASES:
        for policy in POLICIES:
            row, raw = run_case(case, policy, output / (case + "-" + policy))
            rows.append(row)
            files.update(raw)
    validate(rows)
    return rows, files
