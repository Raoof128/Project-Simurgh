"""Actual frozen phase 2 native workflow; model arguments never supply identity."""

import sys
from pathlib import Path

from spec import full_action

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import Host
from receiver import Receiver
from study import observed
from workflow import native_delivery


class Session:
    def __init__(self, case, trial, control, directory):
        self.directory = directory
        self.case = case
        self.trial = trial
        self.expected = full_action(case, trial, case["expected"])
        self.receiver = Receiver(directory / "inbox.sqlite")
        try:
            self.host = Host.create(
                directory / "host.sqlite",
                self.receiver.client,
                identity={k: self.expected[k] for k in ("run", "principal", "tenant")},
                approved=self.expected,
                control=control,
            )
        except BaseException:
            self.receiver.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.receiver.close()

    def step(self, proposal):
        status = proposal["status"]
        native = None
        if status == "call":
            action = full_action(self.case, self.trial, proposal["arguments"])
            try:
                native = native_delivery(self.host, action, self.directory)
                status = native["status"]
            except (ValueError, OSError, RuntimeError):
                status = "runtime_error"
        try:
            effects = observed(self.receiver.path)
        except (ValueError, OSError):
            effects = None
            status = "unknown"
        return {"status": status, "effects": effects, "native": native}
