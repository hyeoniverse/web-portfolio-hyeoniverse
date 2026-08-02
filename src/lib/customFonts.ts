/** 커스텀(업로드 / public 폴더) 폰트 — 런타임 @font-face 로 주입해 이름으로 선택·렌더한다.
 *  모든 선택 폰트가 Google Fonts 였던 구조에, 로컬/업로드 폰트를 얹기 위한 최소 레이어. */
export interface CustomFont {
  /** font-family 이름 — 선택값·@font-face 와 일치 (예: "Partial Sans") */
  name: string;
  /** 폰트 파일 URL — Supabase Storage(업로드) 또는 /fonts/... (public 빌드 스캔) */
  url: string;
  /** @font-face format() — woff2 | woff | truetype | opentype */
  format?: string;
}

const injected = new Set<string>();

/** @font-face 를 <head> 에 1회 주입 (이름 기준 dedupe). 클라이언트 전용, SSR 에선 no-op. */
export function injectFontFace(font: CustomFont): void {
  if (typeof document === "undefined") return;
  if (!font?.name || !font?.url || injected.has(font.name)) return;
  injected.add(font.name);
  const family = font.name.replace(/["\\]/g, "");
  const fmt = font.format ? ` format("${font.format}")` : "";
  const style = document.createElement("style");
  style.dataset.customFont = family;
  style.textContent = `@font-face{font-family:"${family}";src:url("${font.url}")${fmt};font-display:swap;}`;
  document.head.appendChild(style);
}

/** 로컬(빌드 스캔) + 업로드(DB) 병합 — 이름 중복은 뒤(업로드)가 우선. 유효 항목만. */
export function mergeCustomFonts(
  local: CustomFont[],
  uploaded: CustomFont[],
): CustomFont[] {
  const map = new Map<string, CustomFont>();
  for (const f of [...local, ...uploaded]) {
    if (f?.name && f?.url) map.set(f.name, f);
  }
  return Array.from(map.values());
}

/** 파일 확장자 → @font-face format() 값 (없으면 undefined) */
export function fontFormatFromExt(ext: string): string | undefined {
  switch (ext.toLowerCase().replace(/^\./, "")) {
    case "woff2":
      return "woff2";
    case "woff":
      return "woff";
    case "ttf":
      return "truetype";
    case "otf":
      return "opentype";
    default:
      return undefined;
  }
}
