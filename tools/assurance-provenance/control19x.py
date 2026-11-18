"""Phase 19x instrument: lane 19w's no-attack control on eight models from two vendors.

Lane 19w fixed the audit of the case files, the reader that turns a run log into a record,
the counting rule and the interval, and its pack pins the module that holds them. This
module imports those unchanged and holds only what lane 19x declared on top: the models and
the order they run in, each vendor's prices, the cap at each vendor and the rule that decides
whether one environment of one repeat may start. It reads files and does arithmetic. It calls
no model and imports nothing outside the standard library and ``control19w``.
"""

import json
import zipfile

import control19w

BENCHMARK_REPO = control19w.BENCHMARK_REPO
BENCHMARK_COMMIT = control19w.BENCHMARK_COMMIT
ENVIRONMENTS = control19w.ENVIRONMENTS
CASES = control19w.CASES
JUDGE = control19w.JUDGE
JUDGE_VOTES = control19w.JUDGE_VOTES
LABELS = control19w.LABELS
CLASSES = control19w.CLASSES
BOOT_DRAWS = control19w.BOOT_DRAWS
BOOT_SEED = control19w.BOOT_SEED
audit = control19w.audit
read_log = control19w.read_log
count = control19w.count
add_usage = control19w.add_usage
benchmark_commit = control19w.benchmark_commit
data_digest = control19w.data_digest

# Haiku 5.5's first repeat is the ninety run logs of lane 19w, whose pack has this root.
STAGE_ONE_ROOT = "dd77de3e5ee53666396b7b11078864bad20aac75c8e808f960f13b577000599f"
# Cases per environment in the benchmark at the declared commit, as 19w's audit lists them.
ENVIRONMENT_CASES = {"devops": 31, "marketplace": 31, "productivity": 28}

# In run order at each vendor. Prices are USD per million tokens: input, output, cache
# write, cache read. ``first_repeat_reserve`` is the declared figure for a model's first
# repeat at its own vendor; a third of it is held before the model's first environment.
MODELS = {
    "claude-haiku-5-5": {
        "provider": "anthropic",
        "repeats": 3,
        "temperature": None,
        "prices": (0.10, 0.50, 0.125, 0.01),
        "first_repeat_reserve": 0.40,
    },
    "claude-sonnet-5-5": {
        "provider": "anthropic",
        "repeats": 3,
        "temperature": None,
        "prices": (2.00, 10.00, 2.50, 0.10),
        "first_repeat_reserve": 6.50,
    },
    "claude-sonnet-4-5-20250929": {
        "provider": "anthropic",
        "repeats": 1,
        "temperature": 0.0,
        "prices": (3.00, 15.00, 3.75, 0.30),
        "first_repeat_reserve": 10.00,
    },
    "claude-opus-5-5": {
        "provider": "anthropic",
        "repeats": 3,
        "temperature": None,
        "prices": (4.00, 20.00, 5.00, 0.20),
        "first_repeat_reserve": 12.50,
    },
    "gpt-6-luna": {
        "provider": "openai",
        "repeats": 3,
        "temperature": None,
        "prices": (0.10, 0.50, 0.125, 0.01),
        "first_repeat_reserve": 0.60,
    },
    "gpt-6.1-terra": {
        "provider": "openai",
        "repeats": 3,
        "temperature": None,
        "prices": (1.00, 5.00, 1.25, 0.05),
        "first_repeat_reserve": 4.50,
    },
    "gpt-6.2-sol": {
        "provider": "openai",
        "repeats": 3,
        "temperature": None,
        "prices": (2.00, 10.00, 2.50, 0.10),
        "first_repeat_reserve": 9.00,
    },
    "gpt-6.2-astra": {
        "provider": "openai",
        "repeats": 3,
        "temperature": None,
        "prices": (8.00, 40.00, 10.00, 0.40),
        "first_repeat_reserve": 35.00,
    },
}
CAPS = {"anthropic": 80.00, "openai": 80.00}
JUDGE_REPEAT_RESERVE = 0.45
# The runner's library reports an OpenAI input count that includes the cached tokens.
INPUT_INCLUDES_CACHE_READ = {"anthropic": False, "openai": True}
KEY_VARIABLE = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY"}


def chain(provider):
    """A vendor's models in the order they run."""
    return [m for m, spec in MODELS.items() if spec["provider"] == provider]


def model_id(model):
    """The runner library's name for a declared model."""
    if model not in MODELS:
        raise ValueError("undeclared_model:" + model)
    return MODELS[model]["provider"] + "/" + model


def dir_name(model):
    """The folder the benchmark's runner writes a model's logs under."""
    return model.split(":")[0].replace(".", "_")


def cost(model, tokens):
    """USD for one model's token counts at the declared prices."""
    if model not in MODELS:
        raise ValueError("unpriced_model:" + model)
    spec = MODELS[model]
    price_in, price_out, price_write, price_read = spec["prices"]
    plain = tokens["input"]
    if INPUT_INCLUDES_CACHE_READ[spec["provider"]]:
        plain -= tokens["cache_read"]
        if plain < 0:
            raise ValueError("cached_exceeds_input:" + model)
    return (
        plain * price_in
        + tokens["cache_write"] * price_write
        + tokens["cache_read"] * price_read
        + tokens["output"] * price_out
    ) / 1e6


def meter(usage):
    """USD at each vendor for a mapping of model name to token counts."""
    spent = {provider: 0.0 for provider in CAPS}
    for model, tokens in usage.items():
        if model not in MODELS:
            raise ValueError("unpriced_model:" + model)
        spent[MODELS[model]["provider"]] += cost(model, tokens)
    return spent


def log_usage(path):
    """Token counts of one finished run log, or None for a log the runner did not finish."""
    try:
        with zipfile.ZipFile(path) as z:
            header = json.loads(z.read("header.json"))
    except (KeyError, zipfile.BadZipFile, ValueError):
        return None
    out = {}
    for name, value in ((header.get("stats") or {}).get("model_usage") or {}).items():
        out[name.split("/")[-1]] = {
            "input": value.get("input_tokens") or 0,
            "output": value.get("output_tokens") or 0,
            "cache_write": value.get("input_tokens_cache_write") or 0,
            "cache_read": value.get("input_tokens_cache_read") or 0,
        }
    return out


def reserve(model, by_unit, repeat, environment):
    """USD held at each vendor before one environment of one repeat of a model starts.

    ``by_unit`` maps (repeat, environment) to the token usage of that model's logs for the
    unit. The reserve is the cost of the same environment in the repeat before; failing
    that, the cost of the unit run just before this one; failing that, a third of the
    declared first-repeat figure, with a third of the judge's.
    """
    spec = MODELS[model]
    before = by_unit.get((repeat - 1, environment))
    if before is None:
        order = [(r, e) for r in range(1, repeat + 1) for e in ENVIRONMENTS]
        earlier = order[: order.index((repeat, environment))]
        before = next((by_unit[u] for u in reversed(earlier) if u in by_unit), None)
    if before is not None:
        return meter(before)
    held = {provider: 0.0 for provider in CAPS}
    held[spec["provider"]] += spec["first_repeat_reserve"] / 3
    held["anthropic"] += JUDGE_REPEAT_RESERVE / 3
    return held


def refused_by(spent, held):
    """The vendors whose cap the meter plus the reserve would pass."""
    return [
        provider
        for provider in sorted(CAPS)
        if spent[provider] + held[provider] > CAPS[provider] + 1e-9
    ]


def may_start(spent, held):
    return not refused_by(spent, held)
