"use client";

import Link from "next/link";
import { CalendarClock, ChevronLeft, CircleCheck, Cloud, Copy, KeyRound, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { questionBank } from "@/data/questions";
import { formatSyncKey, generateSyncKey, normalizeSyncKey, SYNC_KEY_STORAGE_KEY } from "@/lib/cloud-sync";
import { questionTypeLabel, summarizeRecords } from "@/lib/question-utils";
import { usePracticeState } from "@/lib/use-practice-state";
import type { PracticeState, QuestionType } from "@/lib/types";

const typeOrder: QuestionType[] = ["judge", "single", "multiple"];

export default function StatsPage() {
  const { state, replaceState, reset } = usePracticeState();
  const summary = useMemo(() => summarizeRecords(state?.records ?? {}), [state?.records]);
  const [syncKey, setSyncKey] = useState("");
  const [syncInput, setSyncInput] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("未绑定同步码");

  useEffect(() => {
    const storedKey = window.localStorage.getItem(SYNC_KEY_STORAGE_KEY);
    if (!storedKey) return;

    setSyncKey(formatSyncKey(storedKey));
    setSyncMessage("已绑定同步码");
  }, []);

  function clearRecords() {
    if (window.confirm("确认清空本机练习记录？")) {
      reset();
    }
  }

  async function createSyncKey() {
    const nextKey = generateSyncKey();
    setSyncInput(formatSyncKey(nextKey));
    await syncWithCloud(nextKey);
  }

  async function bindSyncKey() {
    await syncWithCloud(syncInput);
  }

  async function syncCurrentKey() {
    await syncWithCloud(syncKey);
  }

  async function copySyncKey() {
    const normalized = normalizeSyncKey(syncKey);
    if (!normalized) return;

    await window.navigator.clipboard?.writeText(formatSyncKey(normalized));
    setSyncMessage("同步码已复制");
  }

  async function syncWithCloud(rawKey: string) {
    if (!state) return;

    const normalized = normalizeSyncKey(rawKey);
    if (!normalized) {
      setSyncMessage("同步码无效");
      return;
    }

    setSyncBusy(true);
    setSyncMessage("同步中");
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          syncKey: normalized,
          state
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; state?: PracticeState };
      if (!response.ok || !payload.state) {
        throw new Error(payload.error ?? "同步失败");
      }

      window.localStorage.setItem(SYNC_KEY_STORAGE_KEY, normalized);
      replaceState(payload.state);
      setSyncKey(formatSyncKey(normalized));
      setSyncInput("");
      setSyncMessage("已同步");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      setSyncBusy(false);
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
          <span>本机记录永久保存</span>
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

      <h2 className="section-title">多设备同步</h2>
      <section className="sync-panel">
        <div className="sync-panel__header">
          <span className="sync-panel__title">
            <Cloud aria-hidden="true" size={20} />
            云端记录
          </span>
          <span className={`sync-badge ${normalizeSyncKey(syncKey) ? "is-active" : ""}`}>{syncMessage}</span>
        </div>

        <div className="sync-key-box">
          <span>同步码</span>
          <strong>{normalizeSyncKey(syncKey) ? formatSyncKey(syncKey) : "未生成"}</strong>
          <button className="ghost-button" disabled={!normalizeSyncKey(syncKey)} onClick={copySyncKey} type="button">
            <Copy aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="sync-form">
          <input
            aria-label="输入同步码"
            disabled={syncBusy}
            onChange={(event) => setSyncInput(event.target.value)}
            placeholder="输入同步码"
            value={syncInput}
          />
          <button className="secondary-button" disabled={syncBusy || !syncInput.trim()} onClick={bindSyncKey} type="button">
            <KeyRound aria-hidden="true" size={18} />
            绑定
          </button>
        </div>

        <div className="sync-actions">
          <button className="secondary-button" disabled={syncBusy || !state} onClick={createSyncKey} type="button">
            生成同步码
          </button>
          <button
            className="primary-button"
            disabled={syncBusy || !normalizeSyncKey(syncKey) || !state}
            onClick={syncCurrentKey}
            type="button"
          >
            <Cloud aria-hidden="true" size={20} />
            {syncBusy ? "同步中" : "立即同步"}
          </button>
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
