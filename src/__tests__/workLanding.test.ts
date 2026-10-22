import { describe, expect, it } from "vitest";
import { EMPTY_LANDING, isLandingEmpty, landingFilledCount, landingMediaOf, normalizeLanding, pruneLanding } from "@/types/workLanding";
import { normalizeLandingFields } from "@/lib/api/workLandingColumns";

/* 작업물 랜딩 페이지 내용(works.landing_ko / landing_en) — 제목 위 한 줄 · 미디어(그림 · 영상 / 데모, 칼럼 폭 / 화면 폭) */
describe("normalizeLanding", () => {
  it("빈 값 · 모양이 다른 값은 빈 랜딩이 된다", () => {
    expect(normalizeLanding(null)).toEqual(EMPTY_LANDING);
    expect(normalizeLanding({})).toEqual(EMPTY_LANDING);
    expect(normalizeLanding("x")).toEqual(EMPTY_LANDING);
    expect(normalizeLanding([1, 2])).toEqual(EMPTY_LANDING);
  });

  it("모르는 칸 · 모르는 데모는 버리고, 크기는 full 아니면 inset", () => {
    const l = normalizeLanding({
      eyebrow: "사이드 프로젝트", evil: "<script>",
      media: [{ src: " a.png ", size: "full", extra: 1 }, { demo: "translate", size: "wide" }, { demo: "nope" }],
    });
    expect(l).not.toHaveProperty("evil");
    expect(l.eyebrow).toBe("사이드 프로젝트");
    expect(l.media).toEqual([{ src: "a.png", size: "full" }, { demo: "translate", size: "inset" }, { size: "inset" }]);
  });

  it("예전 모양(tagline · facts …)이 남아 있어도 빈 랜딩으로 읽는다", () => {
    expect(normalizeLanding({ tagline: "옛 칸", facts: [{ value: "1", label: "x" }] })).toEqual(EMPTY_LANDING);
  });
});

describe("pruneLanding · 개수", () => {
  it("'추가'만 누르고 비워 둔 미디어를 덜어 낸다", () => {
    const l = pruneLanding({ eyebrow: "", media: [{ size: "inset" }, { size: "full", src: "a.png" }, { size: "inset", demo: "roles" }] });
    expect(l.media).toEqual([{ size: "full", src: "a.png" }, { size: "inset", demo: "roles" }]);
  });

  it("채운 칸 수 · 비었는지", () => {
    expect(isLandingEmpty(EMPTY_LANDING)).toBe(true);
    expect(isLandingEmpty({ eyebrow: "", media: [{ size: "inset" }] })).toBe(true);
    const filled = { eyebrow: "분류", media: [{ size: "inset" as const, src: "a.png" }] };
    expect(isLandingEmpty(filled)).toBe(false);
    expect(landingFilledCount(filled)).toBe(2);
  });
});

describe("landingMediaOf", () => {
  it("적어 둔 미디어가 있으면 그것을 쓴다", () => {
    expect(landingMediaOf({ eyebrow: "", media: [{ size: "full", src: "a.png" }] }, ["g1.png"])).toEqual([{ size: "full", src: "a.png" }]);
  });

  it("비어 있으면 갤러리 그림으로 — 모두 칼럼 폭(슬라이드를 가로로 자르지 않게)", () => {
    expect(landingMediaOf(EMPTY_LANDING, ["1", "", "3"])).toEqual([{ src: "1", size: "inset" }, { src: "3", size: "inset" }]);
  });
});

describe("normalizeLandingFields (저장 API)", () => {
  it("랜딩 칸만 모양을 맞추고 다른 칸은 건드리지 않는다", () => {
    const fields: Record<string, unknown> = { title: "t", landing_ko: { eyebrow: "a", media: [{ size: "inset" }] } };
    normalizeLandingFields(fields);
    expect(fields.title).toBe("t");
    expect(fields.landing_ko).toEqual({ eyebrow: "a", media: [] });
    expect(fields).not.toHaveProperty("landing_en");
  });
});
