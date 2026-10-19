#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Stage 5S — Task 36 — run every PRIOR reproduce script.
#
# THE SET PIN IS THE AUTHORITY; THE GLOB IS ONLY HOW CANDIDATES ARE DISCOVERED. Seven scripts sit
# outside the `reproduce-llm-shield-stage*` family, so a glob alone is not a census — and revision
# 2's `reproduce-stage-*.sh` would have matched 4 and missed 43.
#
# THIS STAGE'S OWN SCRIPT IS EXCLUDED BY NAME. Including it would make this task re-run Task 34
# under the label "prior", which is a count going up and no new evidence (§14, R5).
#
# A script that VANISHES is a refusal, not a silence: the discovered set is compared against the
# committed pin and any addition or removal stops the run.

set -euo pipefail
cd "$(dirname "$0")/.."

# Phase 16 current inventory extends, and hash-binds, the historical Stage 5S pin.
SELF=reproduce-llm-shield-stage5s.sh
DISCOVERED_FILE=$(mktemp)
trap 'rm -f "$DISCOVERED_FILE"' EXIT
if ! node scripts/lib/currentReproduceSet.mjs > "$DISCOVERED_FILE"; then
  printf 'REFUSED — the prior set drifted from its pin\n'
  exit 1
fi

DISCOVERED_COUNT=$(wc -l < "$DISCOVERED_FILE" | tr -d ' ')
printf 'prior reproduce scripts: %s (pinned as a set, 5S excluded by name)\n' "$DISCOVERED_COUNT"

PASSED=0
FAILED=0
while IFS= read -r script; do
  [ -n "$script" ] || continue
  status=0
  set +e
  bash "scripts/$script" >"/tmp/prior-${script}.log" 2>&1
  status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    PASSED=$((PASSED + 1))
    printf 'PASS  %s\n' "$script"
  else
    FAILED=$((FAILED + 1))
    printf 'FAIL  %s (exit %s)\n' "$script" "$status"
  fi
done < "$DISCOVERED_FILE"

printf '\nprior reproduce: %s passed, %s failed\n' "$PASSED" "$FAILED"
if [ "$PASSED" -eq 0 ]; then
  printf 'REFUSED — no prior script executed\n'
  exit 2
fi
[ "$FAILED" -eq 0 ] || exit 1
printf 'OK — every prior reproduce script still reproduces\n'
