"""Phase 19d evidence: source-bound pack for the namespace egress lane, with verify.

``run`` refuses with ``host_cannot_namespace`` where the lane cannot execute: a pack produced where
nothing ran would be an empty evaluated range. ``verify`` re-executes the lane (Linux only) and
compares the decision rows; host-dependent fields (kernel release, timings, counter values that
vary with the live-reader probe, the proxy log order) are reported in the pack and excluded from
the comparison, which is stated in the receipt.
"""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import egress19
import lanes19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19d"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19d-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19d-protocol-v1"
PHASE_19D_FILES = (
    "egress19.py",
    "lanes19d.py",
    "evidence19d.py",
    "projection.py",
    "tests/test_egress19.py",
    "tests/test_lanes19d.py",
    "tests/test_evidence19d.py",
)
COMPARED = (
    "case",
    "request",
    "decision",
    "expected",
    "final",
    "routes",
    "counter_delta",
    "holds",
    "errno",
)
SIDECARS = {
    "rows.json": lambda r: r["lane"]["rows"],
    "proxy-log.json": lambda r: r["lane"]["proxy_log"],
}


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19D_FILES}


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "namespace_egress",
        "namespace": "unshare --user --map-root-user --net; worker reaches the parent only over a Unix socket",
        "cases": [c[0] for c in lanes19d.CASES]
        + ["same_destination_other_tool", "mutable_tool_server_destination"],
        "decisions": list(egress19.DECISIONS),
        "compared_fields": list(COMPARED),
        "informed_authoring": "cases, allowlists and the proxy were authored together; the strawman arm of 19c is not repeated here",
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
        or p.get("decisions") != list(egress19.DECISIONS)
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


def comparable_rows(rows):
    return [{k: r.get(k) for k in COMPARED} for r in rows]


def build_report(work):
    lane = lanes19d.run_all(Path(work) / "lane")
    return {
        "schema": SCHEMA,
        "arm": "namespace_egress",
        "lane": lane,
        "comparable_rows": comparable_rows(lane["rows"]),
        "non_claims": [
            "one namespace on one host; the canary is per-namespace kernel counters and the proxy log",
            "the covert-channel probe reports a shared-filesystem channel and does not close it",
            "the namespace confines IP routing only; filesystem Unix sockets to privileged daemons are probed and reported, not closed",
            "the second-operator canary is attested, not recomputable",
            "kernel release, timings, the live-reader counter values and the socket-probe results are reported, not compared",
        ],
    }


HOST_DEPENDENT = (
    "host, covert_probe.seconds, covert_probe.bits_per_second_observed, "
    "live_reader_control.counter_delta, live_reader_control.routes_after_lo_up, "
    "unix_socket_probe.results, unix_socket_probe.reachable"
)


def _normalise(report):
    """The report with only the fields named in HOST_DEPENDENT blanked (P19-REPAIR03); every
    other byte is bound by the comparison."""
    out = loads(wire(report))
    lane = out.get("lane") or {}
    lane["host"] = None
    for key in ("seconds", "bits_per_second_observed"):
        if type(lane.get("covert_probe")) is dict:
            lane["covert_probe"][key] = None
    if type(lane.get("live_reader_control")) is dict:
        lane["live_reader_control"]["counter_delta"] = None
        lane["live_reader_control"]["routes_after_lo_up"] = None
    if type(lane.get("unix_socket_probe")) is dict:
        lane["unix_socket_probe"]["results"] = None
        lane["unix_socket_probe"]["reachable"] = None
    out.pop("protocol_sha256", None)
    return out


def compare(saved, actual):
    if len(saved["comparable_rows"]) != len(actual["comparable_rows"]):
        raise ValueError("row_inventory")
    for s, a in zip(saved["comparable_rows"], actual["comparable_rows"]):
        if wire(s) != wire(a):
            raise ValueError("case_mismatch:" + str(s.get("case")))
    if saved["lane"]["all_hold"] != actual["lane"]["all_hold"]:
        raise ValueError("hold_mismatch")
    if saved["lane"]["receiver_effects"] != actual["lane"]["receiver_effects"]:
        raise ValueError("effect_mismatch")
    if (
        saved["lane"]["namespace"]["routes_in_fresh_namespace"]
        != actual["lane"]["namespace"]["routes_in_fresh_namespace"]
    ):
        raise ValueError("route_mismatch")
    if wire(_normalise(saved)) != wire(_normalise(actual)):
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
    lane = report["lane"]
    return {
        "verified": True,
        "arm": "namespace_egress",
        "host": lane["host"],
        "cases": len(lane["rows"]),
        "all_hold": lane["all_hold"],
        "receiver_effects": lane["receiver_effects"],
        "routes_in_fresh_namespace": lane["namespace"]["routes_in_fresh_namespace"],
        "live_reader_moved": lane["live_reader_control"]["counter_delta"]["Tcp.OutSegs"]
        >= 1,
        "covert_channel_eliminated": lane["covert_probe"]["eliminated"],
        "covert_probe_bytes_delivered": lane["covert_probe"]["bytes_delivered"],
        "unix_sockets_reachable": lane["unix_socket_probe"]["reachable"],
        "unix_socket_egress_eliminated": lane["unix_socket_probe"]["eliminated"],
        "compared_fields": list(COMPARED),
        "reported_not_compared": HOST_DEPENDENT,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "model_inference": False,
        "tree_state": tree_state(),
    }


def verify(pack, expected_root, *, protocol=None):
    if not egress19.can_namespace():
        raise RuntimeError("host_cannot_namespace")
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    with tempfile.TemporaryDirectory(prefix="p19d-verify-") as work:
        actual = build_report(work)
    compare(saved, actual)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    # the receipt describes THIS host's recomputation, never the pack's saved values
    return receipt_for(actual, expected_root)


def run(out, *, protocol=None):
    if not egress19.can_namespace():
        raise RuntimeError("host_cannot_namespace")
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    with tempfile.TemporaryDirectory(prefix="p19d-run-") as work:
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
