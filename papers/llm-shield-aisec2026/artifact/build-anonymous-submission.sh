#!/usr/bin/env bash
set -euo pipefail

PAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PAPER_DIR/dist"
STAGE_DIR="$DIST_DIR/llm-shield-aisec2026-anonymous"
ARCHIVE="$DIST_DIR/llm-shield-aisec2026-anonymous.tar.gz"

rm -rf "$STAGE_DIR" "$ARCHIVE"
mkdir -p "$STAGE_DIR"

copy_path() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

copy_path "$PAPER_DIR/main.tex" "$STAGE_DIR/main.tex"
copy_path "$PAPER_DIR/references.bib" "$STAGE_DIR/references.bib"
copy_path "$PAPER_DIR/Makefile" "$STAGE_DIR/Makefile"
copy_path "$PAPER_DIR/main.pdf" "$STAGE_DIR/main.pdf"
copy_path "$PAPER_DIR/artifact/README.md" "$STAGE_DIR/artifact/README.md"
copy_path "$PAPER_DIR/artifact/reproduce-paper-claims.sh" "$STAGE_DIR/artifact/reproduce-paper-claims.sh"
copy_path "$PAPER_DIR/source/genai-disclosure.md" "$STAGE_DIR/source/genai-disclosure.md"
copy_path "$PAPER_DIR/source/limitations.md" "$STAGE_DIR/source/limitations.md"

mkdir -p "$STAGE_DIR/figures" "$STAGE_DIR/tables"
touch "$STAGE_DIR/figures/.gitkeep" "$STAGE_DIR/tables/.gitkeep"

IDENTITY_PATTERN="Mohammad|Raouf|Abedini|Macquarie|students\\.mq|raoufabedini|github\\.com/Raoof128|zenodo|/Users/"

if rg -n "$IDENTITY_PATTERN" "$STAGE_DIR"; then
  echo "anonymous artifact scan failed" >&2
  exit 1
fi

if command -v pdftotext >/dev/null 2>&1; then
  if pdftotext "$STAGE_DIR/main.pdf" - | rg -n "$IDENTITY_PATTERN"; then
    echo "anonymous artifact PDF text scan failed" >&2
    exit 1
  fi
else
  echo "warning: pdftotext unavailable; skipped artifact PDF text scan" >&2
fi

chmod +x "$STAGE_DIR/artifact/reproduce-paper-claims.sh"
tar -C "$DIST_DIR" -czf "$ARCHIVE" "llm-shield-aisec2026-anonymous"
rm -rf "$STAGE_DIR"

echo "$ARCHIVE"
