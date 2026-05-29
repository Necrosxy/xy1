import type { Question } from "../../src/lib/types";

export interface MiniProgramQuestionBank {
  title: string;
  counts: {
    judge: number;
    single: number;
    multiple: number;
  };
  total: number;
  questions: Question[];
}

export function createMiniProgramDataModule(bank: MiniProgramQuestionBank): string {
  return `module.exports = ${JSON.stringify(bank, null, 2)};\n`;
}
