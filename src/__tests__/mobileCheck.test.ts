import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkMobileLayout, MOBILE_WIDTH, MIN_DESKTOP_HEIGHT } from "@/app/about/_hooks/mobileCheck";

describe("checkMobileLayout", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      innerWidth: 1440,
      innerHeight: 900,
    });
  });

  it("데스크톱 해상도에서 false를 반환한다", () => {
    expect(checkMobileLayout()).toBe(false);
  });

  it("너비가 MOBILE_WIDTH 이하이면 true를 반환한다", () => {
    vi.stubGlobal("window", { innerWidth: MOBILE_WIDTH, innerHeight: 900 });
    expect(checkMobileLayout()).toBe(true);
  });

  it("너비가 MOBILE_WIDTH보다 작으면 true를 반환한다", () => {
    vi.stubGlobal("window", { innerWidth: 768, innerHeight: 900 });
    expect(checkMobileLayout()).toBe(true);
  });

  it("높이가 MIN_DESKTOP_HEIGHT 미만이면 true를 반환한다", () => {
    vi.stubGlobal("window", { innerWidth: 1440, innerHeight: MIN_DESKTOP_HEIGHT - 1 });
    expect(checkMobileLayout()).toBe(true);
  });

  it("높이가 MIN_DESKTOP_HEIGHT 초과이면 false를 반환한다", () => {
    vi.stubGlobal("window", { innerWidth: 1440, innerHeight: MIN_DESKTOP_HEIGHT + 1 });
    expect(checkMobileLayout()).toBe(false);
  });

  it("SSR 환경(window undefined)에서 false를 반환한다", () => {
    vi.stubGlobal("window", undefined);
    expect(checkMobileLayout()).toBe(false);
  });
});
