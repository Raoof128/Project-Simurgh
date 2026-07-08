#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Simurgh end-to-end gate — the second CI step, run AFTER scripts/check.sh.
#
# The base gate (check.sh) runs unit tests + static checks + platform smokes.
# This script runs everything end-to-end: the full-chain E2E nets under
# tests/e2e/ and the byte-stable LLM-Shield reproduce pipelines (Stage 4D–4L).
#
# REQUIRES NODE 26: the reproduce pipelines assert byte-stable hermeticity, which
# only holds under Node 26. The script fails closed if the major version is lower.
#
# Usage:
#   ./scripts/check-e2e.sh          # full end-to-end run
#   ./scripts/check-e2e.sh --verbose
#
# Exit code: 0 if all gates pass, 1 otherwise.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -t 1 && "${NO_COLOR:-}" == "" ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' NC=''
fi

VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

PASS=0
FAIL=0
FAILED_STEPS=()
LOG_DIR=".simurgh_check_logs"
mkdir -p "$LOG_DIR"

step() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}
pass() {
  echo -e "${GREEN}✓ $1${NC}"
  PASS=$((PASS + 1))
}
fail() {
  echo -e "${RED}✗ $1${NC}"
  FAIL=$((FAIL + 1))
  FAILED_STEPS+=("$1")
}

# run_step <name> <tail-lines> <cmd...> — logs to file, prints tail on failure.
run_step() {
  local name="$1"
  local tail_lines="$2"
  shift 2
  # Sanitise spaces AND slashes so the step name never creates a bogus subdir path.
  local safe="${name// /_}"
  safe="${safe//\//_}"
  local log_file="$LOG_DIR/e2e_${safe}.log"
  if [[ "$VERBOSE" == true ]]; then
    echo -e "${YELLOW}$*${NC}"
    if "$@" 2>&1 | tee "$log_file"; then pass "$name"; else fail "$name"; fi
  else
    if "$@" > "$log_file" 2>&1; then
      pass "$name"
    else
      fail "$name"
      echo -e "${YELLOW}Last $tail_lines log lines from $log_file:${NC}"
      tail -"$tail_lines" "$log_file" || true
    fi
  fi
}

# ── 0. Node version (byte-stable reproduce requires Node 26) ──
step "Node version (>= 26 required for byte-stable reproduce)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -ge 26 ]]; then
  pass "node $(node --version) (>= 26)"
else
  fail "node $(node --version || echo 'missing') — need >= 26 for byte-stable reproduce"
  echo -e "${RED}Aborting: E2E reproduce is not hermetic below Node 26.${NC}"
  exit 1
fi

# ── 1. Full-chain E2E nets (tests/e2e) ────────────────────
# node --test needs explicit files, not a bare directory — enumerate with find.
# Portable (bash 3.2): expand the newline list into args at the call site. Repo
# paths never contain spaces (same assumption check.sh makes with its globs).
step "Full-chain E2E nets (tests/e2e)"
E2E_FILES="$(find tests/e2e -name '*.test.js' | sort | tr '\n' ' ')"
if [[ -z "$E2E_FILES" ]]; then
  fail "no E2E test files found under tests/e2e"
else
  echo "  $(echo "$E2E_FILES" | wc -w | tr -d ' ') E2E test files"
  # Serialise (--test-concurrency=1): these nets each regenerate fixtures into temp
  # dirs; running files in parallel races on shared fixture I/O ("Unexpected end of
  # JSON input"). They are correct when run one file at a time.
  # shellcheck disable=SC2086
  run_step "e2e nets" 60 node --test --test-concurrency=1 $E2E_FILES
fi

# ── 2. LLM-Shield reproduce pipelines (Stage 4D–4L) ───────
# Moved out of check.sh so the base gate stays unit+static; these are the
# byte-stable end-to-end reproductions and belong on the Node-26 e2e step.
declare -a REPRODUCE=(
  "Stage 4D decision-replay evidence pack|scripts/reproduce-stage4d.sh"
  "Stage 4E browser-agent containment run|scripts/reproduce-stage4e.sh"
  "Stage 4F containment-utility Pareto canary|scripts/reproduce-stage4f.sh"
  "Stage 4G adaptive red-team campaign|scripts/reproduce-stage4g.sh"
  "Stage 4H proof-carrying containment|scripts/reproduce-llm-shield-stage4h.sh"
  "Stage 4J PCTA|scripts/reproduce-llm-shield-stage4j.sh"
  "Stage 4K EBA|scripts/reproduce-llm-shield-stage4k.sh"
  "Stage 4L CCB|scripts/reproduce-llm-shield-stage4l.sh"
  "Stage 4M VXD|scripts/reproduce-llm-shield-stage4m.sh"
  "Stage 4O VTSA|scripts/reproduce-llm-shield-stage4o.sh"
  "Stage 4P VOCA|scripts/reproduce-llm-shield-stage4p.sh"
  "Stage 4Q VFR|scripts/reproduce-llm-shield-stage4q.sh"
  "Stage 4R PCCC|scripts/reproduce-llm-shield-stage4r.sh"
  "Stage 4S VDCC|scripts/reproduce-llm-shield-stage4s.sh"
  "Stage 4U VRTA|scripts/reproduce-llm-shield-stage4u.sh"
  "Stage 4T VIC|scripts/reproduce-llm-shield-stage4t.sh"
  "Stage 4V VDP|scripts/reproduce-llm-shield-stage4v.sh"
  "Stage 4W VSN|scripts/reproduce-llm-shield-stage4w.sh"
  "Stage 4X VLR|scripts/reproduce-llm-shield-stage4x.sh"
  "Stage 4Y VDR|scripts/reproduce-llm-shield-stage4y.sh"
  "Stage 4Z VWA|scripts/reproduce-llm-shield-stage4z.sh"
)
for entry in "${REPRODUCE[@]}"; do
  name="${entry%%|*}"
  script="${entry#*|}"
  step "LLM Shield $name (reproduce)"
  if [[ -x "$script" || -f "$script" ]]; then
    run_step "$name" 100 bash "$script"
  else
    fail "$name — reproduce script missing: $script"
  fi
done

# ── Summary ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━ E2E Summary ━━━${NC}"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}Failed steps:${NC}"
  for failed in "${FAILED_STEPS[@]}"; do
    echo -e "  ${RED}- $failed${NC}"
  done
  echo ""
  echo -e "${YELLOW}Logs saved in: $LOG_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}All E2E gates passed.${NC}"
