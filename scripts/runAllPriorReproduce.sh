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

PIN=docs/research/llm-shield/evidence/stage-5s/prior-reproduce-set.json
SELF=reproduce-llm-shield-stage5s.sh

# `mapfile` is bash 4+; macOS ships 3.2 and the first version of this script died on line 22 having
# run NOTHING. A sweep that cannot start must not look like a sweep that found nothing wrong, which
# is why the anti-vacuity check at the end exists — it would have caught this even if the shell had
# carried on.
DISCOVERED_FILE=$(mktemp)
PINNED_FILE=$(mktemp)
trap 'rm -f "$DISCOVERED_FILE" "$PINNED_FILE"' EXIT

(cd scripts && ls reproduce-*.sh 2>/dev/null | grep -v "^${SELF}$" | sort) > "$DISCOVERED_FILE"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).scripts.forEach(s=>console.log(s))' "$PIN" | sort > "$PINNED_FILE"

ADDED=$(comm -13 "$PINNED_FILE" "$DISCOVERED_FILE" || true)
REMOVED=$(comm -23 "$PINNED_FILE" "$DISCOVERED_FILE" || true)

if [ -n "$ADDED" ] || [ -n "$REMOVED" ]; then
  printf 'REFUSED — the prior set drifted from its pin\n'
  [ -n "$ADDED" ]   && printf 'added:\n%s\n' "$ADDED"
  [ -n "$REMOVED" ] && printf 'removed:\n%s\n' "$REMOVED"
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
