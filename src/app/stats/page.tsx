"use client";

import Link from "next/link";
import { CalendarClock, ChevronLeft, CircleCheck, RotateCcw, XCircle } from "lucide-react";
import { useMemo } from "react";

import { questionBank } from "@/data/questions";
import { questionTypeLabel, summarizeRecords } from "@/lib/question-utils";
import { usePracticeState } from "@/lib/use-practice-state";
import type { QuestionType } from "@/lib/types";

const typeOrder: QuestionType[] = ["judge", "single", "multiple"];

export default function StatsPage() {
  const { state, reset } = usePracticeState();
  const summary = useMemo(() => summarizeRecords(state?.records ?? {}), [state?.records]);

  const expiresAt = state ? new Date(state.expiresAt).toLocaleDateString("zh-CN") : "--";

  function clearRecords() {
    if (window.confirm("确认清空本机练习记录？")) {
      reset();
    }
  }

  return (
    <main className="screen">
      <div className="top-bar">
        <Link className="ghost-button" href="/" aria-label="返回首页">
          <ChevronLeft aria-hidden="true" size={22} />
        </Link>
        <div className="top-bar__title">
          <h1>练习统计</h1>
          <span>有效至 {expiresAt}</span>
        </div>
        <button className="ghost-button" onClick={clearRecords} type="button" aria-label="清空记录">
          <RotateCcw aria-hidden="true" size={20} />
        </button>
      </div>

      <section className="metric-grid">
        <div className="metric-card">
          <span className="metric-card__label">累计答题</span>
          <span className="metric-card__value">{summary.answered}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">正确率</span>
          <span className="metric-card__value">{summary.answered === 0 ? "--" : `${summary.accuracy}%`}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">答对题数</span>
          <span className="metric-card__value">{summary.correct}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">错题数</span>
          <span className="metric-card__value">{state?.mistakes.length ?? 0}</span>
        </div>
      </section>

      <h2 className="section-title">题型进度</h2>
      <div className="answer-list">
        {typeOrder.map((type) => {
          const answered = Object.values(state?.records ?? {}).filter((record) => record.questionId.startsWith(type));
          const correct = answered.filter((record) => record.correct).length;
          const count = questionBank.counts[type];
          return (
            <div className="quick-card" key={type}>
              <span className="quick-card__left">
                <span className={`quick-card__icon ${iconClass(type)}`}>
                  {type === "judge" ? (
                    <CircleCheck aria-hidden="true" size={22} />
                  ) : type === "single" ? (
                    <CalendarClock aria-hidden="true" size={22} />
                  ) : (
                    <XCircle aria-hidden="true" size={22} />
                  )}
                </span>
                <span>
                  <span className="quick-card__title">{questionTypeLabel(type)}</span>
                  <span className="quick-card__meta">
                    {answered.length} / {count} · 答对 {correct}
                  </span>
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <button className="primary-button" onClick={clearRecords} type="button">
        <RotateCcw aria-hidden="true" size={22} />
        清空本机记录
      </button>
    </main>
  );
}

function iconClass(type: QuestionType): string {
  if (type === "judge") return "icon-green";
  if (type === "single") return "icon-purple";
  return "icon-amber";
}
