# SPDX-License-Identifier: AGPL-3.0-or-later
"""Transport-only HTTP client for the real Node Simurgh gateway.

This module performs NO safety classification. It forwards requests and returns
the gateway's verdict verbatim.
"""
import json
import os
import urllib.request

DEFAULT_BASE = "http://127.0.0.1:33030/api/llm-shield/gateway"


class GatewayUnavailable(RuntimeError):
    pass


def _default_transport(method, url, headers, body):
    req = urllib.request.Request(url, method=method, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, resp.read()


def _origin(base_url):
    # strip the /api/llm-shield/gateway suffix to reach the top-level /health route
    marker = "/api/llm-shield/gateway"
    return base_url[: -len(marker)] if base_url.endswith(marker) else base_url


class SimurghClient:
    def __init__(self, base_url=None, transport=None):
        self.base_url = (
            base_url or os.environ.get("SIMURGH_GATEWAY_BASE_URL", DEFAULT_BASE)
        ).rstrip("/")
        self._transport = transport or _default_transport
        self.session_id = None
        self.token = None

    def _post(self, url, payload, auth=False):
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = f"Bearer {self.token}"
        status, raw = self._transport("POST", url, headers, json.dumps(payload).encode())
        return status, json.loads(raw or b"{}")

    def preflight(self):
        try:
            status, _ = self._transport("GET", _origin(self.base_url) + "/health", {}, None)
            if status < 400:
                return
        except OSError:
            pass
        # fallback: session-create
        try:
            status, body = self._post(self.base_url + "/sessions", {})
            if status < 400 and body.get("ok"):
                self.session_id = body["session_id"]
                self.token = body["token"]
                return
        except OSError:
            pass
        raise GatewayUnavailable(f"gateway not reachable at {self.base_url}")

    def create_session(self):
        status, body = self._post(self.base_url + "/sessions", {})
        if status >= 400 or not body.get("ok"):
            raise GatewayUnavailable(f"session create failed: {status}")
        self.session_id = body["session_id"]
        self.token = body["token"]
        return self.session_id

    def run(
        self,
        *,
        input,
        contexts=None,
        provider_mode="mock",
        provider="mock",
        task_type="unknown",
        scenario=None,
        case_id=None,
    ):
        if not self.session_id or not self.token:
            raise GatewayUnavailable("no gateway session; call create_session() first")
        payload = {
            "input": input,
            "provider_mode": provider_mode,
            "provider": provider,
            "task_type": task_type,
        }
        if contexts:
            payload["contexts"] = contexts
        if scenario:
            payload["scenario"] = scenario
        if case_id:
            payload["case_id"] = case_id
        _, body = self._post(f"{self.base_url}/{self.session_id}/run", payload, auth=True)
        return body

    def verify(self):
        url = f"{self.base_url}/{self.session_id}/verify"
        status, raw = self._transport(
            "GET", url, {"Authorization": f"Bearer {self.token}"}, None
        )
        return json.loads(raw or b"{}")
