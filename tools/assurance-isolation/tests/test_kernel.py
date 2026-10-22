import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ENV = {
    "PYTHONPATH": str(ROOT / "tools/assurance-isolation"),
    "PYTHONDONTWRITEBYTECODE": "1",
    "LC_ALL": "C.UTF-8",
}


def child(code, fds=()):
    return subprocess.run(
        [sys.executable, "-c", code],
        check=False,
        pass_fds=fds,
        env=ENV,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=10,
    )


class KernelTests(unittest.TestCase):
    def test_useful_io_and_denied_paths_ipc_and_import(self):
        # Removing the syscall filter would expose the temporary mailbox.
        with tempfile.TemporaryDirectory() as d:
            source, target = Path(d) / "input", Path(d) / "output"
            source.write_bytes(b"useful")
            with source.open("rb") as inp, target.open("wb") as out:
                r = child(
                    f"""
import ctypes, errno, os
from simurgh_isolation.kernel import prepare, install
libc=ctypes.CDLL(None,use_errno=True)
caps={{"input":{inp.fileno()},"output":{out.fileno()}}}
prepare(caps, None)
install(caps)
assert os.read(caps["input"],6)==b"useful"
assert os.write(caps["output"],b"done")==4
try:
    os.open({str(source)!r},os.O_RDONLY)
except OSError as e: assert e.errno==errno.EPERM
else: raise AssertionError("path open permitted")
for number in (41,42,46,47,53,62,101,257,288,298,310,311,425,426,427,434,438,440):
    ctypes.set_errno(0)
    assert libc.syscall(number,0,0,0,0,0,0)==-1, number
    assert ctypes.get_errno()==errno.EPERM, (number,ctypes.get_errno())
print("ok")
""",
                    (inp.fileno(), out.fileno()),
                )
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(r.stdout, "ok\n")
            self.assertEqual(target.read_bytes(), b"done")

    def test_inherited_file_closed_before_enforcement(self):
        with tempfile.TemporaryFile() as leaked:
            r = child(
                f"""
import errno, os
from simurgh_isolation.kernel import prepare
prepare({{}},None)
try: os.write({leaked.fileno()},b"bad")
except OSError as e: assert e.errno==errno.EBADF
else: raise AssertionError("leak")
print("closed")
""",
                (leaked.fileno(),),
            )
            self.assertEqual(r.returncode, 0, r.stderr)
            leaked.seek(0)
            self.assertEqual(leaked.read(), b"")

    def test_invalid_capabilities_refuse(self):
        r = child("""
from simurgh_isolation.kernel import prepare, Refusal
for caps in ({"input":1},{"other":3},{"input":True},{"input":3,"output":3}):
    try: prepare(caps,None)
    except (Refusal,OSError): pass
    else: raise AssertionError(caps)
print("refused")
""")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_file_mapping_exec_and_descriptor_duplication_deny(self):
        r = child("""
import ctypes, errno, os
from simurgh_isolation.kernel import prepare, install
c=ctypes.CDLL(None,use_errno=True); c.syscall.restype=ctypes.c_long
prepare({},None); install({})
for number in (2,17,18,19,20,32,33,59,72,76,77,82,83,87,90,217,234,257,292,319,322):
    assert c.syscall(number,0,0,0,0,0,0)==-1
    assert ctypes.get_errno()==errno.EPERM, number
assert c.syscall(9,0,4096,1,1,0,0)==-1  # shared, file backed mmap
assert ctypes.get_errno()==errno.EPERM
assert c.syscall(0,1,0,0)==-1  # wrong descriptor direction
assert ctypes.get_errno()==errno.EPERM
assert c.syscall(1,ctypes.c_ulonglong(0x100000001),0,0)==-1
assert ctypes.get_errno()==errno.EPERM
print("denied")
""")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_fork_inherits_and_wrong_abi_dies(self):
        r = child("""
import ctypes, errno, os
from simurgh_isolation.kernel import prepare, install
c=ctypes.CDLL(None,use_errno=True)
prepare({},None); install({})
pid=c.syscall(57)
assert pid>=0
if pid==0:
    assert c.syscall(41,2,1,0)==-1 and ctypes.get_errno()==errno.EPERM
    os._exit(0)
assert os.waitpid(pid,0)[1]==0
print("inherited")
c.syscall(0x40000000)
""")
        self.assertEqual(r.returncode, -31, r.stderr)
        # Flush explicitly is unnecessary for the inheritance assertion: no SIGSYS
        # could be reached if it failed, because Python would exit with an exception.

    def test_live_extra_thread_refused(self):
        r = child("""
import threading
from simurgh_isolation.kernel import install, Refusal
event=threading.Event(); t=threading.Thread(target=event.wait); t.start()
try:
    try: install({})
    except Refusal: print("refused")
    else: raise AssertionError("multithreaded setup")
finally: event.set(); t.join()
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout, "refused\n")

    def test_peer_substitution_and_wrong_file_mode_refused(self):
        r = child("""
import os,socket,tempfile
from simurgh_isolation.kernel import prepare, Refusal
with socket.socket() as server:
    server.bind(('127.0.0.1',0));server.listen()
    with socket.create_connection(server.getsockname()) as conn:
        accepted,_=server.accept()
        with accepted:
            try: prepare({'network':conn.fileno()},('127.0.0.2',server.getsockname()[1]))
            except Refusal: pass
            else: raise AssertionError('peer substitution')
with tempfile.TemporaryFile() as file:
    try: prepare({'input':file.fileno()},None)
    except Refusal: pass
    else: raise AssertionError('read/write file accepted as read-only')
print('refused')
""")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_socket_reporting_stream_refused(self):
        r = child("""
import os,socket
from simurgh_isolation.kernel import prepare, Refusal
first,second=socket.socketpair()
os.dup2(first.fileno(),1)
try: prepare({},None)
except Refusal: os._exit(0)
os._exit(1)
""")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_anonymous_private_allocation_survives(self):
        r = child("""
import mmap
from simurgh_isolation.kernel import prepare, install
prepare({},None);install({})
with mmap.mmap(-1,4096,flags=mmap.MAP_PRIVATE|mmap.MAP_ANONYMOUS) as memory:
    memory[:4]=b'work'
    assert memory[:4]==b'work'
print('allocated')
""")
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
