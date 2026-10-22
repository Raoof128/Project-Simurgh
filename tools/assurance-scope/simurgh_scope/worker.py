"""Trusted experiment worker killed after a durable intent, before send."""

import json
import sys
import threading
from pathlib import Path

from .broker import Broker
from .fixtures import proposal, registry, send


def main():
    root, fixture_root, mode, action = sys.argv[1:]
    root = Path(root)
    policy = json.loads((root / "policy.json").read_text())

    def ready():
        (root / "intent-ready").write_text("ready")
        threading.Event().wait()

    broker = Broker(
        root / "crash.sqlite",
        policy,
        lambda r: send(r, registry(fixture_root)),
        mode=mode,
        after_intent=ready if action == "pause" else None,
    )
    print(json.dumps(broker.execute(proposal())), flush=True)


if __name__ == "__main__":
    main()
