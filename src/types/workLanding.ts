/**
 * 작업물 랜딩 페이지 — 설정의 '작업물 상세 화면'을 랜딩 페이지로 고르면 상세가 이 내용으로 그려진다(WorkLanding).
 * andreasantonsson.dev 의 프로젝트 페이지처럼 글 없이 그림 위주다 — 큰 제목 · 정보 한 줄 아래로 미디어가 이어진다.
 * 한 언어치 내용이고, DB 에는 works.landing_ko / landing_en(jsonb)로 둔다.
 * 미디어를 비워 두면 대표 화면 뒤에 갤러리 그림으로 채운다(landingMediaOf).
 */

/** 미디어 자리에 띄울 수 있는 상호작용 데모 — components/works/landing/demos.
 *  AI 넷은 실제 API(/api/demo/*, 하루 상한)를 부르고, 나머지는 화면 안에서만 돈다 */
export const LANDING_DEMOS = [
  "translate", "summary", "cover", "speech",
  "slides", "wave", "convert",
  "autosave", "lifecycle", "comments", "invite", "roles", "kitchen", "mailbox", "providers",
  "themes", "layouts",
] as const;
export type LandingDemo = (typeof LANDING_DEMOS)[number];

/** 미디어 크기 — inset: 칼럼 폭(1128px), full: 화면 폭을 채우는 가로로 긴 컷 */
export const LANDING_MEDIA_SIZES = ["inset", "full"] as const;
export type LandingMediaSize = (typeof LANDING_MEDIA_SIZES)[number];

/** 미디어 한 칸 — 그림 · 영상 주소(src) 또는 데모. 데모가 있으면 데모를 띄운다 */
export interface LandingMedia {
  src?: string;
  demo?: LandingDemo;
  size: LandingMediaSize;
}

export interface WorkLanding {
  /** 제목 위 한 줄 — 비우면 부제목 */
  eyebrow: string;
  media: LandingMedia[];
}

export const EMPTY_LANDING: WorkLanding = { eyebrow: "", media: [] };

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});
const isDemo = (v: unknown): v is LandingDemo => (LANDING_DEMOS as readonly unknown[]).includes(v);

function media(v: unknown): LandingMedia {
  const o = obj(v);
  const src = str(o.src).trim();
  return {
    ...(src ? { src } : {}),
    ...(isDemo(o.demo) ? { demo: o.demo } : {}),
    size: o.size === "full" ? "full" : "inset",
  };
}

/** DB · 요청 본문의 값을 모양에 맞춘다 — 모르는 칸은 버리고 빠진 칸은 빈 값으로 */
export function normalizeLanding(raw: unknown): WorkLanding {
  const o = obj(raw);
  return { eyebrow: str(o.eyebrow), media: arr(o.media).map(media) };
}

/** 저장 전에 빈 줄을 덜어 낸다 — 편집기에서 '추가'만 누르고 비워 둔 줄 */
export function pruneLanding(l: WorkLanding): WorkLanding {
  return { eyebrow: l.eyebrow, media: l.media.filter((m) => !!(m.src?.trim() || m.demo)) };
}

/** 적어 둔 칸이 하나도 없는가 */
export function isLandingEmpty(l: WorkLanding): boolean {
  const p = pruneLanding(l);
  return !p.eyebrow.trim() && p.media.length === 0;
}

/** 채운 칸 수 — 편집기 요약 카드의 개수 */
export function landingFilledCount(l: WorkLanding): number {
  const p = pruneLanding(l);
  return (p.eyebrow.trim() ? 1 : 0) + p.media.length;
}

/** 보일 미디어 — 적어 둔 게 있으면 그것, 없으면 갤러리 그림(모두 칼럼 폭 — 갤러리는 대개 글이 든 슬라이드라 가로로 자르면 잘린다).
 *  대표 화면은 따로 맨 위에 그린다 */
export function landingMediaOf(l: WorkLanding, gallery: string[]): LandingMedia[] {
  const p = pruneLanding(l);
  if (p.media.length > 0) return p.media;
  return gallery.filter(Boolean).map((src) => ({ src, size: "inset" }));
}
