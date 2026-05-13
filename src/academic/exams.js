import crypto from "node:crypto";
import { getStore } from "../storage/memoryStore.js";

const store = getStore("exams");

export function createExam({
  title = "Untitled Exam",
  durationMinutes = 120,
  description = "",
} = {}) {
  const exam = {
    id: `exam_${crypto.randomBytes(6).toString("hex")}`,
    title,
    durationMinutes,
    description,
    createdAt: Date.now(),
  };
  store.set(exam.id, exam);
  return exam;
}

export function getExam(examId) {
  return store.get(examId) ?? null;
}

export function listExams() {
  return [...store.values()];
}
