const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_DAEMON_BASE_URL = "http://127.0.0.1:3031";

export const SIMURGH_DAEMON_STATES = Object.freeze([
  "idle",
  "discovering",
  "available",
  "pairing",
  "paired",
  "proof_ready",
  "missing",
  "stale",
  "untrusted",
  "error",
]);

function joinUrl(base, path) {
  return String(base || "").replace(/\/+$/, "") + path;
}

function createError(message, detail = {}) {
  const error = new Error(message);
  Object.assign(error, detail);
  return error;
}

export function createSimurghClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) throw new Error("fetchImpl is required");

  let config = {
    serverBaseUrl: options.serverBaseUrl || "",
    daemonBaseUrl: options.daemonBaseUrl || DEFAULT_DAEMON_BASE_URL,
    sessionToken: options.sessionToken || null,
    sessionId: options.sessionId || null,
    examId: options.examId || null,
    requireDaemon: Boolean(options.requireDaemon),
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
  };
  let state = {
    state: "idle",
    reachable: false,
    paired: false,
    nodeIdHash: null,
    lastProofAt: null,
    lastError: null,
  };
  const listeners = new Set();

  function notify() {
    const snapshot = getState();
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  }

  function setState(next) {
    state = { ...state, ...next };
    return notify();
  }

  function getState() {
    return { ...state };
  }

  function updateSession(next = {}) {
    config = { ...config, ...next };
    return getState();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  }

  async function jsonFetch(url, options = {}, timeoutMs = config.timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...options, signal: ctrl.signal });
      const body = await response.json().catch(() => null);
      return { response, body };
    } finally {
      clearTimeout(timer);
    }
  }

  async function daemonJson(path, options = {}) {
    const headers = {
      "content-type": "application/json",
      "x-simurgh-local-client": "browser",
      ...(options.headers || {}),
    };
    const { response, body } = await jsonFetch(joinUrl(config.daemonBaseUrl, path), {
      ...options,
      headers,
    });
    if (!response.ok) {
      throw createError(`daemon_${response.status}`, { status: response.status, body });
    }
    return body;
  }

  async function serverJson(path, options = {}) {
    const headers = {
      "content-type": "application/json",
      ...(config.sessionToken ? { authorization: "Bearer " + config.sessionToken } : {}),
      ...(options.headers || {}),
    };
    const { response, body } = await jsonFetch(joinUrl(config.serverBaseUrl, path), {
      ...options,
      headers,
    });
    if (!response.ok) {
      throw createError(`server_${response.status}`, { status: response.status, body });
    }
    return body;
  }

  async function discover() {
    setState({ state: "discovering", lastError: null });
    try {
      const health = await daemonJson("/health", { method: "GET" });
      if (!health?.ok) {
        return setState({ state: "missing", reachable: false, paired: false });
      }
      const status = await daemonJson("/status", { method: "GET" });
      const paired = Boolean(status?.paired);
      return setState({
        state: paired ? "paired" : "available",
        reachable: true,
        paired,
        nodeIdHash: status?.node_id_hash || state.nodeIdHash,
        lastError: null,
      });
    } catch (error) {
      return setState({
        state: "missing",
        reachable: false,
        paired: false,
        lastError: error.message,
      });
    }
  }

  async function serverChallenge(purpose) {
    if (!config.sessionToken || !config.sessionId) return null;
    return serverJson("/api/device/challenge", {
      method: "POST",
      body: JSON.stringify({ sessionId: config.sessionId, purpose }),
    });
  }

  async function pair() {
    if (!state.reachable) await discover();
    if (!state.reachable) return getState();
    if (state.paired) return getState();
    if (!config.sessionToken || !config.sessionId || !config.examId) return getState();

    setState({ state: "pairing", lastError: null });
    try {
      const challenge = await serverChallenge("pair");
      if (!challenge?.challenge) throw createError("pair_challenge_unavailable");
      const daemonPair = await daemonJson("/pair", {
        method: "POST",
        body: JSON.stringify({
          session_id: config.sessionId,
          exam_id: config.examId,
          challenge: challenge.challenge,
          server_origin: globalThis.location?.origin || config.serverBaseUrl,
        }),
      });
      if (!daemonPair?.ok) throw createError("daemon_pair_failed");
      await serverJson("/api/device/pair", {
        method: "POST",
        body: JSON.stringify({
          sessionId: config.sessionId,
          node_id_hash: daemonPair.node_id_hash,
          public_key: daemonPair.public_key,
          signed_payload: daemonPair.signed_payload,
          signature: daemonPair.signature,
        }),
      });
      return setState({
        state: "paired",
        reachable: true,
        paired: true,
        nodeIdHash: daemonPair.node_id_hash,
        lastError: null,
      });
    } catch (error) {
      return setState({ state: "error", paired: false, lastError: error.message });
    }
  }

  async function fetchProof(sequence) {
    if (
      !state.reachable ||
      !state.paired ||
      !config.sessionToken ||
      !config.sessionId ||
      !config.examId
    ) {
      return null;
    }
    try {
      const challenge = await serverChallenge("proof");
      if (!challenge?.challenge) return null;
      const proof = await daemonJson("/proof", {
        method: "POST",
        body: JSON.stringify({
          session_id: config.sessionId,
          exam_id: config.examId,
          sequence,
          challenge: challenge.challenge,
        }),
      });
      if (!proof?.ok || !proof.daemon_proof) return null;
      setState({ state: "proof_ready", lastProofAt: Date.now(), lastError: null });
      return proof.daemon_proof;
    } catch (error) {
      setState({ state: "stale", lastError: error.message });
      return null;
    }
  }

  async function sendTelemetry({ sequence, telemetry, timestamp = Date.now(), daemonRequired }) {
    const requireProof = daemonRequired ?? config.requireDaemon;
    const daemonProof = await fetchProof(sequence);
    if (requireProof && !daemonProof) {
      setState({ state: "missing", lastError: "daemon_proof_required" });
      throw createError("daemon_proof_required");
    }

    try {
      const verdict = await serverJson("/api/telemetry", {
        method: "POST",
        body: JSON.stringify({
          sessionId: config.sessionId,
          sequence,
          timestamp,
          telemetry,
          daemon_required: requireProof,
          ...(daemonProof ? { daemon_proof: daemonProof } : {}),
        }),
      });
      return verdict;
    } catch (error) {
      if (error.status === 429) {
        return { error: "rate_limited" };
      }
      if (error.status === 401 || error.status === 409) {
        setState({ state: "untrusted", lastError: error.body?.error || error.message });
      } else {
        setState({ state: "error", lastError: error.message });
      }
      throw error;
    }
  }

  function setDaemonAvailable(status = {}) {
    return setState({
      state: status.paired ? "paired" : "available",
      reachable: true,
      paired: Boolean(status.paired),
      nodeIdHash: status.node_id_hash || state.nodeIdHash,
      lastError: null,
    });
  }

  return {
    discover,
    pair,
    fetchProof,
    sendTelemetry,
    getState,
    setDaemonAvailable,
    subscribe,
    updateSession,
  };
}

if (typeof window !== "undefined") {
  window.SimurghBrowserSdk = { createSimurghClient, SIMURGH_DAEMON_STATES };
}
