import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const WF_PATH = ".github/workflows/stage-1-checks.yml";

test("[stage-2-8d] CI workflow installs xvfb + x11-utils + dbus-x11", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(/\bxvfb\b/.test(src), "CI does not install xvfb");
  assert.ok(/\bx11-utils\b/.test(src), "CI does not install x11-utils");
  assert.ok(/\bdbus-x11\b/.test(src), "CI does not install dbus-x11");
});

test("[stage-2-8d] CI workflow installs Rust stable + fmt + clippy + cargo test", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(/dtolnay\/rust-toolchain@stable/.test(src), "Rust toolchain action missing");
  assert.ok(/cargo fmt --check/.test(src), "cargo fmt step missing");
  assert.ok(/cargo clippy.*-D warnings/.test(src), "cargo clippy -D warnings missing");
  assert.ok(/cargo test.*tools\/simurgh-daemon-linux/.test(src), "cargo test step missing");
});

test("[stage-2-8d] CI workflow sets SIMURGH_REQUIRE_XVFB_TESTS=1 for cargo test", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(
    /SIMURGH_REQUIRE_XVFB_TESTS:\s*["']?1["']?/.test(src),
    "Xvfb tests not promoted to mandatory in CI"
  );
});

test("[stage-2-8d] CI workflow runs shellcheck on Linux daemon scripts", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(/shellcheck/.test(src), "shellcheck step missing");
});

test("[stage-2-8d] CI workflow has no deploy / release / publish steps", () => {
  const src = readFileSync(WF_PATH, "utf8");
  for (const banned of [/\bnpm publish\b/, /\bdocker push\b/, /softprops\/action-gh-release/]) {
    assert.ok(!banned.test(src), `CI contains forbidden step: ${banned}`);
  }
});

test("[stage-2-8d] CI workflow does not echo secrets", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(!/echo\s+\$\{\{\s*secrets\./.test(src), "workflow echoes a secret");
});

test("[stage-2-8d] CI workflow caches the cargo registry to keep cold builds bounded", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.ok(/actions\/cache@v4/.test(src), "actions/cache@v4 step missing");
  assert.ok(/\.cargo\/registry/.test(src), "cargo registry not in cache path");
});
