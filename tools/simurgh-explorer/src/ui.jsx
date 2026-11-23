// SPDX-License-Identifier: AGPL-3.0-or-later
// Small shared pieces. Every string from a bundle is rendered as text, never as markup.
import React from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "Undated";
}

export function formatSpend(usd) {
  return usd === null ? "Not recorded" : usd === 0 ? "None" : `${usd.toFixed(2)} USD`;
}

// Backticks in committed prose mark code. They become <code> elements; nothing else is parsed.
export function Rich({ text }) {
  return text
    .split("`")
    .map((part, i) =>
      i % 2 ? <code key={i}>{part}</code> : <React.Fragment key={i}>{part}</React.Fragment>
    );
}

export const sentence = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const OUTCOME_WORDS = {
  held: "Held",
  failed: "Did not hold",
  undecided: "Not decided",
  by_model: "Decided model by model",
};

export function outcomeText(h) {
  if (h.outcome !== "by_model") return OUTCOME_WORDS[h.outcome];
  return h.of === null
    ? `Held on ${h.held_on} models; the receipt does not say of how many`
    : `Held on ${h.held_on} of ${h.of} models`;
}

// One prediction, drawn so that shape carries the outcome and colour only repeats it.
export function Mark({ h, size = 14 }) {
  const label = `${h.id}: ${outcomeText(h)}`;
  const fill = h.outcome === "by_model" && h.of ? (10 * h.held_on) / h.of : 0;
  return (
    <svg
      className={`mark mark-${h.outcome}`}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {h.outcome === "held" && <rect x="1" y="1" width="12" height="12" rx="2" />}
      {h.outcome === "failed" && (
        <>
          <rect className="edge" x="1.75" y="1.75" width="10.5" height="10.5" rx="2" />
          <path d="M4.5 4.5 9.5 9.5M9.5 4.5 4.5 9.5" />
        </>
      )}
      {h.outcome === "undecided" && <circle className="edge dashed" cx="7" cy="7" r="5" />}
      {h.outcome === "by_model" && (
        <>
          <rect className="edge" x="1.75" y="1.75" width="10.5" height="10.5" rx="2" />
          <rect className="part" x="2" y={12 - fill} width="10" height={fill} />
        </>
      )}
    </svg>
  );
}

export function Marks({ lane, size }) {
  return (
    <span className="marks">
      {lane.hypotheses.map((h) => (
        <Mark key={h.id} h={h} size={size} />
      ))}
    </span>
  );
}

export function State({ state, children }) {
  return (
    <span className={`state state-${state}`}>
      <span className="state-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function CopyButton({ text, label = "Copy", onCopied }) {
  return (
    <button
      className="quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          onCopied("Copied.");
        } catch {
          onCopied(`Copy this by hand: ${text}`);
        }
      }}
    >
      {label}
    </button>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function saveJson(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
