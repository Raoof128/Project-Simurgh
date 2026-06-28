// SPDX-License-Identifier: AGPL-3.0-or-later
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function sha256(text) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

export async function runRecordedCommand({
  label,
  command,
  args = [],
  logDir,
  env,
  expectedGreen = true,
}) {
  await mkdir(logDir, { recursive: true });
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });
  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });
  const logName = `${label}.log`;
  await writeFile(join(logDir, logName), output, "utf8");
  return {
    label,
    command: [command, ...args].join(" "),
    exit_code: exitCode,
    expected_green: expectedGreen,
    log_hash: sha256(output),
    log_name: logName,
  };
}
