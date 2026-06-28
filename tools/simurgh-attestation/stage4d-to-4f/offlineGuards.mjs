// SPDX-License-Identifier: AGPL-3.0-or-later

const FORBIDDEN_ENV = [
  /^OPENAI/i,
  /^ANTHROPIC/i,
  /^GOOGLE_API/i,
  /^AZURE_OPENAI/i,
  /^PLAYWRIGHT/i,
  /^PUPPETEER/i,
  /^BROWSER/i,
];

const FORBIDDEN_SOURCE_PATTERNS = [
  { reason: "network_required_error", pattern: /from ["']node:(?:net|tls|http|https|dns)["']/ },
  { reason: "network_required_error", pattern: /require\(["']node:(?:net|tls|http|https|dns)["']\)/ },
  { reason: "network_required_error", pattern: /\bfetch\s*\(/ },
  { reason: "network_required_error", pattern: /\bWebSocket\s*\(/ },
  { reason: "forbidden_browser_automation", pattern: /from ["'](?:playwright|puppeteer)["']/ },
  { reason: "forbidden_live_api_access", pattern: /from ["'](?:@anthropic-ai\/sdk|openai)["']/ },
  { reason: "network_required_error", pattern: /\b(?:curl|wget|gh api|npm audit)\b/ },
];

export function scrubOfflineEnv(baseEnv = process.env) {
  const clean = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (!FORBIDDEN_ENV.some((pattern) => pattern.test(key))) clean[key] = value;
  }
  clean.NO_NETWORK = "1";
  clean.PYTHONHASHSEED = "0";
  clean.TZ = "UTC";
  clean.LC_ALL = "C";
  clean.LANG = "C";
  clean.SOURCE_DATE_EPOCH = "0";
  clean.SIMURGH_STAGE4D_TO_4F_OFFLINE = "1";
  return clean;
}

export function assertNoForbiddenProviderEnv(env = process.env) {
  const forbidden = Object.keys(env).filter((key) =>
    FORBIDDEN_ENV.some((pattern) => pattern.test(key))
  );
  if (forbidden.length > 0) {
    const error = new Error(`forbidden_provider_env: ${forbidden.sort().join(",")}`);
    error.reason = "forbidden_provider_env";
    throw error;
  }
}

export function scanSourceForForbiddenNetworkUse(source) {
  const failures = [];
  for (const check of FORBIDDEN_SOURCE_PATTERNS) {
    if (check.pattern.test(source)) failures.push({ reason: check.reason });
  }
  return { ok: failures.length === 0, failures };
}
