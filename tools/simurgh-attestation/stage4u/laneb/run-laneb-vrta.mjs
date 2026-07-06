// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U Lane B ceremony wrapper (4U spec §6). Motto: AnthropicSafe First, then
// ReviewerSafe. Lane B is ADDITIVE and sealed separately in lane_b_capture; it never
// mutates the byte-stable offline corpus. In CI (live=false, default) this VERIFIES a
// captured lane_b-capture.json by replaying recorded outcomes through evaluateChainSafe
// — it NEVER re-calls the live model. Live capture is ephemeral → reproduce re-verifies,
// never regenerates. If no capture exists, it degrades gracefully (verified_count 0).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { classify } from "../core/dualSignal.mjs";
import { attackOnce } from "./fable-attacker.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CAPTURE = join(ROOT, "docs/research/llm-shield/evidence/stage-4u/laneb/laneb-capture.json");

function replayEntry(entry) {
  // Refusals and lane_disabled markers are outcomes, not attacks — they reproduce as-is.
  if (entry.outcome_class === "model_refused" || entry.outcome_class === "lane_disabled") {
    return {
      attack_id: entry.attack_id,
      recorded_class: entry.outcome_class,
      replay_class: entry.outcome_class,
    };
  }
  let replay_class = entry.outcome_class;
  if (entry.produced_bundle) {
    const raw = evaluateChainSafe(entry.produced_bundle).raw;
    replay_class = classify(entry.expected_raw ?? raw, raw);
  }
  return { attack_id: entry.attack_id, recorded_class: entry.outcome_class, replay_class };
}

export function runVrtaLaneB({ live = false, client = null, charter = null } = {}) {
  if (!live) {
    if (!existsSync(CAPTURE)) {
      return { raw: 0, reason: "green", verified_count: 0, lane_b_capture: [], replayed: [] };
    }
    const capture = JSON.parse(readFileSync(CAPTURE, "utf8"));
    const entries = capture.lane_b_capture || [];
    const replayed = entries.map(replayEntry);
    for (const r of replayed)
      if (r.replay_class !== r.recorded_class)
        return {
          raw: 129,
          reason: "attack_not_reproducible",
          detail: r,
          replayed,
          lane_b_capture: entries,
        };
    return {
      raw: 0,
      reason: "green",
      verified_count: replayed.length,
      lane_b_capture: entries,
      replayed,
    };
  }
  // Live path (manual only) — not reached in CI.
  return runLive({ client, charter });
}

async function runLive({ client, charter }) {
  const capState = { turns: 0, tokens: 0, spend_usd: 0 };
  const lane_b_capture = [];
  const slots = charter?.attack_family_counts?.fable_adaptive ?? 0;
  for (let i = 0; i < slots; i++) {
    try {
      lane_b_capture.push(await attackOnce({ client, charter, capState, attack_id: `laneb#${i}` }));
    } catch (e) {
      if (e.name === "LaneBCapExceededError") break;
      // A disabled/unavailable lane records a single lane_disabled marker (evidence, not silence).
      lane_b_capture.push({
        attack_id: `laneb#${i}`,
        outcome_class: "lane_disabled",
        reason: String(e.message),
      });
      break;
    }
  }
  mkdirSync(dirname(CAPTURE), { recursive: true });
  writeFileSync(
    CAPTURE,
    JSON.stringify({ schema: "simurgh.vrta_laneb_capture.v1", lane_b_capture }, null, 2) + "\n"
  );
  return { raw: 0, reason: "green", verified_count: lane_b_capture.length, lane_b_capture };
}
