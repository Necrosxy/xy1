"use client";

import { useCallback, useEffect, useState } from "react";

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
