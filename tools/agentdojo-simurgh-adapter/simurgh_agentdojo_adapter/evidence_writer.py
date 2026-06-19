# SPDX-License-Identifier: AGPL-3.0-or-later
"""Writes Stage 3H/3H-L2 evidence and enforces the metadata-only contract."""
import json
import os

FORBIDDEN = {
    "api_key",
    "anthropic_api_key",
    "provider_request_body",
    "provider_response_body",
    "raw_provider_output",
    "raw_prompt",
    "raw_tool_output",
    "system_prompt",
    "transcript",
    "trajectory",
    "tool_result",
    "token",
}


class EvidenceLeakage(RuntimeError):
    pass


def _assert_metadata_only(payload):
    blob = json.dumps(payload).lower()
    for key in FORBIDDEN:
        if isinstance(payload, dict) and key in payload:
            raise EvidenceLeakage(f"forbidden key: {key}")
        if f'"{key}"' in blob:
            raise EvidenceLeakage(f"forbidden key: {key}")


def write_evidence(out_dir, metrics):
    write_json_artifacts(out_dir, {"metrics.json": metrics})


def write_json_artifacts(out_dir, artifacts):
    os.makedirs(out_dir, exist_ok=True)
    for filename, payload in artifacts.items():
        _assert_metadata_only(payload)
        with open(os.path.join(out_dir, filename), "w") as f:
            f.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
