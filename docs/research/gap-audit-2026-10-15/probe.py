"""Read-only source audit; mutations affect disposable copies and temporary fixtures."""

import copy
import hashlib
import importlib.util
import json
import socket
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / "tools/hf-containment"))
import gateway
import model

spec = importlib.util.spec_from_file_location(
    "native_probe", ROOT / "tools/hf-native/native.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)

results = {}
for label, module, rel in [
    ("plain", model, "hf-containment/evidence/model-capture.json"),
    ("native", native, "hf-native/evidence/capture.json"),
]:
    cap = json.loads((ROOT / "docs/assurance" / rel).read_text())
    module.validate_rows(cap)
    for value, name in [(float("nan"), "nan"), (float("inf"), "infinity")]:
        altered = copy.deepcopy(cap)
        altered["rows"][0]["seconds"] = value
        module.validate_rows(altered)
        results[f"{label}_{name}_timing_accepted_by_row_validator"] = True

real_connect = sqlite3.connect
with tempfile.TemporaryDirectory(prefix="simurgh-gap-probe-") as d:
    root = Path(d)
    g = gateway.Gateway(root, True, "misspelled-task")
    connection = socket.create_connection(g.address)
    request = {
        "token": g.tokens["valid"],
        "run": "run-a",
        "tenant": "tenant-a",
        "op": "report",
        "body": gateway.PUBLIC,
    }
    try:
        results["unknown_task_configuration_accepts_public_report"] = g.handle(request)[
            "ok"
        ]
        results["unknown_task_configuration_accepts_handoff"] = g.handle(
            dict(request, op="handoff", body=gateway.HANDOFF)
        )["ok"]
    finally:
        connection.close()
        g.close()

# Deterministic interleaving: revoke and commit after grant SELECT, before effect INSERT.
# This is an injected schedule at the DB API, not a probabilistic concurrency benchmark.
with tempfile.TemporaryDirectory(prefix="simurgh-gap-probe-") as d:
    root = Path(d)
    g = gateway.Gateway(root, True, "useful_report")
    connection = socket.create_connection(g.address)
    request = {
        "token": g.tokens["valid"],
        "run": "run-a",
        "tenant": "tenant-a",
        "op": "report",
        "body": gateway.PUBLIC,
    }

    class Cursor:
        def __init__(self, cursor):
            self.cursor = cursor

        def fetchone(self):
            old_grant = self.cursor.fetchone()
            with real_connect(g.db) as revoker:
                revoker.execute(
                    "UPDATE grants SET revoked=1 WHERE token=?", (g.tokens["valid"],)
                )
            results["revocation_committed_before_effect_insert"] = True
            return old_grant

    class DB:
        def __init__(self, *args, **kwargs):
            self.db = real_connect(*args, **kwargs)

        def __enter__(self):
            self.db.__enter__()
            return self

        def __exit__(self, *args):
            result = self.db.__exit__(*args)
            self.db.close()
            return result

        def execute(self, sql, parameters=()):
            cursor = self.db.execute(sql, parameters)
            return Cursor(cursor) if sql.startswith("SELECT run,tenant") else cursor

    try:
        gateway.sqlite3.connect = DB
        results["inflight_request_accepted_after_interleaved_revocation"] = g.handle(
            request
        )["ok"]
    finally:
        gateway.sqlite3.connect = real_connect
    results["effect_persisted_after_interleaved_revocation"] = (
        g.observed()["effects"].get("report") == gateway.PUBLIC
    )
    results["subsequent_request_denied_as_revoked"] = g.handle(request) == {
        "ok": False,
        "reason": "revoked",
    }
    connection.close()
    g.close()

assert all(results.values()), results
sources = {
    p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
    for p in [
        "tools/hf-containment/gateway.py",
        "tools/hf-containment/model.py",
        "tools/hf-native/native.py",
        "docs/assurance/hf-containment/evidence/model-capture.json",
        "docs/assurance/hf-native/evidence/capture.json",
    ]
}
print(
    json.dumps(
        {
            "schema": "simurgh-gap-probes-v1",
            "baseline_commit": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip(),
            "scope": "Row validators only for timing; synthetic gateway only; deterministic injected revocation schedule; no production exploit claim",
            "sources": sources,
            "observations": results,
        },
        indent=2,
        allow_nan=False,
    )
)
