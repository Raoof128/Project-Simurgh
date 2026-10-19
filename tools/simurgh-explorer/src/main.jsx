import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { parseBundle } from "../core.mjs";
import "./style.css";
const root = createRoot(document.getElementById("root"));
root.render(<div className="boot">Opening the evidence workspace…</div>);
fetch("./evidence.json")
  .then((r) => {
    if (!r.ok) throw new Error("Evidence index unavailable. Run npm run build.");
    return r.text();
  })
  .then((text) => root.render(<App initial={parseBundle(text)} />))
  .catch((e) =>
    root.render(
      <main className="boot">
        <h1>Unable to load evidence</h1>
        <p role="alert">{e.message}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </main>
    )
  );
