# SPDX-License-Identifier: AGPL-3.0-or-later
"""One trusted harness request per fresh executor process."""

import json
import sqlite3
import sys

from .store import Store, parse_json
from .volatile import execute as volatile_execute


def main():
    print("ready", flush=True)
    try:
        data = sys.stdin.buffer.read(65537)
        if len(data) > 65536:
            raise ValueError("request_too_large")
        request = parse_json(data)
        if type(request) is not dict or set(request) not in (
            {"action"},
            {"action", "crashAt"},
        ):
            raise ValueError("invalid_request")
        if len(sys.argv) == 3 and sys.argv[2] == "--volatile":
            if "crashAt" in request:
                raise ValueError("unsupported_control_crash")
            result = volatile_execute(sys.argv[1], request["action"])
        else:
            result = Store(sys.argv[1]).execute(
                request["action"], crash_at=request.get("crashAt")
            )
        print(json.dumps(result, allow_nan=False), flush=True)
        return 0
    except (ValueError, OSError, sqlite3.Error) as error:
        print(
            json.dumps({"status": "error", "reason": type(error).__name__}), flush=True
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
