# SPDX-License-Identifier: AGPL-3.0-or-later
"""Print the Phase 19 handoff's lane table and its recomputed status as JSON.

Usage: python3 -E -s -B read-handoff.py <repository root>

The lane table and the status are the handoff tool's own (`handoff19.PHASES`, `handoff19.status`),
so the explorer never keeps a second copy of which items an outside operator still owes.
"""

import json
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / "tools" / "assurance-provenance"))

import handoff19  # noqa: E402

print(
    json.dumps(
        {
            "phases": [
                {
                    "id": p["id"],
                    "docs": p["docs"],
                    "module": p["module"],
                    "host": p["host"],
                    "time": p["time"],
                    "deeper": handoff19.deeper_items(p["id"]),
                }
                for p in handoff19.PHASES
            ],
            "status": handoff19.status(),
            "guide": (handoff19.DOCS / "HANDOFF.md").relative_to(root).as_posix(),
        }
    )
)
