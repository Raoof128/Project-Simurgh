// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const UNIT = "tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service";
const INSTALL = "tools/simurgh-daemon-linux/scripts/install-user-unit.sh";
const UNINSTALL = "tools/simurgh-daemon-linux/scripts/uninstall-user-unit.sh";
const CHECK = "tools/simurgh-daemon-linux/scripts/check-user-unit.sh";
const DOCTOR = "tools/simurgh-daemon-linux/scripts/doctor-user-unit.sh";

test("[stage-2-8d] systemd user unit file exists", () => {
  assert.ok(existsSync(UNIT), `${UNIT} missing`);
});

test("[stage-2-8d] systemd unit is user-scope only (no system-wide)", () => {
  const src = readFileSync(UNIT, "utf8");
  assert.ok(!/User=root/.test(src), "unit declares User=root");
  assert.ok(!/WantedBy=multi-user\.target/.test(src), "unit targets system-wide");
  assert.ok(/WantedBy=default\.target/.test(src), "unit must target default.target (user)");
  assert.ok(!/\bsudo\b/.test(src), "unit references sudo");
});

test("[stage-2-8d] systemd unit binds daemon to loopback by env or default", () => {
  const src = readFileSync(UNIT, "utf8");
  assert.ok(!/--bind\s+0\.0\.0\.0/.test(src), "unit broadens bind to 0.0.0.0");
  assert.ok(/ExecStart=%h\/.local\/bin\/simurgh-daemon-linux/.test(src), "unit ExecStart wrong");
});

test("[stage-2-8d] install / uninstall / check / doctor scripts exist + executable", () => {
  for (const s of [INSTALL, UNINSTALL, CHECK, DOCTOR]) {
    assert.ok(existsSync(s), `${s} missing`);
    const mode = statSync(s).mode & 0o777;
    assert.ok((mode & 0o100) !== 0, `${s} not user-executable (mode ${mode.toString(8)})`);
  }
});

test("[stage-2-8d] install script supports --check and --dry-run", () => {
  const src = readFileSync(INSTALL, "utf8");
  assert.ok(/--check/.test(src), "install script missing --check support");
  assert.ok(/--dry-run/.test(src), "install script missing --dry-run support");
});

test("[stage-2-8d] lifecycle scripts use only systemctl --user (no sudo / no system mode)", () => {
  for (const s of [INSTALL, UNINSTALL, CHECK, DOCTOR]) {
    const src = readFileSync(s, "utf8");
    assert.ok(!/\bsudo\b/.test(src), `${s} uses sudo`);
    assert.ok(!/systemctl\s+(?!--user)/m.test(src), `${s} uses non --user systemctl`);
  }
});

test("[stage-2-8d] lifecycle scripts contain no eval and no curl pipe", () => {
  for (const s of [INSTALL, UNINSTALL, CHECK, DOCTOR]) {
    const src = readFileSync(s, "utf8");
    assert.ok(!/\beval\b/.test(src), `${s} uses eval`);
    assert.ok(!/curl[^|]+\|\s*(sh|bash)/.test(src), `${s} pipes curl to shell`);
  }
});
