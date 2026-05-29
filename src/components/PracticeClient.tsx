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
  RotateCcw,
  Star
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { findQuestion, questionsForScope, shuffleQuestions, type PracticeScope } from "@/data/questions";
import { buildAnswerCardItems, formatAnswer, gradeQuestion, questionTypeLabel } from "@/lib/question-utils";
import { usePracticeState } from "@/lib/use-practice-state";
import type { AnswerValue, Question } from "@/lib/types";

type PracticeMode = "ordered" | "random";

interface PracticeClientProps {
  scope: PracticeScope;
  mode: PracticeMode;
  mistakesOnly?: boolean;
}

export function PracticeClient({ scope, mode, mistakesOnly = false }: PracticeClientProps) {
  const { state, recordAnswer, rememberPractice, toggleQuestionFavorite } = usePracticeState();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerValue[]>([]);
  const [submitted, setSubmitted] = useState<{ correct: boolean } | null>(null);
  const [randomSeed, setRandomSeed] = useState(0);
  const [mistakeSessionIds, setMistakeSessionIds] = useState<string[] | null>(null);
  const [answerCardOpen, setAnswerCardOpen] = useState(false);
  const currentCardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (mistakesOnly && state && mistakeSessionIds === null) {
      setMistakeSessionIds(state.mistakes);
    }
  }, [mistakeSessionIds, mistakesOnly, state]);

  const questions = useMemo(() => {
    if (mistakesOnly) {
      const mistakeQuestions = mistakeSessionIds?.map(findQuestion).filter(Boolean) as Question[] | undefined;
      return mistakeQuestions ?? [];
    }
    const base = questionsForScope(scope);
    return mode === "random" ? shuffleQuestions(base) : base;
  }, [mistakeSessionIds, mistakesOnly, mode, randomSeed, scope]);

  useEffect(() => {
    setIndex(0);
    setSelected([]);
    setSubmitted(null);
  }, [mistakesOnly, scope, mode, randomSeed]);

  const question = questions[index];
  const total = questions.length;
  const favorite = question ? Boolean(state?.favorites.includes(question.id)) : false;
  const answerCardItems = useMemo(
    () => buildAnswerCardItems(questions, state?.records ?? {}, index),
    [index, questions, state?.records]
  );

  useEffect(() => {
    if (!answerCardOpen) return;
    const frame = window.requestAnimationFrame(() => {
      currentCardRef.current?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [answerCardOpen, index]);

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
    const correct = gradeQuestion(question, selected);
    recordAnswer(question.id, selected, correct);
    rememberPractice({
      type: mistakesOnly ? "mistakes" : scope,
      mode,
      questionId: question.id
    });
    setSubmitted({ correct });
  }

  function move(nextIndex: number) {
    const nextQuestion = questions[nextIndex];
    const record = nextQuestion ? state?.records[nextQuestion.id] : undefined;
    setIndex(nextIndex);
    setSelected(record?.selected ?? []);
    setSubmitted(record ? { correct: record.correct } : null);
  }

  function jumpToQuestion(nextIndex: number) {
    move(nextIndex);
    setAnswerCardOpen(false);
  }

  if (!state || (mistakesOnly && mistakeSessionIds === null)) {
    return (
      <main className="screen">
        <div className="top-bar">
          <div className="top-bar__title">
            <h1>{mistakesOnly ? "错题复习" : "开始刷题"}</h1>
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
            <h1>{mistakesOnly ? "错题复习" : "开始刷题"}</h1>
            <span>{mistakesOnly ? "暂无错题" : "暂无题目"}</span>
          </div>
          <button className="ghost-button" onClick={() => setRandomSeed((value) => value + 1)} type="button">
            <RotateCcw aria-hidden="true" size={20} />
          </button>
        </div>
        <section className="empty-state">
          <div>
            <BookOpenCheck aria-hidden="true" size={42} color="#1f5be3" />
            <h2>{mistakesOnly ? "错题已清空" : "没有可练习题目"}</h2>
            <p>{mistakesOnly ? "答错的题会自动出现在这里。" : "可以从首页重新选择题型。"}</p>
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
          <h1>{mistakesOnly ? "错题复习" : questionTypeLabel(scope)}</h1>
          <span>
            {index + 1} / {total} · {mode === "random" ? "随机" : "顺序"}
          </span>
        </div>
        <div className="top-bar__actions">
          <button className="answer-card-trigger" onClick={() => setAnswerCardOpen(true)} type="button">
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
          <span className="pill">第 {question.sourcePage} 页</span>
        </div>
        <p className="question-stem">{question.stem}</p>

        <div className="answer-list">
          {answerOptions(question).map((option) => {
            const isSelected = selected.includes(option.key);
            const isCorrect = submitted && question.answer.includes(option.key);
            const isWrong = submitted && isSelected && !question.answer.includes(option.key);
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
            {submitted.correct ? "回答正确" : `回答错误，正确答案：${formatAnswer(question.answer)}`}
          </div>
        ) : null}

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
                  当前 {index + 1} / {total}，点题号跳转
                </span>
              </div>
              <button className="ghost-button" onClick={() => setAnswerCardOpen(false)} type="button" aria-label="关闭">
                <X aria-hidden="true" size={20} />
              </button>
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
              {answerCardItems.map((item) => (
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
    </main>
  );
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
