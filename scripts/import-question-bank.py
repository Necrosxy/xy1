#!/usr/bin/env python3
from __future__ import annotations

import bisect
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

try:
    from docx import Document
    from pypdf import PdfReader
except ImportError as exc:
    raise SystemExit(
        "Missing parser dependency. Install python-docx and pypdf, or run with the bundled Codex Python."
    ) from exc

QuestionType = Literal["judge", "single", "multiple"]

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = Path("/Users/bytedance/Desktop/全媒体运营师（视听运营）_三级_理论知识复习题.pdf")
DEFAULT_DOCX = Path("/Users/bytedance/Desktop/全媒体运营师（理论模拟题答案）.docx")
OUTPUT = ROOT / "src" / "data" / "question-bank.json"
OVERRIDES = ROOT / "scripts" / "manual-answer-overrides.json"

EXPECTED_COUNTS: dict[QuestionType, int] = {
    "judge": 486,
    "single": 644,
    "multiple": 480,
}

SECTION_PATTERNS: list[tuple[QuestionType, str]] = [
    ("judge", r"一、\s*判断题"),
    ("single", r"二、\s*单项选择题"),
    ("multiple", r"三、\s*多项选择题"),
]

OPTION_RE = re.compile(r"[（(]\s*([A-E])\s*[）)]")
QUESTION_RE = re.compile(r"(?m)^\s*(\d+)\.")
PAGE_RE = re.compile(r"@@PAGE:(\d+)@@")


@dataclass(frozen=True)
class Section:
    kind: QuestionType
    start: int
    end: int


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    docx_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_DOCX

    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")
    if not docx_path.exists():
        raise SystemExit(f"DOCX not found: {docx_path}")

    pdf_text, page_offsets = read_pdf_text(pdf_path)
    answers = read_answers(docx_path)
    override_count = apply_answer_overrides(answers)
    questions = parse_questions(pdf_text, page_offsets, answers)
    validate_question_bank(questions)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            {
                "title": "全媒体运营师（视听运营）三级理论知识复习题",
                "generatedFrom": {
                    "questions": pdf_path.name,
                "answers": docx_path.name,
                "manualOverrides": OVERRIDES.name if override_count else None,
            },
                "counts": EXPECTED_COUNTS,
                "total": sum(EXPECTED_COUNTS.values()),
                "questions": questions,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT} ({len(questions)} questions, {override_count} manual answer overrides)")


def read_pdf_text(path: Path) -> tuple[str, list[tuple[int, int]]]:
    reader = PdfReader(str(path))
    parts: list[str] = []
    page_offsets: list[tuple[int, int]] = []
    current = 0

    for page_no, page in enumerate(reader.pages, start=1):
        marker = f"\n@@PAGE:{page_no}@@\n"
        parts.append(marker)
        current += len(marker)
        page_offsets.append((current, page_no))
        text = page.extract_text() or ""
        parts.append(text)
        current += len(text)

    return "".join(parts), page_offsets


def read_answers(path: Path) -> dict[QuestionType, dict[int, list[str]]]:
    doc = Document(str(path))
    text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
    headings: list[tuple[int, QuestionType]] = []

    for kind, pattern in SECTION_PATTERNS:
        for match in re.finditer(pattern, text):
            headings.append((match.start(), kind))
    headings.sort(key=lambda item: item[0])

    answers: dict[QuestionType, dict[int, list[str]]] = {
        "judge": {},
        "single": {},
        "multiple": {},
    }

    for index, (start, kind) in enumerate(headings):
        end = headings[index + 1][0] if index + 1 < len(headings) else len(text)
        segment = text[start:end]
        token_re = re.compile(r"(\d+)\s*[.、]?\s*([A-E]+|[√×])")
        for number, raw_answer in token_re.findall(segment):
            answers[kind][int(number)] = normalize_answer(raw_answer)

    return answers


def apply_answer_overrides(answers: dict[QuestionType, dict[int, list[str]]]) -> int:
    if not OVERRIDES.exists():
        return 0

    raw = json.loads(OVERRIDES.read_text(encoding="utf-8"))
    count = 0
    for kind in EXPECTED_COUNTS:
        overrides = raw.get(kind, {})
        for raw_number, answer in overrides.items():
            number = int(raw_number)
            if number not in answers[kind]:
                answers[kind][number] = answer
                count += 1
    return count


def parse_questions(
    text: str,
    page_offsets: list[tuple[int, int]],
    answers: dict[QuestionType, dict[int, list[str]]],
) -> list[dict[str, object]]:
    sections = find_sections(text)
    questions: list[dict[str, object]] = []

    for section in sections:
        chunk = text[section.start : section.end]
        matches = list(QUESTION_RE.finditer(chunk))
        for index, match in enumerate(matches):
            number = int(match.group(1))
            block_start = section.start + match.start()
            block_end = section.start + (matches[index + 1].start() if index + 1 < len(matches) else len(chunk))
            block = text[block_start:block_end]
            answer = answers[section.kind].get(number)
            if answer is None:
                raise ValueError(f"Missing answer for {section.kind} #{number}")

            parsed = parse_question_block(section.kind, number, block)
            questions.append(
                {
                    "id": f"{section.kind}-{number}",
                    "type": section.kind,
                    "number": number,
                    "stem": parsed["stem"],
                    "options": parsed["options"],
                    "answer": answer,
                    "sourcePage": page_for_offset(page_offsets, block_start),
                }
            )

    return questions


def find_sections(text: str) -> list[Section]:
    positions: list[tuple[int, QuestionType]] = []
    for kind, pattern in SECTION_PATTERNS:
        match = re.search(pattern, text)
        if not match:
            raise ValueError(f"Could not find PDF section: {kind}")
        positions.append((match.start(), kind))
    positions.sort(key=lambda item: item[0])

    return [
        Section(kind=kind, start=start, end=positions[index + 1][0] if index + 1 < len(positions) else len(text))
        for index, (start, kind) in enumerate(positions)
    ]


def parse_question_block(kind: QuestionType, number: int, block: str) -> dict[str, object]:
    body = QUESTION_RE.sub("", block, count=1)
    body = PAGE_RE.sub("", body)
    body = compact_text(body)

    option_matches = list(OPTION_RE.finditer(body))
    if kind == "judge":
        return {"stem": clean_stem(body), "options": []}

    if not option_matches:
        raise ValueError(f"Missing options for {kind} #{number}")

    stem = clean_stem(body[: option_matches[0].start()])
    options = []
    for index, option_match in enumerate(option_matches):
        key = option_match.group(1)
        value_start = option_match.end()
        value_end = option_matches[index + 1].start() if index + 1 < len(option_matches) else len(body)
        options.append({"key": key, "text": clean_option(body[value_start:value_end])})

    return {"stem": stem, "options": options}


def compact_text(value: str) -> str:
    value = value.replace("\u3000", " ")
    value = re.sub(r"\s+", "", value)
    return value.strip()


def clean_stem(value: str) -> str:
    value = re.sub(r"[（(]\s*[）)]$", "", value)
    return value.strip()


def clean_option(value: str) -> str:
    return value.strip("。；; ")


def normalize_answer(value: str) -> list[str]:
    value = value.strip().upper()
    if value == "√":
        return ["true"]
    if value == "×":
        return ["false"]
    return sorted(set(value), key="ABCDE".index)


def page_for_offset(page_offsets: list[tuple[int, int]], offset: int) -> int:
    starts = [item[0] for item in page_offsets]
    index = bisect.bisect_right(starts, offset) - 1
    if index < 0:
        return 1
    return page_offsets[index][1]


def validate_question_bank(questions: list[dict[str, object]]) -> None:
    total = sum(EXPECTED_COUNTS.values())
    if len(questions) != total:
        raise ValueError(f"Expected {total} questions, got {len(questions)}")

    for kind, expected_count in EXPECTED_COUNTS.items():
        numbers = [int(question["number"]) for question in questions if question["type"] == kind]
        expected_numbers = list(range(1, expected_count + 1))
        if numbers != expected_numbers:
            missing = sorted(set(expected_numbers) - set(numbers))
            extra = sorted(set(numbers) - set(expected_numbers))
            raise ValueError(f"{kind} numbering mismatch. Missing={missing[:10]} extra={extra[:10]}")

        for question in (question for question in questions if question["type"] == kind):
            if not question["stem"]:
                raise ValueError(f"Empty stem: {question['id']}")
            if not question["answer"]:
                raise ValueError(f"Empty answer: {question['id']}")
            if kind != "judge" and len(question["options"]) < 2:
                raise ValueError(f"Too few options: {question['id']}")


if __name__ == "__main__":
    main()
