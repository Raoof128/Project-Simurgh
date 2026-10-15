import json
import os
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class KernelTests(unittest.TestCase):
    def run_child(self, program):
        return subprocess.run(
            [sys.executable, "-c", program],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )

    def test_kernel_blocks_socket_creation_without_disabling_local_computation(self):
        program = """
import errno, json, socket
from simurgh_egress.kernel import install
install()
results=[]
for family,kind in ((socket.AF_INET,socket.SOCK_STREAM),(socket.AF_INET6,socket.SOCK_STREAM),
                    (socket.AF_INET,socket.SOCK_DGRAM),(socket.AF_UNIX,socket.SOCK_STREAM)):
    try:
        socket.socket(family,kind).close(); results.append("allowed")
    except OSError as e: results.append(errno.errorcode[e.errno])
print(json.dumps({"results":results,"useful":sum(range(10))}))
"""
        completed = self.run_child(program)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(
            json.loads(completed.stdout), {"results": ["EPERM"] * 4, "useful": 45}
        )

    def test_raw_syscalls_and_x32_are_not_an_escape(self):
        program = """
import ctypes, errno, json
from simurgh_egress.kernel import install
libc=ctypes.CDLL(None,use_errno=True)
install()
results=[]
for number in (41,42,53,46,47,299,307,425,426,427,438,101):
    ctypes.set_errno(0)
    result=libc.syscall(number,-1,0,0,0,0,0)
    results.append([result,ctypes.get_errno()])
print(json.dumps(results))
"""
        completed = self.run_child(program)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout), [[-1, 1]] * 12)
        x32 = self.run_child("""
import ctypes
from simurgh_egress.kernel import install
libc=ctypes.CDLL(None)
install()
libc.syscall(0x40000000 | 39)
""")
        self.assertEqual(x32.returncode, -31)

    def test_filter_inherited_by_fork_and_exec(self):
        completed = self.run_child("""
import os,sys
from simurgh_egress.kernel import install
install()
pid=os.fork()
if pid==0:
    os.execv(sys.executable,[sys.executable,"-c","import socket,errno;\\ntry: socket.socket(); raise SystemExit(3)\\nexcept OSError as e: raise SystemExit(0 if e.errno==errno.EPERM else 4)"])
_,status=os.waitpid(pid,0)
raise SystemExit(os.waitstatus_to_exitcode(status))
""")
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_existing_thread_refuses_installation(self):
        completed = self.run_child("""
import threading
from simurgh_egress.kernel import install,Refusal
stop=threading.Event()
thread=threading.Thread(target=stop.wait);thread.start()
try:
    try: install()
    except Refusal as e: assert "single-threaded" in str(e)
    else: raise AssertionError("installed with pre-existing thread")
finally:
    stop.set();thread.join()
""")
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_failed_filter_install_does_not_return_success(self):
        # A second install is denied by the first immutable filter: actual kernel error.
        completed = self.run_child("""
from simurgh_egress.kernel import install,Refusal
install()
try: install()
except Refusal: pass
else: raise AssertionError("filter unexpectedly replaced")
""")
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_worker_refuses_socket_stdio_before_readiness(self):
        with (
            tempfile.TemporaryDirectory(prefix="egress-fd-") as directory,
            socket.socket(socket.AF_UNIX) as listener,
        ):
            listener.bind(str(Path(directory) / "in.sock"))
            listener.listen()
            left, right = socket.socketpair()
            try:
                config = Path(directory) / "worker.json"
                config.write_text(
                    json.dumps(
                        {
                            "case": "public_read",
                            "control": "kernel",
                            "listener": listener.fileno(),
                        }
                    )
                )
                completed = subprocess.run(
                    [sys.executable, "-m", "simurgh_egress.worker", str(config)],
                    stdin=left,
                    check=False,
                    capture_output=True,
                    text=True,
                    pass_fds=[listener.fileno()],
                    timeout=5,
                )
                self.assertEqual(completed.returncode, 1)
                self.assertEqual(completed.stdout, "")
                self.assertIn("socket standard streams refused", completed.stderr)
            finally:
                left.close()
                right.close()

    def test_tcp_listener_refused(self):
        with socket.socket(socket.AF_INET) as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            completed = subprocess.run(
                [
                    sys.executable,
                    "-c",
                    f"from simurgh_egress.kernel import sanitize; sanitize({listener.fileno()})",
                ],
                check=False,
                capture_output=True,
                text=True,
                pass_fds=[listener.fileno()],
                timeout=5,
            )
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("listening Unix stream socket", completed.stderr)

    def test_descriptor_import_is_denied_even_on_an_existing_socket(self):
        import array

        left, right = socket.socketpair()
        try:
            with open(os.devnull, "rb") as source:
                left.sendmsg(
                    [b"fd"],
                    [
                        (
                            socket.SOL_SOCKET,
                            socket.SCM_RIGHTS,
                            array.array("i", [source.fileno()]),
                        )
                    ],
                )
            code = f"""
import errno,socket
from simurgh_egress.kernel import install
s=socket.socket(fileno={right.fileno()})
install()
try: s.recvmsg(32,64)
except OSError as e: assert e.errno==errno.EPERM
else: raise AssertionError("descriptor import allowed")
"""
            completed = subprocess.run(
                [sys.executable, "-c", code],
                check=False,
                capture_output=True,
                text=True,
                pass_fds=[right.fileno()],
                timeout=5,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
        finally:
            left.close()
            right.close()


if __name__ == "__main__":
    unittest.main()
