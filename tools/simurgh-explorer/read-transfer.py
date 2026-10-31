# SPDX-License-Identifier: AGPL-3.0-or-later
"""Read only declared JSON members, with bounded sizes, without extraction."""
import hashlib
import json
import sys
import zipfile

def member_digest(entry):
    """The manifest records a member's SHA-256 either as a string or under a `sha256` key."""
    if isinstance(entry, dict):
        entry = entry.get("sha256")
    return str(entry or "").removeprefix("sha256:")


with zipfile.ZipFile(sys.argv[1]) as archive:
    result = {}
    names = archive.namelist()
    # The verifier's root is sha256(manifest.json) (audit F-4). The explorer records it and checks
    # the members it reads against the manifest; a mismatch is reported, never silently loaded.
    if names.count("manifest.json") != 1:
        raise ValueError("Ambiguous or missing manifest")
    manifest_raw = archive.read("manifest.json")
    manifest = json.loads(manifest_raw)
    result["manifest_root"] = hashlib.sha256(manifest_raw).hexdigest()
    result["members_match_manifest"] = True
    for model in ("llama", "luna"):
        name = model + ".json"
        if names.count(name) != 1 or archive.getinfo(name).file_size > 16 * 1024 * 1024:
            raise ValueError("Ambiguous or oversized transfer member")
        with archive.open(name) as stream:
            raw = stream.read(16 * 1024 * 1024 + 1)
        if len(raw) > 16 * 1024 * 1024:
            raise ValueError("Oversized transfer member")
        data = json.loads(raw)
        if hashlib.sha256(raw).hexdigest() != member_digest(manifest.get("files", {}).get(name)):
            result["members_match_manifest"] = False
        result[model] = {
            "sha256": hashlib.sha256(raw).hexdigest(),
            "model": data["model"],
            "generations": [{
                "id": g["id"], "task_id": g["task_id"], "trial": g["trial"],
                "proposal": g["proposal"],
                "raw": g["output"]["raw"] if "output" in g else json.dumps(g["call"]["response"].get("output", [])),
            } for g in data["generations"]],
            "rows": [{k: r[k] for k in ("generation", "task_id", "trial", "control", "status",
                       "initial", "leaf_status", "before_effects", "new_effects", "effect_count")}
                     for r in data["rows"]],
        }
    print(json.dumps(result))
