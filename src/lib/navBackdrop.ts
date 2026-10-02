/**
 * nav 로고 바로 밑 배경이 어두운지 밝은지 — 업로드 이미지 로고의 변형을 고르는 데 쓴다(Navigation).
 *
 * 글자 로고는 mix-blend-mode: difference 로 어떤 배경에서도 보이지만, 이미지 로고는 색이 뒤집히지 않게 blend 를 끈다.
 * 그래서 로고 밑을 직접 잰다. 로고 한가운데 점에 겹친 요소를 위에서부터 보며 처음 답이 나오는 것을 쓴다.
 *  1. `data-nav-tone="dark|light"` — 요소가 스스로 밝기를 아는 경우(상세 커버는 검은 막까지 셈해 적어 둔다).
 *     그 요소 안쪽(커버 이미지 등)에 닿아도 이 값을 쓴다
 *  2. 이미지 — 로고가 덮는 구역의 밝기(lib/imageTone). 재는 동안은 모른다(null)
 *  3. 불투명한 배경색 — 그 색의 밝기
 * 영상 · 캔버스처럼 잴 수 없는 것을 만나면 모른다(null) — 그때는 테마를 따른다.
 */
import { parse, wcagLuminance } from "culori";
import { measureImageTone } from "@/lib/imageTone";

export type Tone = "dark" | "light";

/** 흰 글자와 검은 글자 중 흰 글자 대비가 더 큰 밝기 경계(상대 휘도) */
const LUMINANCE_SPLIT = 0.179;

/** 배경색 하나의 밝기. 거의 투명하면(뒤가 비친다) null */
export function colorTone(css: string): Tone | null {
  const c = parse(css);
  if (!c || (c.alpha ?? 1) < 0.5) return null;
  return wcagLuminance(c) < LUMINANCE_SPLIT ? "dark" : "light";
}

interface Rect { left: number; top: number; width: number; height: number }

/**
 * 로고 사각형이 덮는 이미지 구역(이미지 원본 기준 0~1). 이미지는 상자를 가운데 기준으로 덮어 채운다고 본다(object-fit: cover)
 */
export function coveredRegion(box: Rect, naturalW: number, naturalH: number, logo: Rect) {
  const scale = Math.max(box.width / naturalW, box.height / naturalH);
  const shownW = naturalW * scale;
  const shownH = naturalH * scale;
  const offX = box.left + (box.width - shownW) / 2;
  const offY = box.top + (box.height - shownH) / 2;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x0: clamp((logo.left - offX) / shownW),
    y0: clamp((logo.top - offY) / shownH),
    x1: clamp((logo.left + logo.width - offX) / shownW),
    y1: clamp((logo.top + logo.height - offY) / shownH),
  };
}

/** imageTone 에 넘길 원본 주소 — next/image 주소(`/_next/image?url=…`)면 원본을 꺼내고, 같은 사이트 주소는 경로만 남긴다
 *  (이미지 최적화는 사이트 밖 주소를 설정된 도메인만 받는다. 같은 사이트를 절대 주소로 주면 거절한다) */
function originalSrc(src: string): string {
  try {
    const u = new URL(src, location.href);
    if (u.pathname === "/_next/image") return u.searchParams.get("url") ?? src;
    if (u.origin === location.origin) return u.pathname + u.search;
  } catch {
    /* 주소가 아니면 그대로 */
  }
  return src;
}

/* 같은 이미지 · 비슷한 구역은 한 번만 잰다(스크롤마다 다시 재지 않게 구역을 10% 칸으로 맞춘다) */
const imageCache = new Map<string, Tone | null>();
const pending = new Map<string, Promise<void>>();

function imageTone(img: HTMLImageElement, logo: Rect, onMeasured: () => void): Tone | null | undefined {
  const src = img.currentSrc || img.src;
  if (!src || !img.naturalWidth) return undefined;
  const r = coveredRegion(img.getBoundingClientRect(), img.naturalWidth, img.naturalHeight, logo);
  const q = (v: number) => Math.round(v * 10) / 10;
  const region = { x0: q(r.x0), y0: q(r.y0), x1: Math.max(q(r.x1), q(r.x0) + 0.1), y1: Math.max(q(r.y1), q(r.y0) + 0.1) };
  const key = `${src}|${region.x0},${region.y0},${region.x1},${region.y1}`;
  if (imageCache.has(key)) return imageCache.get(key);
  if (!pending.has(key)) {
    pending.set(key, measureImageTone(originalSrc(src), region).then((tone) => {
      imageCache.set(key, tone);
      pending.delete(key);
      onMeasured();
    }));
  }
  return undefined;
}

/**
 * 로고 밑 배경의 밝기. 모르면 null(테마를 따른다).
 * skip 안의 요소(nav 자신)는 건너뛴다. 이미지를 재는 중이면 "pending" — 쓰는 쪽은 앞의 값을 그대로 두고,
 * 다 재면 onMeasured 가 불린다.
 */
export function backdropToneUnder(logo: Rect, skip: Element, onMeasured: () => void): Tone | null | "pending" {
  const x = logo.left + logo.width / 2;
  const y = logo.top + logo.height / 2;
  for (const el of document.elementsFromPoint(x, y)) {
    if (skip.contains(el)) continue;
    const declared = (el.closest("[data-nav-tone]") as HTMLElement | null)?.dataset.navTone;
    if (declared === "dark" || declared === "light") return declared;
    if (el instanceof HTMLImageElement) {
      if (!el.complete) return "pending"; // 받는 중
      if (!el.naturalWidth) continue; // 깨진 이미지 — 그 아래를 본다
      const tone = imageTone(el, logo, onMeasured);
      return tone === undefined ? "pending" : tone;
    }
    if (el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement || el instanceof HTMLIFrameElement) return null;
    const tone = colorTone(getComputedStyle(el).backgroundColor);
    if (tone) return tone;
  }
  return null;
}
