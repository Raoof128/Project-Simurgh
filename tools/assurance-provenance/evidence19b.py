"""Phase 19b-1 evidence: source-bound pack for the write-anywhere, outage and Lean lanes.

``run`` executes every lane under the fixed clock and writes ``protocol.json``,
``agent-writable.json``, ``report.json``, ``evidence.zip``, ``ROOT.sha256``, ``receipt.json``.
``verify`` re-executes the lanes (they are deterministic) and rejects any difference with a reason
that names the section. The protocol pins the 19b-1 file set explicitly, the successor module, the
frozen modules it subclasses, and the Lean model.
"""

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import awm
import lane
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19b"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19b-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19b-protocol-v1"
PHASE_19B_FILES = (
    "awm.py",
    "payloads.py",
    "rig.py",
    "mutants.py",
    "provenance.py",
    "gate19.py",
    "lane.py",
    "evidence19b.py",
    "tests/test_awm.py",
    "tests/test_payloads.py",
    "tests/test_rig.py",
    "tests/test_mutants.py",
    "tests/test_provenance.py",
    "tests/test_lane.py",
    "tests/test_lean_differential.py",
    "tests/test_evidence19b.py",
)
SHARED_SOURCES = (
    "tools/assurance-composed-successor/successor.py",
    "tools/assurance-composed/composition.py",
    "tools/assurance-context/context_gate.py",
    "tools/assurance-signals/signals.py",
    "tools/assurance-credentials/gateway.py",
    "tools/assurance-credentials/service.py",
    "tools/assurance-credentials/transport.py",
    "tools/assurance-connector/core.py",
    "proofs/phase19/AuthorityProvenance.lean",
)
SIDECARS = {
    "lane-rows.json": lambda r: r["write_anywhere"]["rows"],
    "provenance-records.json": lambda r: r["write_anywhere"]["provenance"]["rows"],
    "outage.json": lambda r: r["outage"],
}


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19B_FILES}
    names.update(SHARED_SOURCES)
    return names


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "composed_successor",
        "awm_hash": awm.manifest_hash(),
        "wired_channels": list(lane.WIRED),
        "not_wired": list(lane.NOT_WIRED),
        "payloads": [p["id"] for p in lane.PAYLOADS],
        "clock": lane.rigmod.CLOCK,
        "informed_authoring": (
            "payloads, adapters and mutants were authored with the gate source open; the "
            "mutants are the positive control, not a held-out attacker"
        ),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or p.get("awm_hash") != awm.manifest_hash()
        or p.get("wired_channels") != list(lane.WIRED)
        or type(p.get("sources")) is not dict
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, digest in p["sources"].items():
        target = ROOT / name
        if (
            target.is_symlink()
            or not target.is_file()
            or sha(target.read_bytes()) != digest
        ):
            raise ValueError("source_binding:" + name)
    return sha(raw)


def lean_section():
    lean_file = ROOT / "proofs/phase19/AuthorityProvenance.lean"
    checked = None
    if shutil.which("lean"):
        out = subprocess.run(
            ["lean", str(lean_file)],
            capture_output=True,
            text=True,
            cwd=lean_file.parent,
        )
        checked = out.returncode == 0 and not out.stdout.strip()
    return {
        "file": "proofs/phase19/AuthorityProvenance.lean",
        "sha256": sha(lean_file.read_bytes()),
        "theorems": [
            "admitsImpliesRegistered",
            "agentStepPreservesAuthority",
            "agentBytesIrrelevant",
            "resumeBytesIrrelevant",
            "admittedInImage",
        ],
        "type_checked_on_this_host": checked,
        "states_compared": 48,
        "differential_test": "tools/assurance-provenance/tests/test_lean_differential.py",
        "bound": (
            "the model is tied to the Python gate only by the differential test over the "
            "enumerated states; held is not enumerated"
        ),
    }


def build_report(work):
    work = Path(work)
    wa = lane.write_anywhere(work / "wa")
    outage = lane.outage(work / "outage")
    return {
        "schema": SCHEMA,
        "arm": "composed_successor",
        "awm": awm.manifest(),
        "write_anywhere": wa,
        "outage": outage,
        "lean": lean_section(),
        "wired_deterministic_channels": wa["wired_deterministic_channels"],
        "phase_19b_closed": False,
        "why_not_closed": (
            "the design's 19b gate needs at least four wired deterministic channels; the "
            "tool_result_body reader and the approval token are 19b-2"
        ),
    }


def compare(saved, actual):
    s, a = saved["write_anywhere"], actual["write_anywhere"]
    if len(s["rows"]) != len(a["rows"]):
        raise ValueError("row_inventory")
    for x, y in zip(s["rows"], a["rows"]):
        if wire(x) != wire(y):
            raise ValueError("oracle_mismatch")
    if wire(s["provenance"]["rows"]) != wire(a["provenance"]["rows"]):
        raise ValueError("provenance_mismatch")
    if wire(s["mutants"]) != wire(a["mutants"]) or s["kill_count"] != a["kill_count"]:
        raise ValueError("kill_count_mismatch")
    if wire(saved["outage"]) != wire(actual["outage"]):
        raise ValueError("outage_mismatch")
    if wire(saved["awm"]) != wire(actual["awm"]):
        raise ValueError("awm_mismatch")
    if wire(saved) != wire(actual):
        raise ValueError("report_mismatch")


def receipt_for(report, manifest_root):
    return {
        "verified": True,
        "arm": "composed_successor",
        "awm_hash": awm.manifest_hash(),
        "wired_deterministic_channels": report["wired_deterministic_channels"],
        "phase_19b_closed": report["phase_19b_closed"],
        "clean_differences": report["write_anywhere"]["clean_differences"],
        "kill_count": report["write_anywhere"]["kill_count"],
        "mutants_total": report["write_anywhere"]["mutants_total"],
        "provenance_records": report["write_anywhere"]["provenance"]["records"],
        "lean": {
            "sha256": report["lean"]["sha256"],
            "states_compared": report["lean"]["states_compared"],
            "type_checked_on_this_host": report["lean"]["type_checked_on_this_host"],
        },
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "model_inference": False,
        "tree_state": _tree_state(),
    }


def _tree_state():
    try:
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain", "--", str(LANE_DIR), "proofs/phase19"],
            cwd=ROOT,
            text=True,
        ).strip()
        if dirty:
            return "uncommitted"
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def _normalise_for_compare(report):
    # the Lean host check is host-dependent and is reported, not compared
    out = json.loads(wire(report))
    out["lean"]["type_checked_on_this_host"] = None
    return out


def verify(pack, expected_root, *, protocol=None):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    with tempfile.TemporaryDirectory(prefix="p19b-verify-") as work:
        actual = build_report(work)
    actual.update(protocol_sha256=protocol_digest)
    compare(_normalise_for_compare(saved), _normalise_for_compare(actual))
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    return receipt_for(saved, expected_root)


def run(out, *, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    (out / "agent-writable.json").write_bytes(wire(awm.manifest()))
    with tempfile.TemporaryDirectory(prefix="p19b-run-") as work:
        report = build_report(work)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(manifest_root + "\n")
    receipt = verify(out / "evidence.zip", manifest_root, protocol=proto_path)
    (out / "receipt.json").write_bytes(wire(receipt))
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args()
    if args.command == "run":
        print(json.dumps(run(args.out.resolve()), sort_keys=True))
    else:
        print(
            json.dumps(
                verify(args.pack, args.expected_root, protocol=args.protocol),
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
