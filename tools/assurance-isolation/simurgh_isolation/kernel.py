"""Linux x86_64, trusted bootstrap, no pathname I/O after lockdown.

The host provisions exact regular files and a connected TCP socket. Unknown FDs
are closed before an additive seccomp filter restricts I/O by FD and direction.
No argument pointer dereferencing, filesystem path matching or network DNS rules.
"""

import ctypes
import errno
import fcntl
import os
import platform
import socket
import stat


class Refusal(Exception):
    """No execution or containment claim after a failed prerequisite."""


class Instruction(ctypes.Structure):
    _fields_ = [
        ("code", ctypes.c_ushort),
        ("jt", ctypes.c_ubyte),
        ("jf", ctypes.c_ubyte),
        ("k", ctypes.c_uint),
    ]


class Program(ctypes.Structure):
    _fields_ = [
        ("length", ctypes.c_ushort),
        ("instructions", ctypes.POINTER(Instruction)),
    ]


KILL, PERMIT, DENY = 0x80000000, 0x7FFF0000, 0x00050000 | errno.EPERM
# No open/stat-by-path, exec/clone, IPC, fd acquisition or filter-changing calls.
# fork is deliberate: its child inherits the filter and the same capabilities.
ALLOW = {
    3: "close",
    8: "lseek",
    10: "mprotect",
    11: "munmap",
    12: "brk",
    13: "rt_sigaction",
    14: "rt_sigprocmask",
    15: "rt_sigreturn",
    24: "sched_yield",
    28: "madvise",
    35: "nanosleep",
    39: "getpid",
    57: "fork",
    60: "exit",
    61: "wait4",
    96: "gettimeofday",
    102: "getuid",
    104: "getgid",
    107: "geteuid",
    108: "getegid",
    110: "getppid",
    131: "sigaltstack",
    186: "gettid",
    218: "set_tid_address",
    228: "clock_gettime",
    230: "clock_nanosleep",
    231: "exit_group",
    273: "set_robust_list",
    318: "getrandom",
}


def validate_numbers(caps):
    if not isinstance(caps, dict) or set(caps) - {"input", "output", "network"}:
        raise Refusal("unknown capability role")
    values = list(caps.values())
    if any(type(fd) is not int or not 3 <= fd < 2**31 for fd in values):
        raise Refusal("invalid capability descriptor")
    if len(set(values)) != len(values):
        raise Refusal("aliased capability descriptors")


def prepare(caps, peer):
    """Trusted, single-threaded setup only; no untrusted code may race this step."""
    validate_numbers(caps)
    if len(os.listdir("/proc/self/task")) != 1:
        raise Refusal("setup requires one thread")
    for fd in (1, 2):
        if not stat.S_ISFIFO(os.fstat(fd).st_mode):
            raise Refusal("report streams must be parent-owned pipes")
    stdin = os.fstat(0)
    if not stat.S_ISCHR(stdin.st_mode) or stdin.st_rdev != os.makedev(1, 3):
        raise Refusal("stdin must be /dev/null")
    for role, mode in (("input", os.O_RDONLY), ("output", os.O_WRONLY)):
        if role not in caps:
            continue
        fd = caps[role]
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        if (
            not stat.S_ISREG(os.fstat(fd).st_mode)
            or flags & os.O_ACCMODE != mode
            or flags & os.O_PATH
        ):
            raise Refusal("require regular file with exact access direction")
    if "network" in caps:
        # Validation does not convey DNS/TLS identity: expected peer is trusted
        # host configuration, not supplied by untrusted task content.
        check = socket.socket(fileno=os.dup(caps["network"]))
        try:
            if (
                check.family not in (socket.AF_INET, socket.AF_INET6)
                or check.type != socket.SOCK_STREAM
                or tuple(check.getpeername()) != tuple(peer or ())
            ):
                raise Refusal("connected TCP peer mismatch")
        finally:
            check.close()
    elif peer is not None:
        raise Refusal("peer without network capability")
    keep = {0, 1, 2, *caps.values()}
    for name in os.listdir("/proc/self/fd"):
        fd = int(name)
        if fd not in keep:
            try:
                os.close(fd)
            except OSError as exc:
                if exc.errno != errno.EBADF:
                    raise


def fd_rule(number, descriptors):
    # Compare all 64 bits of arg0, then exact allowed descriptors. No pointer reads.
    block = [(0x20, 0, 0, 20), (0x15, 1, 0, 0), (0x06, 0, 0, DENY), (0x20, 0, 0, 16)]
    for fd in sorted(descriptors):
        block += [(0x15, 0, 1, fd), (0x06, 0, 0, PERMIT)]
    block.append((0x06, 0, 0, DENY))
    return [(0x15, 0, len(block), number)] + block


def filter_instructions(caps):
    validate_numbers(caps)
    rows = [
        (0x20, 0, 0, 4),
        (0x15, 1, 0, 0xC000003E),
        (0x06, 0, 0, KILL),
        (0x20, 0, 0, 0),
        (0x35, 0, 1, 0x40000000),
        (0x06, 0, 0, KILL),
    ]
    readers = {caps[k] for k in ("input", "network") if k in caps}
    writers = {1, 2} | {caps[k] for k in ("output", "network") if k in caps}
    rows += fd_rule(0, readers) + fd_rule(1, writers)
    rows += fd_rule(5, readers | writers)  # fstat only for existing objects
    # mmap(flags == MAP_PRIVATE|MAP_ANONYMOUS) only. File-backed/shared mappings
    # could bypass the read/write rules or introduce a shared-memory channel.
    block = [
        (0x20, 0, 0, 44),
        (0x15, 1, 0, 0),
        (0x06, 0, 0, DENY),
        (0x20, 0, 0, 40),
        (0x15, 0, 1, 0x22),
        (0x06, 0, 0, PERMIT),
        (0x06, 0, 0, DENY),
    ]
    rows += [(0x15, 0, len(block), 9)] + block
    for number in sorted(ALLOW):
        rows += [(0x15, 0, 1, number), (0x06, 0, 0, PERMIT)]
    return rows + [(0x06, 0, 0, DENY)]


def install(caps):
    if (
        platform.system() != "Linux"
        or platform.machine() != "x86_64"
        or ctypes.sizeof(ctypes.c_void_p) != 8
    ):
        raise Refusal("only Linux x86_64 supported")
    if len(os.listdir("/proc/self/task")) != 1:
        raise Refusal("profile setup requires one thread")
    rows = filter_instructions(caps)
    instructions = (Instruction * len(rows))(*(Instruction(*r) for r in rows))
    program = Program(len(rows), instructions)
    libc = ctypes.CDLL(None, use_errno=True)
    libc.syscall.restype = ctypes.c_long
    libc.prctl.argtypes = (ctypes.c_int,) + (ctypes.c_ulong,) * 4
    if libc.prctl(38, 1, 0, 0, 0) != 0:
        raise Refusal("no_new_privs unavailable")
    if libc.syscall(317, 1, 1, ctypes.byref(program)) != 0:
        raise Refusal("seccomp installation failed")
    try:
        fd = os.open("/dev/null", os.O_RDONLY)
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise Refusal("unexpected path denial") from exc
    else:
        os.close(fd)
        raise Refusal("path denial probe failed")
