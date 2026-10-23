/**
 * 작업물 랜딩 페이지의 데이터 — 머리 한 줄(eyebrow), 첫 번호 앞의 장면들(hero), 번호 · 제목 · 설명이 붙은 섹션들.
 * 섹션 안의 항목은 랜딩 부품(components/works/landing/kit) 하나씩과 짝이다. 번호는 섹션 차례로 매긴다(저장하지 않는다).
 * works.landing(JSONB)에 담고, 비어 있으면 저장소의 기본 데이터(content/works/<slug>/landing.json)를 쓴다.
 */
export type LandingL10n = { ko: string; en: string };
export type LandingFrameAt = "bleed" | "wide" | "left" | "right" | "center";

export type LandingItem =
  /** 그림 · 영상 한 장 — at 은 폭 · 위치(화면 폭 전체 · 넓게 · 왼쪽 · 오른쪽 · 가운데) */
  | { kind: "frame"; at: LandingFrameAt; src?: string; video?: string; alt: LandingL10n; width?: number; height?: number }
  /** 스크롤로 흐르는 두 줄 띠(테마 · 배경화면) */
  | { kind: "marquee"; rows: { src: string; alt: LandingL10n }[][] }
  /** 화면에 붙어 스크롤로 넘기는 장면(시각 · 날씨) */
  | { kind: "sequence"; items: { src: string; alt: LandingL10n }[] }
  /** 구르는 3D 휴대폰 — 화면마다 녹화와 주소 줄 */
  | { kind: "phones"; items: { src: string; video?: string; alt: LandingL10n; route: LandingL10n }[] }
  /** 큰 숫자 몇 개 */
  | { kind: "numbers"; items: { value: string; label: LandingL10n }[] };

export type LandingItemKind = LandingItem["kind"];

export interface LandingSection {
  /** 편집 · 끌어 옮기기용 고유값 */
  id: string;
  title: LandingL10n;
  body?: LandingL10n;
  items: LandingItem[];
}

export interface WorkLanding {
  eyebrow: LandingL10n;
  hero: LandingItem[];
  sections: LandingSection[];
}

const AT: readonly LandingFrameAt[] = ["bleed", "wide", "left", "right", "center"];
const str = (v: unknown) => (typeof v === "string" ? v : "");
const l10n = (v: unknown): LandingL10n => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { ko: str(o.ko), en: str(o.en) };
};
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const media = (v: unknown) => { const o = obj(v); return { src: str(o.src), alt: l10n(o.alt) }; };

/** 한 항목 — 모르는 종류 · 빈 항목은 null(버린다) */
export function normalizeLandingItem(raw: unknown): LandingItem | null {
  const o = obj(raw);
  switch (o.kind) {
    case "frame": {
      const src = str(o.src) || undefined;
      const video = str(o.video) || undefined;
      if (!src && !video) return null;
      const at = AT.includes(o.at as LandingFrameAt) ? (o.at as LandingFrameAt) : "wide";
      return { kind: "frame", at, src, video, alt: l10n(o.alt), width: num(o.width), height: num(o.height) };
    }
    case "marquee": {
      const rows = arr(o.rows).map((row) => arr(row).map(media).filter((m) => m.src)).filter((row) => row.length > 0);
      return rows.length ? { kind: "marquee", rows } : null;
    }
    case "sequence": {
      const items = arr(o.items).map(media).filter((m) => m.src);
      return items.length ? { kind: "sequence", items } : null;
    }
    case "phones": {
      const items = arr(o.items).map((v) => {
        const p = obj(v);
        return { src: str(p.src), video: str(p.video) || undefined, alt: l10n(p.alt), route: l10n(p.route) };
      }).filter((p) => p.src);
      return items.length ? { kind: "phones", items } : null;
    }
    case "numbers": {
      const items = arr(o.items).map((v) => { const n = obj(v); return { value: str(n.value), label: l10n(n.label) }; }).filter((n) => n.value);
      return items.length ? { kind: "numbers", items } : null;
    }
    default:
      return null;
  }
}

/** 저장된 값을 믿지 않고 모양을 맞춘다 — 섹션이 하나도 없고 hero 도 비었으면 null(랜딩 데이터 없음) */
export function normalizeWorkLanding(raw: unknown): WorkLanding | null {
  if (!raw || typeof raw !== "object") return null;
  const o = obj(raw);
  const items = (v: unknown) => arr(v).map(normalizeLandingItem).filter((i): i is LandingItem => i !== null);
  const sections = arr(o.sections).map((v, i) => {
    const s = obj(v);
    return { id: str(s.id) || `s${i + 1}`, title: l10n(s.title), body: s.body ? l10n(s.body) : undefined, items: items(s.items) };
  });
  const hero = items(o.hero);
  if (sections.length === 0 && hero.length === 0) return null;
  return { eyebrow: l10n(o.eyebrow), hero, sections };
}

/** 섹션 번호 — 01, 02 … */
export const sectionNo = (index: number) => String(index + 1).padStart(2, "0");
