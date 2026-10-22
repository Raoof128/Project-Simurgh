#!/usr/bin/env python3
"""Check tracked CommonMark/HTML local links without network or content execution.

Requires markdown-it-py==3.0.0. Root-relative application URLs in HTML are routes,
not filesystem targets. Generated anchors, external links and inline-code paths
are outside this checker. GitHub-like heading slugs are approximated explicitly.
"""
import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit

from markdown_it import MarkdownIt

HTML_TARGET = re.compile(r'''(?:href|src)=["']([^"']+)''')
HTML_ANCHOR = re.compile(r'''(?:id|name)=["']([^"']+)''')


def check(repo):
    markdown = MarkdownIt("commonmark", {"html": True}).enable("table")
    files = subprocess.check_output(
        ["git", "-C", str(repo), "ls-files"], text=True
    ).splitlines()
    if not files:
        raise ValueError("Empty tracked inventory cannot pass")
    cache = {}

    def parse(path):
        if path not in cache:
            cache[path] = markdown.parse(path.read_text())
        return cache[path]

    def anchors(path):
        found = set(HTML_ANCHOR.findall(path.read_text()))
        seen = {}
        tokens = parse(path)
        for index, token in enumerate(tokens):
            if token.type != "heading_open":
                continue
            children = tokens[index + 1].children or []
            heading = "".join(
                child.content for child in children if child.type not in {"html_inline", "image"}
            ).lower()
            heading = "".join(
                char for char in heading
                if char in "_- " or unicodedata.category(char)[0] in "LN"
            ).replace(" ", "-")
            count = seen.get(heading, 0)
            seen[heading] = count + 1
            found.add(heading + (f"-{count}" if count else ""))
        return found

    checked = []
    document_count = 0
    for name in sorted(set(files)):
        path = repo / name
        if not path.is_file() or path.suffix not in {".md", ".markdown", ".mdx", ".html", ".htm"}:
            continue
        document_count += 1
        targets = []
        if path.suffix in {".md", ".markdown", ".mdx"}:
            for token in parse(path):
                line = token.map[0] + 1 if token.map else None
                for child in token.children or []:
                    if child.type in {"link_open", "image"}:
                        targets.append((child.attrGet("href") or child.attrGet("src"), line))
                    elif child.type == "html_inline":
                        targets.extend((target, line) for target in HTML_TARGET.findall(child.content))
                if token.type == "html_block":
                    targets.extend((target, line) for target in HTML_TARGET.findall(token.content))
        else:
            targets = [(target, None) for target in HTML_TARGET.findall(path.read_text())]
        for target, line in targets:
            if not target or urlsplit(target).scheme or target.startswith("//"):
                continue
            raw, _, fragment = target.partition("#")
            raw = unquote(raw.split("?")[0])
            fragment = unquote(fragment)
            if path.suffix in {".html", ".htm"} and raw.startswith("/"):
                continue
            if any(char in raw for char in "{}<>*"):
                continue
            if not raw:
                destination = path
            elif raw.startswith("/"):
                destination = (repo / raw.lstrip("/")).resolve()
            else:
                destination = (path.parent / raw).resolve()
            status = "resolved"
            if not destination.exists():
                status = "missing_path"
            elif fragment and destination.suffix in {".md", ".markdown", ".mdx"}:
                if fragment not in anchors(destination):
                    status = "missing_anchor"
            elif fragment and destination.suffix in {".html", ".htm"}:
                if fragment not in set(HTML_ANCHOR.findall(destination.read_text())):
                    status = "missing_html_anchor"
            checked.append({"path": name, "line": line, "target": target, "status": status})
    if not document_count:
        raise ValueError("No eligible documents inspected")
    issues = [item for item in checked if item["status"] != "resolved"]
    return {"documents": document_count, "total": len(checked), "issues": issues, "checked": checked}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--out", type=Path, required=True, help="New JSON output path")
    args = parser.parse_args()
    result = check(args.repo.resolve())
    with args.out.open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
    print(json.dumps({"documents": result["documents"], "local_links": result["total"], "issues": result["issues"]}))
    if result["issues"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
