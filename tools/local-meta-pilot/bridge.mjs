// The model supplies proposals only. Corpus, policies, modes and code are host-owned.
import { getScenarios } from "../openai-readiness/corpus.mjs";
import { manifest, runExperiment } from "../openai-readiness/experiment.mjs";

const scenarios = getScenarios();
if (process.argv.slice(2).join() === "--dataset") {
  console.log(
    JSON.stringify({
      manifest: manifest(),
      scenarios: scenarios.map(({ id, kind, prompt, untrustedContext, toolSchemas }) => ({
        id,
        kind,
        prompt,
        untrustedContext,
        toolSchemas,
      })),
    })
  );
} else {
  if (process.argv.length !== 2) throw new Error("invalid arguments");
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
    if (Buffer.byteLength(text) > 262144) throw new Error("input too large");
  }
  const proposals = JSON.parse(text);
  if (
    Object.keys(proposals).sort().join() !==
    scenarios
      .map((s) => s.id)
      .sort()
      .join()
  )
    throw new Error("incomplete proposal set");
  const modes = Object.fromEntries(
    ["enforced", "bypass", "deny_all"].map((mode) => [
      mode,
      runExperiment({ scenarios, proposals, mode }),
    ])
  );
  console.log(JSON.stringify(modes));
}
