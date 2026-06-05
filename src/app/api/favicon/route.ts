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
  const font = config?.brand?.faviconFont ?? "serif";
  const weight = config?.brand?.faviconWeight ?? "light";
  const fontWeight = weight === "light" ? 300 : weight === "regular" ? 500 : 700;

  const lightBg = config?.theme?.lightBg || "#f5f5f0";
  const darkBg = config?.theme?.darkBg || "#0a0a0a";
  const lightFg = config?.brand?.logoColor || "#0a0a0a";
  const darkFg = config?.brand?.logoColorDark || "#f5f5f0";

  // 색 매핑 — favicon 은 페이지 테마와 같은 변형 (페이지의 미니 로고).
  //   light variant → bg=lightBg, text=logoColor (dark text on light bg)
  //   dark variant → bg=darkBg, text=logoColorDark (light text on dark bg)
  const bg = variant === "light" ? lightBg : darkBg;
  const fg = variant === "light" ? lightFg : darkFg;
  const finalBg = shape === "none" ? "transparent" : bg;

  const fontFamily = font === "serif" ? "Georgia, serif" : font === "mono" ? "Menlo, monospace" : "system-ui, sans-serif";
  const radius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;

  // 이미지 업로드된 경우 — SVG <image> (변형 없이 그대로)
  const inner = logoUrl
    ? `<image href="${esc(logoUrl)}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="${esc(fontFamily)}" font-size="20" font-weight="${fontWeight}" fill="${esc(fg)}">${esc(logoText)}</text>`;

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
