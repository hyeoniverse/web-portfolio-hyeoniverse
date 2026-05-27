import { getSiteConfig } from "@/lib/getSiteConfig";

/** 다이내믹 SVG favicon — prefers-color-scheme 으로 viewer 시스템 테마에 따라 bg 반전.
 *  light user → darkBg, dark user → lightBg (페이지 색과 반대 → favicon 가독성 보장).
 *  로고 이미지 업로드되어 있으면 그 이미지 그대로 (테마 무관). */

export const dynamic = "force-dynamic";
export const revalidate = 0;

// SVG 안 사용자 입력 색상 / 텍스트 sanitize — 따옴표 / 꺽쇠 단순 escape
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  }[c]!));
}

export async function GET() {
  const config = await getSiteConfig().catch(() => null);
  const logoText = ((config?.brand?.logoText ?? "H").trim() || "H").charAt(0);
  const logoUrl = config?.brand?.logoShortUrl || config?.brand?.logoShortDarkUrl || "";
  const shape = config?.brand?.faviconShape ?? "circle";
  const font = config?.brand?.faviconFont ?? "serif";

  // bg / fg 색 — 페이지 테마와 반대 (가독성)
  const lightBg = config?.theme?.lightBg || "#f5f5f0";
  const darkBg = config?.theme?.darkBg || "#0a0a0a";
  const lightFg = config?.brand?.logoColor || "#0a0a0a"; // light 페이지 텍스트 색
  const darkFg = config?.brand?.logoColorDark || "#f5f5f0"; // dark 페이지 텍스트 색

  // light user 시점 — favicon bg = darkBg, text = darkFg (dark 테마용 텍스트색)
  // dark user 시점 — favicon bg = lightBg, text = lightFg
  const bgLightUser = shape === "none" ? "transparent" : darkBg;
  const bgDarkUser = shape === "none" ? "transparent" : lightBg;
  const fgLightUser = darkFg;
  const fgDarkUser = lightFg;

  const fontFamily = font === "serif" ? "Georgia, serif" : font === "mono" ? "Menlo, monospace" : "system-ui, sans-serif";
  const radius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;

  // 이미지 업로드된 경우 — SVG <image> 로 (테마 무관, 단일 이미지)
  const inner = logoUrl
    ? `<image href="${esc(logoUrl)}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="16" y="16" text-anchor="middle" dominant-baseline="central" font-family="${esc(fontFamily)}" font-size="22" font-weight="700" letter-spacing="-1" class="fg">${esc(logoText)}</text>`;

  const bgShape = shape === "none"
    ? "" // bg 없음
    : `<rect class="bg" x="0" y="0" width="32" height="32" rx="${radius}" ry="${radius}" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <style>
    .bg { fill: ${esc(bgLightUser)}; }
    .fg { fill: ${esc(fgLightUser)}; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: ${esc(bgDarkUser)}; }
      .fg { fill: ${esc(fgDarkUser)}; }
    }
  </style>
  ${bgShape}
  ${inner}
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
