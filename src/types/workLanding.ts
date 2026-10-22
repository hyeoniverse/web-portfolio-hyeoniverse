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

/** 항목에 붙일 수 있는 상호작용 데모 — 랜딩 페이지가 그 자리에 직접 만져 보는 화면을 띄운다(components/works/landing/demos).
 *  AI 넷은 실제 API(/api/demo/*, 하루 상한)를 부르고, 나머지는 화면 안에서만 돈다 */
export const LANDING_DEMOS = [
  "translate", "summary", "cover", "speech",
  "slides", "wave", "convert",
  "autosave", "lifecycle", "comments", "invite", "roles", "kitchen", "mailbox", "providers",
  "themes", "layouts",
] as const;
export type LandingDemo = (typeof LANDING_DEMOS)[number];

/** 기능 · 챕터 항목 — 제목 · 설명 · 미디어(그림 · 영상 주소, 선택) · 데모(선택). 데모가 있으면 미디어 대신 데모를 띄운다 */
export interface LandingPoint {
  title: string;
  body: string;
  image?: string;
  demo?: LandingDemo;
}

/** 챕터 모양 — list: 두 칸 카드, bento: 크기가 다른 칸, stage: 항목마다 큰 무대(데모를 크게) */
export const LANDING_CHAPTER_LOOKS = ["list", "bento", "stage"] as const;
export type LandingChapterLook = (typeof LANDING_CHAPTER_LOOKS)[number];

/** 챕터 — 번호가 붙은 큰 단락. 띠 배경을 번갈아 깐다 */
export interface LandingChapter {
  title: string;
  lead: string;
  points: LandingPoint[];
  look?: LandingChapterLook;
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

const isDemo = (v: unknown): v is LandingDemo => (LANDING_DEMOS as readonly unknown[]).includes(v);
const isLook = (v: unknown): v is LandingChapterLook => (LANDING_CHAPTER_LOOKS as readonly unknown[]).includes(v);

function point(v: unknown): LandingPoint {
  const o = obj(v);
  const image = str(o.image);
  return { title: str(o.title), body: str(o.body), ...(image ? { image } : {}), ...(isDemo(o.demo) ? { demo: o.demo } : {}) };
}

/** DB · 요청 본문의 값을 모양에 맞춘다 — 모르는 칸은 버리고 빠진 칸은 빈 값으로 */
export function normalizeLanding(raw: unknown): WorkLanding {
  const o = obj(raw);
  return {
    tagline: str(o.tagline),
    context: str(o.context),
    facts: arr(o.facts).map((f) => ({ value: str(obj(f).value), label: str(obj(f).label) })),
    highlights: arr(o.highlights).map(point),
    chapters: arr(o.chapters).map((c) => {
      const look = obj(c).look;
      return {
        title: str(obj(c).title),
        lead: str(obj(c).lead),
        points: arr(obj(c).points).map(point),
        ...(isLook(look) && look !== "list" ? { look } : {}),
      };
    }),
    timeline: arr(o.timeline).map((t) => ({ date: str(obj(t).date), label: str(obj(t).label) })),
    specs: arr(o.specs).map((s) => ({ label: str(obj(s).label), value: str(obj(s).value) })),
  };
}

/** 저장 전에 빈 줄을 덜어 낸다 — 편집기에서 '추가'만 누르고 비워 둔 줄 */
export function pruneLanding(l: WorkLanding): WorkLanding {
  const filled = (p: LandingPoint) => !!(p.title.trim() || p.body.trim() || p.image?.trim() || p.demo);
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
