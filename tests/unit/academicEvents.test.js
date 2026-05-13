import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, createEvent, eventTimeline } from '../../src/academic/academicEvents.js';

describe('academicEvents', () => {
  test('EVENTS exports all required taxonomy constants', () => {
    const required = [
      'EXAM_STARTED', 'PRIVACY_ACCEPTED', 'HELPER_CONNECTED', 'HELPER_DISCONNECTED',
      'TELEMETRY_WINDOW_RECEIVED', 'FOCUS_LOSS', 'BULK_PASTE', 'ABNORMAL_WPM_SPIKE',
      'LONG_IDLE_GAP', 'CAPTURE_EXCLUDED_WINDOW', 'RISK_ESCALATED', 'RISK_DEESCALATED',
      'EXAM_SUBMITTED', 'REPORT_GENERATED', 'AUDIT_VERIFIED',
    ];
    for (const name of required) {
      assert.ok(EVENTS[name], `Missing event: ${name}`);
    }
  });

  test('createEvent returns a well-shaped event object', () => {
    const ev = createEvent('sess_1', EVENTS.EXAM_STARTED, { examId: 'exam_1' });
    assert.equal(ev.sessionId, 'sess_1');
    assert.equal(ev.type, EVENTS.EXAM_STARTED);
    assert.deepEqual(ev.detail, { examId: 'exam_1' });
    assert.ok(typeof ev.ts === 'number');
    assert.ok(ev.ts > 0);
  });

  test('eventTimeline adds and retrieves events in insertion order', () => {
    const timeline = eventTimeline();
    timeline.add('sess_x', EVENTS.EXAM_STARTED, {});
    timeline.add('sess_x', EVENTS.PRIVACY_ACCEPTED, {});
    const events = timeline.get('sess_x');
    assert.equal(events.length, 2);
    assert.equal(events[0].type, EVENTS.EXAM_STARTED);
    assert.equal(events[1].type, EVENTS.PRIVACY_ACCEPTED);
  });

  test('eventTimeline returns empty array for unknown session', () => {
    const timeline = eventTimeline();
    assert.deepEqual(timeline.get('unknown_session'), []);
  });
});
