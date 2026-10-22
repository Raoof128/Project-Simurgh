"""Source-bound model capture publication and mandatory fresh proposal replay."""

import argparse
import hashlib
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

from contract import CONTROLS, TRIALS, validate_tasks
from deps import DOCS, MANIFEST, ROOT, Provider, loads, wire, write_pack
from reproduce import preflight
from runner import SEED_BASE, execute

from audit import check_capture, check_journal, summarize

PROTOCOL = DOCS / "protocol.json"
MAX_PACK_BYTES = 128 * 1024 * 1024


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_pack(path, expected_root):
    if (
        type(expected_root) is not str
        or len(expected_root) != 64
        or any(c not in "0123456789abcdef" for c in expected_root)
    ):
        raise ValueError("expected_root_required")
    if path.stat().st_size > MAX_PACK_BYTES:
        raise ValueError("archive_size")
    with zipfile.ZipFile(path) as z:
        info = z.infolist()
        names = [i.filename for i in info]
        if not 4 <= len(info) <= 2000 or len(set(names)) != len(names):
            raise ValueError("archive_inventory")
        if sum(i.file_size for i in info) > MAX_PACK_BYTES:
            raise ValueError("archive_size")
        if any(
            PurePosixPath(n).is_absolute()
            or ".." in PurePosixPath(n).parts
            or "\\" in n
            or n.endswith("/")
            for n in names
        ):
            raise ValueError("archive_path")
        raw = z.read("manifest.json")
        if sha(raw) != expected_root:
            raise ValueError("manifest_root")
        m = loads(raw)
        if (
            set(m) != {"schema", "files"}
            or m["schema"] != "simurgh-phase4-pack-v1"
            or set(names) != {"manifest.json", *m["files"]}
        ):
            raise ValueError("archive_inventory")
        files = {n: z.read(n) for n in m["files"]}
        if any(sha(raw) != m["files"][n] for n, raw in files.items()):
            raise ValueError("member_hash")
        return files


def expected_sources():
    inherited = set()
    for name in ("composition-phase-9", "model-phase-3"):
        p = ROOT / "docs/research" / name / "protocol.json"
        inherited.update(loads(p.read_bytes())["sources"])
        inherited.add(str(p.relative_to(ROOT)))
    inherited.update(
        str(p.relative_to(ROOT))
        for p in (ROOT / "tools/assurance-model-composed").rglob("*.py")
    )
    inherited.update(
        str((DOCS / name).relative_to(ROOT))
        for name in (
            "tasks.json",
            "corpus-provenance.md",
            "settings.json",
            "development-tasks.json",
            "development-pilot.json",
        )
    )
    return inherited


def check_protocol():
    preflight()
    p = loads(PROTOCOL.read_bytes())
    settings = loads((DOCS / "settings.json").read_bytes())
    if (
        set(p)
        != {
            "schema",
            "sources",
            "controls",
            "trials",
            "seed_base",
            "planned_tasks",
            "planned_generations",
            "planned_branches",
            "raw_snapshots",
            "model_header",
        }
        or p["schema"] != "simurgh-phase10-protocol-v1"
        or p["controls"] != list(CONTROLS)
        or p["trials"] != list(TRIALS)
        or p["seed_base"] != SEED_BASE
        or (
            p["planned_tasks"],
            p["planned_generations"],
            p["planned_branches"],
            p["raw_snapshots"],
        )
        != (24, 48, 144, 1440)
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, h in p["sources"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or sha(path.read_bytes()) != h:
            raise ValueError("source_binding:" + name)
    validate_tasks(loads((DOCS / "tasks.json").read_bytes()))
    if settings["batch_size"] != 16:
        raise ValueError("batch_size")
    if p["model_header"]["manifest_sha256"] != sha(MANIFEST.read_bytes()):
        raise ValueError("model_manifest")
    return p


def committed_protocol(commit):
    if (
        type(commit) is not str
        or len(commit) != 40
        or any(c not in "0123456789abcdef" for c in commit)
    ):
        raise ValueError("protocol_commit")

    def read(name):
        return subprocess.check_output(["git", "show", commit + ":" + name], cwd=ROOT)

    if read(str(PROTOCOL.relative_to(ROOT))) != PROTOCOL.read_bytes():
        raise ValueError("protocol_not_committed")
    for name, h in loads(PROTOCOL.read_bytes())["sources"].items():
        if sha(read(name)) != h:
            raise ValueError("source_not_frozen:" + name)


def make_report(cap, tasks):
    return {
        "schema": "simurgh-phase10-report-v1",
        "capture_sha256": sha(wire(cap)),
        "metadata": cap["metadata"],
        "summary": summarize(cap, tasks),
    }


def check_report(report, cap, tasks):
    if wire(report) != wire(make_report(cap, tasks)):
        raise ValueError("report_mismatch")


def verify(path, expected_root):
    p = check_protocol()
    files = read_pack(path, expected_root)
    cap = loads(files.pop("capture.json"))
    journal = files.pop("journal.jsonl")
    report = loads(files.pop("report.json"))
    if (
        set(cap["metadata"]) != {"protocol_sha256", "protocol_commit"}
        or cap["metadata"]["protocol_sha256"] != sha(PROTOCOL.read_bytes())
        or wire(cap["model_header"]) != wire(p["model_header"])
    ):
        raise ValueError("capture_protocol_binding")
    committed_protocol(cap["metadata"]["protocol_commit"])
    tasks = loads((DOCS / "tasks.json").read_bytes())
    check_journal(cap, journal)
    check_capture(cap, tasks, files, replay=True)
    check_report(report, cap, tasks)
    return {
        "verified": True,
        "generations": len(cap["generations"]),
        "branches": len(cap["rows"]),
        "raw_snapshots": len(files),
        "manifest_sha256": expected_root,
        "model_inference_regenerated": False,
        "independent_custody": False,
    }


def run(out, python, model_dir):
    p = check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    if out.exists():
        raise ValueError("output_exists")
    out.parent.mkdir(parents=True, exist_ok=True)
    provider = Provider(
        python,
        model_dir,
        MANIFEST,
        DOCS / "settings.json",
        out.with_suffix(".worker.log"),
    )
    try:
        if wire(provider.header) != wire(p["model_header"]):
            raise ValueError("runtime_binding")
        tasks = loads((DOCS / "tasks.json").read_bytes())
        cap, files = execute(
            tasks,
            provider,
            out,
            metadata={
                "protocol_sha256": sha(PROTOCOL.read_bytes()),
                "protocol_commit": commit,
            },
        )
    finally:
        provider.close()
    files["capture.json"] = wire(cap)
    files["journal.jsonl"] = (out / "journal.jsonl").read_bytes()
    files["report.json"] = wire(make_report(cap, tasks))
    (out / "report.json").write_bytes(files["report.json"])
    root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(root + "\n")
    receipt = verify(out / "evidence.zip", root)
    (out / "receipt.json").write_bytes(wire(receipt))
    print(wire(receipt).decode(), end="")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    r = sub.add_parser("run")
    r.add_argument("--out", type=Path, required=True)
    r.add_argument("--model-python", required=True)
    r.add_argument("--model-dir", type=Path, required=True)
    v = sub.add_parser("verify")
    v.add_argument("pack", type=Path)
    v.add_argument("--expected-root", required=True)
    args = parser.parse_args()
    if args.command == "run":
        run(args.out, args.model_python, args.model_dir)
    else:
        print(wire(verify(args.pack, args.expected_root)).decode(), end="")


if __name__ == "__main__":
    main()
