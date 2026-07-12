// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C: complete a DE-IDENTIFIED public-witness anchor. Runs `ots upgrade` + `ots
// verify` on the OpenTimestamps proof, checks it is (a) Bitcoin-confirmed and (b) a timestamp of THIS
// pack's contest_layer_root, and returns { status: confirmed|pending|invalid, witnessVerified }. This
// is the ONLINE step (Sigstore/Bitcoin are external services) — its result is injected into the gate as
// `witnessVerified` (B11). A PENDING proof (fresh stamp, not yet mined) yields witnessVerified=false —
// so no public_witness is ever recorded until Bitcoin actually confirms.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { contestLayerRoot } from "../core/roots.mjs";
import { publicWitnessBindingValid } from "../core/independence.mjs";

function runOts(args) {
  try {
    return execFileSync("ots", args, { encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}

export function verifyWitness(packDir, proofPath) {
  const bundle = JSON.parse(readFileSync(join(packDir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(packDir, "external-config.json"), "utf8"));
  const bind = publicWitnessBindingValid(bundle, cfg);
  if (!bind.ok) return { status: "invalid", reason: bind.reason, witnessVerified: false };

  // The attach step stamped ANCHOR_ME.txt = `${contest_layer_root}\n`. Reconstruct it exactly so `ots
  // verify` binds the proof to THIS pack (a proof for a different digest fails the hash check).
  const dir = mkdtempSync(join(tmpdir(), "vrc-ots-"));
  const target = join(dir, "ANCHOR_ME.txt");
  writeFileSync(target, contestLayerRoot(bundle) + "\n");
  copyFileSync(proofPath, `${target}.ots`);

  runOts(["upgrade", `${target}.ots`]); // best-effort: pull any newly-mined attestations
  const out = runOts(["verify", `${target}.ots`]);
  const confirmed = /Success!|Bitcoin block \d+ attests/i.test(out);
  const pending = /Pending confirmation/i.test(out);
  const hashMismatch = /(does not match|expected|different)/i.test(out) && !confirmed && !pending;
  const status = hashMismatch
    ? "invalid"
    : confirmed
      ? "confirmed"
      : pending
        ? "pending"
        : "unknown";
  return {
    status,
    witnessVerified: status === "confirmed",
    log: cfg.anchor_evidence.log,
    output: out.trim(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packDir, proofPath] = process.argv.slice(2);
  if (!packDir || !proofPath) {
    console.error("usage: node verify-witness.mjs <packDir> <witness-proof.opentimestamps>");
    process.exit(2);
  }
  const r = verifyWitness(packDir, proofPath);
  console.log(
    `witness: status=${r.status} witnessVerified=${r.witnessVerified} log=${r.log ?? "-"}`
  );
  if (r.output) console.log(r.output);
  process.exit(r.status === "confirmed" ? 0 : r.status === "pending" ? 3 : 1);
}
