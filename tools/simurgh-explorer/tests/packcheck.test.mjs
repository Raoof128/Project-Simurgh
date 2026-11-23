import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../index.mjs";
import { checkPack, readZip, verdict } from "../packcheck.mjs";

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
