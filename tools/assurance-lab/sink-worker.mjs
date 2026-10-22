// SPDX-License-Identifier: AGPL-3.0-or-later
// Private IPC worker. Its directory is created by the trusted harness, never an action field.
import { writeFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validAction } from "./core.mjs";

const directory = process.argv[2];
let sequence = 0;
process.on("message", ({ id, operation, action }) => {
  try {
    let result;
    if (operation === "execute") {
      if (!validAction(action)) throw new Error("invalid_action");
      const event = { sequence: sequence + 1, action };
      writeFileSync(
        join(directory, `${String(event.sequence).padStart(6, "0")}.json`),
        JSON.stringify(event),
        { flag: "wx", mode: 0o600 }
      );
      sequence++;
      result = event;
    } else if (operation === "snapshot") {
      // Read actual persisted bytes, not the returned trace or a worker effects array.
      result = {
        available: true,
        effects: readdirSync(directory)
          .sort()
          .map((file) => JSON.parse(readFileSync(join(directory, file), "utf8"))),
      };
    } else throw new Error("unknown_operation");
    process.send({ id, result });
  } catch (error) {
    process.send({ id, error: error.message });
  }
});
process.on("disconnect", () => process.exit(0));
process.send({ ready: true });
