#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
destination="${1:?Usage: bash tools/assurance-redis/install-redis.sh ABSOLUTE_DESTINATION}"
case "$destination" in /*) ;; *) exit 2 ;; esac
build_root="$(mktemp -d /tmp/simurgh-redis-build-XXXXXXXX)"
trap 'rm -rf -- "$build_root"' EXIT
archive="$build_root/redis.tar.gz"
curl --fail --location --silent --show-error --max-time 120 \
  --output "$archive" https://download.redis.io/releases/redis-8.10.2.tar.gz
printf '%s  %s\n' b9ffee226b5eecdba98a679260dad764b2a4ebd90dce4ad5ac9e9f3eef9c02b3 "$archive" | sha256sum --check
tar -xzf "$archive" -C "$build_root"
if ! make -C "$build_root/redis-8.10.2" -j2 MALLOC=libc BUILD_TLS=no USE_SYSTEMD=no redis-server > "$build_root/build.log" 2>&1; then
  tail -80 "$build_root/build.log"
  exit 1
fi
mkdir -p -- "$destination"
install -m 755 "$build_root/redis-8.10.2/src/redis-server" "$destination/redis-server"
"$destination/redis-server" --version
