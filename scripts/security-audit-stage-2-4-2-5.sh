#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="${SIMURGH_SECURITY_AUDIT_LOG_DIR:-.simurgh_check_logs/stage24-25-security}"
mkdir -p "$LOG_DIR"

echo "Stage 2.4/2.5 cybersecurity audit: SDK + daemon + scanner + signed proof"

node --test tests/security/stage24_25_security_audit.test.js
node tools/privacy-audit.mjs
npm audit --audit-level=high

./scripts/smoke-stage-2-4-2-5.sh

bash -n tools/simurgh-daemon-macos/scripts/*.sh
tools/simurgh-daemon-macos/scripts/install-launch-agent.sh --check
tools/simurgh-daemon-macos/scripts/uninstall-launch-agent.sh --check

if grep -RniE "innerHTML\s*=|insertAdjacentHTML|eval\(|new Function\(" public src tests \
  | grep -v "public/index.html:.*verdictBox.innerHTML" \
  | grep -v "public/index.html:.*baselineState.innerHTML" \
  | grep -v "public/instructor.html:683:" \
  | grep -v "public/instructor.html:687:" \
  | grep -v "public/instructor.html:.*grid.innerHTML"; then
  echo "unsafe dynamic HTML sink found outside reviewed dashboard/student render paths" >&2
  exit 1
fi

if grep -RniE "process_name|window_title|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" \
  data logs .simurgh_check_logs 2>/dev/null \
  | grep -v "security/stage24_25_security_audit" \
  | grep -v "privacy-fields.log" \
  | grep -v "npm_test.log" \
  | grep -v "stage24-25-security"; then
  echo "generated output contains raw local-data field names" >&2
  exit 1
fi

if grep -RniE "cheating detected|student guilty|confirmed misconduct|hardware attestation verified|production ready|MDM ready" \
  README.md SECURITY.md PRIVACY.md ROADMAP.md docs public src 2>/dev/null \
  | grep -vE "docs/superpowers/|docs/DEVICE_SHIELD_CONTRACT\.md|docs/DEVICE_SHIELD_PLATFORM_MATRIX\.md|docs/stages/STAGE_2_7_REVIEWER_CHECKLIST\.md|docs/stages/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD\.md|tests/security/stage27_|src/bankingPilot/bankingNarrativeOutputFirewall\.js" \
  | grep -E . >&2; then
  echo "overclaim wording found" >&2
  exit 1
fi

if grep -RniE "curl .*sh|sudo rm -rf|chmod 777|0\.0\.0\.0" tools/simurgh-daemon-macos 2>/dev/null; then
  echo "dangerous daemon shell/network pattern found" >&2
  exit 1
fi

if [[ "$(uname)" == "Darwin" ]] && command -v swift >/dev/null 2>&1; then
  (
    cd tools/simurgh-daemon-macos
    swift test
    swift build
    swift build -c release
    swift run SimurghDaemon doctor > "$ROOT_DIR/$LOG_DIR/daemon-doctor.txt" || true
  )
  if grep -Ei "private_key|secret|token|process_name|window_title|username|home|serial|mac_address|screenshot|screen_pixels|webcam|typed|paste" \
    "$LOG_DIR/daemon-doctor.txt"; then
    echo "daemon doctor output contains sensitive wording" >&2
    exit 1
  fi
else
  echo "macOS Swift audit skipped: not on Darwin or swift unavailable"
fi

echo "Stage 2.4/2.5 cybersecurity audit passed"
