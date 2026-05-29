const STORAGE_KEY = "omnimedia-practice:v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LETTER_ORDER = ["A", "B", "C", "D", "E"];

function createInitialPracticeState(now = new Date()) {
  return {
    version: 1,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString(),
    records: {},
    mistakes: [],
    favorites: [],
    lastPractice: null
  };
}

function normalizeAnswer(answer) {
  if (!Array.isArray(answer)) {
    const value = String(answer).trim();
    if (value === "√" || value === "正确" || value.toLowerCase() === "true") return ["true"];
    if (value === "×" || value === "错误" || value.toLowerCase() === "false") return ["false"];
    return normalizeLetters(value.toUpperCase().split(""));
  }
  return normalizeLetters(answer);
}

function gradeQuestion(question, selected) {
  const expected = normalizeAnswer(question.answer);
  const actual = normalizeAnswer(selected);
  return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
}

function markAnswer(state, questionId, selected, correct, now = new Date()) {
  const previous = state.records[questionId];
  const mistakes = correct
    ? state.mistakes.filter((id) => id !== questionId)
    : Array.from(new Set(state.mistakes.concat(questionId)));

  return {
    ...state,
    records: {
      ...state.records,
      [questionId]: {
        questionId,
        selected,
        correct,
        answeredAt: now.toISOString(),
        attempts: previous ? previous.attempts + 1 : 1
      }
    },
    mistakes
  };
}

function toggleFavorite(state, questionId) {
  const exists = state.favorites.includes(questionId);
  return {
    ...state,
    favorites: exists ? state.favorites.filter((id) => id !== questionId) : state.favorites.concat(questionId)
  };
}

function summarizeRecords(records) {
  const values = Object.values(records || {});
  const answered = values.length;
  const correct = values.filter((record) => record.correct).length;
  const mistakes = answered - correct;
  return {
    answered,
    correct,
    mistakes,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100)
  };
}

function isExpired(state, now = new Date()) {
  return !state || !state.expiresAt || new Date(state.expiresAt).getTime() <= now.getTime();
}

function normalizeLetters(answer) {
  const unique = new Set();
  for (const item of answer) {
    const value = String(item).trim().toUpperCase();
    if (value === "TRUE" || value === "FALSE") {
      unique.add(value.toLowerCase());
      continue;
    }
    if (LETTER_ORDER.includes(value)) unique.add(value);
  }

  if (unique.has("true") || unique.has("false")) {
    return Array.from(unique).filter((item) => item === "true" || item === "false");
  }
  return LETTER_ORDER.filter((item) => unique.has(item));
}

module.exports = {
  STORAGE_KEY,
  createInitialPracticeState,
  gradeQuestion,
  isExpired,
  markAnswer,
  normalizeAnswer,
  summarizeRecords,
  toggleFavorite
};
