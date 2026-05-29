const bank = require("../../data/question-bank");
const store = require("../../utils/storage");
const core = require("../../utils/practice-core");

const typeCards = [
  { scope: "mixed", label: "全部题目", count: bank.total, icon: "□", iconClass: "icon-blue" },
  { scope: "judge", label: "判断题", count: bank.counts.judge, icon: "✓", iconClass: "icon-green" },
  { scope: "single", label: "单选题", count: bank.counts.single, icon: "○", iconClass: "icon-purple" },
  { scope: "multiple", label: "多选题", count: bank.counts.multiple, icon: "◎", iconClass: "icon-amber" }
];

Page({
  data: {
    typeCards,
    selectedType: "mixed",
    mode: "ordered",
    todayStats: { answered: 0, correct: 0, mistakes: 0, accuracy: 0 },
    totalStats: { answered: 0, correct: 0, mistakes: 0, accuracy: 0 },
    accuracyText: "--",
    mistakeCount: 0
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    const state = store.getState();
    const today = new Date().toDateString();
    const todayRecords = {};
    Object.keys(state.records).forEach((id) => {
      if (new Date(state.records[id].answeredAt).toDateString() === today) {
        todayRecords[id] = state.records[id];
      }
    });
    const totalStats = core.summarizeRecords(state.records);
    this.setData({
      todayStats: core.summarizeRecords(todayRecords),
      totalStats,
      accuracyText: totalStats.answered === 0 ? "--" : `${totalStats.accuracy}%`,
      mistakeCount: state.mistakes.length
    });
  },

  selectType(event) {
    this.setData({ selectedType: event.currentTarget.dataset.scope });
  },

  selectMode(event) {
    this.setData({ mode: event.currentTarget.dataset.mode });
  },

  startPractice() {
    wx.navigateTo({
      url: `/pages/practice/practice?type=${this.data.selectedType}&mode=${this.data.mode}`
    });
  },

  goMistakes() {
    wx.navigateTo({ url: "/pages/mistakes/mistakes" });
  },

  goStats() {
    wx.navigateTo({ url: "/pages/stats/stats" });
  }
});
