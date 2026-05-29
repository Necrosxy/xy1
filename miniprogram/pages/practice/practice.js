const bank = require("../../data/question-bank");
const core = require("../../utils/practice-core");
const store = require("../../utils/storage");

const typeLabels = {
  mixed: "混合练习",
  judge: "判断题",
  single: "单选题",
  multiple: "多选题",
  mistakes: "错题复习"
};

Page({
  data: {
    pageTitle: "混合练习",
    positionText: "0 / 0",
    index: 0,
    total: 0,
    question: null,
    options: [],
    selected: [],
    submitted: false,
    correct: false,
    answerText: "",
    favorite: false,
    empty: false,
    emptyTitle: "暂无题目",
    emptyText: "可以从首页重新选择题型。",
    questionTypeText: "题目"
  },

  onLoad(query) {
    this.scope = query.type || "mixed";
    this.mode = query.mode === "random" ? "random" : "ordered";
    this.mistakesOnly = query.mistakes === "1";
    this.questions = [];
    this.loadQuestions();
  },

  loadQuestions() {
    const state = store.getState();
    if (this.mistakesOnly) {
      this.scope = "mistakes";
      const ids = state.mistakes.slice();
      this.questions = ids.map((id) => bank.questions.find((question) => question.id === id)).filter(Boolean);
    } else {
      this.questions =
        this.scope === "mixed" ? bank.questions.slice() : bank.questions.filter((question) => question.type === this.scope);
      if (this.mode === "random") {
        this.questions = shuffle(this.questions);
      }
    }

    if (this.questions.length === 0) {
      this.setData({
        empty: true,
        pageTitle: this.mistakesOnly ? "错题复习" : typeLabels[this.scope],
        positionText: "0 / 0",
        emptyTitle: this.mistakesOnly ? "错题已清空" : "暂无题目",
        emptyText: this.mistakesOnly ? "答错的题会自动出现在这里。" : "可以从首页重新选择题型。"
      });
      return;
    }

    this.setQuestion(0);
  },

  setQuestion(index) {
    const question = this.questions[index];
    const state = store.getState();
    this.setData({
      empty: false,
      index,
      total: this.questions.length,
      question,
      selected: [],
      submitted: false,
      correct: false,
      favorite: state.favorites.includes(question.id),
      pageTitle: typeLabels[this.scope] || "开始刷题",
      positionText: `${index + 1} / ${this.questions.length} · ${this.mode === "random" ? "随机" : "顺序"}`,
      questionTypeText: typeLabels[question.type],
      answerText: formatAnswer(question.answer),
      options: buildOptions(question, [], false)
    });
  },

  toggleAnswer(event) {
    if (this.data.submitted) return;
    const key = event.currentTarget.dataset.key;
    const question = this.data.question;
    let selected = this.data.selected.slice();
    if (question.type === "multiple") {
      selected = selected.includes(key) ? selected.filter((item) => item !== key) : selected.concat(key);
    } else {
      selected = [key];
    }
    this.setData({
      selected,
      options: buildOptions(question, selected, false)
    });
  },

  submitAnswer() {
    const question = this.data.question;
    const selected = this.data.selected;
    if (!question || selected.length === 0 || this.data.submitted) return;
    const correct = core.gradeQuestion(question, selected);
    store.recordAnswer(question.id, selected, correct);
    store.setLastPractice({
      type: this.scope,
      mode: this.mode,
      questionId: question.id
    });
    this.setData({
      submitted: true,
      correct,
      favorite: store.getState().favorites.includes(question.id),
      options: buildOptions(question, selected, true)
    });
  },

  previousQuestion() {
    if (this.data.index > 0) this.setQuestion(this.data.index - 1);
  },

  nextQuestion() {
    if (this.data.index < this.data.total - 1) this.setQuestion(this.data.index + 1);
  },

  toggleFavorite() {
    const question = this.data.question;
    if (!question) return;
    const state = store.toggleFavorite(question.id);
    this.setData({ favorite: state.favorites.includes(question.id) });
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: "/pages/index/index" })
    });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/index/index" });
  },

  goMistakes() {
    wx.redirectTo({ url: "/pages/mistakes/mistakes" });
  },

  goStats() {
    wx.redirectTo({ url: "/pages/stats/stats" });
  }
});

function buildOptions(question, selected, submitted) {
  const options =
    question.type === "judge"
      ? [
          { key: "true", label: "√", text: "正确" },
          { key: "false", label: "×", text: "错误" }
        ]
      : question.options.map((option) => ({
          key: option.key,
          label: option.key,
          text: option.text
        }));

  return options.map((option) => ({
    ...option,
    selected: selected.includes(option.key),
    correct: submitted && question.answer.includes(option.key),
    wrong: submitted && selected.includes(option.key) && !question.answer.includes(option.key)
  }));
}

function formatAnswer(answer) {
  return core
    .normalizeAnswer(answer)
    .map((item) => {
      if (item === "true") return "正确";
      if (item === "false") return "错误";
      return item;
    })
    .join("");
}

function shuffle(questions) {
  const copy = questions.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}
