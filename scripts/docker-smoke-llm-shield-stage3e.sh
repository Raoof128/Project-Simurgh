#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3E docker smoke: build mock-mode image, boot, hit the gateway, assert
# non-root + 3E receipt. Skips gracefully if Docker is unavailable.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "docker-smoke-llm-shield-stage3e: SKIP (docker unavailable)"
  exit 0
fi
IMG=simurgh-gateway-stage3e:smoke
docker build -f Dockerfile.gateway -t "$IMG" . >/tmp/3e-docker-build.log 2>&1
CID=$(docker run -d -p 33060:33030 -e SIMURGH_LLM_SHIELD_SECRET=docker-mock-secret-32-characters-xx "$IMG")
cleanup() { docker rm -f "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for _ in {1..60}; do curl -sf http://127.0.0.1:33060/health >/dev/null 2>&1 && break; sleep 0.5; done
WHO=$(docker exec "$CID" id -u)
if [ "$WHO" != "0" ]; then echo "[PASS] container runs non-root (uid=$WHO)"; else echo "[FAIL] container runs as root"; exit 1; fi
S=$(curl -sf -X POST http://127.0.0.1:33060/api/llm-shield/gateway/sessions -H "Content-Type: application/json" -d '{}')
SID=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).session_id))")
TOK=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
R=$(curl -sf -X POST "http://127.0.0.1:33060/api/llm-shield/gateway/$SID/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d '{"input":"hi","provider_mode":"mock","provider":"mock","scenario":"benign"}')
if echo "$R" | grep -q '"schema_version":"3E"'; then echo "[PASS] docker mock run emits 3E receipt"; else echo "[FAIL] no 3E receipt"; exit 1; fi
echo "docker-smoke-llm-shield-stage3e: passed"
