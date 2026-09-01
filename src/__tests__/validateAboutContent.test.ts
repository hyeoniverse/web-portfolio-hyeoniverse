import { describe, it, expect } from "vitest";
import { checkAboutContent } from "@/lib/api/validateAboutContent";
import { aboutDecisions } from "@/data/generated/aboutContent";
import { siteConfig } from "@/config/site.config";

const wrap = (about: Record<string, unknown>) => ({ delta: { about } });

const ok = {
  id: "sample",
  problem: { ko: "증상", en: "symptom" },
  definition: { ko: "a", en: "a" },
  cause: { ko: "b", en: "b" },
  solution: { ko: "c", en: "c" },
  keyInsight: { ko: "d", en: "d" },
};

describe("실제 값은 통과한다", () => {
  it("지금 노출 중인 Design Decisions 9개", () => {
    expect(checkAboutContent(wrap({ troubleshooting: aboutDecisions }))).toBeNull();
  });

  it("siteConfig 의 about 전체", () => {
    expect(checkAboutContent(wrap(siteConfig.about as unknown as Record<string, unknown>))).toBeNull();
  });

  it("about 이 없으면 검사할 것도 없다", () => {
    expect(checkAboutContent({ delta: { brand: {} } })).toBeNull();
    expect(checkAboutContent(null)).toBeNull();
  });
});

/* 화면이 `item.cause[language]` 처럼 바로 파고들어서, 빠지면 빈 칸이 아니라 TypeError 다. */
describe("화면을 죽이는 값을 막는다", () => {
  it.each(["problem", "definition", "cause", "solution", "keyInsight"] as const)(
    "%s 가 없으면 거부",
    (field) => {
      const item: Record<string, unknown> = { ...ok };
      delete item[field];
      expect(checkAboutContent(wrap({ troubleshooting: [item] }))).toContain(field);
    },
  );

  it("한 언어만 있으면 거부", () => {
    const item = { ...ok, cause: { ko: "b" } };
    expect(checkAboutContent(wrap({ troubleshooting: [item] }))).toContain("cause");
  });

  it("difficulty 가 1~3 밖이면 거부", () => {
    expect(checkAboutContent(wrap({ troubleshooting: [{ ...ok, difficulty: 0 }] }))).toContain("difficulty");
    expect(checkAboutContent(wrap({ troubleshooting: [{ ...ok, difficulty: 4 }] }))).toContain("difficulty");
    expect(checkAboutContent(wrap({ troubleshooting: [{ ...ok, difficulty: "2" }] }))).toContain("difficulty");
    expect(checkAboutContent(wrap({ troubleshooting: [{ ...ok, difficulty: 2 }] }))).toBeNull();
  });

  it("id 가 없거나 겹치면 거부", () => {
    const noId: Record<string, unknown> = { ...ok };
    delete noId.id;
    expect(checkAboutContent(wrap({ troubleshooting: [noId] }))).toContain("id");
    expect(checkAboutContent(wrap({ troubleshooting: [ok, { ...ok }] }))).toContain("중복");
  });

  it("배열이 아니면 거부", () => {
    expect(checkAboutContent(wrap({ troubleshooting: {} }))).toContain("배열");
    expect(checkAboutContent(wrap({ security: "x" }))).toContain("배열");
  });
});

/* 없어도 빈 칸으로 끝나는 값까지 막으면 정상적인 편집이 걸린다. */
describe("죽지 않는 값은 막지 않는다", () => {
  it("security 항목의 문자열이 비어도 통과", () => {
    expect(checkAboutContent(wrap({ security: [{ icon: "", title_ko: "", scope_ko: "" }] }))).toBeNull();
  });

  it("Design Decisions 의 선택 필드가 없어도 통과", () => {
    expect(checkAboutContent(wrap({ troubleshooting: [ok] }))).toBeNull();
  });
});
