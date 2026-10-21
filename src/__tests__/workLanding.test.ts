import { describe, expect, it } from "vitest";
import { EMPTY_LANDING, isLandingEmpty, landingFilledCount, normalizeLanding, pruneLanding } from "@/types/workLanding";
import { normalizeLandingFields } from "@/lib/api/workLandingColumns";

/* 작업물 랜딩 페이지 내용(works.landing_ko / landing_en) — DB · 요청 본문의 값을 모양에 맞추고 빈 줄을 덜어 낸다 */
describe("normalizeLanding", () => {
  it("빈 값 · 모양이 다른 값은 빈 랜딩이 된다", () => {
    expect(normalizeLanding(null)).toEqual(EMPTY_LANDING);
    expect(normalizeLanding({})).toEqual(EMPTY_LANDING);
    expect(normalizeLanding("x")).toEqual(EMPTY_LANDING);
    expect(normalizeLanding([1, 2])).toEqual(EMPTY_LANDING);
  });

  it("모르는 칸은 버리고, 글자가 아닌 값은 빈 글자로", () => {
    const l = normalizeLanding({
      tagline: "한 줄", evil: "<script>", facts: [{ value: 16, label: "기술" }],
      highlights: [{ title: "기능", body: "설명", image: "", extra: 1 }],
      chapters: [{ title: "챕터", points: "not array" }],
    });
    expect(l.tagline).toBe("한 줄");
    expect(l).not.toHaveProperty("evil");
    expect(l.facts).toEqual([{ value: "", label: "기술" }]);
    expect(l.highlights).toEqual([{ title: "기능", body: "설명" }]);
    expect(l.chapters).toEqual([{ title: "챕터", lead: "", points: [] }]);
  });
});

describe("pruneLanding", () => {
  it("'추가'만 누르고 비워 둔 줄 · 빈 챕터를 덜어 낸다", () => {
    const l = pruneLanding({
      ...EMPTY_LANDING,
      facts: [{ value: "", label: " " }, { value: "3", label: "명" }],
      highlights: [{ title: "", body: "" }, { title: "", body: "", image: "a.png" }],
      chapters: [{ title: "", lead: "", points: [{ title: "", body: "" }] }, { title: "", lead: "", points: [{ title: "항목", body: "" }] }],
      timeline: [{ date: "", label: "" }],
      specs: [{ label: "FE", value: "" }],
    });
    expect(l.facts).toEqual([{ value: "3", label: "명" }]);
    expect(l.highlights).toEqual([{ title: "", body: "", image: "a.png" }]);
    expect(l.chapters).toEqual([{ title: "", lead: "", points: [{ title: "항목", body: "" }] }]);
    expect(l.timeline).toEqual([]);
    expect(l.specs).toEqual([{ label: "FE", value: "" }]);
  });

  it("채운 칸 수 · 비었는지", () => {
    expect(isLandingEmpty(EMPTY_LANDING)).toBe(true);
    expect(isLandingEmpty({ ...EMPTY_LANDING, facts: [{ value: "", label: "" }] })).toBe(true);
    const filled = { ...EMPTY_LANDING, tagline: "한 줄", specs: [{ label: "FE", value: "Next.js" }] };
    expect(isLandingEmpty(filled)).toBe(false);
    expect(landingFilledCount(filled)).toBe(2);
  });
});

describe("normalizeLandingFields (저장 API)", () => {
  it("랜딩 칸만 모양을 맞추고 다른 칸은 건드리지 않는다", () => {
    const fields: Record<string, unknown> = { title: "t", landing_ko: { tagline: "a", facts: [{ value: "", label: "" }] } };
    normalizeLandingFields(fields);
    expect(fields.title).toBe("t");
    expect(fields.landing_ko).toEqual({ ...EMPTY_LANDING, tagline: "a" });
    expect(fields).not.toHaveProperty("landing_en");
  });
});
