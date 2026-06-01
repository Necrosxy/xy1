"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  ListChecks,
  PencilLine,
  RotateCcw,
  Star
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { findQuestion, questionsForScope, shuffleQuestions, type PracticeScope } from "@/data/questions";
import {
  buildAnswerCardItems,
  buildAnswerCardRanges,
  correctionActionLabel,
  findInitialPracticeIndex,
  formatAnswer,
  getPracticeAnswerRecord,
  gradeQuestion,
  normalizeAnswer,
  questionTypeLabel
} from "@/lib/question-utils";
import { usePracticeState } from "@/lib/use-practice-state";
import type { AnswerRecord, AnswerValue, Question } from "@/lib/types";

type PracticeMode = "ordered" | "random";
const ANSWER_CARD_PAGE_SIZE = 50;

interface PracticeClientProps {
  scope: PracticeScope;
  mode: PracticeMode;
  mistakesOnly?: boolean;
  favoritesOnly?: boolean;
}

export function PracticeClient({ scope, mode, mistakesOnly = false, favoritesOnly = false }: PracticeClientProps) {
  const {
    state,
    correctQuestionAnswer,
    recordAnswer,
    rememberPractice,
    restoreQuestionAnswer,
    toggleQuestionFavorite
  } = usePracticeState();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerValue[]>([]);
  const [submitted, setSubmitted] = useState<{ correct: boolean } | null>(null);
  const [randomSeed, setRandomSeed] = useState(0);
  const [reviewSessionIds, setReviewSessionIds] = useState<string[] | null>(null);
  const [reviewSessionRecords, setReviewSessionRecords] = useState<Record<string, AnswerRecord>>({});
  const [answerCardOpen, setAnswerCardOpen] = useState(false);
  const [answerCardRangeIndex, setAnswerCardRangeIndex] = useState(0);
  const [answerCardJumpValue, setAnswerCardJumpValue] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionSelected, setCorrectionSelected] = useState<AnswerValue[]>([]);
  const currentCardRef = useRef<HTMLButtonElement | null>(null);
  const initializedPracticeKeyRef = useRef<string | null>(null);
  const reviewMode = mistakesOnly || favoritesOnly;
  const practiceType = favoritesOnly ? "favorites" : mistakesOnly ? "mistakes" : scope;
  const reviewTitle = favoritesOnly ? "收藏复习" : mistakesOnly ? "错题复习" : "开始刷题";
  const emptyTitle = favoritesOnly ? "暂无收藏题" : mistakesOnly ? "暂无错题" : "暂无题目";
  const practiceKey = `${practiceType}:${mode}:${reviewMode ? reviewSessionIds?.join("|") ?? "loading" : "standard"}:${randomSeed}`;

  useEffect(() => {
    if (reviewMode && state && reviewSessionIds === null) {
      setReviewSessionIds(favoritesOnly ? state.favorites : state.mistakes);
    }
  }, [favoritesOnly, reviewMode, reviewSessionIds, state]);

  const questions = useMemo(() => {
    if (reviewMode) {
      const reviewQuestions = reviewSessionIds?.map(findQuestion).filter(Boolean) as Question[] | undefined;
      return reviewQuestions ?? [];
    }
    const base = questionsForScope(scope);
    return mode === "random" ? shuffleQuestions(base) : base;
  }, [mode, randomSeed, reviewMode, reviewSessionIds, scope]);

  useEffect(() => {
    setIndex(0);
    setSelected([]);
    setSubmitted(null);
    setReviewSessionRecords({});
    setCorrectionOpen(false);
  }, [favoritesOnly, mistakesOnly, scope, mode, randomSeed]);

  const question = questions[index];
  const total = questions.length;
  const favorite = question ? Boolean(state?.favorites.includes(question.id)) : false;
  const correctedAnswer = question ? state?.answerCorrections[question.id] : undefined;
  const effectiveAnswer = correctedAnswer ?? question?.answer ?? [];
  const hasCorrection = Boolean(correctedAnswer);
  const answerCardRecords = reviewMode ? reviewSessionRecords : (state?.records ?? {});
  const answerCardItems = useMemo(
    () => buildAnswerCardItems(questions, answerCardRecords, index),
    [answerCardRecords, index, questions]
  );
  const answerCardRanges = useMemo(
    () => buildAnswerCardRanges(total, answerCardRangeIndex, ANSWER_CARD_PAGE_SIZE),
    [answerCardRangeIndex, total]
  );
  const activeAnswerCardRange = answerCardRanges.find((range) => range.active) ?? answerCardRanges[0];
  const visibleAnswerCardItems = activeAnswerCardRange
    ? answerCardItems.slice(activeAnswerCardRange.startIndex, activeAnswerCardRange.endIndex + 1)
    : [];

  useEffect(() => {
    if (!answerCardOpen) return;
    const frame = window.requestAnimationFrame(() => {
      currentCardRef.current?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [answerCardOpen, index]);

  useEffect(() => {
    if (!state || questions.length === 0 || (reviewMode && reviewSessionIds === null)) return;
    if (initializedPracticeKeyRef.current === practiceKey) return;

    const initialIndex = findInitialPracticeIndex(questions, state.lastPractice, practiceType, mode);
    const initialQuestion = showQuestion(initialIndex);
    initializedPracticeKeyRef.current = practiceKey;
    if (initialQuestion) {
      rememberPractice({
        type: practiceType,
        mode,
        questionId: initialQuestion.id
      });
    }
  }, [mode, practiceKey, practiceType, questions, rememberPractice, reviewMode, reviewSessionIds, state]);

  function openAnswerCard() {
    setAnswerCardRangeIndex(rangeStartForQuestion(index));
    setAnswerCardJumpValue(String(index + 1));
    setAnswerCardOpen(true);
  }

  function toggleAnswer(value: AnswerValue) {
    if (submitted) return;
    if (!question) return;

    if (question.type === "multiple") {
      setSelected((current) =>
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      );
      return;
    }

    setSelected([value]);
  }

  function submitAnswer() {
    if (!question || selected.length === 0) return;
    const correct = gradeQuestion(question, selected, correctedAnswer);
    recordAnswer(question.id, selected, correct);
    if (reviewMode) {
      recordReviewSessionAnswer(question.id, selected, correct);
    }
    rememberPractice({
      type: practiceType,
      mode,
      questionId: question.id
    });
    setSubmitted({ correct });
  }

  function showQuestion(nextIndex: number): Question | undefined {
    const nextQuestion = questions[nextIndex];
    const record = getPracticeAnswerRecord(
      nextQuestion?.id,
      state?.records ?? {},
      reviewSessionRecords,
      practiceType
    );
    setIndex(nextIndex);
    setSelected(record?.selected ?? []);
    setSubmitted(record ? { correct: record.correct } : null);
    setCorrectionOpen(false);
    return nextQuestion;
  }

  function move(nextIndex: number) {
    const nextQuestion = showQuestion(nextIndex);
    if (nextQuestion) {
      rememberPractice({
        type: practiceType,
        mode,
        questionId: nextQuestion.id
      });
    }
  }

  function jumpToQuestion(nextIndex: number) {
    move(nextIndex);
    setAnswerCardOpen(false);
  }

  function jumpFromAnswerCard() {
    const parsed = Number.parseInt(answerCardJumpValue, 10);
    if (Number.isNaN(parsed) || total <= 0) return;

    const nextIndex = Math.min(Math.max(parsed - 1, 0), total - 1);
    jumpToQuestion(nextIndex);
  }

  function openCorrection() {
    if (!question) return;
    setCorrectionSelected(effectiveAnswer);
    setCorrectionOpen(true);
  }

  function toggleCorrectionAnswer(value: AnswerValue) {
    if (!question) return;
    if (question.type === "multiple") {
      setCorrectionSelected((current) =>
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      );
      return;
    }

    setCorrectionSelected([value]);
  }

  function saveCorrection() {
    if (!question || correctionSelected.length === 0) return;
    const normalized = normalizeAnswer(correctionSelected);
    correctQuestionAnswer(question.id, normalized);
    if (submitted && selected.length > 0) {
      const correct = gradeQuestion(question, selected, normalized);
      setSubmitted({ correct });
      updateReviewSessionAnswerCorrectness(question.id, correct);
    }
    setCorrectionOpen(false);
  }

  function restoreOriginalAnswer() {
    if (!question) return;
    restoreQuestionAnswer(question.id, question.answer);
    if (submitted && selected.length > 0) {
      const correct = gradeQuestion(question, selected);
      setSubmitted({ correct });
      updateReviewSessionAnswerCorrectness(question.id, correct);
    }
    setCorrectionOpen(false);
  }

  function recordReviewSessionAnswer(questionId: string, values: AnswerValue[], correct: boolean) {
    setReviewSessionRecords((current) => {
      const previous = current[questionId];
      return {
        ...current,
        [questionId]: {
          questionId,
          selected: [...values],
          correct,
          answeredAt: new Date().toISOString(),
          attempts: (previous?.attempts ?? 0) + 1
        }
      };
    });
  }

  function updateReviewSessionAnswerCorrectness(questionId: string, correct: boolean) {
    if (!reviewMode) return;
    setReviewSessionRecords((current) => {
      const record = current[questionId];
      if (!record) return current;
      return {
        ...current,
        [questionId]: {
          ...record,
          correct
        }
      };
    });
  }

  if (!state || (reviewMode && reviewSessionIds === null)) {
    return (
      <main className="screen">
        <div className="top-bar">
          <div className="top-bar__title">
            <h1>{reviewTitle}</h1>
            <span>加载中</span>
          </div>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="screen">
        <div className="top-bar">
          <Link className="ghost-button" href="/" aria-label="返回首页">
            <Home aria-hidden="true" size={20} />
          </Link>
          <div className="top-bar__title">
            <h1>{reviewTitle}</h1>
            <span>{emptyTitle}</span>
          </div>
          <button className="ghost-button" onClick={() => setRandomSeed((value) => value + 1)} type="button">
            <RotateCcw aria-hidden="true" size={20} />
          </button>
        </div>
        <section className="empty-state">
          <div>
            <BookOpenCheck aria-hidden="true" size={42} color="#1f5be3" />
            <h2>{favoritesOnly ? "还没有收藏题" : mistakesOnly ? "错题已清空" : "没有可练习题目"}</h2>
            <p>
              {favoritesOnly
                ? "刷题时点右上角星标，题目会出现在这里。"
                : mistakesOnly
                  ? "答错的题会自动出现在这里。"
                  : "可以从首页重新选择题型。"}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="top-bar">
        <Link className="ghost-button" href="/" aria-label="返回首页">
          <ChevronLeft aria-hidden="true" size={22} />
        </Link>
        <div className="top-bar__title">
          <h1>{favoritesOnly ? "收藏复习" : mistakesOnly ? "错题复习" : questionTypeLabel(scope)}</h1>
          <span>
            {index + 1} / {total} · {mode === "random" ? "随机" : "顺序"}
          </span>
        </div>
        <div className="top-bar__actions">
          <button className="answer-card-trigger" onClick={openAnswerCard} type="button">
            <ListChecks aria-hidden="true" size={18} />
            题卡
          </button>
          <button
            className={`ghost-button ${favorite ? "is-active" : ""}`}
            onClick={() => toggleQuestionFavorite(question.id)}
            type="button"
            aria-label="收藏"
          >
            <Star aria-hidden="true" fill={favorite ? "currentColor" : "none"} size={21} />
          </button>
        </div>
      </div>

      <section className="question-card">
        <div className="question-meta">
          <span className="pill">
            {questionTypeLabel(question.type)} {question.number}
          </span>
          <span className="question-meta__right">
            {hasCorrection ? <span className="pill pill-corrected">已纠正</span> : null}
            <span className="pill">第 {question.sourcePage} 页</span>
          </span>
        </div>
        <p className="question-stem">{question.stem}</p>

        <div className="answer-list">
          {answerOptions(question).map((option) => {
            const isSelected = selected.includes(option.key);
            const isCorrect = submitted && effectiveAnswer.includes(option.key);
            const isWrong = submitted && isSelected && !effectiveAnswer.includes(option.key);
            return (
              <button
                className={`answer-option ${isSelected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${
                  isWrong ? "is-wrong" : ""
                }`}
                key={option.key}
                onClick={() => toggleAnswer(option.key)}
                type="button"
              >
                <span className="answer-option__key">{option.label}</span>
                <span className="answer-option__text">{option.text}</span>
              </button>
            );
          })}
        </div>

        {submitted ? (
          <div className={`result-box ${submitted.correct ? "is-correct" : "is-wrong"}`}>
            <span>{submitted.correct ? "回答正确" : `回答错误，正确答案：${formatAnswer(effectiveAnswer)}`}</span>
            {hasCorrection ? <small>当前使用你纠正后的答案</small> : null}
          </div>
        ) : null}

        <button className="correction-button" onClick={openCorrection} type="button">
          <PencilLine aria-hidden="true" size={18} />
          {correctionActionLabel(hasCorrection)}
        </button>

        <button className="primary-button" disabled={selected.length === 0 || Boolean(submitted)} onClick={submitAnswer}>
          <CheckCircle2 aria-hidden="true" size={22} />
          提交答案
        </button>

        <div className="action-row">
          <button className="secondary-button" disabled={index === 0} onClick={() => move(index - 1)} type="button">
            上一题
          </button>
          <button
            className="secondary-button"
            disabled={index >= total - 1}
            onClick={() => move(index + 1)}
            type="button"
          >
            下一题
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>

      {answerCardOpen ? (
        <div className="answer-card-overlay" role="dialog" aria-modal="true" aria-label="答题卡">
          <button
            aria-label="关闭答题卡"
            className="answer-card-backdrop"
            onClick={() => setAnswerCardOpen(false)}
            type="button"
          />
          <section className="answer-card-sheet">
            <div className="answer-card-panel__header">
              <div>
                <h2>答题卡</h2>
                <span>
                  当前 {index + 1} / {total}，每页 {ANSWER_CARD_PAGE_SIZE} 题
                </span>
              </div>
              <button className="ghost-button" onClick={() => setAnswerCardOpen(false)} type="button" aria-label="关闭">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <form
              className="answer-card-jump"
              onSubmit={(event) => {
                event.preventDefault();
                jumpFromAnswerCard();
              }}
            >
              <label htmlFor="answer-card-jump-input">跳到</label>
              <input
                id="answer-card-jump-input"
                inputMode="numeric"
                max={total}
                min={1}
                onChange={(event) => setAnswerCardJumpValue(event.target.value)}
                pattern="[0-9]*"
                type="number"
                value={answerCardJumpValue}
              />
              <span>/ {total}</span>
              <button className="answer-card-jump__button" type="submit">
                前往
              </button>
            </form>
            <div className="answer-card-ranges" aria-label="题号范围">
              {answerCardRanges.map((range) => (
                <button
                  className={`answer-card-range ${range.active ? "is-active" : ""}`}
                  key={range.label}
                  onClick={() => setAnswerCardRangeIndex(range.startIndex)}
                  type="button"
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="answer-card-legend" aria-hidden="true">
              <span>
                <i className="legend-dot is-current" />
                当前
              </span>
              <span>
                <i className="legend-dot is-correct" />
                答对
              </span>
              <span>
                <i className="legend-dot is-wrong" />
                答错
              </span>
              <span>
                <i className="legend-dot" />
                未答
              </span>
            </div>
            <div className="answer-card-grid" aria-label="答题卡">
              {visibleAnswerCardItems.map((item) => (
                <button
                  aria-label={`跳转到第 ${item.index + 1} 题`}
                  className={`answer-card-cell is-${item.status} ${item.current ? "is-current" : ""}`}
                  key={item.questionId}
                  onClick={() => jumpToQuestion(item.index)}
                  ref={item.current ? (node) => void (currentCardRef.current = node) : undefined}
                  type="button"
                >
                  {item.number}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {correctionOpen ? (
        <div className="answer-card-overlay" role="dialog" aria-modal="true" aria-label="纠正答案">
          <button
            aria-label="关闭纠正答案"
            className="answer-card-backdrop"
            onClick={() => setCorrectionOpen(false)}
            type="button"
          />
          <section className="answer-card-sheet correction-sheet">
            <div className="answer-card-panel__header">
              <div>
                <h2>纠正答案</h2>
                <span>保存后，本题会按你的答案判题</span>
              </div>
              <button className="ghost-button" onClick={() => setCorrectionOpen(false)} type="button" aria-label="关闭">
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="correction-options">
              {answerOptions(question).map((option) => {
                const active = correctionSelected.includes(option.key);
                return (
                  <button
                    className={`answer-option correction-option ${active ? "is-selected" : ""}`}
                    key={option.key}
                    onClick={() => toggleCorrectionAnswer(option.key)}
                    type="button"
                  >
                    <span className="answer-option__key">{option.label}</span>
                    <span className="answer-option__text">{option.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="correction-actions">
              {hasCorrection ? (
                <button className="secondary-button" onClick={restoreOriginalAnswer} type="button">
                  恢复题库答案
                </button>
              ) : null}
              <button
                className="primary-button"
                disabled={correctionSelected.length === 0}
                onClick={saveCorrection}
                type="button"
              >
                <CheckCircle2 aria-hidden="true" size={20} />
                保存纠正
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function rangeStartForQuestion(index: number): number {
  return Math.floor(Math.max(index, 0) / ANSWER_CARD_PAGE_SIZE) * ANSWER_CARD_PAGE_SIZE;
}

function answerOptions(question: Question): Array<{ key: AnswerValue; label: string; text: string }> {
  if (question.type === "judge") {
    return [
      { key: "true", label: "√", text: "正确" },
      { key: "false", label: "×", text: "错误" }
    ];
  }

  return question.options.map((option) => ({
    key: option.key,
    label: option.key,
    text: option.text
  }));
}
