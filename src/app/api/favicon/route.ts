import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  resolveFavicon,
  faviconFilterString,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  type FaviconShape,
  type FaviconWeight,
} from "@/lib/favicon";

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

  const presetLight = config?.brand?.logoColor || "#0a0a0a";
  const presetDark = config?.brand?.logoColorDark || "#f5f5f0";

  const render = resolveFavicon(
    {
      shape: (config?.brand?.faviconShape ?? "circle") as FaviconShape,
      weight: (config?.brand?.faviconWeight ?? "light") as FaviconWeight,
      logoText: config?.brand?.logoText ?? "H",
      logoFont: config?.brand?.logoFont ?? "",
      logoFontStretch: config?.brand?.logoFontStretch ?? "",
      faviconBgLight: config?.brand?.faviconBgLight ?? "",
      faviconBgDark: config?.brand?.faviconBgDark ?? "",
      faviconFontSize: config?.brand?.faviconFontSize ?? "20",
      faviconColor: config?.brand?.faviconColor ?? "",
      faviconColorDark: config?.brand?.faviconColorDark ?? "",
      faviconTextShadow: config?.brand?.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW,
      faviconBgShadow: config?.brand?.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW,
      presetLight,
      presetDark,
    },
    variant,
  );

  const textTransform = render.transform ? ` transform="${render.transform}"` : "";
  const textShadowId = `favicon-text-shadow-${variant}`;
  const bgShadowId = `favicon-bg-shadow-${variant}`;

  // 그림자 filter defs — enabled 인 것만
  const defsParts: string[] = [];
  if (render.textShadow) defsParts.push(faviconFilterString(render.textShadow, textShadowId));
  if (render.bgShadow) defsParts.push(faviconFilterString(render.bgShadow, bgShadowId));
  const defs = defsParts.length ? `<defs>${defsParts.join("")}</defs>` : "";

  // 이미지 업로드된 경우 — SVG <image> (변형/그림자 없이 그대로)
  const inner = logoUrl
    ? `<image href="${esc(logoUrl)}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="${esc(render.fontFamily)}" font-size="${render.fontSize}" font-weight="${render.fontWeight}" fill="${esc(render.fgColor)}"${textTransform}${render.textShadow ? ` filter="url(#${textShadowId})"` : ""}>${esc(logoText)}</text>`;

  const bgShape = !render.hasBg
    ? ""
    : `<rect x="0" y="0" width="32" height="32" rx="${render.radius}" ry="${render.radius}" fill="${esc(render.bgColor)}"${render.bgShadow ? ` filter="url(#${bgShadowId})"` : ""} />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">${defs}${bgShape}${inner}</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
