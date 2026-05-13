import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createReplayGuard } from '../../src/security/replayGuard.js';

describe('replayGuard', () => {
  test('accepts a fresh first telemetry window', () => {
    const g = createReplayGuard();
    const now = Date.now();
    const r = g.check('sess_a', 1, now, now);
    assert.equal(r.ok, true);
  });

  test('rejects duplicate sequence', () => {
    const g = createReplayGuard();
    const now = Date.now();
    g.check('sess_a', 5, now, now);
    const r = g.check('sess_a', 5, now + 1000, now + 1000);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'sequence_replay_or_rollback');
  });

  test('rejects sequence rollback', () => {
    const g = createReplayGuard();
    const now = Date.now();
    g.check('sess_a', 10, now, now);
    const r = g.check('sess_a', 3, now + 1000, now + 1000);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'sequence_replay_or_rollback');
  });

  test('accepts strictly increasing sequence', () => {
    const g = createReplayGuard();
    const now = Date.now();
    assert.equal(g.check('sess_a', 1, now, now).ok, true);
    assert.equal(g.check('sess_a', 2, now + 5000, now + 5000).ok, true);
    assert.equal(g.check('sess_a', 3, now + 10000, now + 10000).ok, true);
  });

  test('rejects timestamps too far in the future', () => {
    const g = createReplayGuard({ futureMs: 5000 });
    const now = Date.now();
    const r = g.check('sess_a', 1, now + 60_000, now);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'timestamp_in_future');
  });

  test('rejects stale timestamps', () => {
    const g = createReplayGuard({ skewMs: 10_000 });
    const now = Date.now();
    const r = g.check('sess_a', 1, now - 60_000, now);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'timestamp_stale');
  });

  test('rejects invalid sequence types', () => {
    const g = createReplayGuard();
    const now = Date.now();
    assert.equal(g.check('sess_a', -1, now, now).reason, 'invalid_sequence');
    assert.equal(g.check('sess_a', 1.5, now, now).reason, 'invalid_sequence');
    assert.equal(g.check('sess_a', NaN, now, now).reason, 'invalid_sequence');
  });

  test('rejects invalid timestamps', () => {
    const g = createReplayGuard();
    assert.equal(g.check('sess_a', 1, 'not-a-number', Date.now()).reason, 'invalid_timestamp');
    assert.equal(g.check('sess_a', 1, NaN, Date.now()).reason, 'invalid_timestamp');
    assert.equal(g.check('sess_a', 1, Infinity, Date.now()).reason, 'invalid_timestamp');
  });

  test('isolates sequences between sessions', () => {
    const g = createReplayGuard();
    const now = Date.now();
    g.check('sess_a', 10, now, now);
    const r = g.check('sess_b', 1, now, now);
    assert.equal(r.ok, true);
  });

  test('reset clears a session', () => {
    const g = createReplayGuard();
    const now = Date.now();
    g.check('sess_a', 10, now, now);
    g.reset('sess_a');
    const r = g.check('sess_a', 1, now + 1000, now + 1000);
    assert.equal(r.ok, true);
  });
});
