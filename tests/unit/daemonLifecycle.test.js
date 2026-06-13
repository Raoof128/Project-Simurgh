// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DAEMON_ROOT = join(ROOT, "tools", "simurgh-daemon-macos");

test("daemon lifecycle source exposes start stop status doctor reset-identity commands", async () => {
  const source = await readFile(
    join(DAEMON_ROOT, "Sources", "SimurghDaemon", "DaemonCommand.swift"),
    "utf8"
  );

  for (const command of ["start", "stop", "status", "doctor", "reset-identity"]) {
    assert.match(source, new RegExp(`case\\s+"${command}"`));
  }
  assert.match(source, /port_unavailable/);
  assert.match(source, /127\.0\.0\.1/);
});

test("development LaunchAgent installer and uninstaller are bounded to local dev", async () => {
  const plist = await readFile(
    join(DAEMON_ROOT, "launchd", "dev.raouf.simurgh.daemon.plist"),
    "utf8"
  );
  const install = await readFile(join(DAEMON_ROOT, "scripts", "install-launch-agent.sh"), "utf8");
  const uninstall = await readFile(
    join(DAEMON_ROOT, "scripts", "uninstall-launch-agent.sh"),
    "utf8"
  );

  assert.match(plist, /dev\.raouf\.simurgh\.daemon/);
  assert.match(plist, /127\.0\.0\.1|SIMURGH_DAEMON_PORT|3031/);
  assert.match(install, /Development-only local LaunchAgent/);
  assert.match(install, /Not notarised/);
  assert.match(install, /Not MDM deployment/);
  assert.match(uninstall, /bootout/);
  assert.doesNotMatch(install + uninstall, /sudo|LaunchDaemons|\/Library\/LaunchDaemons/);
});
