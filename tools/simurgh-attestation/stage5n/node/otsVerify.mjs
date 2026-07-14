// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — real OFFLINE OpenTimestamps verifier (P0-11 strong route). Parses the detached-proof binary
// format (no network, no bitcoind), recomputes the op path from the leaf, and extracts each
// BitcoinBlockHeaderAttestation(height, merkle_root). Proves: leaf == D, and D deterministically reaches a
// declared Bitcoin merkle root at a claimed height. The residual pin (that height/root is on the canonical
// chain) is a committed verifier_config checkpoint — stated, not hidden. Typed result, never throws.
import crypto from "node:crypto";

const MAGIC = Buffer.concat([
  Buffer.from([0x00]),
  Buffer.from("OpenTimestamps", "ascii"),
  Buffer.from([0x00, 0x00]),
  Buffer.from("Proof", "ascii"),
  Buffer.from([0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
]);
const BITCOIN_TAG = Buffer.from([0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]);
const PENDING_TAG = Buffer.from([0x83, 0xdf, 0xe3, 0x0d, 0x2e, 0xf9, 0x0c, 0x8e]);

class Reader {
  constructor(buf) {
    this.b = buf;
    this.o = 0;
  }
  byte() {
    return this.b[this.o++];
  }
  bytes(n) {
    const s = this.b.subarray(this.o, this.o + n);
    this.o += n;
    return s;
  }
  varuint() {
    let value = 0n,
      shift = 0n;
    for (;;) {
      const b = this.byte();
      value |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7n;
    }
    return Number(value);
  }
  varbytes() {
    return this.bytes(this.varuint());
  }
  eof() {
    return this.o >= this.b.length;
  }
}

const sha256 = (b) => crypto.createHash("sha256").update(b).digest();
const ripemd160 = (b) => crypto.createHash("ripemd160").update(b).digest();

function applyOp(tag, current, r) {
  switch (tag) {
    case 0x08:
      return sha256(current); // OpSHA256
    case 0x02:
      return crypto.createHash("sha1").update(current).digest(); // OpSHA1
    case 0x03:
      return ripemd160(current); // OpRIPEMD160
    case 0xf0:
      return Buffer.concat([current, Buffer.from(r.varbytes())]); // OpAppend
    case 0xf1:
      return Buffer.concat([Buffer.from(r.varbytes()), current]); // OpPrepend
    default:
      throw new Error(`unknown OTS op 0x${tag.toString(16)}`);
  }
}

// Walk the timestamp tree from `current`, collecting Bitcoin attestations {height, merkle_root}.
function walk(r, current, out) {
  const doOne = (tag) => {
    if (tag === 0x00) {
      const attTag = Buffer.from(r.bytes(8));
      const payload = Buffer.from(r.varbytes());
      if (attTag.equals(BITCOIN_TAG)) {
        const pr = new Reader(payload);
        out.push({ height: pr.varuint(), merkle_root: current.toString("hex") });
      } else if (attTag.equals(PENDING_TAG)) {
        out.pending = true;
      }
    } else {
      const next = applyOp(tag, current, r);
      walk(r, next, out);
    }
  };
  let tag = r.byte();
  while (tag === 0xff) {
    doOne(r.byte());
    tag = r.byte();
  }
  doOne(tag);
}

// verifyOtsOffline(otsBytes, expectedLeafHex) -> { leaf_ok, confirmed, attestations, pending }
export function verifyOtsOffline(otsBytes, expectedLeafHex) {
  try {
    const r = new Reader(Buffer.from(otsBytes));
    if (!Buffer.from(r.bytes(MAGIC.length)).equals(MAGIC))
      return { leaf_ok: false, confirmed: false, error: "bad_magic" };
    r.varuint(); // major version
    r.byte(); // file hash op (OpSHA256)
    const leaf = Buffer.from(r.bytes(32));
    const leaf_ok = leaf.toString("hex") === expectedLeafHex;
    const out = [];
    walk(r, leaf, out);
    return {
      leaf_ok,
      confirmed: leaf_ok && out.length > 0,
      attestations: out,
      pending: !!out.pending,
    };
  } catch (e) {
    return { leaf_ok: false, confirmed: false, error: String(e) };
  }
}
