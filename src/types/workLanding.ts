/**
 * 작업물 랜딩 페이지 — 설정의 '작업물 상세 화면'을 랜딩 페이지로 고르면 상세가 이 내용으로 그려진다(WorkLanding).
 * 한 언어치 내용이고, DB 에는 works.landing_ko / landing_en(jsonb)로 둔다. 비어 있는 칸은 작업물의 다른 칸으로 채운다
 * (한 줄 소개 → 부제목, 소개 → 설명, 숫자 → 기간 · 기술 수 · 팀원 수, 기술 사양 → 기술 설명).
 * 구성은 MacFolio 의 프로젝트 소개 페이지(safari/hyeoniverse)를 따랐다.
 */

/** 숫자 요약 한 칸 — "16" · "사용한 기술" */
export interface LandingFact {
  value: string;
  label: string;
}

/** 기능 · 챕터 항목 — 제목 · 설명 · 이미지(선택) */
export interface LandingPoint {
  title: string;
  body: string;
  image?: string;
}

/** 챕터 — 번호가 붙은 큰 단락. 띠 배경을 번갈아 깐다 */
export interface LandingChapter {
  title: string;
  lead: string;
  points: LandingPoint[];
}

export interface LandingTimelineItem {
  date: string;
  label: string;
}

export interface LandingSpec {
  label: string;
  value: string;
}

export interface WorkLanding {
  /** 머리의 큰 한 줄 */
  tagline: string;
  /** 한눈에 보기 — 숫자 위의 소개 문단 */
  context: string;
  facts: LandingFact[];
  /** 주요 기능 */
  highlights: LandingPoint[];
  chapters: LandingChapter[];
  timeline: LandingTimelineItem[];
  specs: LandingSpec[];
}

export const EMPTY_LANDING: WorkLanding = {
  tagline: "",
  context: "",
  facts: [],
  highlights: [],
  chapters: [],
  timeline: [],
  specs: [],
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});

function point(v: unknown): LandingPoint {
  const o = obj(v);
  const image = str(o.image);
  return { title: str(o.title), body: str(o.body), ...(image ? { image } : {}) };
}

/** DB · 요청 본문의 값을 모양에 맞춘다 — 모르는 칸은 버리고 빠진 칸은 빈 값으로 */
export function normalizeLanding(raw: unknown): WorkLanding {
  const o = obj(raw);
  return {
    tagline: str(o.tagline),
    context: str(o.context),
    facts: arr(o.facts).map((f) => ({ value: str(obj(f).value), label: str(obj(f).label) })),
    highlights: arr(o.highlights).map(point),
    chapters: arr(o.chapters).map((c) => ({
      title: str(obj(c).title),
      lead: str(obj(c).lead),
      points: arr(obj(c).points).map(point),
    })),
    timeline: arr(o.timeline).map((t) => ({ date: str(obj(t).date), label: str(obj(t).label) })),
    specs: arr(o.specs).map((s) => ({ label: str(obj(s).label), value: str(obj(s).value) })),
  };
}

/** 저장 전에 빈 줄을 덜어 낸다 — 편집기에서 '추가'만 누르고 비워 둔 줄 */
export function pruneLanding(l: WorkLanding): WorkLanding {
  const filled = (p: LandingPoint) => !!(p.title.trim() || p.body.trim() || p.image?.trim());
  return {
    tagline: l.tagline,
    context: l.context,
    facts: l.facts.filter((f) => f.value.trim() || f.label.trim()),
    highlights: l.highlights.filter(filled),
    chapters: l.chapters
      .map((c) => ({ ...c, points: c.points.filter(filled) }))
      .filter((c) => c.title.trim() || c.lead.trim() || c.points.length > 0),
    timeline: l.timeline.filter((t) => t.date.trim() || t.label.trim()),
    specs: l.specs.filter((s) => s.label.trim() || s.value.trim()),
  };
}

/** 적어 둔 칸이 하나도 없는가 */
export function isLandingEmpty(l: WorkLanding): boolean {
  const p = pruneLanding(l);
  return !p.tagline.trim() && !p.context.trim() && p.facts.length === 0 && p.highlights.length === 0
    && p.chapters.length === 0 && p.timeline.length === 0 && p.specs.length === 0;
}

/** 채운 칸 수 — 편집기 요약 카드의 개수 */
export function landingFilledCount(l: WorkLanding): number {
  const p = pruneLanding(l);
  return [p.tagline.trim(), p.context.trim()].filter(Boolean).length
    + p.facts.length + p.highlights.length + p.chapters.length + p.timeline.length + p.specs.length;
}
