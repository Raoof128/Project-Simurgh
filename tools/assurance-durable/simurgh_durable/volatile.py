# SPDX-License-Identifier: AGPL-3.0-or-later
"""Deliberately volatile replay control, solely for the restart experiment."""

import os
import tempfile

from .store import Store, canonical, fsync_directory, valid_action

CONSUMED = set()


def execute(root, action):
    if not valid_action(action):
        return {"status": "denied"}
    with Store(root).transaction() as (_, authority):
        if action not in authority["actions"] or action["id"] in CONSUMED:
            return {"status": "denied"}
        CONSUMED.add(action["id"])
        directory = Store(root).root / "volatile-effects"
        directory.mkdir(mode=0o700, exist_ok=True)
        fd, _ = tempfile.mkstemp(suffix=".json", dir=directory)
        with os.fdopen(fd, "wb") as stream:
            stream.write(canonical({"action": action}).encode("utf-8"))
            stream.flush()
            os.fsync(stream.fileno())
        fsync_directory(directory)
        return {
            "status": "executed",
            "effectCreated": True,
            "event": {"action": action},
        }
