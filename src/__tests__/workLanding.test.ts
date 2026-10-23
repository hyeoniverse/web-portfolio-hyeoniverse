import { describe, expect, it } from "vitest";
import { normalizeWorkLanding, normalizeLandingItem, sectionNo } from "@/lib/workLanding";
import { defaultLanding, landingOf } from "@/components/works/landing/landingData";
import type { Project } from "@/data/projects";

/* 작업물 랜딩 데이터 — 저장된 값의 모양 맞추기, 어느 데이터를 쓰는지(DB › 저장소 기본 › 카드 정보) */

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1", slug: "newpick", title: { ko: "뉴픽", en: "NewPick" }, subtitle: { ko: "AI 뉴스레터", en: "AI newsletter" },
  description: { ko: "아침 뉴스 요약", en: "Morning news" }, image: "https://img.test/cover.webp",
  gallery: ["https://img.test/cover.webp", "https://img.test/1.webp", "https://img.test/2.mp4", "https://img.test/deck.ppt"],
  ...over,
} as Project);

describe("normalizeWorkLanding", () => {
  it("모르는 종류 · 빈 항목은 버리고, 틀린 폭은 wide", () => {
    expect(normalizeLandingItem({ kind: "frame", at: "huge", src: "a.webp", alt: { ko: "가" } })).toEqual({ kind: "frame", at: "wide", src: "a.webp", video: undefined, alt: { ko: "가", en: "" }, width: undefined, height: undefined });
    expect(normalizeLandingItem({ kind: "frame", at: "wide" })).toBeNull();
    expect(normalizeLandingItem({ kind: "confetti" })).toBeNull();
    expect(normalizeLandingItem({ kind: "marquee", rows: [[], [{ src: "a" }]] })).toEqual({ kind: "marquee", rows: [[{ src: "a", alt: { ko: "", en: "" } }]] });
  });

  it("섹션도 hero 도 없으면 null, 섹션 id 가 없으면 채운다", () => {
    expect(normalizeWorkLanding(null)).toBeNull();
    expect(normalizeWorkLanding({ sections: [] })).toBeNull();
    const d = normalizeWorkLanding({ sections: [{ title: { ko: "하나" }, items: [{ kind: "numbers", items: [{ value: "0원", label: { ko: "운영비" } }] }] }] });
    expect(d?.sections[0].id).toBe("s1");
    expect(d?.sections[0].items[0].kind).toBe("numbers");
    expect(sectionNo(0)).toBe("01");
  });
});

describe("landingOf", () => {
  it("DB 값이 있으면 그것", () => {
    const landing = { eyebrow: { ko: "a", en: "b" }, hero: [], sections: [{ id: "x", title: { ko: "DB", en: "DB" }, items: [] }] };
    expect(landingOf(project({ landing })).sections[0].title.ko).toBe("DB");
  });

  it("없으면 저장소 기본 데이터(hyeoniverse · macfolio)", () => {
    const d = landingOf(project({ slug: "macfolio" }));
    expect(d.sections).toHaveLength(13);
    expect(d.sections[0].title.ko).toBe("포트폴리오를 운영체제처럼");
  });

  it("그것도 없으면 카드 정보 — 표지 hero, 소개 섹션에 설명 · 표지와 문서를 뺀 갤러리", () => {
    const d = defaultLanding(project());
    expect(d.eyebrow.en).toBe("AI newsletter");
    expect(d.hero).toEqual([{ kind: "frame", at: "bleed", src: "https://img.test/cover.webp", alt: { ko: "뉴픽", en: "NewPick" } }]);
    expect(d.sections[0].body?.ko).toBe("아침 뉴스 요약");
    expect(d.sections[0].items.map((i) => (i.kind === "frame" ? i.src ?? i.video : ""))).toEqual(["https://img.test/1.webp", "https://img.test/2.mp4"]);
    expect(landingOf(project()).sections[0].id).toBe("intro");
  });
});
