// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: the eight declared signals, as predicates about DEFECTS.
//
// WHAT THIS REPLACES, AND WHY IT HAD TO BE REPLACED BEFORE THE CONTROLS WERE WRITTEN.
//
// Through Task 17 the detector decided by looking for a marker comment naming the declared signal.
// That is an answer key written into the exam paper. The control's author places the marker, so
// `vulnerable → detected` and `safe → not detected` hold BY CONSTRUCTION, every §4.1 condition passes,
// and not one byte of it is about the defect the class names. It is §1.4's failure — a detector that
// "can appear brilliant while understanding nothing" — reached from the detector's side instead of
// the control's. Building 24 controls on top of it would have made the whole campaign vacuous while
// looking, at every gate, entirely green.
//
// A SIGNAL IS TWO PREDICATES, AND BOTH ARE LOAD-BEARING:
//
//   applies(source)     the construct this signal is about is present at all
//   defective(source)   that construct carries the defect the class names
//
// `applies` is what makes a not-detected mean something. §4.3 already says a safe control must
// exercise the signal path or it is not-detected for the wrong reason; without `applies` that rule has
// no mechanical form. It is also what lets the campaign record `premise_not_applicable` about a member
// honestly, instead of reporting a clean bill of health for a check that never reached anything.
//
// AMBIGUITY RESOLVES TOWARD NOT-DETECTED, NEVER TOWARD DETECTED. The tokeniser below is a tokeniser,
// not a parser: a regex literal containing a quote can over-strip. Over-stripping loses a detection;
// under-stripping would invent one. Under clause 10 a false positive DISCHARGES A CELL, so the only
// acceptable failure direction is the one that costs coverage rather than the one that manufactures
// it.
//
// THESE PREDICATES ARE NARROW AND SAY SO. Each names one concrete syntactic shape of one defect. They
// are not a static analyser for their attack class, and a family that is admissible under one of them
// has measured that class for that role through one shape — which is precisely the claim §13 permits
// and no more.

/** Comment and string syntax per language. Nothing here reads a file, a clock or an environment. */
const LANGUAGES = Object.freeze(["js", "lean"]);

/**
 * Remove comments, and the CONTENT of string literals, leaving the code and the line structure.
 *
 * Three 5Q gates matched their own explanatory prose. A detector that can fire from a comment is that
 * defect wearing the detector's hat, so the stripping happens before any predicate sees the source.
 *
 * @param {string} source
 * @param {"js"|"lean"} language
 * @returns {string}
 */
export function stripNonCode(source, language) {
  const s = String(source);
  const lean = language === "lean";
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];
    if (lean ? c === "-" && d === "-" : c === "/" && d === "/") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (lean ? c === "/" && d === "-" : c === "/" && d === "*") {
      const close = lean ? "-" : "*";
      i += 2;
      while (i < s.length && !(s[i] === close && s[i + 1] === "/")) {
        if (s[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || (!lean && c === "`")) {
      out += c;
      i++;
      while (i < s.length && s[i] !== c) {
        if (s[i] === "\\") i++;
        i++;
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Text of the balanced-paren argument list of the first `name(` at or after `from`. */
function callArgs(code, name, from = 0) {
  const at = code.indexOf(`${name}(`, from);
  if (at === -1) return null;
  let depth = 0;
  for (let i = at + name.length; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") {
      depth--;
      if (depth === 0) return { start: at, end: i, args: code.slice(at + name.length + 1, i) };
    }
  }
  return null;
}

/** Every balanced-paren call of `name` in the code. */
function allCalls(code, name) {
  const out = [];
  let from = 0;
  for (;;) {
    const c = callArgs(code, name, from);
    if (!c) return out;
    out.push(c);
    from = c.end;
  }
}

const first = (code, re) => {
  const m = re.exec(code);
  return m ? m[0].trim() : "";
};

/**
 * The eight signals of tranche T1. One per family, one property each.
 *
 * `specimens` are the predicate's own self-test: the smallest pair that must discriminate. They are
 * NOT the corpus — the corpus is `families/`, hand-authored, and it is what the campaign runs.
 */
export const SIGNALS = Object.freeze({
  digest_taken_over_a_field_never_unicode_normalised: {
    family: "F1",
    attack_class: "R2",
    language: "js",
    description:
      "a value read off an emitted record is digested without being unicode-normalised first, so " +
      "two records that differ only in normal form emit two different digests for one subject",
    applies: (code) => allCalls(code, "sha256Hex").length > 0,
    defective: (code) => {
      const bad = allCalls(code, "sha256Hex").find((c) => !c.args.includes(".normalize("));
      return bad ? `sha256Hex(${bad.args.trim()})` : "";
    },
    specimens: {
      defective:
        "export function emit(record) {\n" +
        "  return { subject_digest: sha256Hex(record.subject) };\n}\n",
      repaired:
        "export function emit(record) {\n" +
        '  return { subject_digest: sha256Hex(record.subject.normalize("NFC")) };\n}\n',
    },
  },

  theorem_hypothesis_makes_the_statement_vacuous: {
    family: "F2",
    attack_class: "R10",
    language: "lean",
    description:
      "the theorem's hypothesis is unsatisfiable, so the statement is true of nothing and the gate " +
      "that checks it is green over an empty world",
    applies: (code) => /\btheorem\b/.test(code),
    defective: (code) => first(code, /(?::\s*False\b|\bFalse\s*(?:→|->))/),
    specimens: {
      defective:
        "theorem completeness_holds (h : False) : covered n := by\n  exact absurd h notF\n",
      repaired: "theorem completeness_holds (h : 0 < n) : covered n := by\n  exact ofPos h\n",
    },
  },

  allocator_admits_a_code_at_or_below_the_high_water_mark: {
    family: "F3",
    attack_class: "R12",
    language: "js",
    description:
      "the allocator compares a candidate code against the recorded high-water mark without " +
      "strictness, so a code already spent can be handed out a second time",
    applies: (code) => /highWaterMark/.test(code),
    defective: (code) =>
      first(code, /(?:(?:>=|<=)\s*highWaterMark|highWaterMark\s*(?:>=|<=))[^;\n]*/),
    specimens: {
      defective:
        "export function allocate(code, highWaterMark) {\n" +
        "  if (code >= highWaterMark) return record(code);\n  return reject(code);\n}\n",
      repaired:
        "export function allocate(code, highWaterMark) {\n" +
        "  if (code > highWaterMark) return record(code);\n  return reject(code);\n}\n",
    },
  },

  signature_verified_against_a_key_carried_by_the_message: {
    family: "F4",
    attack_class: "R4",
    language: "js",
    description:
      "the public key used to verify a signature is read out of the very message being verified, so " +
      "any signer who can rewrite the message can also choose the key that vouches for it",
    // The anchor is the CALL that verifies, not the word "verify": a function whose own name starts
    // with verify would otherwise match its own declaration and the predicate would read its
    // parameter list instead of the key it was handed.
    applies: (code) => allCalls(code, "verifySignature").length > 0,
    defective: (code) => {
      if (/TRUSTED_ROOTS/.test(code)) return "";
      const bad = allCalls(code, "verifySignature").find((c) => /\.public_key\w*/.test(c.args));
      return bad ? `verifySignature(${bad.args.trim()})` : "";
    },
    specimens: {
      defective:
        "export function accept(envelope, sig) {\n" +
        "  return verifySignature(envelope.body, sig, envelope.signer.public_key_b64);\n}\n",
      repaired:
        "export function accept(envelope, sig) {\n" +
        "  return verifySignature(envelope.body, sig, TRUSTED_ROOTS[envelope.signer.key_id]);\n}\n",
    },
  },

  digest_computed_without_a_domain_separator: {
    family: "F5",
    attack_class: "R3",
    language: "js",
    description:
      "the completeness digest is taken over the payload with no domain tag and no separator byte, " +
      "so a digest computed for one purpose verifies as a digest computed for another",
    applies: (code) => /createHash\s*\(/.test(code),
    defective: (code) =>
      /Buffer\.from\(\s*\[\s*0x00/.test(code) ? "" : first(code, /createHash\s*\([^;\n]*/),
    specimens: {
      defective:
        "export function claimDigest(payload) {\n" +
        '  return createHash("sha256").update(payload).digest("hex");\n}\n',
      repaired:
        "export function claimDigest(payload) {\n" +
        '  return createHash("sha256")\n' +
        '    .update(Buffer.from(DOMAIN, "utf8"))\n' +
        "    .update(Buffer.from([0x00]))\n" +
        '    .update(payload)\n    .digest("hex");\n}\n',
    },
  },

  schema_profile_selected_from_the_record_being_validated: {
    family: "F6",
    attack_class: "R3",
    language: "js",
    description:
      "the gate chooses which schema profile to validate against by reading a field of the record it " +
      "is validating, so a record can nominate the standard it will be held to",
    applies: (code) => /(?:PROFILES|SCHEMAS)\s*\[|EXPECTED_PROFILE/.test(code),
    defective: (code) => first(code, /(?:PROFILES|SCHEMAS)\s*\[\s*[A-Za-z_$][\w$]*\.[\w$]+\s*\]/),
    specimens: {
      defective:
        "export function gate(record) {\n" +
        "  const profile = PROFILES[record.schema];\n  return profile.validate(record);\n}\n",
      repaired:
        "export function gate(record) {\n" +
        "  if (record.schema !== EXPECTED_PROFILE) return reject(record);\n" +
        "  return PROFILES[EXPECTED_PROFILE].validate(record);\n}\n",
    },
  },

  canonicaliser_skips_a_key_instead_of_encoding_it: {
    family: "F7",
    attack_class: "R6",
    language: "js",
    description:
      "the canonical encoder drops a key rather than encoding its absence, so two records that " +
      "differ in which keys are present canonicalise to identical bytes",
    applies: (code) => /Object\.keys\s*\(/.test(code),
    defective: (code) => first(code, /if\s*\([^)]*(?:undefined|null)[^)]*\)\s*continue\s*;?/),
    specimens: {
      defective:
        "export function canonical(o) {\n  const out = [];\n" +
        "  for (const k of Object.keys(o).sort()) {\n    const v = o[k];\n" +
        "    if (v === undefined) continue;\n    out.push(k + String(v));\n  }\n" +
        '  return out.join("");\n}\n',
      repaired:
        "export function canonical(o) {\n  const out = [];\n" +
        "  for (const k of Object.keys(o).sort()) {\n    const v = o[k];\n" +
        '    out.push(v === undefined ? k + "\\u0000absent" : k + String(v));\n  }\n' +
        '  return out.join("");\n}\n',
    },
  },

  mirror_uses_a_locale_or_platform_dependent_primitive: {
    family: "F8",
    attack_class: "R11",
    language: "js",
    description:
      "the mirror orders or renders through a primitive whose result depends on locale or platform, " +
      "so two runtimes agree on the input and disagree on the bytes",
    applies: (code) => /\.sort\s*\(|toLocale|os\.EOL/.test(code),
    defective: (code) => first(code, /(?:\.sort\s*\(\s*\)|toLocale\w*\s*\(|os\.EOL)/),
    specimens: {
      defective:
        "export function mirrorKeys(o) {\n" + '  return Object.keys(o).sort().join("|");\n}\n',
      repaired:
        "export function mirrorKeys(o) {\n" +
        "  return Object.keys(o)\n" +
        "    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))\n" +
        '    .join("|");\n}\n',
    },
  },
});

/** Declared signal ids, in family order. */
export const SIGNAL_IDS = Object.freeze(Object.keys(SIGNALS));

/**
 * Evaluate one declared signal over one source.
 *
 * @param {string} signalId
 * @param {string} source
 * @returns {{signal: string, applies: boolean, unsupported: boolean, verdict: string, evidence: string}}
 */
export function evaluateSignal(signalId, source) {
  const signal = SIGNALS[signalId];
  if (!signal) {
    // Fail closed. Answering "not detected" for a signal nobody implemented reports a clean bill of
    // health for a check that never ran.
    throw new Error(`"${signalId}" is not a declared signal of this stage`);
  }
  if (!LANGUAGES.includes(signal.language)) {
    throw new Error(`${signalId}: language ${signal.language} is not one this detector reads`);
  }
  const raw = String(source);
  const code = stripNonCode(raw, signal.language);
  const out = {
    signal: signalId,
    applies: false,
    unsupported: false,
    verdict: "not_detected",
    evidence: "",
  };

  // §6.3's rule, on the detector's side: if stripping removed everything, the source is unsupported
  // rather than clean, and a scan that cannot see anything must never report an absence.
  if (raw.trim() !== "" && code.trim() === "") {
    out.unsupported = true;
    return out;
  }
  if (!signal.applies(code)) return out;

  out.applies = true;
  const evidence = signal.defective(code);
  if (evidence) {
    out.verdict = "detected";
    out.evidence = evidence;
  }
  return out;
}
