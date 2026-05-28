"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPracticeState,
  markAnswer,
  resetPracticeState,
  setLastPractice,
  toggleFavorite
} from "./practice-state";
import type { AnswerValue, LastPractice, PracticeState } from "./types";

export function usePracticeState() {
  const [state, setState] = useState<PracticeState | null>(null);

  useEffect(() => {
    setState(getPracticeState(window.localStorage));
  }, []);

  const recordAnswer = useCallback((questionId: string, selected: AnswerValue[], correct: boolean) => {
    setState(markAnswer(window.localStorage, questionId, selected, correct));
  }, []);

  const toggleQuestionFavorite = useCallback((questionId: string) => {
    setState(toggleFavorite(window.localStorage, questionId));
  }, []);

  const rememberPractice = useCallback((lastPractice: LastPractice) => {
    setState(setLastPractice(window.localStorage, lastPractice));
  }, []);

  const reset = useCallback(() => {
    setState(resetPracticeState(window.localStorage));
  }, []);

  return {
    state,
    recordAnswer,
    toggleQuestionFavorite,
    rememberPractice,
    reset
  };
}
