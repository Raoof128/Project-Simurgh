// SPDX-License-Identifier: AGPL-3.0-or-later
// Recomputing a pack's root in the reader's own browser, and saying exactly what that shows.
import React, { useRef, useState } from "react";
import { checkPack, verdict } from "../packcheck.mjs";
import { State } from "./ui.jsx";

// One check of one lane's pack: the bytes come from this checkout's build or from a file the
// reader chooses. The result is kept by the caller so that it survives a change of view.
export async function runCheck(lane, bytes, source, keep = false) {
  try {
    const result = await checkPack(bytes, { keep });
    return { state: "done", source, result, ...verdict(result, lane.root) };
  } catch (e) {
    return { state: "failed", source, message: e.message };
  }
}

export async function fetchPack(lane) {
  const response = await fetch(`./packs/${lane.id}.zip`, { cache: "no-store" });
  if (!response.ok) throw new Error("Pack is not in this build; run npm run build");
  return new Uint8Array(await response.arrayBuffer());
}

const SHOWN = 20000;
const size = (n) => (n < 1024 ? `${n} bytes` : `${(n / 1024).toFixed(1)} KiB`);

// What is in the pack: every member, and the start of one the reader picks. The text is
// shown as text, whatever it says.
function Members({ result }) {
  const [open, setOpen] = useState(null);
  const data = open && result.contents?.get(open);
  const text = data ? new TextDecoder().decode(data.subarray(0, SHOWN)) : "";
  return (
    <details className="members">
      <summary>What is in the pack: {result.members.length} members</summary>
      <ul>
        {result.members.map((m) => (
          <li key={m.name}>
            {result.contents ? (
              <button
                className="link"
                aria-pressed={open === m.name}
                onClick={() => setOpen(m.name)}
              >
                <code>{m.name}</code>
              </button>
            ) : (
              <code>{m.name}</code>
            )}
            <span className="muted">
              {size(m.bytes)}
              {m.state === "manifest" ? ", the manifest" : m.state === "differs" ? ", differs" : ""}
            </span>
          </li>
        ))}
      </ul>
      {data && (
        <>
          <p className="muted">
            <code>{open}</code>: the first {Math.min(data.length, SHOWN)} of {data.length} bytes, as
            text.
          </p>
          <pre className="raw" tabIndex="0">
            {text}
          </pre>
        </>
      )}
    </details>
  );
}

export function CheckResult({ check, members = false }) {
  if (!check) return null;
  if (check.state === "running")
    return (
      <p className="check-result" role="status">
        Reading the pack and hashing its members.
      </p>
    );
  if (check.state === "failed")
    return (
      <p className="check-result" role="alert">
        <State state="alert">Could not check this pack: {check.message}.</State>
      </p>
    );
  const r = check.result,
    problems = [
      !check.rootMatches && "its manifest does not hash to the committed root",
      r.differing.length > 0 && `${r.differing.length} members differ from the manifest`,
      r.missing.length > 0 && `${r.missing.length} listed members are missing`,
      r.unlisted.length > 0 && `${r.unlisted.length} members are not in the manifest`,
    ].filter(Boolean);
  return (
    <div className="check-result" role="status">
      {check.match ? (
        <State state="checked">
          The bytes hash to the committed root, and all {r.listed} members match the manifest.
        </State>
      ) : (
        <State state="alert">This copy does not match: {problems.join("; ")}.</State>
      )}
      <p className="hash">
        <span className="label">Root computed here</span> <code>{r.root}</code>
      </p>
      {members && <Members result={r} />}
      <p className="muted">
        Computed in this browser from {check.source}. It is the first step of the lane's verifier
        and no more: nothing is replayed, and the committed root it is compared with comes from the
        same checkout as this page.
      </p>
    </div>
  );
}

export function CheckButtons({ lane, canFetch, onCheck, onFile }) {
  const input = useRef(null);
  return (
    <>
      {canFetch && <button onClick={() => onCheck(lane)}>Check this pack in your browser</button>}
      <button onClick={() => input.current.click()}>Check a copy from a file</button>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        aria-label={`Choose a copy of the pack of lane ${lane.id}`}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(lane, file);
          event.target.value = "";
        }}
      />
    </>
  );
}
