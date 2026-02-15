import { describe, it, expect } from "vitest";
import { cn } from "@/utils/cn";

describe("cn", () => {
  it("단일 클래스를 반환한다", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("여러 클래스를 결합한다", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("falsy 값을 무시한다", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("조건부 클래스를 처리한다", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("Tailwind 충돌 클래스를 병합한다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("빈 입력에서 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
  });
});
