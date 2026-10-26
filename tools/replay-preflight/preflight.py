"""Name the host prerequisite a frozen replay needs before the replay hides it.

The provider-role demo and the transfer-study verifier replay hash-pinned sources that
cannot be edited without invalidating their evidence. On an unsupported host those
sources fail late and opaquely: `sqlite3.OperationalError: database is locked` on macOS,
or `apply_action: worker_refused` when the worker's seccomp lockdown is refused, because
the frozen worker runner discards the child's stderr. This preflight reproduces each
prerequisite in isolation and reports the actual reason. It is not a verifier and makes
no evidence claim; a passing preflight only means the replay can start.
"""

import argparse
import fcntl
import platform
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ISOLATION = ROOT / "tools/assurance-isolation"

# The frozen worker's own bootstrap: prepare() then install() in a child whose stdin is
# /dev/null and whose report streams are parent-owned pipes.
SECCOMP_PROBE = (
    "import sys; sys.path.insert(0, sys.argv[1]);"
    "from simurgh_isolation.kernel import install, prepare;"
    "prepare({}, None); install({}); print('installed')"
)


def check_platform(system=None, machine=None):
    system = system or platform.system()
    machine = machine or platform.machine()
    if system == "Linux" and machine == "x86_64":
        return None
    reason = f"{system} {machine} is unsupported; the replay requires Linux x86_64"
    if system == "Darwin":
        reason += (
            " (macOS: the frozen pipeline holds fcntl.flock on its SQLite file and Darwin"
            " flock conflicts with SQLite's own lock, so the replay stops with"
            " 'database is locked'; the worker's seccomp filter is Linux-only)"
        )
    elif system == "Linux":
        reason += " (the worker's seccomp filter encodes x86_64 syscall numbers)"
    return reason


def check_python(version=None):
    version = version or sys.version_info[:2]
    if tuple(version) == (3, 12):
        return None
    return (
        "Python %d.%d found; the hash-locked requirements target Python 3.12"
        % tuple(version)
    )


def check_history(root=ROOT):
    try:
        shallow = subprocess.run(
            ["git", "rev-parse", "--is-shallow-repository"],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "not a Git checkout; the verifier compares live sources with committed bytes"
    if shallow != "false":
        return "shallow clone; fetch full history so freeze commits resolve"
    return None


def check_sqlite_under_flock():
    """The exact pattern of the frozen pipeline: flock the database, then query it."""
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "pipeline.sqlite"
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE state(held INTEGER)")
            db.execute("INSERT INTO state VALUES(0)")
        db = None
        try:
            with path.open("rb") as handle:
                fcntl.flock(handle, fcntl.LOCK_EX)
                try:
                    db = sqlite3.connect(path, timeout=1)
                    db.execute("SELECT held FROM state").fetchall()
                finally:
                    fcntl.flock(handle, fcntl.LOCK_UN)
        except sqlite3.OperationalError as exc:
            return (
                f"SQLite cannot read a database this process holds under flock: {exc}"
            )
        finally:
            if db is not None:
                db.close()
    return None


def check_seccomp(python=sys.executable):
    process = subprocess.run(
        [python, "-B", "-E", "-s", "-c", SECCOMP_PROBE, str(ISOLATION)],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
        timeout=30,
    )
    if process.returncode == 0 and process.stdout.strip() == b"installed":
        return None
    lines = process.stderr.decode("utf-8", "replace").strip().splitlines()
    return "worker isolation refused: " + (lines[-1] if lines else "no diagnostic")


def check_dependencies():
    try:
        import agents  # noqa: F401  # openai-agents, from the hash-locked requirements
    except ImportError as exc:
        return f"locked dependencies are not installed in this interpreter: {exc}"
    return None


CHECKS = (
    ("platform", check_platform),
    ("python", check_python),
    ("git-history", check_history),
    ("sqlite-under-flock", check_sqlite_under_flock),
    ("worker-seccomp", check_seccomp),
    ("dependencies", check_dependencies),
)


def run(checks=None):
    failures = []
    for name, check in CHECKS if checks is None else checks:
        try:
            reason = check()
        except (
            Exception
        ) as exc:  # a crashing check is a failed prerequisite, not a pass
            reason = f"{type(exc).__name__}: {exc}"
        print(
            ("ok    " if reason is None else "FAIL  ")
            + name
            + ("" if reason is None else ": " + reason)
        )
        if reason is not None:
            failures.append(name)
    return failures


def main(argv=None):
    argparse.ArgumentParser(description=__doc__.splitlines()[0]).parse_args(argv)
    failures = run()
    if failures:
        print(
            f"preflight refused: {len(failures)} prerequisite(s) unmet; the replay will not run here"
        )
        return 1
    print("preflight passed: the replay can start on this host")
    return 0


if __name__ == "__main__":
    sys.exit(main())
