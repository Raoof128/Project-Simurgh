"""Append a default-deny seccomp filter in a trusted, single-threaded worker.

Linux x86_64 syscall numbers only. No privilege or namespace changes. File I/O
is intentionally permitted, so this is not a general process sandbox.
"""

import ctypes
import errno
import os
import platform
import socket
import stat


class Refusal(Exception):
    """A prerequisite failed; do not start serving or claim containment."""


# Linux x86_64 ABI, explicit reviewable set. Network creation/connect/import,
# io_uring, ptrace, process_vm_*, bpf, namespace and filter-changing calls absent.
ALLOW = {
    0: "read",
    1: "write",
    2: "open",
    3: "close",
    4: "stat",
    5: "fstat",
    6: "lstat",
    7: "poll",
    8: "lseek",
    9: "mmap",
    10: "mprotect",
    11: "munmap",
    12: "brk",
    13: "rt_sigaction",
    14: "rt_sigprocmask",
    15: "rt_sigreturn",
    17: "pread64",
    18: "pwrite64",
    19: "readv",
    20: "writev",
    21: "access",
    23: "select",
    24: "sched_yield",
    25: "mremap",
    28: "madvise",
    32: "dup",
    33: "dup2",
    35: "nanosleep",
    39: "getpid",
    43: "accept",
    45: "recvfrom",
    48: "shutdown",
    51: "getsockname",
    52: "getpeername",
    55: "getsockopt",
    56: "clone",
    57: "fork",
    58: "vfork",
    59: "execve",
    60: "exit",
    61: "wait4",
    62: "kill",
    63: "uname",
    72: "fcntl",
    74: "fsync",
    75: "fdatasync",
    77: "ftruncate",
    78: "getdents",
    79: "getcwd",
    80: "chdir",
    82: "rename",
    83: "mkdir",
    84: "rmdir",
    87: "unlink",
    89: "readlink",
    90: "chmod",
    91: "fchmod",
    96: "gettimeofday",
    97: "getrlimit",
    98: "getrusage",
    99: "sysinfo",
    102: "getuid",
    104: "getgid",
    107: "geteuid",
    108: "getegid",
    110: "getppid",
    131: "sigaltstack",
    158: "arch_prctl",
    186: "gettid",
    202: "futex",
    217: "getdents64",
    218: "set_tid_address",
    228: "clock_gettime",
    230: "clock_nanosleep",
    231: "exit_group",
    234: "tgkill",
    257: "openat",
    262: "newfstatat",
    263: "unlinkat",
    267: "readlinkat",
    270: "pselect6",
    271: "ppoll",
    273: "set_robust_list",
    288: "accept4",
    292: "dup3",
    302: "prlimit64",
    318: "getrandom",
    332: "statx",
    334: "rseq",
}
KILL = 0x80000000
PERMIT = 0x7FFF0000
DENY = 0x00050000 | errno.EPERM


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


def filter_instructions():
    # cBPF LD W ABS, JMP JEQ/JGE K, RET K. Wrong audit arch or x32 => kill.
    rows = [
        (0x20, 0, 0, 4),
        (0x15, 1, 0, 0xC000003E),
        (0x06, 0, 0, KILL),
        (0x20, 0, 0, 0),
        (0x35, 0, 1, 0x40000000),
        (0x06, 0, 0, KILL),
    ]
    # sendto permits replies on already connected ingress FDs only: dest_addr=NULL.
    rows += [
        (0x15, 0, 7, 44),
        (0x20, 0, 0, 48),
        (0x15, 1, 0, 0),
        (0x06, 0, 0, DENY),
        (0x20, 0, 0, 52),
        (0x15, 1, 0, 0),
        (0x06, 0, 0, DENY),
        (0x06, 0, 0, PERMIT),
    ]
    # Python socket blocking mode; all other ioctl commands denied.
    rows += [
        (0x15, 0, 4, 16),
        (0x20, 0, 0, 24),
        (0x15, 0, 1, 0x5421),
        (0x06, 0, 0, PERMIT),
        (0x06, 0, 0, DENY),
    ]
    for number in sorted(ALLOW):
        rows += [(0x15, 0, 1, number), (0x06, 0, 0, PERMIT)]
    rows.append((0x06, 0, 0, DENY))
    return rows


def install():
    if (
        platform.system() != "Linux"
        or platform.machine() != "x86_64"
        or ctypes.sizeof(ctypes.c_void_p) != 8
    ):
        raise Refusal("only Linux x86_64 supported")
    if len(os.listdir("/proc/self/task")) != 1:
        raise Refusal("profile setup requires a single-threaded trusted worker")
    rows = filter_instructions()
    instructions = (Instruction * len(rows))(*(Instruction(*row) for row in rows))
    program = Program(len(rows), instructions)
    libc = ctypes.CDLL(None, use_errno=True)
    libc.prctl.argtypes = (
        ctypes.c_int,
        ctypes.c_ulong,
        ctypes.c_ulong,
        ctypes.c_ulong,
        ctypes.c_ulong,
    )
    libc.syscall.restype = ctypes.c_long
    if libc.prctl(38, 1, 0, 0, 0) != 0:
        raise Refusal("no_new_privs unavailable")
    # SECCOMP_SET_MODE_FILTER + TSYNC; a nonzero result is never readiness.
    if libc.syscall(317, 1, 1, ctypes.byref(program)) != 0:
        raise Refusal("seccomp installation failed")
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM):
            raise Refusal("socket denial probe failed")
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise Refusal("unexpected socket denial") from exc


def sanitize(listener_fd):
    """Host-owned bootstrap only; retain stdio pipes/files and one Unix listener."""
    if type(listener_fd) is not int or listener_fd < 3:
        raise Refusal("invalid listener descriptor")
    for fd in (0, 1, 2):
        if stat.S_ISSOCK(os.fstat(fd).st_mode):
            raise Refusal("socket standard streams refused")
    check = socket.socket(fileno=os.dup(listener_fd))
    try:
        if (
            check.family != socket.AF_UNIX
            or check.type != socket.SOCK_STREAM
            or not check.getsockopt(socket.SOL_SOCKET, socket.SO_ACCEPTCONN)
        ):
            raise Refusal("require a listening Unix stream socket")
    finally:
        check.close()
    # /proc inspection happens before untrusted fixture work. No malicious threads
    # may race setup; install() requires one thread and uses kernel TSYNC too.
    for name in os.listdir("/proc/self/fd"):
        fd = int(name)
        if fd not in (0, 1, 2, listener_fd):
            try:
                os.close(fd)
            except OSError as exc:
                if exc.errno != errno.EBADF:
                    raise
