import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/utils/relativeTime";
import { mulberry32 } from "@/utils/seededRandom";

const NOW = Date.parse("2026-03-10T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("1분 미만은 '방금 전'", () => {
    expect(formatRelativeTime(ago(0), NOW, "ko")).toBe("방금 전");
    expect(formatRelativeTime(ago(59_000), NOW, "en")).toBe("just now");
  });

  it("분·시간·일 단위로 접는다", () => {
    expect(formatRelativeTime(ago(5 * MIN), NOW, "ko")).toBe("5분 전");
    expect(formatRelativeTime(ago(5 * MIN), NOW, "en")).toBe("5m ago");
    expect(formatRelativeTime(ago(3 * HOUR), NOW, "ko")).toBe("3시간 전");
    expect(formatRelativeTime(ago(3 * HOUR), NOW, "en")).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * DAY), NOW, "ko")).toBe("2일 전");
    expect(formatRelativeTime(ago(2 * DAY), NOW, "en")).toBe("2d ago");
  });

  it("경계에서 다음 단위로 넘어간다", () => {
    expect(formatRelativeTime(ago(59 * MIN), NOW, "ko")).toBe("59분 전");
    expect(formatRelativeTime(ago(60 * MIN), NOW, "ko")).toBe("1시간 전");
    expect(formatRelativeTime(ago(23 * HOUR), NOW, "ko")).toBe("23시간 전");
    expect(formatRelativeTime(ago(24 * HOUR), NOW, "ko")).toBe("1일 전");
    expect(formatRelativeTime(ago(6 * DAY), NOW, "ko")).toBe("6일 전");
    expect(formatRelativeTime(ago(7 * DAY), NOW, "ko")).not.toContain("일 전");
  });

  it("7일이 넘으면 절대 날짜, withYear:false 면 연도를 뺀다", () => {
    const withYear = formatRelativeTime(ago(30 * DAY), NOW, "en");
    const noYear = formatRelativeTime(ago(30 * DAY), NOW, "en", { withYear: false });
    expect(withYear).toContain("2026");
    expect(noYear).not.toContain("2026");
  });

  it("미래 시각은 '방금 전' 으로 접는다 — 시계 어긋남 대비", () => {
    expect(formatRelativeTime(ago(-5 * MIN), NOW, "ko")).toBe("방금 전");
  });

  it("파싱 못 하는 값은 원문 그대로 돌려준다", () => {
    expect(formatRelativeTime("아무 문자열", NOW, "ko")).toBe("아무 문자열");
  });
});

describe("mulberry32", () => {
  it("같은 시드는 같은 수열", () => {
    const a = mulberry32(12345), b = mulberry32(12345);
    expect(Array.from({ length: 8 }, a)).toEqual(Array.from({ length: 8 }, b));
  });

  it("다른 시드는 다른 수열", () => {
    const a = mulberry32(1), b = mulberry32(2);
    expect(Array.from({ length: 8 }, a)).not.toEqual(Array.from({ length: 8 }, b));
  });

  it("0 이상 1 미만", () => {
    const r = mulberry32(99);
    const xs = Array.from({ length: 500 }, r);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});
