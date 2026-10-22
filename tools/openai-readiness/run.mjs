// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { tmpdir } from "node:os";
import { getScenarios } from "./corpus.mjs";
import { runOffline, runLive } from "./experiment.mjs";
import { createArtifact } from "./artifact.mjs";
function parseArgs(args) {
  const opts = { live: false, allowLive: false, out: null, model: process.env.OPENAI_MODEL };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (seen.has(arg)) throw new Error(`Duplicate option: ${arg}`);
    seen.add(arg);
    if (arg === "--live") opts.live = true;
    else if (arg === "--allow-live") opts.allowLive = true;
    else if (arg === "--out" || arg === "--model") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing value: ${arg}`);
      opts[arg === "--out" ? "out" : "model"] = args[++i];
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (opts.live && !opts.allowLive)
    throw new Error("Live requests require explicit --allow-live authorization");
  if (opts.allowLive && !opts.live) throw new Error("--allow-live requires --live");
  if (opts.live && (!opts.model || !process.env.OPENAI_API_KEY))
    throw new Error("Live requests require OPENAI_MODEL or --model, and OPENAI_API_KEY");
  return opts;
}
function checkParents(path) {
  let current = parse(path).root;
  for (const part of dirname(path).slice(current.length).split("/").filter(Boolean)) {
    current = join(current, part);
    if (existsSync(current)) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new Error("Output parent must be a real directory");
    } else mkdirSync(current, { mode: 0o700 });
  }
}
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const out = resolve(
    opts.out || join(mkdtempSync(join(tmpdir(), "simurgh-openai-")), "report.json")
  );
  checkParents(out);
  const fd = openSync(
    out,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600
  );
  try {
    let payload;
    if (opts.live) {
      const { generateOpenAIProposal } = await import("./responsesAdapter.mjs");
      const proposals = {};
      for (const scenario of getScenarios()) {
        try {
          proposals[scenario.id] = await generateOpenAIProposal({
            model: opts.model,
            scenario,
            allowLive: true,
            apiKey: process.env.OPENAI_API_KEY,
          });
        } catch (error) {
          proposals[scenario.id] = {
            error: /^[a-z_]{1,64}$/.test(error.code || "") ? error.code : "provider_error",
          };
        }
      }
      payload = runLive(proposals);
    } else payload = runOffline();
    writeFileSync(fd, `${JSON.stringify(createArtifact(payload), null, 2)}\n`);
    if (!payload.validation.passed) process.exitCode = 1;
    console.log(
      JSON.stringify(
        {
          out,
          track: payload.track,
          validation: payload.validation,
          metrics: Object.fromEntries(
            Object.entries(payload.modes).map(([mode, result]) => [mode, result.metrics])
          ),
        },
        null,
        2
      )
    );
  } catch (error) {
    unlinkSync(out);
    throw error;
  } finally {
    closeSync(fd);
  }
}
main().catch((error) => {
  console.error(`Evaluation failed: ${error.message}`);
  process.exitCode = 1;
});
