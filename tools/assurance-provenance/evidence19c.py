"""Phase 19c evidence: source-bound pack for the forked-receiver lanes, with verify.

The protocol pins the 19c file set explicitly, the frozen receiver and schema modules the lanes
compare against, and nothing from 19a or 19b. ``verify`` re-executes the lanes (deterministic,
in-process) and rejects any difference with a reason naming the lane.
"""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import lanes19c
import projection
import receiver19
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19c"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19c-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19c-protocol-v1"
PHASE_19C_FILES = (
    "receiver19.py",
    "lanes19c.py",
    "evidence19c.py",
    "projection.py",
    "tests/test_receiver19.py",
    "tests/test_lanes19c.py",
    "tests/test_evidence19c.py",
)
SHARED_SOURCES = (
    "tools/assurance-credentials/service.py",
    "tools/assurance-connector/core.py",
)
FROZEN_REASONS = (
    "request",
    "session",
    "session_inactive",
    "scope",
    "credential_inactive",
    "idempotency_conflict",
)
SIDECARS = {
    "lanes.json": lambda r: r["lanes"],
    "reasons.json": lambda r: {
        "reasons": r["lanes"]["reasons"],
        "new_reasons": r["new_reasons"],
    },
}


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19C_FILES}
    names.update(SHARED_SOURCES)
    return names


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "receiver_direct_fork",
        "reasons": list(receiver19.REASONS),
        "frozen_reasons": list(FROZEN_REASONS),
        "variants": [v[0] for v in lanes19c.VARIANTS],
        "informed_authoring": "the variants, limits and strawman were authored with the receiver source open",
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
        or p.get("reasons") != list(receiver19.REASONS)
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


def build_report(work):
    lanes = lanes19c.run_all(Path(work) / "lanes")
    return {
        "schema": SCHEMA,
        "arm": "receiver_direct_fork",
        "lanes": lanes,
        "new_reasons": len(set(receiver19.REASONS) - set(FROZEN_REASONS)),
        "transport_forked": False,
        "non_claims": [
            "receiver-direct: the composed gate is not in the path, by design (M5)",
            "the strawman is authored and is a power check, not a comparator; G22 is not paid",
            "the frozen receiver rows show what the archived receiver does with the same bytes",
            "the HTTP transport is not forked",
        ],
    }


def compare(saved, actual):
    s, a = saved["lanes"], actual["lanes"]
    if len(s["credential"]["rows"]) != len(a["credential"]["rows"]):
        raise ValueError("row_inventory")
    if wire(s["credential"]) != wire(a["credential"]):
        raise ValueError("credential_mismatch")
    if wire(s["manifest"]) != wire(a["manifest"]):
        raise ValueError("manifest_mismatch")
    if wire(s["route_corpus"]) != wire(a["route_corpus"]):
        raise ValueError("route_mismatch")
    if wire(s["cumulative"]) != wire(a["cumulative"]):
        raise ValueError("cumulative_mismatch")
    if wire(s["admin_revoked"]) != wire(a["admin_revoked"]):
        raise ValueError("admin_mismatch")
    if wire(saved) != wire(actual):
        raise ValueError("report_mismatch")


def tree_state():
    try:
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain", "--", str(LANE_DIR)], cwd=ROOT, text=True
        ).strip()
        if dirty:
            return "uncommitted"
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def receipt_for(report, manifest_root):
    rc = report["lanes"]["route_corpus"]
    return {
        "verified": True,
        "arm": "receiver_direct_fork",
        "new_reasons": report["new_reasons"],
        "route_variants": len(rc["variants"]),
        "strawman_admits_at_least_one": rc["strawman_admits_at_least_one"],
        "pays_G22": rc["pays_G22"],
        "transport_forked": report["transport_forked"],
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "model_inference": False,
        "tree_state": tree_state(),
    }


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
    with tempfile.TemporaryDirectory(prefix="p19c-verify-") as work:
        actual = build_report(work)
    actual.update(protocol_sha256=protocol_digest)
    compare(saved, actual)
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
    with tempfile.TemporaryDirectory(prefix="p19c-run-") as work:
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
