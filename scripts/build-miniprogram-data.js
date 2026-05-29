const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const bank = require(path.join(root, "src/data/question-bank.json"));
const outputPath = path.join(root, "miniprogram/data/question-bank.js");

function createMiniProgramDataModule(questionBank) {
  return `module.exports = ${JSON.stringify(questionBank, null, 2)};\n`;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, createMiniProgramDataModule(bank), "utf8");

console.log(`Wrote ${outputPath} (${bank.questions.length} questions)`);
