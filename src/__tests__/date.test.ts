import { describe, it, expect } from "vitest";
import { formatDate, getYear } from "@/utils/date";

describe("formatDate", () => {
  it("날짜를 YY. MM. DD 형식으로 포맷한다", () => {
    const date = new Date(2025, 0, 15); // 2025-01-15
    expect(formatDate(date)).toBe("25. 01. 15");
  });

  it("한 자릿수 월/일을 0으로 패딩한다", () => {
    const date = new Date(2024, 5, 3); // 2024-06-03
    expect(formatDate(date)).toBe("24. 06. 03");
  });
});

describe("getYear", () => {
  it("end 날짜가 있으면 해당 연도를 반환한다", () => {
    expect(getYear("2023-01-01", "2024-06-15")).toBe("2024");
  });

  it("end가 null이면 start 연도를 반환한다", () => {
    expect(getYear("2023-03-20", null)).toBe("2023");
  });

  it("end가 undefined이면 start 연도를 반환한다", () => {
    expect(getYear("2022-12-01")).toBe("2022");
  });

  it("start와 end 모두 없으면 Unknown을 반환한다", () => {
    expect(getYear(undefined, undefined)).toBe("Unknown");
  });
});
