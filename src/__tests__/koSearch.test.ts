import { describe, it, expect } from "vitest";
import { getChosung, matchesSearch } from "@/lib/koSearch";

describe("getChosung", () => {
  it("한글 음절을 초성으로 변환한다", () => {
    expect(getChosung("리액트")).toBe("ㄹㅇㅌ");
    expect(getChosung("타입스크립트")).toBe("ㅌㅇㅅㅋㄹㅌ");
  });

  it("쌍자음은 base 자음으로 정규화한다", () => {
    expect(getChosung("까")).toBe("ㄱ");
    expect(getChosung("쓰리")).toBe("ㅅㄹ");
  });

  it("비한글 문자는 그대로 둔다", () => {
    expect(getChosung("React 19")).toBe("React 19");
  });
});

describe("matchesSearch", () => {
  it("영문 부분일치 (r / re / act)", () => {
    expect(matchesSearch("r", "React")).toBe(true);
    expect(matchesSearch("re", "React")).toBe(true);
    expect(matchesSearch("act", "React")).toBe(true);
    expect(matchesSearch("xyz", "React")).toBe(false);
  });

  it("대소문자 무시", () => {
    expect(matchesSearch("REACT", "react")).toBe(true);
  });

  it("한글 이름 부분일치", () => {
    expect(matchesSearch("리액", "리액트")).toBe(true);
  });

  it("초성 매칭 (ㄹㅇ / ㄹㅇㅌ)", () => {
    expect(matchesSearch("ㄹㅇ", "리액트")).toBe(true);
    expect(matchesSearch("ㄹㅇㅌ", "리액트")).toBe(true);
    expect(matchesSearch("ㄱㄴ", "리액트")).toBe(false);
  });

  it("여러 후보 중 하나라도 맞으면 true", () => {
    expect(matchesSearch("리액트", "React", "리액트", "Library")).toBe(true);
    expect(matchesSearch("ㄹㅇㅌ", "React", "리액트")).toBe(true);
  });

  it("빈 쿼리는 항상 true", () => {
    expect(matchesSearch("", "anything")).toBe(true);
    expect(matchesSearch("   ", "anything")).toBe(true);
  });

  it("빈 후보는 건너뛴다", () => {
    expect(matchesSearch("x", "", "")).toBe(false);
  });
});
