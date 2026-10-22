import socket
import unittest

from simurgh_isolation.kernel import Refusal
from simurgh_isolation.observer import Collector


class ObserverTests(unittest.TestCase):
    def test_incomplete_stream_is_unknown_not_absence(self):
        observer = Collector()
        try:
            with socket.create_connection(observer.address, timeout=2) as client:
                client.sendall(b"incomplete")
            with self.assertRaises(Refusal):
                observer.finish()
        finally:
            observer.close()

    def test_stalled_connection_cannot_hide_queued_delivery(self):
        observer = Collector()
        first = socket.create_connection(observer.address, timeout=2)
        second = socket.create_connection(observer.address, timeout=2)
        try:
            first.sendall(b"partial")
            second.sendall(b"delivered\n")
            with self.assertRaises(Refusal):
                observer.finish()
        finally:
            first.close()
            second.close()
            observer.close()


if __name__ == "__main__":
    unittest.main()
