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

  /* tailwind-merge 를 걷어냈으므로 Tailwind 충돌 해결은 더 이상 하지 않는다.
     CSS Modules 프로젝트라 cn() 에 들어오는 건 전부 해시 클래스이고, 실제 호출 중
     Tailwind 유틸을 병합하는 곳이 없었다. 둘 다 그대로 남는 것이 현재 동작이다. */
  it("클래스를 병합하지 않고 그대로 이어붙인다", () => {
    expect(cn("px-2", "px-4")).toBe("px-2 px-4");
  });

  it("빈 입력에서 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
  });
});
