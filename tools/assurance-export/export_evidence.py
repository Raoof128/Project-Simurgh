"""Versioned public outcome bundles, with explicit source-consistency verification."""

import argparse
import re
import subprocess
import zipfile
from pathlib import Path

from outcomes import (
    DOCS,
    MAX_BYTES,
    ROOT,
    from_jsonl,
    loads,
    project,
    sha,
    to_jsonl,
    validate,
    wire,
)

PROTOCOL = DOCS / "protocol.json"
SOURCE = ROOT / "docs/research/model-composition-phase-10"
MEMBERS = {"public.json", "metadata.json", "outcomes.jsonl", "release.json"}


def write_bundle(path, view, release):
    validate(view)
    metadata, lines = to_jsonl(view)
    files = {
        "public.json": wire(view),
        "metadata.json": metadata,
        "outcomes.jsonl": lines,
        "release.json": wire(release),
    }
    manifest = wire(
        {
            "schema": "simurgh-phase14-pack-v1",
            "files": {n: sha(raw) for n, raw in sorted(files.items())},
        }
    )
    with zipfile.ZipFile(path, "x", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", manifest)
        for n, raw in sorted(files.items()):
            z.writestr(n, raw)
    return sha(manifest)


def read_bundle(path, root):
    if type(root) is not str or not re.fullmatch("[0-9a-f]{64}", root):
        raise ValueError("expected_root_required")
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("archive_size")
    with zipfile.ZipFile(path) as z:
        info = z.infolist()
        names = [i.filename for i in info]
        if (
            len(names) != 5
            or set(names) != MEMBERS | {"manifest.json"}
            or sum(i.file_size for i in info) > MAX_BYTES
        ):
            raise ValueError("archive_inventory")
        manifest_raw = z.read("manifest.json")
        if sha(manifest_raw) != root:
            raise ValueError("manifest_root")
        manifest = loads(manifest_raw)
        if (
            set(manifest) != {"schema", "files"}
            or manifest["schema"] != "simurgh-phase14-pack-v1"
            or set(manifest["files"]) != MEMBERS
        ):
            raise ValueError("manifest_schema")
        files = {n: z.read(n) for n in MEMBERS}
        if any(sha(raw) != manifest["files"][n] for n, raw in files.items()):
            raise ValueError("member_hash")
    view = loads(files["public.json"])
    validate(view)
    if wire(view) != files["public.json"] or wire(
        from_jsonl(files["metadata.json"], files["outcomes.jsonl"])
    ) != wire(view):
        raise ValueError("jsonl_roundtrip")
    release = loads(files["release.json"])
    if (
        set(release)
        != {"schema", "protocol_sha256", "protocol_commit", "public_sha256"}
        or release["schema"] != "simurgh-phase14-release-v1"
        or release["public_sha256"] != sha(files["public.json"])
        or any(
            type(release[k]) is not str
            or re.fullmatch("[0-9a-f]{" + str(n) + "}", release[k]) is None
            for k, n in [("protocol_sha256", 64), ("protocol_commit", 40)]
        )
    ):
        raise ValueError("release_binding")
    return view, release


def inspect(path, root):
    view, _ = read_bundle(path, root)
    return {
        "public_structure_verified": True,
        "source_consistency_verified": False,
        "branches": len(view["rows"]),
        "public_sha256": sha(wire(view)),
        "manifest_sha256": root,
        "independent_custody": False,
    }


def match_source(view, cap, tasks, source_root):
    if wire(view) != wire(project(cap, tasks, source_root)):
        raise ValueError("source_projection_mismatch")


def expected_sources():
    p = SOURCE / "protocol.json"
    return (
        set(loads(p.read_bytes())["sources"])
        | {
            str(p.relative_to(ROOT)),
            str((SOURCE / "evidence.zip").relative_to(ROOT)),
            str((SOURCE / "ROOT.sha256").relative_to(ROOT)),
        }
        | {
            str(p.relative_to(ROOT))
            for p in (ROOT / "tools/assurance-export").rglob("*.py")
        }
    )


def check_protocol():
    p = loads(PROTOCOL.read_bytes())
    if (
        set(p)
        != {
            "schema",
            "sources",
            "source_manifest_sha256",
            "branches",
            "format",
            "source_validation_required",
        }
        or p["schema"] != "simurgh-phase14-protocol-v1"
        or p["branches"] != 144
        or p["format"] != "simurgh-phase14-outcomes-v1"
        or p["source_validation_required"] is not True
        or p["source_manifest_sha256"] != (SOURCE / "ROOT.sha256").read_text().strip()
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, h in p["sources"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or sha(path.read_bytes()) != h:
            raise ValueError("source_binding:" + name)
    return p


def committed_protocol(commit):
    if type(commit) is not str or not re.fullmatch("[0-9a-f]{40}", commit):
        raise ValueError("protocol_commit")

    def read(name):
        return subprocess.check_output(["git", "show", commit + ":" + name], cwd=ROOT)

    if read(str(PROTOCOL.relative_to(ROOT))) != PROTOCOL.read_bytes():
        raise ValueError("protocol_not_committed")
    for name, h in loads(PROTOCOL.read_bytes())["sources"].items():
        if sha(read(name)) != h:
            raise ValueError("source_not_frozen:" + name)


def load_verified_source(path, root):
    # SDK dependencies are only imported for full source verification, never inspect.
    import evidence as source_evidence

    source_evidence.verify(path, root)
    files = source_evidence.read_pack(path, root)
    cap = source_evidence.loads(files["capture.json"])
    tasks = source_evidence.loads((SOURCE / "tasks.json").read_bytes())
    return cap, tasks


def verify(path, root, source_path, source_root):
    p = check_protocol()
    view, release = read_bundle(path, root)
    if (
        release["protocol_sha256"] != sha(PROTOCOL.read_bytes())
        or source_root != p["source_manifest_sha256"]
    ):
        raise ValueError("protocol_binding")
    committed_protocol(release["protocol_commit"])
    cap, tasks = load_verified_source(source_path, source_root)
    match_source(view, cap, tasks, source_root)
    return {
        **inspect(path, root),
        "source_consistency_verified": True,
        "source_manifest_sha256": source_root,
        "export_protocol_sha256": release["protocol_sha256"],
        "receiver_replay_from_public_only": False,
    }


def run(out, source_path, source_root):
    p = check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    if source_root != p["source_manifest_sha256"]:
        raise ValueError("source_root")
    out.mkdir(parents=True, exist_ok=False)
    try:
        cap, tasks = load_verified_source(source_path, source_root)
        view = project(cap, tasks, source_root)
        release = {
            "schema": "simurgh-phase14-release-v1",
            "protocol_sha256": sha(PROTOCOL.read_bytes()),
            "protocol_commit": commit,
            "public_sha256": sha(wire(view)),
        }
        metadata, lines = to_jsonl(view)
        for name, raw in [
            ("public.json", wire(view)),
            ("metadata.json", metadata),
            ("outcomes.jsonl", lines),
            ("release.json", wire(release)),
        ]:
            (out / name).write_bytes(raw)
        root = write_bundle(out / "public.zip", view, release)
        (out / "ROOT.sha256").write_text(root + "\n")
        receipt = verify(out / "public.zip", root, source_path, source_root)
        (out / "receipt.json").write_bytes(wire(receipt))
        print(wire(receipt).decode(), end="")
    except BaseException as exc:
        (out / "failure.json").write_bytes(
            wire({"complete": False, "error_type": type(exc).__name__})
        )
        raise


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    r = sub.add_parser("export")
    r.add_argument("--out", type=Path, required=True)
    for command in (r, sub.add_parser("verify")):
        command.add_argument("--source-pack", type=Path, required=True)
        command.add_argument("--source-root", required=True)
        if command.prog.endswith("verify"):
            command.add_argument("pack", type=Path)
            command.add_argument("--expected-root", required=True)
    i = sub.add_parser("inspect")
    i.add_argument("pack", type=Path)
    i.add_argument("--expected-root", required=True)
    a = p.parse_args()
    if a.command == "export":
        run(a.out, a.source_pack, a.source_root)
    elif a.command == "inspect":
        print(wire(inspect(a.pack, a.expected_root)).decode(), end="")
    else:
        print(
            wire(
                verify(a.pack, a.expected_root, a.source_pack, a.source_root)
            ).decode(),
            end="",
        )


if __name__ == "__main__":
    main()
