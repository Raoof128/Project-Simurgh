"""Fresh-review regressions at parser and process boundaries."""

import os
import signal
import socketserver
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import test_connector as fixtures
from test_connector import action


class MalformedResponseTests(unittest.TestCase):
    setUp = fixtures.ConnectorTests.setUp
    effects = fixtures.ConnectorTests.effects

    def test_bad_http_response_is_unknown_for_dispatch_and_reconcile(self):
        from core import Host
        from receiver import Client

        class Broken(socketserver.BaseRequestHandler):
            def handle(self):
                self.request.recv(8192)
                self.request.sendall(b"BROKEN STATUS\r\n\r\n")

        with socketserver.TCPServer(("127.0.0.1", 0), Broken) as server:
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            try:
                host = Host(
                    self.host.path,
                    Client(f"http://127.0.0.1:{server.server_address[1]}", "synthetic"),
                )
                self.assertEqual(host.dispatch(action()), {"status": "unknown"})
                self.assertEqual(host.reconcile(action()), {"status": "unknown"})
                self.assertEqual(self.effects(), [])
            finally:
                server.shutdown()
                thread.join(5)

    def test_deep_json_response_is_unknown(self):
        from core import Host
        from receiver import Client

        body = b"[" * 2000 + b"]" * 2000

        class Deep(socketserver.BaseRequestHandler):
            def handle(self):
                self.request.recv(8192)
                self.request.sendall(
                    b"HTTP/1.0 200 OK\r\nContent-Length: 4000\r\n\r\n" + body
                )

        with socketserver.TCPServer(("127.0.0.1", 0), Deep) as server:
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            try:
                host = Host(
                    self.host.path,
                    Client(f"http://127.0.0.1:{server.server_address[1]}", "synthetic"),
                )
                self.assertEqual(host.dispatch(action()), {"status": "unknown"})
                self.assertEqual(host.reconcile(action()), {"status": "unknown"})
            finally:
                server.shutdown()
                thread.join(5)


class WorkerResourceTests(unittest.TestCase):
    def prefix(self):
        kernel = Path(__file__).resolve().parents[2] / "assurance-isolation"
        return f"import sys,os,time,ctypes;sys.path.insert(0,{str(kernel)!r});from simurgh_isolation.kernel import prepare,install;"

    def test_capture_is_bounded_before_decoding(self):
        import workflow

        self.assertTrue(
            hasattr(workflow, "run_worker"), "bounded worker runner missing"
        )
        code = (
            self.prefix()
            + "prepare({},None);install({});\nwhile True: os.write(1,b'x'*4096)"
        )
        start = time.monotonic()
        with self.assertRaisesRegex(ValueError, "output_limit"):
            workflow.run_worker([sys.executable, "-I", "-B", "-c", code], timeout=3)
        self.assertLess(time.monotonic() - start, 3)

    def test_timeout_kills_filtered_descendant(self):
        import workflow

        self.assertTrue(
            hasattr(workflow, "run_worker"), "bounded worker runner missing"
        )
        with tempfile.TemporaryDirectory() as root:
            marker = Path(root) / "pid"
            code = (
                self.prefix()
                + f"""\nfd=os.open({str(marker)!r},os.O_WRONLY|os.O_CREAT,0o600)
libc=ctypes.CDLL(None)
prepare({{"output":fd}},None);install({{"output":fd}})
pid=libc.syscall(57)
if pid == 0:
    os.write(fd,str(os.getpid()).encode())
    while True: time.sleep(0.05)
else:
    os._exit(0)
"""
            )
            try:
                with self.assertRaisesRegex(ValueError, "timeout"):
                    workflow.run_worker(
                        [sys.executable, "-I", "-B", "-c", code], timeout=1
                    )
                pid = int(marker.read_text())
                # A reparented zombie is dead; init's reaping delay is not execution.
                state = Path(f"/proc/{pid}/stat")
                for _ in range(50):
                    if not state.exists() or state.read_text().split()[2] == "Z":
                        break
                    time.sleep(0.01)
                self.assertTrue(
                    not state.exists() or state.read_text().split()[2] == "Z"
                )
            finally:
                if marker.exists():
                    try:
                        os.kill(int(marker.read_text()), signal.SIGKILL)
                    except ProcessLookupError:
                        pass
