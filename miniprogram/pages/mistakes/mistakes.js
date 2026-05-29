const bank = require("../../data/question-bank");
const store = require("../../utils/storage");

const typeLabels = {
  judge: "判断题",
  single: "单选题",
  multiple: "多选题"
};

Page({
  data: {
    mistakeCount: 0,
    mistakes: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const state = store.getState();
    const mistakes = state.mistakes
      .map((id) => bank.questions.find((question) => question.id === id))
      .filter(Boolean)
      .map((question) => ({
        ...question,
        typeText: typeLabels[question.type]
      }));

    this.setData({
      mistakeCount: mistakes.length,
      mistakes
    });
  },

  startMistakes() {
    wx.navigateTo({ url: "/pages/practice/practice?mistakes=1" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/index/index" });
  },

  goPractice() {
    wx.redirectTo({ url: "/pages/practice/practice?type=mixed&mode=ordered" });
  },

  goStats() {
    wx.redirectTo({ url: "/pages/stats/stats" });
  }
});
