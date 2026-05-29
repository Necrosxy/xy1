const core = require("./practice-core");

function getState(now = new Date()) {
  let state = null;
  try {
    state = wx.getStorageSync(core.STORAGE_KEY);
  } catch (error) {
    state = null;
  }

  if (!state || core.isExpired(state, now)) {
    state = core.createInitialPracticeState(now);
    saveState(state);
  }
  return state;
}

function saveState(state) {
  wx.setStorageSync(core.STORAGE_KEY, state);
  return state;
}

function resetState(now = new Date()) {
  return saveState(core.createInitialPracticeState(now));
}

function recordAnswer(questionId, selected, correct, now = new Date()) {
  return saveState(core.markAnswer(getState(now), questionId, selected, correct, now));
}

function toggleFavorite(questionId) {
  return saveState(core.toggleFavorite(getState(), questionId));
}

function setLastPractice(lastPractice) {
  return saveState({
    ...getState(),
    lastPractice
  });
}

module.exports = {
  getState,
  recordAnswer,
  resetState,
  setLastPractice,
  toggleFavorite
};
