/**
 * Auto cover image — 키워드 기반 Unsplash/Pexels 검색으로 cover URL 자동 배정.
 *
 * 사용 시점:
 *  - 글 발행 시 (cover_image 가 비어 있을 때만)
 *  - admin 일괄 마이그레이션 (기존 published + cover-less 글들 일괄 처리)
 *
 * 정책:
 *  - Unsplash 우선, 실패/empty 면 Pexels fallback
 *  - landscape orientation 만 (배너/카드 fit 위해)
 *  - 첫 result 반환 (랜덤화 X — 일관된 재현성)
 *  - 한 번 배정되면 lock (호출자가 cover_image 비어 있을 때만 호출)
 */

import { getSecret } from "@/lib/getSecret";

interface AutoCoverOptions {
  /** 태그 / 카테고리 / 제목 등에서 추출한 키워드. 우선순위 순. */
  keywords: string[];
}

const UNSPLASH_API = "https://api.unsplash.com";
const PEXELS_API = "https://api.pexels.com/v1";

/** 키워드 배열을 단일 query string 으로 — 처음 1-2개만 사용 (정확도 ↑). */
function buildQuery(keywords: string[]): string {
  const cleaned = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 2);
  return cleaned.join(" ");
}

async function fetchUnsplash(query: string): Promise<string | null> {
  try {
    const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
    if (!accessKey) return null;
    const res = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&page=1&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data.results?.[0];
    return photo?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function fetchPexels(query: string): Promise<string | null> {
  try {
    const apiKey = await getSecret("PEXELS_API_KEY");
    if (!apiKey) return null;
    const res = await fetch(
      `${PEXELS_API}/search?query=${encodeURIComponent(query)}&page=1&per_page=1&orientation=landscape`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data.photos?.[0];
    return photo?.src?.large ?? photo?.src?.original ?? null;
  } catch {
    return null;
  }
}

/** 메인 entry — 키워드 → URL. 실패 시 null (caller 가 graceful 처리). */
export async function fetchAutoCoverImage(opts: AutoCoverOptions): Promise<string | null> {
  const query = buildQuery(opts.keywords);
  if (!query) return null;

  /* Unsplash 우선 → 실패 / empty → Pexels */
  const unsplash = await fetchUnsplash(query);
  if (unsplash) return unsplash;

  const pexels = await fetchPexels(query);
  if (pexels) return pexels;

  return null;
}

/** 글 데이터에서 검색 키워드 우선순위로 추출 (tags > category > title 첫 명사) */
export function extractKeywordsFromPost(post: {
  tags?: string[] | null;
  category?: string | null;
  title?: string | null;
  title_en?: string | null;
}): string[] {
  const keywords: string[] = [];

  /* 태그 — 가장 구체적 */
  if (post.tags && post.tags.length > 0) {
    keywords.push(...post.tags.slice(0, 2));
  }

  /* 카테고리 — 태그 다음 */
  if (post.category) {
    keywords.push(post.category);
  }

  /* 영문 제목 우선 (Unsplash/Pexels 는 영문 검색 정확도 ↑) */
  const title = post.title_en || post.title || "";
  if (title) {
    /* 단순 추출: 한글 단어 / 영문 명사 후보 (대문자 시작 또는 길이 3+) */
    const words = title.split(/\s+/).filter((w) => w.length >= 3 && /^[A-Za-z가-힣]/.test(w));
    if (words.length > 0) keywords.push(words[0]);
  }

  /* fallback */
  if (keywords.length === 0) keywords.push("abstract");

  return keywords;
}
