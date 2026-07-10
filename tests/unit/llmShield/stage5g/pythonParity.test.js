import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const PARITY = join(ROOT, "tools/simurgh-attestation/stage5g/python/vfc_parity.py");

function havePython() {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test(
  "python parity corroborates the committed evidence (byte-agrees with JS)",
  { skip: !havePython() },
  () => {
    const out = execFileSync("python3", [PARITY], { encoding: "utf8" });
    assert.deepEqual(JSON.parse(out), { vfc_parity: "corroborated", mismatches: [] });
  }
);

test(
  "JS canonicalJson byte-matches Python canonicalisation over a parity corpus",
  { skip: !havePython() },
  () => {
    // Tested canonical subset (ASCII-safe): key ordering, nesting, arrays, slashes/backslashes, empty.
    const corpus = [
      { b: 1, a: 2 },
      [1, { y: "z", x: "w" }],
      { nested: { k: [3, 2, 1] } },
      { s: "a/b\\c", t: "" },
      {},
    ];
    const py = execFileSync(
      "python3",
      [
        "-c",
        "import json,sys\n[print(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)) for x in json.load(sys.stdin)]",
      ],
      { input: JSON.stringify(corpus), encoding: "utf8" }
    )
      .trim()
      .split("\n");
    corpus.forEach((v, i) => assert.equal(canonicalJson(v), py[i]));
  }
);
