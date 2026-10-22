#!/usr/bin/env python3
"""Inventory repository files; lexical signals are triage candidates, not findings."""

import argparse
import ast
import collections
import concurrent.futures
import datetime
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--out",
    type=Path,
    required=True,
    help="JSON inventory destination; excluded from its own inventory",
)
args = parser.parse_args()
output = args.out.resolve()
paths = sorted(
    set(
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT,
        )
        .decode()
        .strip("\0")
        .split("\0")
    )
)
records = []
for rel in paths:
    if not rel:
        continue
    p = ROOT / rel
    if p.resolve() == output:
        continue
    entry = {"path": rel, "review": "automated-byte-and-text-scan", "flags": []}
    if p.is_symlink():
        entry.update(
            kind="symlink", targetWithinRepository=p.resolve().is_relative_to(ROOT)
        )
        records.append(entry)
        continue
    try:
        data = p.read_bytes()
    except OSError as exc:
        entry.update(kind="unreadable", error=type(exc).__name__)
        records.append(entry)
        continue
    entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    historical = (
        "/evidence/" in rel
        or "/fixtures/" in rel
        or "/goldens/" in rel
        or rel.startswith(("docs/superpowers/", "proofs/"))
        or rel in ["RESEARCH_HISTORY.md", "DEVICE_ROADMAP.md"]
    )
    entry["scopeHint"] = (
        "historical-or-fixture" if historical else "other"
    )  # Hint only; not authority to edit.
    try:
        text = data.decode("utf8")
        assert "\0" not in text
    except (UnicodeDecodeError, AssertionError):
        entry.update(kind="binary", review="byte-inventory-only")
        records.append(entry)
        continue
    entry.update(kind="text", lines=len(text.splitlines()))
    for label, pattern in [
        ("unfinished-markers", r"\b(?:TODO|FIXME|TBD|PLACEHOLDER)\b"),
        ("conflict-markers", r"^(?:<{7}|>{7})\s"),
        ("absolute-local-path", r"/(?:Users|home)/[A-Za-z0-9_.-]+/"),
    ]:
        lines = [
            i for i, line in enumerate(text.splitlines(), 1) if re.search(pattern, line)
        ]
        if lines:
            entry["flags"].append(
                {"type": label, "lines": lines[:30], "count": len(lines)}
            )
    if data and not data.endswith(b"\n"):
        entry["flags"].append({"type": "no-terminal-newline"})
    if p.suffix == ".json":
        try:
            json.loads(text)
            entry["parse"] = "json-pass"
        except (ValueError, RecursionError) as exc:
            entry["parse"] = "json-fail"
            entry["flags"].append(
                {"type": "json-parse", "line": getattr(exc, "lineno", None)}
            )
    if p.suffix == ".py":
        try:
            ast.parse(text, filename=rel)
            entry["parse"] = "python-pass"
        except (SyntaxError, ValueError) as exc:
            entry["parse"] = "python-fail"
            entry["flags"].append(
                {"type": "python-parse", "line": getattr(exc, "lineno", None)}
            )
    records.append(entry)
checks = [
    e
    for e in records
    if e.get("kind") == "text"
    and Path(e["path"]).suffix in [".js", ".mjs", ".cjs", ".sh"]
]


def check(e):
    parser = "bash" if e["path"].endswith(".sh") else "node"
    cmd = (
        ["bash", "-n", "--", e["path"]]
        if parser == "bash"
        else ["node", "--check", e["path"]]
    )
    try:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, timeout=20, check=False)
        e["parse"] = parser + ("-pass" if r.returncode == 0 else "-fail")
        if r.returncode:
            e["flags"].append({"type": parser + "-syntax", "exitCode": r.returncode})
    except (subprocess.TimeoutExpired, OSError):
        e["parse"] = parser + "-unverified"
        e["flags"].append({"type": "parser-unavailable-or-timeout"})


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(check, checks))
summary = {
    "fileCount": len(records),
    "bytes": sum(e.get("bytes", 0) for e in records),
    "kinds": dict(collections.Counter(e["kind"] for e in records)),
    "parseResults": dict(
        collections.Counter(
            e.get("parse", "not-applicable-or-not-run") for e in records
        )
    ),
    "flagCounts": dict(
        collections.Counter(f["type"] for e in records for f in e["flags"])
    ),
}
report = {
    "schema": "simurgh-file-review-v1",
    "generatedAt": datetime.datetime.now(datetime.UTC).isoformat(),
    "baseCommit": subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip(),
    "outputExcluded": str(output.relative_to(ROOT))
    if output.is_relative_to(ROOT)
    else "outside-repository",
    "scope": "Tracked and unignored local files present at scan; output file itself excluded; dependencies outside repository excluded by Git ignore rules. Every listed file read as bytes; text parsed/scanned where specified. Automated flags are triage candidates, not findings. Binary visual/semantic review not performed. No whole-repository human review claim.",
    "summary": summary,
    "files": records,
}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(summary, indent=2))
print(
    "Parse failures:",
    [
        (e["path"], e.get("parse"))
        for e in records
        if e.get("parse", "").endswith("-fail")
    ],
)

raise SystemExit(
    int(
        any(
            e.get("kind") == "unreadable"
            or e.get("parse", "").endswith(("-fail", "-unverified"))
            for e in records
        )
    )
)
