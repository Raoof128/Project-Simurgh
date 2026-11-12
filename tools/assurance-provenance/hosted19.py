"""Phase 19o: hosted models. The client, the reading and the spend meter (P19-HOSTED01).

A hosted model answers through its provider's tool-calling interface, not as raw text, so
this module states how one provider response becomes the neutral text 19h's parser reads.
Nothing else about a study changes: the cases, readers and analysis are the lane's own.

Reading. Strict, the analysis: the answer is exactly one tool call and no other visible
text. Lenient, for sensitivity only: exactly one tool call, whatever text came with it.
Hidden reasoning that a provider runs before the answer is not part of the answer.

Nothing here holds a key. The key is read from the environment by name when a request is
sent, is never written to a transcript, and request headers are not recorded.
"""

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import capture19local as local

WIRE = "llama_json"  # the neutral form 19h's parser reads without decoding
PROVIDERS = {
    "anthropic": {
        "url": "https://api.anthropic.com/v1/messages",
        "key_env": "ANTHROPIC_API_KEY",
        "version": "2023-06-01",
    },
    "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "key_env": "OPENAI_API_KEY",
    },
    "openrouter": {
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_env": "OPENROUTER_API_KEY",
    },
}
RETRY_STATUS = (408, 429, 500, 502, 503, 504, 524, 529)
MAX_ATTEMPTS = 6


class SpendCap(Exception):
    """The declared cap would be passed by another request."""


class ProviderError(Exception):
    """A response that is not a completion and is not worth retrying."""


def anthropic_tools():
    return [
        {
            "name": t["function"]["name"],
            "description": t["function"]["description"],
            "input_schema": t["function"]["parameters"],
        }
        for t in local.TOOLS
    ]


def build_request(spec, s):
    """The request body for one schedule row. Sampling parameters are sent only where the
    declaration says the model accepts them."""
    system = [m["content"] for m in s["messages"] if m["role"] == "system"]
    turns = [m for m in s["messages"] if m["role"] != "system"]
    if len(system) != 1 or [m["role"] for m in turns] != ["user"]:
        raise ValueError("message_shape")
    if spec["provider"] == "anthropic":
        body = {
            "model": spec["api_model"],
            "max_tokens": spec["max_tokens"],
            "system": system[0],
            "messages": [{"role": "user", "content": turns[0]["content"]}],
            "tools": anthropic_tools(),
            "tool_choice": {"type": "auto"},
        }
        if spec.get("thinking") is not None:
            body["thinking"] = spec["thinking"]
        return body
    if spec["provider"] == "openai":
        # the provider's own endpoint: no sampling parameter is sent, and the output limit
        # covers hidden reasoning as well as the answer
        body = {
            "model": spec["api_model"],
            "max_completion_tokens": spec["max_tokens"],
            "messages": [
                {"role": "system", "content": system[0]},
                {"role": "user", "content": turns[0]["content"]},
            ],
            "tools": local.TOOLS,
            "tool_choice": "auto",
        }
        if spec.get("reasoning_effort") is not None:
            body["reasoning_effort"] = spec["reasoning_effort"]
        return body
    if spec["provider"] == "openrouter":
        body = {
            "model": spec["api_model"],
            "max_tokens": spec["max_tokens"],
            "messages": [
                {"role": "system", "content": system[0]},
                {"role": "user", "content": turns[0]["content"]},
            ],
            "tools": local.TOOLS,
            "tool_choice": "auto",
        }
        for key in ("temperature", "top_p", "reasoning"):
            if spec.get(key) is not None:
                body[key] = spec[key]
        if spec.get("provider_pin") is not None:
            # OpenRouter's routing field: which upstream serves the model, with no fallback
            body["provider"] = spec["provider_pin"]
        if spec.get("seeded"):
            body["seed"] = s["seed"]
        return body
    raise ValueError("provider:" + str(spec["provider"]))


def _calls_and_text(spec, response):
    """(tool calls as (name, arguments), visible text, truncated) from one response."""
    if spec["provider"] == "anthropic":
        blocks = response.get("content")
        if type(blocks) is not list:
            raise ValueError("response_shape")
        calls = [
            (b.get("name"), b.get("input"))
            for b in blocks
            if type(b) is dict and b.get("type") == "tool_use"
        ]
        text = "".join(
            b.get("text", "")
            for b in blocks
            if type(b) is dict and b.get("type") == "text"
        )
        return calls, text, response.get("stop_reason") == "max_tokens"
    choices = response.get("choices")
    if type(choices) is not list or len(choices) != 1:
        raise ValueError("response_shape")
    message = choices[0].get("message")
    if type(message) is not dict:
        raise ValueError("response_shape")
    calls = []
    for call in message.get("tool_calls") or []:
        function = call.get("function") if type(call) is dict else None
        if type(function) is not dict:
            raise ValueError("response_shape")
        arguments = function.get("arguments")
        try:
            arguments = local.strict_loads(arguments)
        except (ValueError, TypeError, RecursionError):
            pass  # left as the string the provider returned; the parser reports it
        calls.append((function.get("name"), arguments))
    text = message.get("content") or ""
    if type(text) is not str:
        raise ValueError("response_shape")
    return calls, text, choices[0].get("finish_reason") == "length"


def _one(call):
    name, arguments = call
    return json.dumps({"name": name, "parameters": arguments}, sort_keys=True)


def neutral(spec, response):
    """A provider response as (raw, truncated) for the strict read. One tool call and no
    visible text is that call in the neutral form; anything else is written out as it came,
    and the parser names it."""
    calls, text, truncated = _calls_and_text(spec, response)
    visible = text.strip()
    if len(calls) == 1 and not visible:
        return _one(calls[0]), truncated
    if not calls:
        return visible, truncated
    listed = json.dumps([json.loads(_one(c)) for c in calls], sort_keys=True)
    return (visible + "\n" + listed) if visible else listed, truncated


def lenient(spec, response):
    """Sensitivity only: exactly one tool call, whatever visible text came with it."""
    calls, _, truncated = _calls_and_text(spec, response)
    if truncated:
        return {"status": "truncated"}
    if len(calls) != 1:
        return {"status": "invalid" if calls else "non_tool_text"}
    return local.parse(_one(calls[0]), False)


def usage(spec, response):
    """Billable tokens as the provider reported them."""
    u = response.get("usage") or {}
    if spec["provider"] == "anthropic":
        return {
            "input_tokens": int(u.get("input_tokens", 0))
            + int(u.get("cache_creation_input_tokens", 0))
            + int(u.get("cache_read_input_tokens", 0)),
            "output_tokens": int(u.get("output_tokens", 0)),
        }
    return {
        "input_tokens": int(u.get("prompt_tokens", 0)),
        "output_tokens": int(u.get("completion_tokens", 0)),
    }


def cost_usd(spec, counted):
    """Spend at the declared list prices (USD per million tokens). The provider's own bill
    is the authority; this is the meter the cap is enforced with, and it rounds up."""
    return (
        counted["input_tokens"] * spec["usd_per_mtok_in"]
        + counted["output_tokens"] * spec["usd_per_mtok_out"]
    ) / 1_000_000


def _post(url, headers, body, timeout):
    request = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as reply:
            return reply.status, dict(reply.headers), reply.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()


def headers_for(spec):
    provider = PROVIDERS[spec["provider"]]
    key = os.environ.get(provider["key_env"])
    if not key:
        raise ProviderError("missing_key:" + provider["key_env"])
    if spec["provider"] == "anthropic":
        return {
            "x-api-key": key,
            "anthropic-version": provider["version"],
            "content-type": "application/json",
        }
    return {"Authorization": "Bearer " + key, "Content-Type": "application/json"}


def complete(spec, body, *, post=_post, sleep=time.sleep, timeout=120):
    """One completion, retried on the statuses that say try again. Returns the parsed
    response and how many attempts it took."""
    url = PROVIDERS[spec["provider"]]["url"]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            status, headers, payload = post(url, headers_for(spec), body, timeout)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            status, headers, payload = 0, {}, str(error).encode()
        if status == 200:
            return json.loads(payload), attempt
        if status not in RETRY_STATUS and status != 0:
            raise ProviderError(
                "http_" + str(status) + ":" + payload[:300].decode(errors="replace")
            )
        wait = headers.get("retry-after") or headers.get("Retry-After")
        sleep(min(float(wait), 120.0) if wait else min(2.0**attempt, 60.0))
    raise ProviderError("retries_exhausted:http_" + str(status))


def capture(spec, out_path, *, rows, cap_usd, spent=0.0, post=_post, log=print):
    """Sample ``rows`` once each, appending one JSON line per generation. Resumable. Stops
    before a request whenever the meter has reached ``cap_usd``. Returns what was spent."""
    out_path = Path(out_path)
    done = []
    if out_path.exists():
        done = [json.loads(x) for x in out_path.read_text().splitlines() if x]
    spent += sum(r["cost_usd"] for r in done)
    with out_path.open("a") as sink:
        for s in rows[len(done) :]:
            if spent >= cap_usd:
                raise SpendCap(spec["id"])
            started = time.monotonic()
            response, attempts = complete(spec, build_request(spec, s), post=post)
            raw, truncated = neutral(spec, response)
            counted = usage(spec, response)
            row = local.transcript_row(
                s,
                raw=raw,
                truncated=truncated,
                response=response,
                usage=counted,
                cost_usd=cost_usd(spec, counted),
                attempts=attempts,
                seconds=round(time.monotonic() - started, 3),
            )
            spent += row["cost_usd"]
            done.append(row)
            sink.write(json.dumps(row, sort_keys=True) + "\n")
            sink.flush()
            log(
                f"{spec['id']} {s['index'] + 1}/{len(rows)} {s['state']} ${spent:.4f} {raw[:60]!r}"
            )
    return {"generations": len(done), "spent_usd": spent}


def recompute(spec, row):
    """What a verifier checks of a stored row: the strict text and the cost follow from the
    stored response and the declared prices."""
    raw, truncated = neutral(spec, row["response"])
    counted = usage(spec, row["response"])
    return {
        "raw": raw,
        "truncated": truncated,
        "usage": counted,
        "cost_usd": cost_usd(spec, counted),
    }
