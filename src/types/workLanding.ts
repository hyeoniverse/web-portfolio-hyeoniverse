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

/** 보일 미디어 — 적어 둔 게 있으면 그것, 없으면 fallback 주소들(모두 칼럼 폭). 대표 화면은 따로 맨 위에 그린다 */
export function landingMediaOf(l: WorkLanding, fallback: string[]): LandingMedia[] {
  const p = pruneLanding(l);
  if (p.media.length > 0) return p.media;
  return fallback.filter(Boolean).map((src) => ({ src, size: "inset" }));
}

const MEDIA_EXT = /\.(jpe?g|png|webp|gif|avif|mp4|webm|mov|m4v)(\?|#|$)/i;

/**
 * 본문에 든 그림 · 영상 주소 — 미디어를 비웠을 때 랜딩이 쓰는 실제 화면 캡처 · 녹화.
 * (갤러리는 대개 발표 슬라이드라 랜딩이 슬라이드 넘겨 보기가 되어 버린다.) HTML 의 img · video · source,
 * 마크다운의 ![](주소)를 본문 차례대로, 같은 주소는 한 번만. 그림 · 영상 확장자가 아닌 것(svg · 아이콘 · data:)은 뺀다
 */
export function contentMediaOf(...contents: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /<(?:img|video|source)\b[^>]*?\bsrc=["']([^"']+)["']|!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/gi;
  for (const content of contents) {
    for (const m of (content ?? "").matchAll(re)) {
      const src = (m[1] ?? m[2] ?? "").trim();
      if (!src || src.startsWith("data:") || !MEDIA_EXT.test(src) || seen.has(src)) continue;
      seen.add(src);
      out.push(src);
    }
  }
  /* 실제 화면은 대개 사진 형식(jpg · webp)이나 녹화(mp4)이고, png 는 설명 그림(인포그래픽 카드)인 경우가 많다.
     실제 화면이 세 장 넘게 있으면 그것만 쓴다 — 설명 그림이 섞이면 다시 슬라이드 넘겨 보기가 된다 */
  const screens = out.filter((src) => SCREEN_EXT.test(src));
  return screens.length >= 3 ? screens : out;
}

const SCREEN_EXT = /\.(jpe?g|webp|avif|mp4|webm|mov|m4v)(\?|#|$)/i;
