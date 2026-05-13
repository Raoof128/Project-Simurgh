import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTelemetry } from '../../src/privacy/normaliseTelemetry.js';

describe('normaliseTelemetry', () => {
  test('passes through allowed metadata fields', () => {
    const input = {
      keystrokes: 42,
      chars_typed: 100,
      effective_wpm: 80,
      focus_losses: 1,
      time_off_window_ms: 2000,
      pastes: 1,
      paste_payload_chars: 50,
      max_idle_gap_ms: 3000,
      window_seconds: 5,
    };
    const result = normaliseTelemetry(input);
    assert.equal(result.keystrokes, 42);
    assert.equal(result.paste_payload_chars, 50);
    assert.equal(result.focus_losses, 1);
  });

  test('strips any content fields that should never be collected', () => {
    const input = {
      keystrokes: 10,
      paste_content: 'secret text',
      typed_content: 'answer here',
      screen_data: 'base64stuff',
    };
    const result = normaliseTelemetry(input);
    assert.equal(result.paste_content, undefined);
    assert.equal(result.typed_content, undefined);
    assert.equal(result.screen_data, undefined);
    assert.equal(result.keystrokes, 10);
  });

  test('adds privacy_mode annotation', () => {
    const result = normaliseTelemetry({ keystrokes: 5 });
    assert.equal(result._privacy_mode, 'metadata_only');
  });

  test('caps key_intervals array to maxKeyIntervalsStored', () => {
    const intervals = Array.from({ length: 500 }, (_, i) => i);
    const result = normaliseTelemetry({ keystrokes: 5, key_intervals: intervals });
    assert.ok(result.key_intervals.length <= 200);
  });

  test('returns null for null input', () => {
    assert.equal(normaliseTelemetry(null), null);
  });
});
