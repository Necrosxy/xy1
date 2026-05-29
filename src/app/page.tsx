"use client";

import Link from "next/link";
import { BookOpen, CheckSquare, ChevronRight, Grid2X2, ListOrdered, Radio, Shuffle, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { questionBank } from "@/data/questions";
import { usePracticeState } from "@/lib/use-practice-state";
import { summarizeRecords } from "@/lib/question-utils";
import type { PracticeScope } from "@/data/questions";

type PracticeMode = "ordered" | "random";

const typeCards: Array<{
  scope: PracticeScope;
  label: string;
  count: number;
  icon: typeof Grid2X2;
  className: string;
}> = [
  { scope: "mixed", label: "全部题目", count: questionBank.total, icon: Grid2X2, className: "icon-blue" },
  { scope: "judge", label: "判断题", count: questionBank.counts.judge, icon: CheckSquare, className: "icon-green" },
  { scope: "single", label: "单选题", count: questionBank.counts.single, icon: Radio, className: "icon-purple" },
  { scope: "multiple", label: "多选题", count: questionBank.counts.multiple, icon: Target, className: "icon-amber" }
];

export default function HomePage() {
  const [scope, setScope] = useState<PracticeScope>("mixed");
  const [mode, setMode] = useState<PracticeMode>("ordered");
  const { state } = usePracticeState();

  const totalSummary = useMemo(() => summarizeRecords(state?.records ?? {}), [state?.records]);
  const todaySummary = useMemo(() => {
    const today = new Date().toDateString();
    const records = Object.fromEntries(
      Object.entries(state?.records ?? {}).filter(([, record]) => new Date(record.answeredAt).toDateString() === today)
    );
    return summarizeRecords(records);
  }, [state?.records]);

  const mistakes = state?.mistakes.length ?? 0;
  const startHref = `/practice?type=${scope}&mode=${mode}`;

  return (
    <main className="screen home-screen">
      <section className="hero">
        <div className="hero__topline">
          <h1 className="hero__title">理论知识刷题系统</h1>
          <span>{questionBank.total} 题</span>
        </div>
        <div className="stats-panel">
          <div className="stat">
            <span className="stat__value">{todaySummary.answered}</span>
            <span className="stat__label">今日答题</span>
          </div>
          <div className="stat">
            <span className="stat__value">{totalSummary.answered === 0 ? "--" : `${totalSummary.accuracy}%`}</span>
            <span className="stat__label">正确率</span>
          </div>
          <div className="stat">
            <span className="stat__value">{totalSummary.answered}</span>
            <span className="stat__label">累计答题</span>
          </div>
          <div className="stat">
            <span className="stat__value">{mistakes}</span>
            <span className="stat__label">错题数</span>
          </div>
        </div>
      </section>

      <h2 className="section-title">选择题型</h2>
      <div className="type-grid">
        {typeCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              className={`type-card ${scope === card.scope ? "is-active" : ""}`}
              key={card.scope}
              onClick={() => setScope(card.scope)}
              type="button"
            >
              <span className={`type-card__icon ${card.className}`}>
                <Icon aria-hidden="true" size={24} />
              </span>
              <span className="type-card__label">{card.label}</span>
              <span className="type-card__count">{card.count} 道</span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">练习方式</h2>
      <div className="mode-row">
        <button
          className={`mode-button ${mode === "ordered" ? "is-active" : ""}`}
          onClick={() => setMode("ordered")}
          type="button"
        >
          <ListOrdered aria-hidden="true" size={22} />
          顺序练习
        </button>
        <button
          className={`mode-button ${mode === "random" ? "is-active" : ""}`}
          onClick={() => setMode("random")}
          type="button"
        >
          <Shuffle aria-hidden="true" size={22} />
          随机练习
        </button>
      </div>

      <h2 className="section-title">快速入口</h2>
      <Link className={`quick-card ${mistakes === 0 ? "is-disabled" : ""}`} href="/mistakes">
        <span className="quick-card__left">
          <span className="quick-card__icon icon-pink">
            <BookOpen aria-hidden="true" size={22} />
          </span>
          <span>
            <span className="quick-card__title">错题复习</span>
            <span className="quick-card__meta">{mistakes === 0 ? "暂无错题" : `${mistakes} 道待复习`}</span>
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={22} />
      </Link>

      <div className="home-fixed-start">
        <Link className="primary-button home-start-button" href={startHref}>
          <BookOpen aria-hidden="true" size={24} />
          开始刷题
        </Link>
      </div>
    </main>
  );
}
