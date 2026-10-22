#!/usr/bin/env python3
"""Inventory baseline documentation without executing document content or mutating inputs.

Run from any directory. Requires Python 3.12 and pdftotext for PDF extraction.
This scanner is not a semantic reviewer or an artifact authenticity verifier.
"""
import argparse
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

BASELINE = "8d47bbbfd2bc2e351fa334fa3a61acc7ac108ef5"
EXTENSIONS = {
    ".md", ".markdown", ".mdx", ".txt", ".rst", ".adoc", ".html", ".htm",
    ".tex", ".bib", ".bbl", ".pdf", ".docx",
}
SPECIAL_NAMES = {"LICENSE", "NOTICE", "CITATION.cff"}
SIGNALS = {
    "placeholder": r"\b(?:TODO|TBD|FIXME|XXX)\b|YOUR[_ -](?:KEY|NAME|TOKEN)|\[INSERT|<(?:repo|tag-or-branch|pinned[^>]*|SESSION_ID|SESSION_TOKEN)>",
    "workstation_path": r"/Users/|/home/|/workspace/",
    "temporal": r"\b(?:current|latest|next|pending|unrun|incomplete|not yet)\b",
    "assurance": r"\b(?:certified|production.ready|guarantee|first.ever|100%|10/10)\b",
}


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args])


def category(name):
    p = Path(name)
    if p.name in SPECIAL_NAMES:
        return "license_or_citation"
    if p.name == "requirements.txt":
        return "dependency_manifest"
    if p.suffix in {".pdf", ".docx", ".tex", ".bib", ".bbl"} or name.startswith("papers/"):
        return "publication_or_personal_record"
    if p.suffix in {".html", ".htm"} and name.startswith(("tools/", "public/")):
        return "executable_html"
    if name in {"AGENT.md", "CHANGELOG.md", "wiki/log.md"}:
        return "append_only_log"
    if name in {"RESEARCH_HISTORY.md", "DEVICE_ROADMAP.md"}:
        return "exact_archive"
    if "/evidence/" in name or name.startswith("tests/fixtures/"):
        return "evidence_or_fixture"
    if name.startswith(("docs/superpowers/", "docs/stages/", "docs/research/llm-shield/")):
        return "stage_research_record"
    if name.startswith(("docs/research/", "docs/assurance/")):
        return "scoped_research_record"
    return "guidance_or_supporting_document"


def extract(path):
    if path.suffix == ".pdf":
        result = subprocess.run(
            ["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True
        )
        return result.stdout, "pdftotext_layout"
    if path.suffix == ".docx":
        with zipfile.ZipFile(path) as archive:
            root = ET.fromstring(archive.read("word/document.xml"))
            # Extract prose only, not markup or executable document relationships.
            ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            return "\n".join(node.text or "" for node in root.iter(ns + "t")), "docx_word_text"
    return path.read_text(encoding="utf-8", errors="strict"), "utf8_complete"


def scan(repo, baseline, reviews):
    tracked = git(repo, "ls-tree", "-r", "--name-only", baseline).decode().splitlines()
    candidates = sorted(
        p for p in tracked if Path(p).suffix.lower() in EXTENSIONS or Path(p).name in SPECIAL_NAMES
    )
    if not candidates:
        raise ValueError("Empty document inventory cannot pass")
    changed = set(git(repo, "diff", "--name-only", baseline).decode().splitlines())
    rows = []
    for index, name in enumerate(candidates, 1):
        path = repo / name
        raw = path.read_bytes()  # Missing baseline files fail rather than silently disappear.
        original = git(repo, "show", f"{baseline}:{name}") if name in changed else raw
        text, extraction = extract(path)
        lines = text.splitlines()
        signals = {
            key: [i + 1 for i, line in enumerate(lines) if re.search(pattern, line, re.I)]
            for key, pattern in SIGNALS.items()
        }
        review = reviews.get(name, {})
        rows.append({
            "ordinal": index,
            "path": name,
            "category": category(name),
            "baseline_sha256": hashlib.sha256(original).hexdigest(),
            "observed_sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "lines": len(lines),
            "words": len(text.split()),
            "extraction": extraction,
            "changed_from_baseline": original != raw,
            "review_scope": review.get("scope", "complete_text_automated_scan"),
            "review_note": review.get("note", "Preserved; automated signals are not semantic or scientific validation. Read in its own revision/stage context."),
            "errata": review.get("errata", []),
            "signals": signals,
        })
    if len({row["path"] for row in rows}) != len(candidates):
        raise ValueError("Duplicate or omitted candidate")
    if set(reviews) - set(candidates):
        raise ValueError("Review mapping contains paths outside baseline inventory")
    return {
        "schema": "simurgh.documentation_audit.v1",
        "baseline": baseline,
        "review_date": "2026-10-19",
        "timezone": "Australia/Sydney",
        "candidate_rule": "Tracked baseline extensions: " + ", ".join(sorted(EXTENSIONS))
        + "; names: " + ", ".join(sorted(SPECIAL_NAMES)),
        "candidate_count": len(rows),
        "candidate_paths_sha256": hashlib.sha256(("\n".join(candidates) + "\n").encode()).hexdigest(),
        "limits": [
            "Complete candidate coverage is not complete semantic review.",
            "No historical commands, embedded HTML scripts or model captures are executed.",
            "PDF/DOCX text extraction does not validate visual layout, references or owner identity.",
            "Machine evidence and archives use their own verifiers; no cryptographic validity is inferred from this inventory.",
            "Signals can be deliberate examples, non-claims or historical context, not confirmed defects.",
            "New audit deliverables are verified separately to avoid self-referential hashes.",
        ],
        "documents": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--baseline", default=BASELINE)
    parser.add_argument("--reviews", type=Path, default=Path(__file__).with_name("reviews.json"))
    parser.add_argument("--out", type=Path, required=True, help="New output path; never overwrites")
    args = parser.parse_args()
    result = scan(args.repo.resolve(), args.baseline, json.loads(args.reviews.read_text()))
    with args.out.open("x", encoding="utf-8") as output:
        json.dump(result, output, indent=2, ensure_ascii=False)
        output.write("\n")
    print(json.dumps({"candidate_count": result["candidate_count"], "output": str(args.out)}))


if __name__ == "__main__":
    main()
