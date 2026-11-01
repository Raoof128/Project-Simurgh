"""Phase 19a evidence: source-bound projection pack over the Phase 17 archive, with verify.

``run`` writes ``protocol.json, report.json, evidence.zip, ROOT.sha256, receipt.json``.
``verify`` re-reads the Phase 17 archive, recomputes every row and rejects any difference with
a reason that names the section. On Linux x86_64 with ``--replay`` the frozen Phase 17 verifier
is chained first; on any other host the receipt says ``hash_bound_projection`` and ``not_run``.
"""

import argparse
import json
import platform
import subprocess
import sys
from pathlib import Path

import projection
from projection import (
    AWARENESS_TERMS,
    CONTROLS,
    FORCED_CALL_LINE,
    MODELS,
    P17,
    ROOT,
    SCHEMA,
    SPLITS,
    loads,
    read_pack,
    sha,
    wire,
    write_pack,
)

DOCS = ROOT / "docs/research/provenance-phase-19a"
PROTOCOL = DOCS / "protocol.json"
PROTOCOL_SCHEMA = "simurgh-phase19a-protocol-v1"
LANE = ROOT / "tools/assurance-provenance"
SIDECARS = {
    "split-rows.json": lambda r: {m: r["split"][m]["rows"] for m in MODELS},
    "awareness-sidecar.json": lambda r: r["awareness"],
    "coverage.json": lambda r: r["coverage"],
}


PHASE_19A_FILES = (
    "projection.py",
    "evidence.py",
    "tests/test_projection.py",
    "tests/test_evidence.py",
)


def expected_sources():
    # An explicit set, not a directory glob: later Phase 19 modules in this namespace must not
    # invalidate the 19a pack (pin sets, not counts; gate-lifecycle.md).
    names = {str((LANE / n).relative_to(ROOT)) for n in PHASE_19A_FILES}
    names.update(
        str((P17 / n).relative_to(ROOT))
        for n in ("protocol.json", "ROOT.sha256", "tasks.json", "VALIDATION.md")
    )
    return names


def build_protocol():
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "composed_frozen",
        "archive": "docs/research/transfer-phase-17/evidence.zip",
        "archive_root": projection.P17_ROOT(),
        "models": list(MODELS),
        "controls": list(CONTROLS),
        "splits": list(SPLITS),
        "awareness_terms": list(AWARENESS_TERMS),
        "forced_call_line": FORCED_CALL_LINE,
        "informed_authoring": (
            "the projection rules were written with the Phase 17 archive open; "
            "they are reported, not scored against a held-out set"
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
        or p.get("arm") != "composed_frozen"
        or p.get("archive_root") != projection.P17_ROOT()
        or p.get("splits") != list(SPLITS)
        or p.get("awareness_terms") != list(AWARENESS_TERMS)
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


def host_can_replay():
    return platform.system() == "Linux" and platform.machine() in ("x86_64", "AMD64")


def tree_state():
    try:
        # The pack itself is output and is untracked when first produced; only the
        # protocol-pinned lane sources decide whether the tree is committed.
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain", "--", str(LANE)],
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


def frozen_replay(files):
    sys.path.insert(0, str(ROOT / "tools/assurance-transfer"))
    import transfer_study  # noqa: E402  (hash-locked venv on Linux x86_64 only)

    transfer_study.verify_files(files, replay=True)
    return {"kind": "frozen_replay", "result": "verified"}


def load_archive():
    root = projection.P17_ROOT()
    return root, read_pack(P17 / "evidence.zip", root)


def compare(saved, actual):
    for m in MODELS:
        if len(saved["split"][m]["rows"]) != len(actual["split"][m]["rows"]):
            raise ValueError("row_inventory")
        if wire(saved["split"][m]["rows"]) != wire(actual["split"][m]["rows"]):
            raise ValueError("split_mismatch")
        if wire(saved["split"][m]["counts"]) != wire(actual["split"][m]["counts"]):
            raise ValueError("split_mismatch")
    if wire(saved["awareness"]) != wire(actual["awareness"]):
        raise ValueError("sidecar_mismatch")
    if wire(saved["coverage"]) != wire(actual["coverage"]):
        raise ValueError("coverage_mismatch")
    if wire(saved) != wire(actual):
        raise ValueError("report_mismatch")


def receipt_for(report, root, replay, manifest_root):
    return {
        "verified": True,
        "kind": "frozen_replay_chained"
        if replay["result"] == "verified"
        else "hash_bound_projection",
        "arm": "composed_frozen",
        "replay": replay,
        "generations": report["generations"],
        "branches": report["branches"],
        "archive_root": root,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "model_inference": False,
        "tree_state": tree_state(),
        "note": (
            "recomputing a projection from the project's own archive is not custody "
            "evidence; the Phase 17 root is a self-supplied pin"
        ),
    }


def verify(pack, expected_root, *, protocol=None, replay=False):
    protocol_digest = check_protocol(protocol or PROTOCOL)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    root, archive = load_archive()
    if saved.get("archive_root") != root:
        raise ValueError("archive_binding")
    actual = projection.report(archive, projection.load_tasks())
    actual.update(protocol_sha256=protocol_digest, archive_root=root)
    compare(saved, actual)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    if replay:
        if not host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        rep = frozen_replay(archive)
    else:
        rep = {"result": "not_run", "reason": "not_requested"}
    return receipt_for(saved, root, rep, expected_root)


def run(out, *, replay=False, protocol=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol()))
    protocol_digest = check_protocol(proto_path)
    root, archive = load_archive()
    report = projection.report(archive, projection.load_tasks())
    report.update(protocol_sha256=protocol_digest, archive_root=root)
    files = {"report.json": wire(report)}
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(manifest_root + "\n")
    if replay:
        if not host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        rep = frozen_replay(archive)
    else:
        rep = {
            "result": "not_run",
            "reason": "not_requested" if host_can_replay() else "host_not_linux_x86_64",
        }
    receipt = verify(out / "evidence.zip", manifest_root, protocol=proto_path)
    receipt["replay"] = rep
    receipt["kind"] = (
        "frozen_replay_chained"
        if rep["result"] == "verified"
        else "hash_bound_projection"
    )
    (out / "receipt.json").write_bytes(wire(receipt))
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
    launch.add_argument("--replay", action="store_true")
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    check.add_argument("--replay", action="store_true")
    args = parser.parse_args()
    if args.command == "run":
        print(json.dumps(run(args.out.resolve(), replay=args.replay), sort_keys=True))
    else:
        print(
            json.dumps(
                verify(
                    args.pack,
                    args.expected_root,
                    protocol=args.protocol,
                    replay=args.replay,
                ),
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
