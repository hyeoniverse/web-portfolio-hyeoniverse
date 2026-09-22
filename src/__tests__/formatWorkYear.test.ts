import { describe, it, expect } from "vitest";
import { formatWorkYear, parseStoredPeriod } from "@/utils/formatWorkYear";
import { parseYearAsPeriod, serializePeriodAsYear } from "@/components/works/workEditor/periodFormat";

/* 편집기가 기간으로 저장한 연도(JSON)가 목록·상세에 그대로 찍히던 문제(#1115) */
describe("formatWorkYear", () => {
  it("단일 연도 문자열은 그대로 둔다", () => {
    expect(formatWorkYear("2024", "ko")).toBe("2024");
    expect(formatWorkYear(" 2024 ", "en")).toBe("2024");
    expect(formatWorkYear("", "ko")).toBe("");
    expect(formatWorkYear(null, "ko")).toBe("");
  });

  it("편집기가 저장한 기간은 JSON 이 아니라 읽을 수 있는 글자로 바꾼다", () => {
    const range = serializePeriodAsYear({ start: "2024-03", end: "2024-06", format: "yearMonth" });
    expect(range.startsWith("{")).toBe(true);
    expect(formatWorkYear(range, "ko")).toBe("2024.03 - 2024.06");

    const years = serializePeriodAsYear({ start: "2024", end: "2025", format: "year" });
    expect(formatWorkYear(years, "en")).toBe("2024 - 2025");
  });

  it("진행 중이면 보는 언어로 끝을 적는다", () => {
    const ongoing = serializePeriodAsYear({ start: "2026-02", ongoing: true, format: "yearMonth" });
    expect(formatWorkYear(ongoing, "ko")).toBe("2026.02 - 현재");
    expect(formatWorkYear(ongoing, "en")).toBe("2026.02 - Present");
  });

  it("월 단위 하나만 저장한 값도 풀어 쓴다", () => {
    const single = serializePeriodAsYear({ start: "2024-11", end: "", format: "yearMonth" });
    expect(formatWorkYear(single, "ko")).toBe("2024.11");
  });

  it("JSON 처럼 보여도 모양이 틀리면 원래 글자를 둔다", () => {
    expect(parseStoredPeriod("{broken")).toBeNull();
    expect(parseStoredPeriod("{\"foo\":1}")).toBeNull();
    expect(formatWorkYear("{broken", "ko")).toBe("{broken");
  });

  it("편집기의 기간 해석과 같은 값을 읽는다", () => {
    const stored = serializePeriodAsYear({ start: "2024-03", end: "2024-06", format: "yearMonth" });
    expect(parseStoredPeriod(stored)).toEqual(parseYearAsPeriod(stored));
    expect(parseYearAsPeriod("2024")).toEqual({ start: "2024", format: "year" });
  });
});
