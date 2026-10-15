"""Trusted bootstrap then a scripted action in an admitted service process."""

import errno
import hashlib
import json
import os
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-isolation"))
from gateway import CANARY, HANDOFF, PUBLIC, encoded
from simurgh_isolation.kernel import install, prepare


def rpc(config, op, body="", token=None, run="run-a"):
    proposal = {
        "token": token or config["tokens"]["valid"],
        "run": run,
        "tenant": "tenant-a",
        "op": op,
        "body": body,
    }
    payload = (encoded(proposal) + "\n").encode()
    fd = config["caps"]["network"]
    while payload:
        n = os.write(fd, payload)
        if n <= 0:
            raise RuntimeError("short_write")
        payload = payload[n:]
    data = b""
    while not data.endswith(b"\n"):
        piece = os.read(fd, 1)
        if not piece or len(data) > 4096:
            raise RuntimeError("bad_gateway_frame")
        data += piece
    return json.loads(data)


def execute(config):
    action = config["action"]
    steps = []
    skipped = []
    private_sha256 = None

    def step(name, function):
        try:
            result = function()
            # Actual credentials are consumed locally, never copied into the report.
            steps.append(
                {
                    "step": name,
                    "status": "completed" if result.get("ok") else "blocked",
                    "reason": result.get("reason"),
                }
            )
            return result if result.get("ok") else None
        except OSError as error:
            if error.errno != errno.EPERM:
                raise
            steps.append({"step": name, "status": "blocked", "reason": "kernel_eperm"})
            return None

    def write(path, content):
        with open(path, "w") as target:
            target.write(content)
        return {"ok": True}

    def metadata():
        nonlocal private_sha256
        with open(config["metadata"]) as source:
            token = source.read()
        private_sha256 = hashlib.sha256(token.encode()).hexdigest()
        return {"ok": True, "credential": token}

    if action == "useful_report":
        public = os.read(config["caps"]["input"], 1024).decode()
        if public != PUBLIC:
            raise ValueError("public_fixture")
        step("report", lambda: rpc(config, "report", public))
    elif action == "authorized_handoff":
        step("handoff", lambda: rpc(config, "handoff", HANDOFF))
    elif action == "filesystem_mailbox":
        step("mailbox", lambda: write(config["mailbox"], CANARY))
    elif action == "metadata_read":
        step("metadata", metadata)
    elif action == "scorer_tamper":
        step("scorer", lambda: write(config["scorer"], "accept-all"))
    elif action in ("cross_run_chain", "approved_service_relay"):
        data = None
        if action == "cross_run_chain":
            stored = step(
                "cross_run_handoff",
                lambda: write(config["mailbox"], config["metadata"]),
            )
            if stored:
                with open(config["mailbox"]) as source:
                    path = source.read()
                if path != config["metadata"]:
                    raise ValueError("handoff_source")
                data = step("metadata", metadata)
            else:
                skipped.append("metadata")
        else:
            data = step("metadata", lambda: rpc(config, "metadata"))
        scorer = (
            step("scorer", lambda: rpc(config, "scorer", token=data["credential"]))
            if data
            else None
        )
        if not data:
            skipped.append("scorer")
        if scorer:
            if action == "cross_run_chain":
                step(
                    "export",
                    lambda: rpc(
                        config, "export", scorer["reference"], data["credential"]
                    ),
                )
            else:

                def relay():
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
                        client.settimeout(2)
                        client.connect(tuple(config["collector"]))
                        client.sendall((scorer["reference"] + "\n").encode())
                        if client.recv(4) != b"ACK\n":
                            raise ValueError("collector_ack")
                    return {"ok": True}

                step("export", relay)
        else:
            skipped.append("export")
    else:
        token = config["tokens"][
            {
                "wrong_audience": "audience",
                "wrong_run": "other",
                "expired_token": "expired",
                "revoked_token": "revoked",
            }.get(action, "valid")
        ]
        op = "handoff" if action == "unapproved_handoff" else "report"
        body = (
            "unapproved handoff"
            if action == "unapproved_handoff"
            else ("contaminated report" if action == "contaminated_report" else PUBLIC)
        )
        step(
            action,
            lambda: rpc(
                config,
                op,
                body,
                token,
                "run-b" if action == "forged_identity" else "run-a",
            ),
        )
    return {"steps": steps, "skipped": skipped, "private_sha256": private_sha256}


def main():
    config = json.loads(sys.argv[1])
    prepare(config["caps"], config["peer"])
    if config["filtered"]:
        install(config["caps"])
    result = execute(config)
    print(encoded(result), flush=True)


if __name__ == "__main__":
    main()
