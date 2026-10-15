# SPDX-License-Identifier: AGPL-3.0-or-later
"""Trusted fixed read worker: no model code, path, descriptors or environment."""

import errno
import json
import os
import sys

from simurgh_isolation.kernel import install, prepare


def main():
    config = json.loads(sys.argv[1])
    mode, resource = config["mode"], config["resource"]
    caps = {"input": config["public_fd"]} if mode != "deny_all" else {}
    prepare(caps, None)
    installed = mode != "bypass"
    if installed:
        install(caps)
    result = {
        "status": "blocked",
        "resource": resource,
        "data": None,
        "kernel": {"installed": installed, "descriptor_hygiene": True, "errno": None},
    }
    try:
        if resource == "public":
            # deny_all closes the descriptor at prepare, then denies reads by FD.
            data = os.read(config["public_fd"], 65537)
        else:
            # Actual path-open of the synthetic private object in every mode.
            fd = os.open(config["private_path"], os.O_RDONLY)
            try:
                data = os.read(fd, 65537)
            finally:
                os.close(fd)
        if len(data) > 65536:
            raise ValueError("document_too_large")
        result.update(status="executed", data=data.decode("utf-8"))
    except OSError as error:
        if error.errno != errno.EPERM:
            raise
        result["kernel"]["errno"] = error.errno
    print(json.dumps(result, ensure_ascii=False, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
