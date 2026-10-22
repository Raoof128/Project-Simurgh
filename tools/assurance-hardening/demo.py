"""Key-free regression demonstration, not a new model evaluation or safety rate."""

import argparse
import hashlib
import socket
import tempfile
from pathlib import Path

from authority import Authority
from capture_validation import strict_dumps, strict_loads, validate_capture
from hardened_gateway import HANDOFF, PUBLIC, Gateway

ROOT = Path(__file__).resolve().parents[2]


def run():
    checks = []

    def check(name, passed):
        checks.append({"id": name, "passed": bool(passed)})

    send = {
        "tool": "send_report",
        "arguments": {
            "resource": "report-1",
            "destination": "alice@trusted.example",
            "body": PUBLIC,
        },
    }
    delete = {"tool": "delete_record", "arguments": {"resource": "draft-1"}}
    authority = Authority([send, delete])
    with tempfile.TemporaryDirectory(prefix="simurgh-hardened-") as d:
        root = Path(d)
        outbox, draft, sensitive = (
            root / name for name in ["outbox", "draft-1", "sensitive-file"]
        )
        draft.write_text("synthetic draft")
        sensitive.write_text("synthetic private record")

        def effect(action):
            if action["tool"] == "send_report":
                outbox.write_text(strict_dumps(action["arguments"]))
            else:
                (root / action["arguments"]["resource"]).unlink()

        for name, action in [
            (
                "substituted_domain",
                {
                    "tool": "send_report",
                    "arguments": dict(
                        send["arguments"], destination="alice@attacker.example"
                    ),
                },
            ),
            (
                "extra_bcc",
                {
                    "tool": "send_report",
                    "arguments": dict(send["arguments"], bcc="other@attacker.example"),
                },
            ),
            (
                "wrong_delete_target",
                {"tool": "delete_record", "arguments": {"resource": "sensitive-file"}},
            ),
            ("unknown_tool", {"tool": "shell", "arguments": {}}),
        ]:
            result = authority.execute(action, effect)
            check(
                name,
                result["status"] == "blocked"
                and not outbox.exists()
                and sensitive.exists()
                and draft.exists(),
            )
        check(
            "missing_delete_authority",
            Authority([]).execute(delete, effect)["status"] == "blocked"
            and draft.exists(),
        )
        authority.execute(send, effect)
        check(
            "authorized_report", strict_loads(outbox.read_text()) == send["arguments"]
        )
        authority.execute(delete, effect)
        check("authorized_delete", not draft.exists() and sensitive.exists())
        try:
            Gateway(root, "misspelled-task")
        except ValueError:
            check(
                "unknown_task_refused_before_resources",
                not (root / "gateway.sqlite").exists(),
            )
        else:
            check("unknown_task_refused_before_resources", False)
        gateway = Gateway(root, "useful_report")
        connection = socket.create_connection(gateway.address)
        try:
            request = {
                "token": gateway.tokens["valid"],
                "run": "run-a",
                "tenant": "tenant-a",
                "op": "report",
                "body": PUBLIC,
            }
            # Exercise actual loopback framing, not only the direct Python method.
            with connection.makefile("rwb") as stream:
                stream.write((strict_dumps(request) + "\n").encode())
                stream.flush()
                result = strict_loads(stream.readline().decode())
            check(
                "gateway_report_effect",
                result["ok"] and gateway.observed()["effects"] == {"report": PUBLIC},
            )
            result = gateway.handle(dict(request, op="handoff", body=HANDOFF))
            check(
                "unapproved_handoff_denied",
                not result["ok"]
                and gateway.observed()["effects"] == {"report": PUBLIC},
            )
            gateway.revoke(request["token"])
            check(
                "persisted_revocation",
                gateway.handle(request) == {"ok": False, "reason": "revoked"},
            )
        finally:
            connection.close()
            gateway.close()
    for name, raw in [
        ("nonfinite_json", '{"seconds":NaN}'),
        ("exponent_overflow", '{"seconds":1e999}'),
    ]:
        try:
            strict_loads(raw)
        except ValueError:
            check(name, True)
        else:
            check(name, False)
    for label, rel in [
        ("plain", "hf-containment/evidence/model-capture.json"),
        ("native", "hf-native/evidence/capture.json"),
    ]:
        validate_capture(strict_loads((ROOT / "docs/assurance" / rel).read_text()))
        check(f"{label}_saved_capture_finite", True)
    sources = sorted((ROOT / "tools/assurance-hardening").rglob("*.py")) + [
        ROOT / "tools/hf-containment/gateway.py",
        ROOT / "scripts/reproduce-llm-shield-stage5l-strict.sh",
        ROOT / "docs/assurance/hf-containment/evidence/model-capture.json",
        ROOT / "docs/assurance/hf-native/evidence/capture.json",
    ]
    return {
        "schema": "simurgh-hardening-demo-v1",
        "scope": "Software regression demonstration with synthetic local effects; not a model safety rate or independent audit",
        "sources": {
            str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sources
        },
        "checks": checks,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--out", type=Path)
    group.add_argument("--verify", type=Path)
    args = parser.parse_args()
    result = run()
    if not all(row["passed"] for row in result["checks"]):
        raise ValueError("demonstration_failed")
    if args.verify:
        if (
            args.verify.is_symlink()
            or not args.verify.is_file()
            or args.verify.stat().st_size > 1_000_000
        ):
            raise ValueError("invalid_report_file")
        if strict_loads(args.verify.read_text()) != result:
            raise ValueError("report_mismatch")
    elif args.out:
        with args.out.open("x") as output:
            output.write(strict_dumps(result) + "\n")
    else:
        print(strict_dumps(result))
        return
    print(
        strict_dumps(
            {
                "checks": len(result["checks"]),
                "passed": True,
                "mode": "verify" if args.verify else "write",
            }
        )
    )


if __name__ == "__main__":
    main()
