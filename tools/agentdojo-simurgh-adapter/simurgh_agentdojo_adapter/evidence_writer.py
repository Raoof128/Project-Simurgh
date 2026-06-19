# SPDX-License-Identifier: AGPL-3.0-or-later
"""Writes Layer-2 external-run evidence. Same schema as the Node CI exporter.
Enforces the metadata-only contract before writing."""
import json
import os

FORBIDDEN = {
    "api_key",
    "anthropic_api_key",
    "provider_request_body",
    "provider_response_body",
    "raw_provider_output",
    "system_prompt",
    "transcript",
    "tool_result",
}


class EvidenceLeakage(RuntimeError):
    pass


def write_evidence(out_dir, metrics):
    blob = json.dumps(metrics).lower()
    for k in FORBIDDEN:
        if k in metrics or f'"{k}"' in blob:
            raise EvidenceLeakage(f"forbidden key: {k}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        f.write(json.dumps(metrics, indent=2) + "\n")
