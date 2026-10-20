# SPDX-License-Identifier: AGPL-3.0-or-later
"""Read only declared JSON members, with bounded sizes, without extraction."""
import hashlib
import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    result = {}
    names = archive.namelist()
    for model in ("llama", "luna"):
        name = model + ".json"
        if names.count(name) != 1 or archive.getinfo(name).file_size > 16 * 1024 * 1024:
            raise ValueError("Ambiguous or oversized transfer member")
        with archive.open(name) as stream:
            raw = stream.read(16 * 1024 * 1024 + 1)
        if len(raw) > 16 * 1024 * 1024:
            raise ValueError("Oversized transfer member")
        data = json.loads(raw)
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
