// SPDX-License-Identifier: AGPL-3.0-or-later

function typeMatches(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function fail(key) {
  return key
    ? { ok: false, reason: "schema_invalid", key }
    : { ok: false, reason: "schema_invalid" };
}

export function validateAgainstSchema(value, schema, path = "") {
  if (schema.type && !typeMatches(value, schema.type)) return fail(path);
  if ("const" in schema && value !== schema.const) return fail(path);
  if (schema.enum && !schema.enum.includes(value)) return fail(path);
  if (schema.type === "integer" && schema.minimum !== undefined && value < schema.minimum) {
    return fail(path);
  }
  if (schema.type === "string" && schema.pattern) {
    const pattern = new RegExp(schema.pattern);
    if (!pattern.test(value)) return fail(path);
  }
  if (
    schema.type === "string" &&
    schema.minLength !== undefined &&
    value.length < schema.minLength
  ) {
    return fail(path);
  }
  if (schema.type === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) return fail(key);
    }
    const properties = schema.properties || {};
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) {
        const result = validateAgainstSchema(value[key], child, key);
        if (!result.ok) return result;
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) return fail(key);
      }
    }
  }
  return { ok: true };
}
