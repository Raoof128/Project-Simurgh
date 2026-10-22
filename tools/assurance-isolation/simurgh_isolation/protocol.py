"""Strict observation envelopes shared by individual cases and matrix validation."""

from .kernel import Refusal


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Refusal("duplicate JSON key")
        result[key] = value
    return result


def validate_worker(result, case):
    if not isinstance(result, dict) or set(result) != {"outcome", "errno", "data"}:
        raise Refusal("invalid worker result shape")
    outcome, error, data = result["outcome"], result["errno"], result["data"]
    if outcome == "delivered":
        valid = error is None and (
            type(data) is str if case == "file_read" else data is None
        )
    elif outcome == "blocked":
        valid = type(error) is int and error == 1 and data is None
    elif outcome == "closed":
        valid = (
            case in ("inherited_file", "inherited_socket")
            and type(error) is int
            and error == 9
            and data is None
        )
    else:
        valid = False
    if not valid:
        raise Refusal("inconsistent worker result fields")
