import sharp from "sharp";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  resolveFavicon,
  resolveFaviconShadow,
  faviconFilterString,
  faviconContentTransform,
  firstGrapheme,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  type FaviconShape,
  type FaviconWeight,
} from "@/lib/favicon";
import { symbolGlyphPath } from "@/lib/symbolGlyph";

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

/** 외부 이미지 URL 을 data URI 로. favicon 컨텍스트(브라우저 탭)는 SVG 안 외부 <image href>
 *  를 로드하지 않아 깨지므로, 서버에서 받아 base64 로 인라인 임베드한다. 실패 시 null. */
async function fetchAsDataUri(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const input = Buffer.from(await res.arrayBuffer());
    // favicon 용으로 축소 + PNG 재인코딩 — 탭 아이콘은 작으니 원본을 통째로 넣을 필요 없고(수백 KB 방지),
    // sharp 로 다시 굽는 김에 손상·비표준 PNG 도 정규화돼 브라우저 디코드 실패(엑박)를 막는다.
    const png = await sharp(input)
      .resize(128, 128, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") === "dark" ? "dark" : "light";

  const config = await getSiteConfig().catch(() => null);
  // 빈 값이면 "" — 글리프 없이 배경만(하드코딩 "H" 폴백 제거). 이모지 보존(grapheme).
  const logoText = firstGrapheme(config?.brand?.logoText);
  // variant 별로 알맞은 숏 로고 이미지 (다크 미설정 시 라이트 fallback)
  const logoUrl = (variant === "dark"
    ? config?.brand?.logoShortDarkUrl || config?.brand?.logoShortUrl
    : config?.brand?.logoShortUrl || config?.brand?.logoShortDarkUrl) || "";
  // 업로드 favicon 리컬러 색 — 모노 로고를 이 색으로 채움 (빈 값 = 원본)
  const logoTint = (variant === "dark" ? config?.brand?.logoShortColorDark : config?.brand?.logoShortColor) || "";
  // 업로드 favicon 전용 배경색(빈 값 = 투명) + 그림자 (로고 드롭 / 배경)
  const imgBg = (variant === "dark" ? config?.brand?.faviconImageBgDark : config?.brand?.faviconImageBgLight) || "";
  const imgShadow = resolveFaviconShadow(config?.brand?.faviconImageShadow ?? DEFAULT_FAVICON_TEXT_SHADOW);
  const imgBgShadow = imgBg ? resolveFaviconShadow(config?.brand?.faviconImageBgShadow ?? DEFAULT_FAVICON_BG_SHADOW) : null;

  const presetLight = config?.brand?.logoColor || "#0a0a0a";
  const presetDark = config?.brand?.logoColorDark || "#f5f5f0";

  const render = resolveFavicon(
    {
      shape: (config?.brand?.faviconShape ?? "circle") as FaviconShape,
      faviconRadius: config?.brand?.faviconRadius ?? "",
      faviconBgRatio: config?.brand?.faviconBgRatio ?? "1",
      weight: (config?.brand?.faviconWeight ?? "light") as FaviconWeight,
      logoText: config?.brand?.logoText ?? "",
      logoFont: config?.brand?.logoFont ?? "",
      logoFontStretch: config?.brand?.logoFontStretch ?? "",
      faviconBgLight: config?.brand?.faviconBgLight ?? "",
      faviconBgDark: config?.brand?.faviconBgDark ?? "",
      faviconBorderWidth: config?.brand?.faviconBorderWidth ?? "0",
      faviconBorderColorLight: config?.brand?.faviconBorderColorLight ?? "",
      faviconBorderColorDark: config?.brand?.faviconBorderColorDark ?? "",
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

  const tintId = `favicon-tint-${variant}`;
  const imgShadowId = `favicon-img-shadow-${variant}`;
  const imgBgShadowId = `favicon-img-bg-shadow-${variant}`;

  // 그림자 filter defs — enabled 인 것만
  const defsParts: string[] = [];
  if (render.textShadow) defsParts.push(faviconFilterString(render.textShadow, textShadowId));
  if (render.bgShadow) defsParts.push(faviconFilterString(render.bgShadow, bgShadowId));

  /* 텍스트 글리프 (이미지 없거나 이미지 로드 실패 시 폴백).
   *
   * 기호(✦ 등)는 글자가 아니라 외곽선으로 넣는다(#1048). 브라우저는 탭 아이콘을 그릴 때
   * 웹폰트를 받아오지 않아, `font-family` 만 적어 두면 기기에 깔린 글꼴로 대체돼 페이지와
   * 다른 모양이 된다. 게다가 브랜드 글꼴에는 그 기호가 아예 없어서 페이지 쪽도 대체 글꼴이
   * 그리고 있었다. 기호 글꼴을 갖춰 여기서 path 로 굳히면 어디서 그리든 같아진다.
   * 영문 워드마크처럼 기호 글꼴에 없는 글자는 예전 그대로 <text> 로 둔다 — 그건 브랜드 글꼴의 몫이다. */
  const glyphPath = symbolGlyphPath(logoText, render.fontSize, 16, 16);
  const textInner = glyphPath
    ? `<path d="${glyphPath}" fill="${esc(render.fgColor)}"${textTransform}${render.textShadow ? ` filter="url(#${textShadowId})"` : ""} />`
    : `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="${esc(render.fontFamily)}" font-size="${render.fontSize}" font-weight="${render.fontWeight}" fill="${esc(render.fgColor)}"${textTransform}${render.textShadow ? ` filter="url(#${textShadowId})"` : ""}>${esc(logoText)}</text>`;

  // 이미지 업로드된 경우 — data URI 인라인. logoTint 있으면 알파 유지한 채 그 색으로 채움(feFlood + SourceAlpha).
  // 로고 그림자(imgShadow)는 <g> 로 감싸 적용(SVG element 는 filter 하나뿐이라 tint 는 image, shadow 는 group).
  let inner = textInner;
  let hasImage = false;
  if (logoUrl) {
    const dataUri = await fetchAsDataUri(logoUrl);
    if (dataUri) {
      hasImage = true;
      if (logoTint) {
        defsParts.push(`<filter id="${tintId}" x="0" y="0" width="100%" height="100%"><feFlood flood-color="${esc(logoTint)}" result="f"/><feComposite in="f" in2="SourceAlpha" operator="in"/></filter>`);
      }
      let imageEl = `<image href="${dataUri}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet"${logoTint ? ` filter="url(#${tintId})"` : ""} />`;
      if (imgShadow) {
        defsParts.push(faviconFilterString(imgShadow, imgShadowId));
        imageEl = `<g filter="url(#${imgShadowId})">${imageEl}</g>`;
      }
      inner = imageEl;
    }
  }

  // 배경 rect 지오메트리 (종횡비 반영). rx=ry=radius 는 SVG 가 각 축 절반으로 clamp → 타원/스타디움 자연 생성.
  const bgRectAttrs = `x="${render.bgX}" y="${render.bgY}" width="${render.bgW}" height="${render.bgH}" rx="${render.radius}" ry="${render.radius}"`;
  const borderAttrs = render.borderWidth > 0 ? ` stroke="${esc(render.borderColor)}" stroke-width="${render.borderWidth}"` : "";

  // 업로드 favicon 배경 rect — 배경색 지정 시에만(빈 값 = 투명). 이미지 뒤에 깔고 배경 그림자 적용.
  let imgBgRect = "";
  if (hasImage && imgBg) {
    if (imgBgShadow) defsParts.push(faviconFilterString(imgBgShadow, imgBgShadowId));
    imgBgRect = `<rect ${bgRectAttrs} fill="${esc(imgBg)}"${borderAttrs}${imgBgShadow ? ` filter="url(#${imgBgShadowId})"` : ""} />`;
  }

  const defs = defsParts.length ? `<defs>${defsParts.join("")}</defs>` : "";

  // 텍스트 favicon 만 shape 배경. 이미지 favicon 배경은 위 imgBgRect(선택)로 처리.
  const bgShape = (render.hasBg && !hasImage)
    ? `<rect ${bgRectAttrs} fill="${esc(render.bgColor)}"${borderAttrs}${render.bgShadow ? ` filter="url(#${bgShadowId})"` : ""} />`
    : "";

  // 테두리가 배경 밖으로 안 잘리게 배경+콘텐츠를 축소해 감싸는 형태로
  const contentTransform = faviconContentTransform(render.contentScale);
  const content = `${bgShape}${imgBgRect}${inner}`;
  const wrapped = contentTransform ? `<g transform="${contentTransform}">${content}</g>` : content;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">${defs}${wrapped}</svg>`;

  /* 브라우저가 들고 있게 둔다(#1048). 예전에는 캐시를 완전히 끄고 화면 쪽에서 매번 `t=Date.now()`
     를 붙여, 페이지를 열 때마다 이 라우트가 돌고 그때마다 설정을 조회했다. 탭 아이콘이 그렇게
     자주 바뀔 일이 아니다.
     설정을 저장하면 FaviconSync 가 새 `v` 를 붙여 주소 자체를 바꾸므로, 캐시를 오래 잡아도
     바뀐 것이 바로 반영된다 — 캐시를 비우는 대신 다른 주소를 부르는 방식이다. */
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
