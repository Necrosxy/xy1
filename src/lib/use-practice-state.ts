"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readStoredSyncKey, syncPracticeStateToCloud } from "./cloud-sync-client";
import {
  clearAnswerCorrection,
  getPracticeState,
  markAnswer,
  replacePracticeState,
  resetPracticeState,
  setAnswerCorrection,
  setLastPractice,
  toggleFavorite
} from "./practice-state";
import type { AnswerValue, LastPractice, PracticeState } from "./types";

const AUTO_SYNC_DEBOUNCE_MS = 1200;
const AUTO_SYNC_MIN_INTERVAL_MS = 8000;

export function usePracticeState() {
  const [state, setState] = useState<PracticeState | null>(null);
  const autoSyncTimerRef = useRef<number | null>(null);
  const autoSyncingRef = useRef(false);
  const lastAutoSyncAtRef = useRef(0);
  const lastAutoSyncedSignatureRef = useRef<string | null>(null);
  const pendingAutoSyncStateRef = useRef<PracticeState | null>(null);

  useEffect(() => {
    setState(getPracticeState(window.localStorage));
  }, []);

  const runAutoSync = useCallback((stateToSync: PracticeState) => {
    const syncKey = readStoredSyncKey(window.localStorage);
    if (!syncKey) return;

    const signature = stateSignature(stateToSync);
    if (signature === lastAutoSyncedSignatureRef.current) return;

    if (autoSyncingRef.current) {
      pendingAutoSyncStateRef.current = stateToSync;
      return;
    }

    autoSyncingRef.current = true;
    void syncPracticeStateToCloud(syncKey, stateToSync)
      .then((cloudState) => {
        if (readStoredSyncKey(window.localStorage) !== syncKey) {
          return;
        }

        const nextState = replacePracticeState(window.localStorage, cloudState);
        lastAutoSyncedSignatureRef.current = stateSignature(nextState);
        setState(nextState);
      })
      .catch((error: unknown) => {
        console.warn("Auto cloud sync failed", error);
      })
      .finally(() => {
        autoSyncingRef.current = false;
        lastAutoSyncAtRef.current = Date.now();

        const pendingState = pendingAutoSyncStateRef.current;
        pendingAutoSyncStateRef.current = null;
        if (pendingState && stateSignature(pendingState) !== lastAutoSyncedSignatureRef.current) {
          scheduleAutoSync(pendingState);
        }
      });
  }, []);

  const scheduleAutoSync = useCallback(
    (stateToSync: PracticeState) => {
      if (!readStoredSyncKey(window.localStorage)) return;

      const signature = stateSignature(stateToSync);
      if (signature === lastAutoSyncedSignatureRef.current) return;

      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }

      const elapsed = Date.now() - lastAutoSyncAtRef.current;
      const wait = Math.max(AUTO_SYNC_DEBOUNCE_MS, AUTO_SYNC_MIN_INTERVAL_MS - elapsed);
      autoSyncTimerRef.current = window.setTimeout(() => {
        autoSyncTimerRef.current = null;
        runAutoSync(stateToSync);
      }, wait);
    },
    [runAutoSync]
  );

  useEffect(() => {
    if (!state) return;
    scheduleAutoSync(state);
  }, [scheduleAutoSync, state]);

  useEffect(() => {
    function syncWhenVisible() {
      if (document.visibilityState !== "visible") return;
      const currentState = getPracticeState(window.localStorage);
      setState(currentState);
      runAutoSync(currentState);
    }

    function syncStorageChange(event: StorageEvent) {
      if (!event.key || event.key.startsWith("omnimedia-")) {
        setState(getPracticeState(window.localStorage));
      }
    }

    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("focus", syncWhenVisible);
    window.addEventListener("storage", syncStorageChange);
    return () => {
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("focus", syncWhenVisible);
      window.removeEventListener("storage", syncStorageChange);
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [runAutoSync]);

  const recordAnswer = useCallback((questionId: string, selected: AnswerValue[], correct: boolean) => {
    setState(markAnswer(window.localStorage, questionId, selected, correct));
  }, []);

  const toggleQuestionFavorite = useCallback((questionId: string) => {
    setState(toggleFavorite(window.localStorage, questionId));
  }, []);

  const rememberPractice = useCallback((lastPractice: LastPractice) => {
    setState(setLastPractice(window.localStorage, lastPractice));
  }, []);

  const correctQuestionAnswer = useCallback((questionId: string, answer: AnswerValue[]) => {
    setState(setAnswerCorrection(window.localStorage, questionId, answer));
  }, []);

  const restoreQuestionAnswer = useCallback((questionId: string, originalAnswer: AnswerValue[]) => {
    setState(clearAnswerCorrection(window.localStorage, questionId, originalAnswer));
  }, []);

  const reset = useCallback(() => {
    setState(resetPracticeState(window.localStorage));
  }, []);

  const replaceState = useCallback((nextState: PracticeState) => {
    setState(replacePracticeState(window.localStorage, nextState));
  }, []);

  return {
    state,
    recordAnswer,
    toggleQuestionFavorite,
    rememberPractice,
    correctQuestionAnswer,
    restoreQuestionAnswer,
    replaceState,
    reset
  };
}

function stateSignature(state: PracticeState): string {
  return state.updatedAt;
}
