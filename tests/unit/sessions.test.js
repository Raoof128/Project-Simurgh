// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createExam, getExam, listExams } from "../../src/academic/exams.js";
import {
  STATES,
  createSessionRecord,
  transitionState,
  canTransition,
} from "../../src/academic/sessions.js";

describe("exams", () => {
  test("createExam returns an exam with id, title, and created state", () => {
    const exam = createExam({ title: "COMP3130 Final", durationMinutes: 120 });
    assert.ok(exam.id.startsWith("exam_"));
    assert.equal(exam.title, "COMP3130 Final");
    assert.equal(exam.durationMinutes, 120);
    assert.ok(typeof exam.createdAt === "number");
  });

  test("getExam retrieves a created exam", () => {
    const exam = createExam({ title: "Test Exam" });
    const retrieved = getExam(exam.id);
    assert.equal(retrieved.id, exam.id);
  });

  test("listExams returns all created exams", () => {
    const before = listExams().length;
    createExam({ title: "Another Exam" });
    assert.equal(listExams().length, before + 1);
  });
});

describe("sessions state machine", () => {
  test("createSessionRecord starts in created state", () => {
    const rec = createSessionRecord("exam_1", "student_hash_abc");
    assert.equal(rec.state, STATES.CREATED);
    assert.equal(rec.examId, "exam_1");
    assert.equal(rec.studentIdHash, "student_hash_abc");
    assert.ok(rec.id.startsWith("sess_"));
  });

  test("canTransition allows created → joined", () => {
    const rec = createSessionRecord("e1", "h1");
    assert.ok(canTransition(rec.state, STATES.JOINED));
  });

  test("transitionState advances state", () => {
    let rec = createSessionRecord("e1", "h1");
    rec = transitionState(rec, STATES.JOINED);
    assert.equal(rec.state, STATES.JOINED);
    rec = transitionState(rec, STATES.PRIVACY_ACCEPTED);
    assert.equal(rec.state, STATES.PRIVACY_ACCEPTED);
  });

  test("transitionState throws on illegal transition", () => {
    const rec = createSessionRecord("e1", "h1");
    assert.throws(() => transitionState(rec, STATES.SUBMITTED), /Invalid transition/);
  });
});
