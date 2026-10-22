"""Portable saved-proposal reproduction with retained receiver evidence and pinned root."""

import argparse
import hashlib
import importlib.metadata
import json
import math
import os
import platform
import subprocess
import sys
import tempfile
import time
import zipfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

from observer import decode, read_database

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs/research/model-phase-3"
CONTRACT = ROOT / "docs/research/reproduction-phase-4/contract.json"
MAX_PACK_BYTES = 32 * 1024 * 1024


def wire(value):
    return (
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n"
    ).encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_pack(path, files):
    manifest = wire(
        {
            "schema": "simurgh-phase4-pack-v1",
            "files": {name: sha(data) for name, data in sorted(files.items())},
        }
    )
    with zipfile.ZipFile(path, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", manifest)
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    return sha(manifest)


def read_pack(path, expected_root):
    if (
        type(expected_root) is not str
        or len(expected_root) != 64
        or any(c not in "0123456789abcdef" for c in expected_root)
    ):
        raise ValueError("expected_root_required")
    if path.stat().st_size > MAX_PACK_BYTES:
        raise ValueError("archive_size")
    with zipfile.ZipFile(path) as archive:
        info = archive.infolist()
        names = [item.filename for item in info]
        if not 4 <= len(info) <= 2000 or len(set(names)) != len(names):
            raise ValueError("archive_inventory")
        if sum(item.file_size for item in info) > MAX_PACK_BYTES:
            raise ValueError("archive_size")
        if any(
            PurePosixPath(name).is_absolute()
            or ".." in PurePosixPath(name).parts
            or "\\" in name
            or name.endswith("/")
            for name in names
        ):
            raise ValueError("archive_path")
        raw = archive.read("manifest.json")
        if sha(raw) != expected_root:
            raise ValueError("manifest_root")
        manifest = decode(raw)
        if (
            set(manifest) != {"schema", "files"}
            or manifest["schema"] != "simurgh-phase4-pack-v1"
        ):
            raise ValueError("manifest_schema")
        if set(names) != {"manifest.json", *manifest["files"]}:
            raise ValueError("archive_inventory")
        files = {name: archive.read(name) for name in manifest["files"]}
        if any(sha(data) != manifest["files"][name] for name, data in files.items()):
            raise ValueError("member_hash")
        return files


def check_evidence(files, expected_steps, baseline):
    records = decode(files["observations.json"])
    if (
        not expected_steps
        or type(records) is not list
        or len(records) != len(expected_steps)
    ):
        raise ValueError("decision_inventory")
    names = {"metadata.json", "report.json", "observations.json"}
    with tempfile.TemporaryDirectory(prefix="simurgh-phase4-check-") as directory:
        for index, (record, expected) in enumerate(
            zip(records, expected_steps, strict=True)
        ):
            name = f"witnesses/{index:06d}.sqlite"
            names.add(name)
            if (
                set(record) != {*expected, "witness", "keys"}
                or record["witness"] != name
            ):
                raise ValueError("observation_shape")
            if wire({key: record[key] for key in expected}) != wire(expected):
                raise ValueError("observation_mismatch")
            if name not in files:
                raise ValueError("missing_witness")
            path = Path(directory) / "witness.sqlite"
            path.write_bytes(files[name])
            actual = read_database(path)
            expected_keys = [
                sha(
                    wire(
                        {k: e[k] for k in ("id", "run", "principal", "tenant")}
                    ).rstrip(b"\n")
                )
                for e in expected["effects"]
            ]
            if actual["keys"] != expected_keys:
                raise ValueError("receipt_binding")
            if wire(actual) != wire(
                {"keys": record["keys"], "effects": expected["effects"]}
            ):
                raise ValueError("raw_effect_mismatch")
    if set(files) != names:
        raise ValueError("evidence_inventory")
    if wire(decode(files["report.json"])) != wire(baseline):
        raise ValueError("baseline_report_mismatch")


def frozen_inputs():
    sys.path.insert(0, str(ROOT / "tools/assurance-eval"))
    import report

    cap = report.load_capture(DOCS / "capture.json", DOCS / "protocol.json")
    tasks = decode((DOCS / "tasks.json").read_bytes())["tasks"]
    report.validate_rows(cap["rows"], tasks)
    settings = decode((DOCS / "settings.json").read_bytes())
    report.validate_schedule(cap, tasks, settings["batch_size"])
    baseline = decode((DOCS / "report.json").read_bytes())
    if wire(cap["rows"]) != wire(baseline["rows"]):
        raise ValueError("baseline_rows")
    steps = []
    for row in cap["rows"]:
        for index, step in enumerate(row["steps"]):
            result = step["result"]
            if (
                result["status"] in ("runtime_error", "unknown")
                or result["effects"] is None
            ):
                raise ValueError("historical_unknown_requires_separate_protocol")
            steps.append(
                {
                    "case": row["id"],
                    "trial": row["trial"],
                    "control": row["control"],
                    "index": index,
                    "effects": result["effects"],
                }
            )
    return report, cap, tasks, settings, baseline, steps


def check_contract():
    contract = decode(CONTRACT.read_bytes())
    if contract.get("schema") != "simurgh-phase4-contract-v1" or not contract.get(
        "sources"
    ):
        raise ValueError("contract_schema")
    for name, expected in contract["sources"].items():
        path = ROOT / name
        if (
            not path.is_file()
            or path.is_symlink()
            or sha(path.read_bytes()) != expected
        ):
            raise ValueError("source_binding:" + name)
    return contract


def preflight():
    check_contract()
    if (
        sys.version_info[:2] != (3, 12)
        or platform.system() != "Linux"
        or platform.machine() != "x86_64"
    ):
        raise ValueError("requires_python312_linux_x86_64")
    required = {
        "openai-agents": "0.23.1",
        "openai": "3.31.0",
        "langgraph": "1.2.15",
        "langgraph-checkpoint-sqlite": "3.1.2",
    }
    for name, version in required.items():
        if importlib.metadata.version(name) != version:
            raise ValueError("dependency_version:" + name)
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "sqlite": sqlite_version(),
        "packages": dict(
            sorted(
                (d.metadata["Name"], d.version)
                for d in importlib.metadata.distributions()
            )
        ),
    }


def sqlite_version():
    import sqlite3

    return sqlite3.sqlite_version


def verify_pack(path, expected_root):
    check_contract()
    _, _, _, _, baseline, steps = frozen_inputs()
    files = read_pack(path, expected_root)
    metadata = decode(files["metadata.json"])
    if (
        metadata.get("schema") != "simurgh-phase4-run-v1"
        or metadata.get("contract_sha256") != sha(CONTRACT.read_bytes())
        or metadata.get("kind") != "saved-proposal-replay"
        or metadata.get("independence") != "not-established"
        or metadata.get("decisions") != len(steps)
        or type(metadata.get("seconds")) not in (float, int)
        or not math.isfinite(metadata["seconds"])
        or metadata["seconds"] < 0
    ):
        raise ValueError("run_metadata")
    check_evidence(files, steps, baseline)
    return {
        "verified": True,
        "branches": len(baseline["rows"]),
        "decisions": len(steps),
        "manifest_sha256": expected_root,
        "independence": "not-established",
    }


def reproduce(output):
    runtime = preflight()
    report, cap, tasks, settings, baseline, expected_steps = frozen_inputs()
    output.mkdir(parents=True, exist_ok=False)
    (output / "witnesses").mkdir()
    started = time.monotonic()
    metadata = {
        "schema": "simurgh-phase4-run-v1",
        "kind": "saved-proposal-replay",
        "independence": "not-established",
        "runtime": runtime,
        "contract_sha256": sha(CONTRACT.read_bytes()),
        "started_utc": datetime.now(UTC).isoformat(),
    }
    (output / "started.json").write_bytes(wire(metadata))
    records = []
    import bridge

    original = bridge.Session

    class RetainingSession(original):
        def __init__(self, case, trial, control, directory):
            super().__init__(case, trial, control, directory)
            self.control = control
            self.decision_index = 0

        def step(self, proposal):
            result = super().step(proposal)
            index = len(records)
            name = f"witnesses/{index:06d}.sqlite"
            completed = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-B",
                    str(Path(__file__).with_name("observer.py")),
                    str(self.receiver.path),
                    str(output / name),
                ],
                capture_output=True,
                timeout=15,
                check=True,
                env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
            )
            observed = decode(completed.stdout)
            record = {
                "case": self.case["id"],
                "trial": self.trial,
                "control": self.control,
                "index": self.decision_index,
                "witness": name,
                **observed,
            }
            with (output / "observations.jsonl").open("ab") as journal:
                journal.write(wire(record))
                journal.flush()
                os.fsync(journal.fileno())
            records.append(record)
            self.decision_index += 1
            if wire(observed["effects"]) != wire(result["effects"]):
                raise ValueError("observer_disagreement")
            if len(records) % 50 == 0:
                print(
                    f"Observed {len(records)}/{len(expected_steps)} decisions",
                    flush=True,
                )
            return result

    try:
        bridge.Session = RetainingSession
        actual = report.analyze(cap, tasks, batch_size=settings["batch_size"])
        actual.update(
            capture_sha256=sha((DOCS / "capture.json").read_bytes()),
            journal_sha256=sha((DOCS / "capture.jsonl").read_bytes()),
            protocol_sha256=sha((DOCS / "protocol.json").read_bytes()),
        )
        if wire(actual) != wire(baseline):
            raise ValueError("fresh_report_mismatch")
        metadata.update(
            finished_utc=datetime.now(UTC).isoformat(),
            seconds=time.monotonic() - started,
            decisions=len(records),
        )
        files = {
            "metadata.json": wire(metadata),
            "report.json": wire(actual),
            "observations.json": wire(records),
        }
        files.update(
            {r["witness"]: (output / r["witness"]).read_bytes() for r in records}
        )
        check_evidence(files, expected_steps, baseline)
        root = write_pack(output / "evidence.zip", files)
        receipt = verify_pack(output / "evidence.zip", root)
        (output / "receipt.json").write_bytes(wire(receipt))
        print(json.dumps(receipt, sort_keys=True), flush=True)
        return receipt
    except BaseException as exc:
        (output / "failure.json").write_bytes(
            wire(
                {
                    "complete": False,
                    "error_type": type(exc).__name__,
                    "observed_decisions": len(records),
                    "expected_decisions": len(expected_steps),
                }
            )
        )
        raise
    finally:
        bridge.Session = original


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("preflight")
    run = commands.add_parser("run")
    run.add_argument("--out", type=Path, required=True)
    verify = commands.add_parser("verify")
    verify.add_argument("pack", type=Path)
    verify.add_argument("--expected-root", required=True)
    args = parser.parse_args()
    if args.command == "preflight":
        runtime = preflight()
        frozen_inputs()
        print(json.dumps({"ready": True, "runtime": runtime}, sort_keys=True))
    elif args.command == "run":
        reproduce(args.out.resolve())
    else:
        print(json.dumps(verify_pack(args.pack, args.expected_root), sort_keys=True))


if __name__ == "__main__":
    main()
