#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# RELEASE-ONLY gate (NOT wired into check.sh). v2.6.0 may be tagged ONLY when the committed
# evidence is the REAL RunPod capture, not the sample.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3v-b"
node -e '
const b = require("./'"$EV"'/attestation.bundle.json");
const c = require("./'"$EV"'/capture-replay/lg4-frozen-capture.json");
const SHA = /^sha256:[0-9a-f]{64}$/;
const p = b.capture_provenance || {};
if (c.live !== true) throw new Error("capture is not live (still sample) — refusing release");
if (c.capture_environment !== "runpod_gpu") throw new Error("capture_environment is not runpod_gpu");
if (b.target_defense.live !== true) throw new Error("bundle target_defense.live must be true");
if (b.capture_mode !== "live_capture_frozen_replay") throw new Error("capture_mode mismatch");
if (b.model_reexecuted_in_ci !== false) throw new Error("model_reexecuted_in_ci must be false");
if (!p.hf_model_commit || p.hf_model_commit === "sample-deterministic") throw new Error("hf_model_commit is still sample");
if (!SHA.test(p.hf_model_snapshot_digest || "")) throw new Error("hf_model_snapshot_digest is not a real sha256");
if (!SHA.test(p.tokenizer_config_digest || "")) throw new Error("tokenizer_config_digest is not a real sha256");
if (!SHA.test(p.chat_template_hash || "")) throw new Error("chat_template_hash is not a real sha256");
if (/^1970/.test(p.captured_at_utc || "1970")) throw new Error("captured_at_utc is still the sample epoch");
if (!b.gateway_computed_hashes.capture_file_hash) throw new Error("capture_file_hash missing");
console.log("stage3vb live-release gate: PASS (real capture present)");
'
