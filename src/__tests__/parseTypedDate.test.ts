import { describe, expect, it } from "vitest";
import { formatTypedDate, parseTypedDate } from "@/utils/parseTypedDate";

const now = new Date(2026, 9, 21);
const p = (raw: string, f: Parameters<typeof parseTypedDate>[1], o = {}) => parseTypedDate(raw, f, { now, ...o });

describe("parseTypedDate", () => {
  it("연.월.일 — 이어 적은 숫자 · 구분자 섞인 글을 모두 읽는다", () => {
    for (const raw of ["19990827", "990827", "1999-08-27", "1999.8.27", "1999/08/27", "1999 08 27", "99.08.27"]) {
      expect(p(raw, "date"), raw).toEqual({ value: "1999-08-27", complete: true });
    }
  });

  it("두 자리 연도는 올해 + 5년까지 20xx, 그 위는 19xx", () => {
    expect(p("260101", "date")?.value).toBe("2026-01-01");
    expect(p("310101", "date")?.value).toBe("2031-01-01");
    expect(p("320101", "date")?.value).toBe("1932-01-01");
  });

  it("형식보다 자세하면 버리고, 모자라면 비운 채 끝까지 적지 않은 것으로 본다", () => {
    expect(p("19990827", "yearMonth")).toBeNull(); // 8자리 숫자열은 연.월 형식에서 뜻이 갈리지 않게 거절
    expect(p("1999-08-27", "yearMonth")).toEqual({ value: "1999-08", complete: true });
    expect(p("199908", "yearMonth")).toEqual({ value: "1999-08", complete: true });
    expect(p("1999", "date")).toEqual({ value: "1999", complete: false });
    expect(p("1999.8", "date")).toEqual({ value: "1999-08", complete: false });
    expect(p("1999", "year")).toEqual({ value: "1999", complete: true });
  });

  it("시각 형식", () => {
    expect(p("1999-08-27 14:30", "dateTime")).toEqual({ value: "1999-08-27T14:30", complete: true });
    expect(p("199908271430", "dateTime")).toEqual({ value: "1999-08-27T14:30", complete: true });
    expect(p("1999.08.27 9", "dateTime")).toEqual({ value: "1999-08-27T09:00", complete: true });
    expect(p("19990827", "dateTime")).toEqual({ value: "1999-08-27", complete: false });
  });

  it("없는 날짜 · 범위 밖 · 알 수 없는 글은 null, 빈 글은 빈 값", () => {
    expect(p("20230229", "date")).toBeNull();
    expect(p("20240229", "date")?.value).toBe("2024-02-29");
    expect(p("1999-13-01", "date")).toBeNull();
    expect(p("1999082", "date")).toBeNull();
    expect(p("abc", "date")).toBeNull();
    expect(p("2027", "year", { max: new Date(2026, 11, 31) })).toBeNull();
    expect(p("  ", "date")).toEqual({ value: "", complete: false });
  });
});

describe("formatTypedDate", () => {
  it("저장 형식을 칸에 보일 글로", () => {
    expect(formatTypedDate("1999-08-27")).toBe("1999.08.27");
    expect(formatTypedDate("1999-08-27T14:30")).toBe("1999.08.27 14:30");
    expect(formatTypedDate("")).toBe("");
  });
});
