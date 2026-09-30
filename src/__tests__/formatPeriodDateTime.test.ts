// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatPeriod } from "@/utils/formatPeriod";

describe("formatPeriod — dateTime", () => {
  it("날짜 뒤에 한 칸 띄워 시:분을 붙인다", () => {
    expect(formatPeriod({ start: "2024-03-15T14:30", format: "dateTime" }, "ko")).toBe("2024.03.15 14:30");
  });

  it("범위와 진행 중도 같은 형식으로", () => {
    expect(formatPeriod({ start: "2024-03-15T09:00", end: "2024-03-16T18:05", format: "dateTime" }, "ko"))
      .toBe("2024.03.15 09:00 - 2024.03.16 18:05");
    expect(formatPeriod({ start: "2024-03-15T09:00", ongoing: true, format: "dateTime" }, "en"))
      .toBe("2024.03.15 09:00 - Present");
  });

  it("시각을 아직 안 골랐으면 날짜만", () => {
    expect(formatPeriod({ start: "2024-03-15", format: "dateTime" }, "ko")).toBe("2024.03.15");
  });
});
