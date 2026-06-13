// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

export const STATES = {
  CREATED: "created",
  JOINED: "joined",
  PRIVACY_ACCEPTED: "privacy_accepted",
  HELPER_CONNECTED: "helper_connected",
  EXAM_STARTED: "exam_started",
  ACTIVE: "active",
  SUBMITTED: "submitted",
  REPORT_GENERATED: "report_generated",
  CLOSED: "closed",
};

// Allowed forward transitions
const TRANSITIONS = {
  [STATES.CREATED]: [STATES.JOINED],
  [STATES.JOINED]: [STATES.PRIVACY_ACCEPTED],
  [STATES.PRIVACY_ACCEPTED]: [STATES.HELPER_CONNECTED, STATES.EXAM_STARTED],
  [STATES.HELPER_CONNECTED]: [STATES.EXAM_STARTED],
  [STATES.EXAM_STARTED]: [STATES.ACTIVE],
  [STATES.ACTIVE]: [STATES.SUBMITTED],
  [STATES.SUBMITTED]: [STATES.REPORT_GENERATED],
  [STATES.REPORT_GENERATED]: [STATES.CLOSED],
  [STATES.CLOSED]: [],
};

export function canTransition(currentState, nextState) {
  return (TRANSITIONS[currentState] ?? []).includes(nextState);
}

export function createSessionRecord(examId, studentIdHash) {
  return {
    id: `sess_${crypto.randomBytes(6).toString("hex")}`,
    examId,
    studentIdHash,
    state: STATES.CREATED,
    createdAt: Date.now(),
    startedAt: null,
    submittedAt: null,
    reconnects: 0,
  };
}

export function transitionState(record, nextState) {
  if (!canTransition(record.state, nextState)) {
    throw new Error(`Invalid transition: ${record.state} → ${nextState}`);
  }
  return { ...record, state: nextState };
}
