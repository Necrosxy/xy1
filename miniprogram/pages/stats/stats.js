const bank = require("../../data/question-bank");
const store = require("../../utils/storage");
const core = require("../../utils/practice-core");

const typeRows = [
  { type: "judge", label: "判断题", icon: "✓", iconClass: "icon-green" },
  { type: "single", label: "单选题", icon: "○", iconClass: "icon-purple" },
  { type: "multiple", label: "多选题", icon: "◎", iconClass: "icon-amber" }
];

Page({
  data: {
    summary: { answered: 0, correct: 0, mistakes: 0, accuracy: 0 },
    accuracyText: "--",
    mistakeCount: 0,
    expiresAtText: "--",
    typeProgress: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const state = store.getState();
    const summary = core.summarizeRecords(state.records);
    const typeProgress = typeRows.map((row) => {
      const answered = Object.values(state.records).filter((record) => record.questionId.indexOf(`${row.type}-`) === 0);
      return {
        ...row,
        total: bank.counts[row.type],
        answered: answered.length,
        correct: answered.filter((record) => record.correct).length
      };
    });

    this.setData({
      summary,
      accuracyText: summary.answered === 0 ? "--" : `${summary.accuracy}%`,
      mistakeCount: state.mistakes.length,
      expiresAtText: formatDate(new Date(state.expiresAt)),
      typeProgress
    });
  },

  clearRecords() {
    wx.showModal({
      title: "清空记录",
      content: "确认清空本机练习记录？",
      confirmText: "清空",
      success: (result) => {
        if (result.confirm) {
          store.resetState();
          this.refresh();
        }
      }
    });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/index/index" });
  },

  goPractice() {
    wx.redirectTo({ url: "/pages/practice/practice?type=mixed&mode=ordered" });
  },

  goMistakes() {
    wx.redirectTo({ url: "/pages/mistakes/mistakes" });
  }
});

function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
