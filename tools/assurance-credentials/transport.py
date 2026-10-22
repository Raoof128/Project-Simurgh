"""Trusted parent transport and owned receiver process; credentials never reach workers."""

import secrets
import select
import subprocess
import sys
from dataclasses import dataclass, field
from http.client import HTTPException
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from service import Store, decode, encode, key_for


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def rpc(url, path, body, secret):
    request = Request(
        url + path,
        data=encode(body).encode(),
        headers={
            "Authorization": "Bearer " + secret,
            "Content-Type": "application/json",
        },
    )
    try:
        try:
            response = build_opener(ProxyHandler({}), NoRedirect()).open(
                request, timeout=3
            )
        except HTTPError as exc:
            response = exc
        with response:
            result = decode(response.read(16385).decode("utf-8"))
            if response.status not in (200, 400, 401) or type(result) is not dict:
                raise ValueError("receiver_response")
            return result
    except (HTTPException, UnicodeError, ValueError) as exc:
        raise OSError("receiver_response_unknown") from exc


@dataclass(frozen=True)
class Credential:
    id: str
    secret: str = field(repr=False)


@dataclass(frozen=True)
class SessionClient:
    url: str
    session_id: str
    credential_id: str
    issuer: str
    secret: str = field(repr=False)

    @property
    def binding(self):
        return {
            "session_id": self.session_id,
            "credential_id": self.credential_id,
            "issuer": self.issuer,
        }

    def send(self, action):
        return rpc(
            self.url, "/effect", {"key": key_for(action), "action": action}, self.secret
        )


class Service:
    def __init__(self, path, policy, *, admin_key=None, issuer=None):
        self.path = Path(path)
        self.admin_key = admin_key or secrets.token_hex(32)
        Store.create(
            self.path,
            policy,
            session_key=self.admin_key,
            issuer=issuer or secrets.token_hex(16),
        )
        self.process = subprocess.Popen(
            [
                sys.executable,
                "-B",
                "-E",
                "-s",
                str(Path(__file__).with_name("service.py")),
                str(path),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        try:
            self.process.stdin.write(self.admin_key + "\n")
            self.process.stdin.flush()
            if not select.select([self.process.stdout], [], [], 5)[0]:
                raise RuntimeError("receiver_start_timeout")
            port = decode(self.process.stdout.readline())["port"]
            self.url = "http://127.0.0.1:" + str(port)
        except BaseException:
            self.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
        self.process.communicate(timeout=5)

    def admin(self, path, body):
        return rpc(self.url, "/admin/" + path, body, self.admin_key)

    def issue(self, credential_id, subject, tenant, resource, expires, *, secret=None):
        secret = secret or secrets.token_hex(32)
        result = self.admin(
            "issue",
            {
                "credential_id": credential_id,
                "secret": secret,
                "subject": subject,
                "tenant": tenant,
                "resource": resource,
                "expires": expires,
            },
        )
        if result != {"status": "issued", "credential_id": credential_id}:
            raise ValueError("credential_issue_failed")
        return Credential(credential_id, secret)

    def login(self, credential, ttl=600):
        result = rpc(self.url, "/sessions", {"ttl": ttl}, credential.secret)
        if result.get("status") == "denied":
            return None
        if (
            set(result) != {"status", "session_id", "credential_id", "secret", "issuer"}
            or result["status"] != "issued"
            or result["credential_id"] != credential.id
        ):
            raise ValueError("session_response")
        return SessionClient(
            self.url,
            result["session_id"],
            result["credential_id"],
            result["issuer"],
            result["secret"],
        )

    def revoke(self, credential_id):
        return self.admin("revoke", {"credential_id": credential_id})

    def cancel(self, session_id):
        return self.admin("cancel", {"session_id": session_id})

    def advance(self, now):
        return self.admin("advance", {"now": now})

    def drop_next(self):
        return self.admin("drop", {})
