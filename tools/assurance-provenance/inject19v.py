"""Phase 19v: 19n's study on eight open-weight models at full precision, on a rented GPU
(P19-OPENWEIGHT01). Emission only.

Every model of 19h to 19n was a 4-bit or 8-bit build of at most 7B parameters that fits an
8 GB laptop. Here the same slots, prompts, seeds and reading rules of 19n are run on eight
models of 8B to 36B parameters, each at the revision its publisher released and in the
precision of its weights, sampled with transformers on one rented GPU. Nothing of 19n's
instrument is changed: this module imports it.

Two things are new and are stated here so a reader can check them.

Five of the eight write a tool call as ``<tool_call><function=NAME><parameter=KEY>VALUE
</parameter></function></tool_call>`` and not as JSON. ``decode_function_parameter`` reads that
form into the one neutral text the Phase 17 parser reads. It is put in the place of 19h's
decoder only while a model on that wire is being read (``reader``), so the readers of every
earlier lane are the code they were.

The sampler is this module's own step inside ``generate``: the next-token scores are divided
by the temperature, cut to the smallest set of tokens whose probability reaches ``top_p``, and
one token is drawn from a generator seeded with the slot's seed. No setting a model ships in
its ``generation_config.json`` takes part.
"""

import contextlib
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path

import capture19local as local
import inject19
import inject19k
import inject19n as base

HERE = Path(__file__).resolve().parent
WIRE = "function_parameter"
_NO_THINKING = {"enable_thinking": False}
# In the order they are captured: the two smallest first, the largest last.
MODELS = (
    {
        "id": "qwen3-8b",
        "repo": "Qwen/Qwen3-8B",
        "revision": "b968826d9c46dd6066d109eabc6255188de91218",
        "wire": "hermes_tool_call",
        "template_kwargs": _NO_THINKING,
        "note": "the size above the local 4B of 19k to 19n, unquantised",
    },
    {
        "id": "granite-4.2-8b",
        "repo": "ibm-granite/granite-4.2-8b",
        "revision": "a7042144125ce5ae64f89610e8289647fc000b9a",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
        "note": "an 8B from another publisher, beside qwen3-8b",
    },
    {
        "id": "qwen3-14b",
        "repo": "Qwen/Qwen3-14B",
        "revision": "40c069824f4251a91eefaf281ebe4c544efd3e18",
        "wire": "hermes_tool_call",
        "template_kwargs": _NO_THINKING,
        "note": "the middle of the Qwen3 size ladder",
    },
    {
        "id": "qwen3-32b",
        "repo": "Qwen/Qwen3-32B",
        "revision": "9216db5781bf21249d130ec9da846c4624c16137",
        "wire": "hermes_tool_call",
        "template_kwargs": _NO_THINKING,
        "note": "the top of the Qwen3 size ladder",
    },
    {
        "id": "qwen3.8-27b",
        "repo": "Qwen/Qwen3.8-27B",
        "revision": "37561816e66b5b9153b1b64c10968c18c1e6f4a0",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
        "note": "a 2026 release of the same publisher",
    },
    {
        "id": "arete-27b",
        "repo": "NousResearch/Arete-27B",
        "revision": "108f0afbdcfaa1ceeda4a635004304dfff6d4da2",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
        "note": "a third publisher's model on the qwen3_5 architecture",
    },
    {
        "id": "nemotron-3.5-30b-a3b",
        "repo": "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
        "revision": "a9904d24bcc1d289a1950fa9d2b978c47cf903b9",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
        "note": "another architecture (nemotron_h); the publisher's own licence",
    },
    {
        "id": "qwen3.6-35b-a3b",
        "repo": "Qwen/Qwen3.6-35B-A3B",
        "revision": "345d467b117d1fd5eda9b879a5988de9ae5f47a7",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
        "note": "a mixture-of-experts model; the largest weights here, so it runs last",
    },
)
MODEL_IDS = tuple(m["id"] for m in MODELS)
# Two small models that are NOT in the lane, one on each wire, for checking an installation.
CHECK_MODELS = (
    {
        "id": "check-qwen3-0.6b",
        "repo": "Qwen/Qwen3-0.6B",
        "revision": "c1899de289a04d12100db370d81485cdf75e47ca",
        "wire": "hermes_tool_call",
        "template_kwargs": _NO_THINKING,
    },
    {
        "id": "check-qwen3.5-0.8b",
        "repo": "Qwen/Qwen3.5-0.8B",
        "revision": "2fc06364715b967f1860aea9cf38778875588b17",
        "wire": WIRE,
        "template_kwargs": _NO_THINKING,
    },
)
CHECK_SLOTS = 4
STATUSES = base.STATUSES
BUDGET_SECONDS = 3 * 3600
# The owner's limit for the rented GPU, fixed before the first request. From it and the
# machine's hourly price the run gets a deadline; no model starts with less than
# MIN_START_SECONDS left, and a model still running at the deadline is stopped there.
SPEND_CAP_USD = 25.0
TEARDOWN_SECONDS = 900
MIN_START_SECONDS = 900
NOT_STARTED = "not_started_spending_cap"
CAP_REACHED = "spending_cap_reached"
# A model that failed before it wrote a row (its weights could not be fetched, or its process
# ended) said nothing, so it may be run once more after the machine is repaired. The record
# keeps the first attempt. A model that wrote any row is never run again.
RETRY_PREFIXES = ("fetch_failed", "process_exit")
# Optional kernels the library uses when present; without them it runs reference code that
# gives the same arithmetic more slowly. What was installed is recorded.
KERNELS = ("causal-conv1d", "flash-linear-attention", "mamba-ssm")
LADDER = ("qwen3-8b", "qwen3-14b", "qwen3-32b")
DTYPE = "bfloat16"

# --- the function/parameter wire ------------------------------------------------------------
_BLOCK = re.compile(
    r"\s*<tool_call>\s*<function=([^<>\n]+)>(.*)</function>\s*</tool_call>\s*",
    re.DOTALL,
)
_PARAMETER = re.compile(r"\s*<parameter=([^<>\n]+)>(.*?)</parameter>", re.DOTALL)
_ENVELOPE = re.compile(r"\s*<tool_call>\s*(.*?)\s*</tool_call>\s*", re.DOTALL)


def model(model_id):
    for m in MODELS:
        if m["id"] == model_id:
            return m
    raise KeyError(model_id)


def _block(text):
    """One ``<tool_call>`` block in this wire's form as ``(name, parameters)``; ``None`` when
    the text is anything else, ``False`` when it is such a block and is malformed inside."""
    match = _BLOCK.fullmatch(text)
    if not match or text.count("<tool_call>") != 1:
        return None
    name, body = match.group(1), match.group(2)
    parameters, at = {}, 0
    while True:
        part = _PARAMETER.match(body, at)
        if not part:
            break
        key, value = part.group(1), part.group(2)
        # The template writes a value on its own lines; one line break on each side is the
        # envelope's, anything more is the value's.
        value = value.removeprefix("\n").removesuffix("\n")
        if key in parameters:
            return False
        parameters[key] = value
        at = part.end()
    if body[at:].strip():
        return False
    return name, parameters


def decode_function_parameter(raw):
    """The model's native text as the neutral text ``local.parse`` reads. Exactly one block
    and nothing else becomes that call. A block that is malformed inside, and any JSON object
    (bare, or inside the tags: the other wire's form), becomes ``{}``, which the parser reads
    as ``invalid``. Everything else is left as it is and the parser reports it."""
    read = _block(raw)
    if read is False:
        return "{}"
    if read is not None:
        return json.dumps({"name": read[0], "parameters": read[1]})
    text = raw.strip()
    wrapped = _ENVELOPE.fullmatch(raw)
    if wrapped and raw.count("<tool_call>") == 1:
        text = wrapped.group(1)
    try:
        value = local.strict_loads(text)
    except (ValueError, TypeError, RecursionError):
        return raw
    return "{}" if type(value) is dict else raw


def lenient_function_parameter(raw, truncated):
    """A second reading, for sensitivity only. The models' own template allows reasoning
    before a call and nothing after it, so one block at the end of the output, with any text
    before it, is read as that call. Failing that, 19k's lenient read is applied, which
    recognises a call written as JSON. The strict read stays the analysis."""
    if truncated:
        return {"status": "truncated"}
    start = raw.rfind("<tool_call>")
    if start >= 0 and raw.count("<tool_call>") == 1:
        read = _block(raw[start:])
        if read:
            return local.parse(
                json.dumps({"name": read[0], "parameters": read[1]}), False
            )
    return _pinned["lenient"](raw, truncated)


def form_function_parameter(raw):
    """19n's envelope labels for this wire: ``wrapped`` is one block and nothing else."""
    text = raw.strip()
    if not text:
        return "empty"
    count = raw.count("<tool_call>")
    if count > 1:
        return "several_calls"
    if count == 1:
        return "wrapped" if _block(raw) else "wrapped_with_text"
    return "bare_json" if text.startswith("{") else "prose"


def _decode(wire_name, raw):
    if wire_name == WIRE:
        return decode_function_parameter(raw)
    return _pinned["decode"](wire_name, raw)


# The three names 19n's analysis reaches a reader through, as they are in the pinned modules.
_pinned = {
    "decode": local.decode,
    "lenient": inject19k.lenient,
    "form": base.wire_form,
}


@contextlib.contextmanager
def reader(spec):
    """19n's analysis reads an output through ``local.decode``, ``inject19k.lenient`` and
    ``wire_form``. For a model on the function/parameter wire those three names are bound
    to this wire's readers while the block runs and restored after it. For any other model
    nothing is touched."""
    if spec["wire"] != WIRE:
        yield
        return
    found = (local.decode, inject19k.lenient, base.wire_form)
    local.decode = _decode
    inject19k.lenient = lenient_function_parameter
    base.wire_form = form_function_parameter
    try:
        yield
    finally:
        # what was bound on entry, so a block inside another block leaves the outer one's
        local.decode, inject19k.lenient, base.wire_form = found


def read(spec, raw, truncated):
    with reader(spec):
        return inject19.read(spec, raw, truncated)


def replay(spec, rows, **kwargs):
    with reader(spec):
        return base.replay(spec, rows, **kwargs)


def judge(spec, rows):
    with reader(spec):
        return base.judge(spec, rows)


def assess(spec, rows):
    with reader(spec):
        return base.assess(spec, rows)


def active_control(spec, rows):
    with reader(spec):
        return base.active_control(spec, rows)


def partial(spec, rows):
    with reader(spec):
        return base.partial(spec, rows)


def ladder(models):
    """The three Qwen3 sizes side by side, as counts. Descriptive: one model per size."""
    by_id = {m["id"]: m for m in models}
    out = []
    for model_id in LADDER:
        m = by_id.get(model_id)
        if not m or "analysis" not in m:
            out.append({"id": model_id, "status": m["status"] if m else "absent"})
            continue
        placement = m["analysis"]["placement"]
        out.append(
            {
                "id": model_id,
                "status": m["status"],
                "eligible": m["eligibility"]["eligible"],
                "active_calls": m["analysis"]["active_control"]["calls"],
                "control_sent": m["eligibility"]["control_sent"],
                "injected_sent": sum(
                    placement[p]["injected"]["sent"] for p in base.PLACEMENTS
                ),
                "injected_n": sum(
                    placement[p]["injected"]["n"] for p in base.PLACEMENTS
                ),
            }
        )
    return out


# --- capture: the only code here that needs torch and a GPU ---------------------------------


def nucleus(scores, temperature, top_p, generator):
    """One draw. ``scores`` is a 1-D float32 CPU tensor of next-token scores. The kept set is
    the most probable tokens up to and including the one with which their summed probability
    reaches ``top_p``; ties keep the lower token id first."""
    import torch

    probabilities = torch.softmax(scores / temperature, dim=-1)
    ordered, order = torch.sort(probabilities, descending=True, stable=True)
    before = torch.cumsum(ordered, dim=0) - ordered
    kept = ordered[before < top_p]
    drawn = torch.multinomial(kept / kept.sum(), 1, generator=generator)
    return int(order[int(drawn)])


def _processor(seed):
    import torch
    from transformers import LogitsProcessor

    class Draw(LogitsProcessor):
        """Replaces the scores with a point mass on the token this instrument drew, so
        ``generate`` run greedily emits exactly that token."""

        def __init__(self):
            self.generator = torch.Generator(device="cpu").manual_seed(seed)

        def __call__(self, input_ids, scores):
            token = nucleus(
                scores[0].detach().to("cpu", torch.float32),
                local.SETTINGS["temperature"],
                local.SETTINGS["top_p"],
                self.generator,
            )
            out = torch.full_like(scores, float("-inf"))
            out[0, token] = 0.0
            return out

    return Draw()


def _device():
    import torch

    if torch.cuda.is_available():
        return "cuda:0"
    return "mps" if torch.backends.mps.is_available() else "cpu"


class Sampler:
    """One loaded model, sampling a resolved slot of 19n."""

    def __init__(self, spec, model_path, *, dtype=DTYPE, device=None):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.spec = spec
        self.device = device or _device()
        self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        self.lm = AutoModelForCausalLM.from_pretrained(
            str(model_path), dtype=getattr(torch, dtype), device_map={"": self.device}
        )
        self.lm.eval()
        ends = self.lm.generation_config.eos_token_id
        ends = [ends] if type(ends) is int else list(ends or [])
        self.ends = sorted({*ends, self.tokenizer.eos_token_id} - {None})

    def run(self, resolved):
        import torch
        from transformers import GenerationConfig, LogitsProcessorList

        rendered = self.tokenizer.apply_chat_template(
            resolved["messages"],
            tools=local.TOOLS if resolved["tools"] else None,
            add_generation_prompt=True,
            tokenize=False,
            **self.spec["template_kwargs"],
        )
        ids = self.tokenizer.encode(rendered, add_special_tokens=False)
        if len(ids) > base.MAX_INPUT_TOKENS:
            raise ValueError("input_token_limit")
        started = time.monotonic()
        with torch.inference_mode():
            out = self.lm.generate(
                torch.tensor([ids], device=self.device),
                generation_config=GenerationConfig(
                    do_sample=False,
                    num_beams=1,
                    repetition_penalty=1.0,
                    max_new_tokens=resolved["max_tokens"],
                    eos_token_id=self.ends,
                    pad_token_id=self.ends[0],
                ),
                logits_processor=LogitsProcessorList([_processor(resolved["seed"])]),
            )
        tokens = [int(t) for t in out[0, len(ids) :]]
        stopped = bool(tokens) and tokens[-1] in self.ends
        if stopped:
            tokens = tokens[:-1]
        finish = "stop" if stopped else "length"
        return base.sampled_row(
            resolved,
            raw=self.tokenizer.decode(tokens, skip_special_tokens=True),
            streamed=self.tokenizer.decode(tokens, skip_special_tokens=False),
            truncated=finish == "length",
            finish_reason=finish,
            rendered_prompt_sha256=hashlib.sha256(rendered.encode()).hexdigest(),
            input_tokens=len(ids),
            generated_tokens=len(tokens),
            generated_token_sha256=hashlib.sha256(
                json.dumps(tokens).encode()
            ).hexdigest(),
            seconds=round(time.monotonic() - started, 3),
        )


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _installed(name):
    from importlib import metadata

    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return None


def host():
    """What the capturing host can say about itself. No host name, address or account."""
    import platform
    from importlib import metadata

    import torch

    gpu = None
    if torch.cuda.is_available():
        gpu = {
            "name": torch.cuda.get_device_name(0),
            "memory_gb": round(
                torch.cuda.get_device_properties(0).total_memory / 2**30
            ),
            "count": torch.cuda.device_count(),
            "cuda": torch.version.cuda,
        }
    return {
        "host": {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "gpu": gpu,
            "device": _device(),
        },
        "runtime": {
            "python": platform.python_version(),
            "dtype": DTYPE,
            **{
                n: metadata.version(n)
                for n in ("torch", "transformers", "tokenizers", "accelerate")
            },
            "kernels": {n: _installed(n) for n in KERNELS},
        },
    }


def _check_one(spec, path, *, dtype, device, exact, log):
    """CHECK_SLOTS positive-control slots of one small model, the first sampled twice. With
    ``exact`` the shortest output is also produced by a plain loop that calls the model once
    per token with no cache and no ``generate``. Returns (identical, equal or None)."""
    import torch

    started = time.monotonic()
    lm = Sampler(spec, path, dtype=dtype, device=device)
    log(
        f"{spec['id']} {dtype} {type(lm.lm).__name__} on {lm.device} loaded in "
        f"{round(time.monotonic() - started, 1)} s"
    )
    with reader(spec):
        run = base.Run(spec)
        pairs = []
        for _ in range(CHECK_SLOTS):
            resolved = run.next()
            row = lm.run(resolved)
            run.accept(row)
            pairs.append((resolved, row))
            status = inject19.read(spec, row["raw"], row["truncated"])["status"]
            log(
                f"{spec['id']} {dtype} slot {resolved['index']} "
                f"{row['generated_tokens']} tokens {row['seconds']} s {status} "
                f"{row['raw'][:80]!r}"
            )
    resolved, row = pairs[0]
    again = lm.run(resolved)
    same = all(again[k] == row[k] for k in local.RECHECKED)
    plain = None
    if exact:
        resolved, row = min(pairs, key=lambda pair: pair[1]["generated_tokens"])
        rendered = lm.tokenizer.apply_chat_template(
            resolved["messages"],
            tools=local.TOOLS,
            add_generation_prompt=True,
            tokenize=False,
            **spec["template_kwargs"],
        )
        ids = lm.tokenizer.encode(rendered, add_special_tokens=False)
        generator = torch.Generator(device="cpu").manual_seed(resolved["seed"])
        tokens = []
        with torch.inference_mode():
            while len(tokens) < resolved["max_tokens"]:
                scores = lm.lm(
                    input_ids=torch.tensor([ids + tokens], device=lm.device)
                ).logits[0, -1]
                token = nucleus(
                    scores.detach().to("cpu", torch.float32),
                    local.SETTINGS["temperature"],
                    local.SETTINGS["top_p"],
                    generator,
                )
                if token in lm.ends:
                    break
                tokens.append(token)
        digest = hashlib.sha256(json.dumps(tokens).encode()).hexdigest()
        plain = digest == row["generated_token_sha256"]
    log(f"{spec['id']} {dtype} recheck identical {same}; plain loop equal {plain}")
    del lm
    return same, plain


def check_installation(*, dtype=DTYPE, device=None, log=print):
    """Check an installation on the two small models outside the lane. In 32-bit precision,
    where a cached and an uncached pass agree closely enough to compare token for token, a
    slot sampled again must be identical and the ``generate`` path must give the same tokens
    as the plain loop: that decides the result. In the lane's own precision the same slots
    are then sampled and reported, which shows the models load and generate in it. Nothing
    is written."""
    from huggingface_hub import snapshot_download

    passed = True
    for spec in CHECK_MODELS:
        path = snapshot_download(spec["repo"], revision=spec["revision"])
        same, plain = _check_one(
            spec, path, dtype="float32", device=device, exact=True, log=log
        )
        passed = passed and same and plain
        if dtype != "float32":
            _check_one(spec, path, dtype=dtype, device=device, exact=False, log=log)
    return passed


def capture_one(spec, out_dir, *, log=print):
    from huggingface_hub import snapshot_download

    out_dir = Path(out_dir)
    (out_dir / "transcripts").mkdir(parents=True, exist_ok=True)
    path = snapshot_download(spec["repo"], revision=spec["revision"])
    record = {
        "repo": spec["repo"],
        "revision": spec["revision"],
        "files": local.file_digests(path),
        "started_utc": _now(),
    }
    with reader(spec):
        result = base.capture(
            spec,
            out_dir / "transcripts" / (spec["id"] + ".jsonl"),
            lambda: Sampler(spec, path),
            log=log,
        )
    record.update(finished_utc=_now(), **result)
    return record


def _drop_weights(spec):
    """Free the disk for the next model. The capture record already holds the file digests."""
    import shutil

    from huggingface_hub import constants

    folder = Path(constants.HF_HUB_CACHE) / (
        "models--" + spec["repo"].replace("/", "--")
    )
    if folder.is_dir():
        shutil.rmtree(folder)


def deadline_for(started_epoch, usd_per_hour):
    """The moment the capture must have ended for the meter to stay under the cap, leaving
    TEARDOWN_SECONDS to copy the transcripts off the machine and release it."""
    return started_epoch + SPEND_CAP_USD / usd_per_hour * 3600 - TEARDOWN_SECONDS


def allowance(deadline, now):
    """Seconds the next model may run, and whether the deadline (not the per-model budget)
    is what limits it."""
    if deadline is None:
        return BUDGET_SECONDS, False
    left = int(deadline - now)
    return min(BUDGET_SECONDS, left), left < BUDGET_SECONDS


def may_retry(record):
    return (
        record.get("status") == "not_captured"
        and record.get("partial_rows") == 0
        and str(record.get("reason", "")).startswith(RETRY_PREFIXES)
        and not record.get("earlier_attempts")
    )


def capture_all(out_dir, *, only=None, keep=(), deadline=None, retry=False, log=print):
    """Each declared model in its own process, in the declared order, within its time
    budget and the run's deadline. A model that cannot be fetched, cannot be loaded, fails
    or runs out of time is recorded with the reason and the next one starts. Weights are
    removed after each model unless it is named in ``keep``. With ``retry`` a model that
    failed before writing a row is run once more."""
    from huggingface_hub import snapshot_download

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    meta_path = out_dir / "capture.json"
    meta = (
        json.loads(meta_path.read_text())
        if meta_path.exists()
        else {**host(), "models": {}}
    )
    for spec in MODELS:
        if only and spec["id"] not in only:
            continue
        prior = meta["models"].get(spec["id"], {})
        again = retry and may_retry(prior)
        if prior.get("status") in STATUSES and not again:
            continue
        seconds, capped = allowance(deadline, time.time())
        if seconds < MIN_START_SECONDS:
            break
        started = _now()
        files = None
        try:
            files = local.file_digests(
                snapshot_download(spec["repo"], revision=spec["revision"])
            )
        except Exception as error:  # noqa: BLE001 - whatever the fetch raised is the record
            record = {
                "status": "not_captured",
                "reason": "fetch_failed:" + type(error).__name__,
            }
        else:
            result_path = out_dir / ("result-" + spec["id"] + ".json")
            command = [sys.executable, "-B", str(HERE / "inject19v.py"), "one"]
            command += [spec["id"], str(out_dir)]
            try:
                done = subprocess.run(command, timeout=seconds)
                if done.returncode == 0 and result_path.exists():
                    record = json.loads(result_path.read_text())
                else:
                    record = {
                        "status": "not_captured",
                        "reason": "process_exit_" + str(done.returncode),
                    }
            except subprocess.TimeoutExpired:
                reason = CAP_REACHED if capped else "time_budget_exceeded"
                record = {"status": "not_captured", "reason": reason}
        if record["status"] == "not_captured":
            transcript = out_dir / "transcripts" / (spec["id"] + ".jsonl")
            rows = (
                len([x for x in transcript.read_text().splitlines() if x])
                if transcript.exists()
                else 0
            )
            record = {
                "repo": spec["repo"],
                "revision": spec["revision"],
                "files": files,
                "started_utc": started,
                "finished_utc": _now(),
                "partial_rows": rows,
                **record,
            }
        if again:
            record["earlier_attempts"] = [
                {k: prior[k] for k in ("reason", "started_utc", "finished_utc")}
            ]
        meta["models"][spec["id"]] = record
        meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
        log(spec["id"] + " " + record["status"])
        if spec["id"] not in keep:
            _drop_weights(spec)
    return meta


def record_rental(out_dir, *, provider, machine, usd_per_hour, seconds):
    """The four facts the meter is computed from, written by the author from the rental
    service's own record of the machine: what it is, its hourly price, and the seconds
    between its creation and its release."""
    meta_path = Path(out_dir) / "capture.json"
    meta = json.loads(meta_path.read_text())
    meta["rental"] = {
        "provider": provider,
        "machine": machine,
        "usd_per_hour": usd_per_hour,
        "seconds": seconds,
    }
    meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
    return meta["rental"]


def close(out_dir, reason=NOT_STARTED, *, log=print):
    """Record every model the run never reached as not captured, with the reason. Used when
    the run is stopped for the spending cap, so the record names all eight models."""
    meta_path = Path(out_dir) / "capture.json"
    meta = json.loads(meta_path.read_text())
    for spec in MODELS:
        if spec["id"] in meta["models"]:
            continue
        stamp = _now()
        meta["models"][spec["id"]] = {
            "repo": spec["repo"],
            "revision": spec["revision"],
            "files": None,
            "started_utc": stamp,
            "finished_utc": stamp,
            "partial_rows": 0,
            "status": "not_captured",
            "reason": reason,
        }
        log(spec["id"] + " not_captured " + reason)
    meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
    return meta


if __name__ == "__main__":
    import argparse

    cli = argparse.ArgumentParser(description=__doc__)
    sub = cli.add_subparsers(dest="command", required=True)
    every = sub.add_parser("all")
    every.add_argument("out", type=Path)
    every.add_argument("--only", nargs="*")
    every.add_argument("--keep", nargs="*", default=[])
    every.add_argument("--deadline", type=float, default=None)
    every.add_argument("--retry", action="store_true")
    one = sub.add_parser("one")
    one.add_argument("model")
    one.add_argument("out", type=Path)
    end = sub.add_parser("close")
    end.add_argument("out", type=Path)
    probe = sub.add_parser("check")
    probe.add_argument("--dtype", default=DTYPE)
    probe.add_argument("--device", default=None)
    rent = sub.add_parser("rental")
    rent.add_argument("out", type=Path)
    rent.add_argument("--provider", required=True)
    rent.add_argument("--machine", required=True)
    rent.add_argument("--usd-per-hour", type=float, required=True)
    rent.add_argument("--seconds", type=int, required=True)
    args = cli.parse_args()
    if args.command == "all":
        capture_all(
            args.out,
            only=args.only,
            keep=args.keep,
            deadline=args.deadline,
            retry=args.retry,
        )
    elif args.command == "close":
        close(args.out)
    elif args.command == "check":
        sys.exit(0 if check_installation(dtype=args.dtype, device=args.device) else 1)
    elif args.command == "rental":
        record_rental(
            args.out,
            provider=args.provider,
            machine=args.machine,
            usd_per_hour=args.usd_per_hour,
            seconds=args.seconds,
        )
    else:
        chosen = model(args.model)
        outcome = capture_one(chosen, args.out)
        (args.out / ("result-" + chosen["id"] + ".json")).write_text(
            json.dumps(outcome, sort_keys=True)
        )
