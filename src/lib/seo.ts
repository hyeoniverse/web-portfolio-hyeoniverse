import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/getSiteConfig";

/* ── 검색 · 공유용 메타데이터 ──
   대표 주소는 SITE_URL(운영은 www). blog.hyeoniverse.com 도 같은 글을 보여 주므로 canonical 은 늘 이 주소로 모은다.
   루트 레이아웃에 canonical 을 두면 그것만 쓰는 페이지가 전부 홈을 가리키게 되므로, canonical 은 페이지마다 pageMetadata 로 단다. */

function toOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export const SITE_ORIGIN = toOrigin(process.env.SITE_URL) ?? "https://www.hyeoniverse.com";

/** 공유 카드 기본 그림 — 커버가 없는 페이지에 쓴다(public/og-default.png, 1200×630) */
export const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630, alt: "HYEONIVERSE" };

/** 커버 없는 글의 공유 카드 주소(app/og/posts/[slug]) — 화면에서도 쓰여 lib/postCover 에 둔다 */
export { postCardImagePath } from "@/lib/postCover";

/** 공유 카드에 쓸 수 있는 그림 주소만 — 커버 칸에는 동영상(mp4 · webm)도 들어온다 */
export function ogImageOf(src: string | null | undefined): string | null {
  if (!src) return null;
  const path = src.split(/[?#]/)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return null;
  return src;
}

interface PageMetaInput {
  /** 탭 제목의 페이지 부분 — 루트 템플릿이 "사이트 이름 | 제목" 으로 감싼다. 비우면 사이트 이름만 */
  title?: string;
  /** 공유 카드 제목을 탭 제목과 달리 할 때(홈은 탭이 "… | Home", 카드는 사이트 이름만) */
  shareTitle?: string;
  description?: string;
  /** 이 페이지의 경로(/posts/abc) — canonical · og:url */
  path: string;
  image?: string | null;
  /** 커버가 없을 때 쓸 그림(글 제목 카드 등) — 없으면 사이트 기본 그림 */
  fallbackImage?: { url: string; alt?: string } | null;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

/** 페이지 메타데이터 — title · description · canonical · og · twitter 를 한 번에.
 *  openGraph 는 레이아웃 것과 얕게 합쳐져 통째로 바뀌므로 siteName · locale 까지 여기서 다시 단다 */
export async function pageMetadata({ title, shareTitle, description, path, image, fallbackImage, type = "website", publishedTime, modifiedTime }: PageMetaInput): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.metadata.title || "HYEONIVERSE";
  const fullTitle = shareTitle ?? (title ? `${siteName} | ${title}` : siteName);
  const desc = description || cfg.metadata.description;
  const ogImage = ogImageOf(image);
  const images = ogImage
    ? [ogImage]
    : fallbackImage
      ? [{ url: fallbackImage.url, width: 1200, height: 630, alt: fallbackImage.alt ?? siteName }]
      : [DEFAULT_OG_IMAGE];
  return {
    ...(title ? { title } : {}),
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description: desc,
      url: path,
      siteName,
      locale: cfg.metadata.locale,
      type,
      images,
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images,
    },
  };
}

/** JSON-LD 를 script 로 그릴 때 — `<` 를 풀어 써서 본문의 `</script>` 가 태그를 닫지 못하게 한다 */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
