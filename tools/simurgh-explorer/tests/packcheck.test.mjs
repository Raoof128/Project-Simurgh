import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../index.mjs";
import { checkPack, readChosen, readZip, sha256, verdict } from "../packcheck.mjs";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const b = buildIndex();
const bytesOf = (path) => new Uint8Array(readFileSync(path));

// A copy of a pack with one change, written by Python's zipfile so that it is a valid archive.
function altered(lane, change) {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-explorer-pack-"));
  const out = join(dir, "evidence.zip");
  execFileSync("python3", [
    "-I",
    "-c",
    [
      "import json, sys, zipfile",
      "src, dst, change = sys.argv[1:4]",
      "with zipfile.ZipFile(src) as z:",
      "    members = {n: z.read(n) for n in z.namelist()}",
      "first = sorted(n for n in members if n != 'manifest.json')[0]",
      "if change == 'member': members[first] = members[first] + b' '",
      "if change == 'manifest':",
      "    m = json.loads(members['manifest.json']); m['note'] = 'changed'",
      "    members['manifest.json'] = json.dumps(m).encode()",
      "if change == 'extra': members['unlisted.txt'] = b'not in the manifest'",
      "if change == 'inherited':",
      "    for name in ('toString', 'constructor', 'hasOwnProperty'): members[name] = b'x'",
      "if change == 'missing': del members[first]",
      "with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as out:",
      "    [out.writestr(n, data) for n, data in members.items()]",
    ].join("\n"),
    join(REPO, lane.pack),
    out,
    change,
  ]);
  const bytes = bytesOf(out);
  rmSync(dir, { recursive: true, force: true });
  return bytes;
}

test("every committed pack hashes to its root file, with every member matching", async () => {
  assert.ok(b.lanes.length > 0);
  for (const lane of b.lanes) {
    const result = await checkPack(bytesOf(join(REPO, lane.pack)));
    const root = readFileSync(join(REPO, lane.pack, "../ROOT.sha256"), "utf8").trim();
    assert.equal(result.root, root, `${lane.id} root`);
    assert.equal(result.matching, result.listed, `${lane.id} members`);
    assert.ok(result.listed > 0, `${lane.id} lists members`);
    assert.deepEqual(
      verdict(result, lane.root),
      { rootMatches: true, whole: true, match: true },
      lane.id
    );
  }
});

test("a changed member, manifest, extra member or missing member is reported, never passed", async () => {
  const lane = b.lanes[0];
  const member = await checkPack(altered(lane, "member"));
  assert.equal(member.root, lane.root, "the manifest is untouched, so the root still matches");
  assert.equal(member.differing.length, 1);
  assert.equal(verdict(member, lane.root).match, false);

  const manifest = await checkPack(altered(lane, "manifest"));
  assert.notEqual(manifest.root, lane.root);
  assert.deepEqual(verdict(manifest, lane.root), { rootMatches: false, whole: true, match: false });

  const extra = await checkPack(altered(lane, "extra"));
  assert.deepEqual(extra.unlisted, ["unlisted.txt"]);
  assert.equal(verdict(extra, lane.root).match, false);

  // A member named like something every object inherits is still not in the manifest.
  const inherited = await checkPack(altered(lane, "inherited"));
  assert.deepEqual([...inherited.unlisted].sort(), ["constructor", "hasOwnProperty", "toString"]);
  assert.equal(verdict(inherited, lane.root).match, false);

  const missing = await checkPack(altered(lane, "missing"));
  assert.equal(missing.missing.length, 1);
  assert.equal(verdict(missing, lane.root).match, false);

  // Another lane's intact pack is whole, and is not this lane's pack.
  const other = await checkPack(bytesOf(join(REPO, b.lanes.at(-1).pack)));
  assert.deepEqual(verdict(other, lane.root), { rootMatches: false, whole: true, match: false });
});

test("bytes that are not a pack are refused with a reason", async () => {
  const real = bytesOf(join(REPO, b.lanes[0].pack));
  await assert.rejects(checkPack(new Uint8Array(64)), /not a ZIP/);
  await assert.rejects(checkPack(new TextEncoder().encode("{}")), /not a ZIP/);
  await assert.rejects(checkPack(real.subarray(0, real.length - 40)), /Pack /);
  await assert.rejects(checkPack("a string"), /bytes/);
  const flipped = real.slice();
  flipped[60] ^= 0xff;
  await assert.rejects(
    (async () => {
      const result = await checkPack(flipped);
      // A flipped byte must surface as a refusal or as a mismatch; passing is the only failure.
      if (!verdict(result, b.lanes[0].root).match) throw new Error("Pack does not match");
      return result;
    })(),
    /Pack |incorrect|invalid|unexpected/i
  );
  const members = await readZip(real);
  assert.ok(members.has("manifest.json"));
});

test("the command line runs the same check", () => {
  const lane = b.lanes.at(-1);
  const out = JSON.parse(
    execFileSync(process.execPath, [cli, "check", "--id", lane.id], { encoding: "utf8" })
  ).data;
  assert.deepEqual(
    [out.lane, out.root, out.committed_root, out.match, out.matching],
    [lane.id, lane.root, lane.root, true, out.listed]
  );
  assert.throws(() =>
    execFileSync(process.execPath, [cli, "check", "--id", "no-such-lane"], { stdio: "pipe" })
  );
});

test("the loose report beside each pack is the pack's own report", async () => {
  // The pages, the explorer and the results generators read the loose file; the verifier
  // reads the archive. This holds the two together.
  let compared = 0;
  for (const lane of b.lanes) {
    const members = await readZip(bytesOf(join(REPO, lane.pack)));
    if (!members.has("report.json")) continue;
    const loose = bytesOf(join(REPO, lane.sources.report.path));
    assert.equal(await sha256(loose), await sha256(members.get("report.json")), lane.id);
    compared += 1;
  }
  assert.ok(compared > 20, `compared ${compared} lanes`);
});

test("an archive that inflates past 256 MiB in all is refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-explorer-bomb-"));
  const out = join(dir, "big.zip");
  execFileSync("python3", [
    "-I",
    "-c",
    [
      "import sys, zipfile",
      "block = bytes(60 * 1024 * 1024)",
      "with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:",
      "    z.writestr('manifest.json', '{\"files\": {}}')",
      "    [z.writestr(f'zeros-{i}.bin', block) for i in range(5)]",
    ].join("\n"),
    out,
  ]);
  const bytes = bytesOf(out);
  rmSync(dir, { recursive: true, force: true });
  assert.ok(bytes.length < 4 * 1024 * 1024, "the archive itself is small");
  await assert.rejects(checkPack(bytes), /inflates to more than 256 MiB/);
});

test("a stored member whose directory entry lies about its size is refused", async () => {
  // The total is counted from declared sizes, so a stored member must be as long as it says.
  // Without this, many names pointing at one stored megabyte, each declaring nothing, pass the
  // cap and are hashed one by one.
  const dir = mkdtempSync(join(tmpdir(), "simurgh-explorer-stored-"));
  const out = join(dir, "stored.zip");
  execFileSync("python3", [
    "-I",
    "-c",
    [
      "import sys, zipfile",
      "with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_STORED) as z:",
      "    z.writestr('manifest.json', '{\"files\": {}}')",
      "    z.writestr('big.bin', bytes(1024 * 1024))",
    ].join("\n"),
    out,
  ]);
  const bytes = bytesOf(out);
  rmSync(dir, { recursive: true, force: true });
  assert.equal((await readZip(bytes)).get("big.bin").length, 1024 * 1024, "the honest copy reads");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let patched = 0;
  for (let i = 0; i + 46 < bytes.length; i++)
    if (view.getUint32(i, true) === 0x02014b50 && view.getUint32(i + 24, true) === 1024 * 1024) {
      view.setUint32(i + 24, 0, true); // the directory now says the member is empty
      patched += 1;
    }
  assert.equal(patched, 1);
  await assert.rejects(readZip(bytes), /stored member whose length is not the one it declares/);
});

test("a chosen file is refused on its size before any of it is read", async () => {
  const huge = {
    name: "huge.zip",
    size: 300 * 1024 * 1024,
    arrayBuffer: () => assert.fail("the file was read"),
  };
  await assert.rejects(readChosen(huge), /larger than 256 MiB/);
  const small = {
    name: "s.zip",
    size: 3,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  };
  assert.deepEqual([...(await readChosen(small))], [1, 2, 3]);
});
