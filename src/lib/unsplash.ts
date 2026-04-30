import { getSecret } from "@/lib/getSecret";

const UNSPLASH_API = "https://api.unsplash.com";

/** 검색에 도움 안 되는 영어 stopwords */
const STOPWORDS = new Set([
  "how", "the", "a", "an", "into", "to", "of", "for", "with", "and", "or",
  "in", "on", "at", "by", "from", "is", "are", "was", "were", "this", "that",
  "what", "why", "when", "where", "who", "diving", "deep", "step", "intro",
  "meeting", "finding", "managing", "designing", "building", "starting",
  "real", "first", "next", "your", "my", "their", "ritual", "workflow",
]);

/** 풀 문장 → Unsplash 가 잘 검색되는 짧은 keyword 형태로 단계적 단순화 */
function buildQueryCandidates(raw: string): string[] {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const significant = cleaned.filter((w) => !STOPWORDS.has(w) && w.length > 1);

  const candidates: string[] = [];
  if (raw && raw.trim()) candidates.push(raw.trim());                 // 1) 원본
  if (significant.length >= 2) candidates.push(significant.slice(0, 2).join(" ")); // 2) 의미어 2개
  if (significant.length >= 1) candidates.push(significant[0]);       // 3) 첫 의미어
  // 중복 제거
  return Array.from(new Set(candidates));
}

async function fetchOne(query: string, accessKey: string): Promise<string | null> {
  const res = await fetch(
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&page=1&per_page=1&orientation=squarish`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) {
    console.warn(`[unsplash] HTTP ${res.status} for "${query}" — likely rate limit (50/hr demo)`);
    return null;
  }
  const data = await res.json() as {
    results?: Array<{ urls?: { regular?: string; small?: string } }>;
  };
  return data.results?.[0]?.urls?.regular || data.results?.[0]?.urls?.small || null;
}

/**
 * 시드 query 에서 단계적으로 단순화하면서 첫 번째 결과 URL 반환.
 * "How React Rendering Works" → "react rendering" → "react" 순으로 fallback.
 */
export async function fetchUnsplashCover(query: string): Promise<string | null> {
  if (!query) return null;
  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) return null;

  const candidates = buildQueryCandidates(query);
  for (const q of candidates) {
    try {
      const url = await fetchOne(q, accessKey);
      if (url) return url;
    } catch {
      // 단일 후보 실패 — 다음으로 진행
    }
  }
  return null;
}
