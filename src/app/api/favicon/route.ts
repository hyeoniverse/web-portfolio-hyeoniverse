import { getSiteConfig } from "@/lib/getSiteConfig";

/** 다이내믹 SVG favicon — query ?variant=light|dark 로 단일 테마 SVG 반환.
 *  layout metadata 에서 prefers-color-scheme media 와 함께 두 URL 등록:
 *    /api/favicon?variant=light  (라이트 user 가 보는 favicon — bg = darkBg)
 *    /api/favicon?variant=dark   (다크 user 가 보는 favicon — bg = lightBg)
 *  SVG 안 @media 보다 <link media> 가 cross-browser 지원 안정적. */

export const dynamic = "force-dynamic";
export const revalidate = 0;

// SVG 안 값 escape
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  }[c]!));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") === "dark" ? "dark" : "light";

  const config = await getSiteConfig().catch(() => null);
  const logoText = ((config?.brand?.logoText ?? "H").trim() || "H").charAt(0);
  const logoUrl = config?.brand?.logoShortUrl || config?.brand?.logoShortDarkUrl || "";
  const shape = config?.brand?.faviconShape ?? "circle";
  // 로고 폰트가 favicon 도 결정 — 빈 값이면 brand 기본 (Instrument Serif)
  const logoFont = config?.brand?.logoFont || "'Instrument Serif', Georgia, serif";
  const weight = config?.brand?.faviconWeight ?? "light";
  const fontWeight = weight === "light" ? 300 : weight === "regular" ? 500 : 700;

  const presetLight = config?.brand?.logoColor || "#0a0a0a";
  const presetDark = config?.brand?.logoColorDark || "#f5f5f0";
  const faviconBgLight = config?.brand?.faviconBgLight || presetDark;
  const faviconBgDark = config?.brand?.faviconBgDark || presetLight;

  // light variant = 라이트 톤 favicon, dark variant = 다크 톤 favicon.
  // bg 는 brand.faviconBgLight/Dark 우선, 빈 값이면 preset 으로 자동 (light → preset.dark, dark → preset.light).
  // 글자색은 preset 의 반대 (light variant text = preset.light, dark variant text = preset.dark).
  // shape=none 일 땐 bg 없음 — text 는 logo 색 그대로
  const bg = variant === "light" ? faviconBgLight : faviconBgDark;
  const fg = shape === "none"
    ? (variant === "light" ? presetDark : presetLight)
    : (variant === "light" ? presetLight : presetDark);
  const finalBg = shape === "none" ? "transparent" : bg;

  const fontFamily = logoFont;
  const radius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;

  // 장평 — viewBox 중심 (16,16) 기준 scaleX. 빈/invalid 면 0.8 default
  const stretchRaw = parseFloat(config?.brand?.logoFontStretch ?? "");
  const stretchN = Number.isFinite(stretchRaw) && stretchRaw > 0 ? stretchRaw : 0.8;
  const textTransform = stretchN !== 1
    ? ` transform="translate(${16 * (1 - stretchN)} 0) scale(${stretchN} 1)"`
    : "";

  // 이미지 업로드된 경우 — SVG <image> (변형 없이 그대로)
  const inner = logoUrl
    ? `<image href="${esc(logoUrl)}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="${esc(fontFamily)}" font-size="20" font-weight="${fontWeight}" fill="${esc(fg)}"${textTransform}>${esc(logoText)}</text>`;

  const bgShape = shape === "none"
    ? ""
    : `<rect x="0" y="0" width="32" height="32" rx="${radius}" ry="${radius}" fill="${esc(finalBg)}" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">${bgShape}${inner}</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
