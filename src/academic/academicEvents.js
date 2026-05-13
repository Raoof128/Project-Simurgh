export const EVENTS = Object.freeze({
  EXAM_STARTED:              'EXAM_STARTED',
  PRIVACY_ACCEPTED:          'PRIVACY_ACCEPTED',
  HELPER_CONNECTED:          'HELPER_CONNECTED',
  HELPER_DISCONNECTED:       'HELPER_DISCONNECTED',
  TELEMETRY_WINDOW_RECEIVED: 'TELEMETRY_WINDOW_RECEIVED',
  FOCUS_LOSS:                'FOCUS_LOSS',
  LONG_TIME_OFF_WINDOW:      'LONG_TIME_OFF_WINDOW',
  BULK_PASTE:                'BULK_PASTE',
  REPEATED_PASTE:            'REPEATED_PASTE',
  ABNORMAL_WPM_SPIKE:        'ABNORMAL_WPM_SPIKE',
  LONG_IDLE_GAP:             'LONG_IDLE_GAP',
  CAPTURE_EXCLUDED_WINDOW:   'CAPTURE_EXCLUDED_WINDOW',
  RISK_ESCALATED:            'RISK_ESCALATED',
  RISK_DEESCALATED:          'RISK_DEESCALATED',
  SESSION_RECONNECTED:       'SESSION_RECONNECTED',
  EXAM_SUBMITTED:            'EXAM_SUBMITTED',
  REPORT_GENERATED:          'REPORT_GENERATED',
  AUDIT_VERIFIED:            'AUDIT_VERIFIED',
});

export function createEvent(sessionId, type, detail = {}) {
  return { sessionId, type, detail, ts: Date.now() };
}

export function eventTimeline() {
  const store = new Map();

  return {
    add(sessionId, type, detail = {}) {
      if (!store.has(sessionId)) store.set(sessionId, []);
      store.get(sessionId).push(createEvent(sessionId, type, detail));
    },
    get(sessionId) {
      return [...(store.get(sessionId) ?? [])];
    },
    clear(sessionId) {
      store.delete(sessionId);
    },
  };
}
