"""Strict JSON/numeric prevalidation, additive to historical provenance verifiers."""

import json
import math


def _reject_constant(_value):
    raise ValueError("nonfinite_json")


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_key")
        result[key] = value
    return result


def _finite(value):
    if type(value) is float and not math.isfinite(value):
        raise ValueError("nonfinite_json")
    if type(value) is dict:
        for child in value.values():
            _finite(child)
    elif type(value) is list:
        for child in value:
            _finite(child)


def strict_loads(text):
    if type(text) is not str or len(text) > 8_000_000:
        raise ValueError("json_input_limit")
    value = json.loads(text, object_pairs_hook=_pairs, parse_constant=_reject_constant)
    _finite(value)  # Exponent overflow such as 1e999 also produces infinity.
    return value


def strict_dumps(value):
    return json.dumps(value, allow_nan=False, sort_keys=True, separators=(",", ":"))


def validate_capture(capture):
    if (
        type(capture) is not dict
        or type(capture.get("rows")) is not list
        or not capture["rows"]
    ):
        raise ValueError("capture_rows")
    _finite(capture)
    for row in capture["rows"]:
        seconds = row.get("seconds") if type(row) is dict else None
        if type(seconds) not in (int, float) or seconds < 0:
            raise ValueError("timing")
