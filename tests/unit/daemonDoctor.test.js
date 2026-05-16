import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DOCTOR_PATH = join(
  ROOT,
  "tools",
  "simurgh-daemon-macos",
  "Sources",
  "SimurghDaemon",
  "DaemonDoctor.swift"
);

test("daemon doctor source checks lifecycle dependencies without printing sensitive data", async () => {
  const source = await readFile(DOCTOR_PATH, "utf8");

  for (const check of [
    "daemon_reachable",
    "port_available",
    "keychain_identity",
    "allowed_origin",
    "localhost_binding",
    "server_reachable",
    "proof_round_trip",
  ]) {
    assert.match(source, new RegExp(check));
  }

  for (const forbidden of [
    "privateKey",
    "raw_process",
    "raw_window",
    "process_name",
    "window_title",
    "username",
    "home_directory",
    "serial_number",
    "mac_address",
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden, "i"));
  }
});
