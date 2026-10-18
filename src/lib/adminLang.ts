import enAdmin from "@/locales/en.admin.json";
import { siteUiSource, siteUiSrcOf, validSiteUi, type SiteUiCache } from "@/lib/siteTranslation";
import { getAdminUi, registerAdminUiFetcher, setAdminUi, setAdminUiLoading } from "@/lib/siteLang";

/**
 * 관리자 화면 글(locales/en.admin.json)의 "다른 언어" 번역 — 사이트 언어(lib/siteLang)와 같은 언어를 쓴다.
 * 관리자 사전을 공개 화면 번들에 싣지 않으려고 lib/siteLang 과 떼어 두고, 관리 화면(AdminDictProvider)만 부른다.
 * 사전을 통째로 받지 않는다 — 화면이 찾은 관리자 열쇠(admin.*)를 lib/siteLang 이 모아 여기(fetchAdminUiKeys)로 넘긴다.
 * 받은 번역은 siteLang 스냅숏의 adminUi 로 넘겨 t() 가 얹는다. 저장은 메모리 + localStorage(문장마다 원문 해시가 같을 때만).
 * 받는 동안 · 실패하면 그 글은 영어 사전으로 보인다.
 */
const CACHE_PREFIX = "adminUi:";

let textsCache: Map<string, string> | null = null;
export function adminUiTexts(): ReadonlyMap<string, string> {
  return (textsCache ??= new Map(siteUiSource(enAdmin)));
}

const loaded = new Set<string>();

function readCache(lang: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lang);
    if (!raw) return null;
    const s = validSiteUi(adminUiTexts(), JSON.parse(raw));
    return Object.keys(s).length ? s : null;
  } catch { return null; }
}

/** 저장해 둔 관리자 화면 글 번역을 올린다 — 언어마다 한 번. 없는 글은 화면이 찾을 때 묻는다 */
export function loadAdminUi(lang: string) {
  if (loaded.has(lang)) return;
  loaded.add(lang);
  const stored = readCache(lang);
  if (stored) setAdminUi(lang, { ...stored, ...(getAdminUi(lang) ?? {}) });
}

/** 관리자 열쇠들의 번역을 받아 지금 것에 더한다 — 실패하면 그 글들은 영어로 남는다 */
export async function fetchAdminUiKeys(lang: string, keys: string[], fetcher: typeof fetch = fetch): Promise<void> {
  if (!keys.length) return;
  setAdminUiLoading(lang, true);
  try {
    const res = await fetcher("/api/admin/site-translate-ui", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, keys }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { strings?: unknown };
    const raw = data.strings && typeof data.strings === "object" ? (data.strings as Record<string, string>) : {};
    const texts = adminUiTexts();
    const got = validSiteUi(texts, { strings: raw, src: siteUiSrcOf(texts, Object.keys(raw)) });
    if (!Object.keys(got).length) return;
    const merged = { ...(getAdminUi(lang) ?? {}), ...got };
    setAdminUi(lang, merged);
    const cache: SiteUiCache = { strings: merged, src: siteUiSrcOf(texts, Object.keys(merged)) };
    try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(cache)); } catch { /* 메모리에만 */ }
  } catch {
    /* 그 글들은 영어로 남는다 */
  } finally {
    setAdminUiLoading(lang, false);
  }
}

/* 관리 화면에서 이 모듈을 불러오면(AdminDictProvider) 관리자 열쇠를 여기서 묻는다 */
registerAdminUiFetcher(fetchAdminUiKeys);

/** 테스트용 */
export function __resetAdminLangForTest() {
  loaded.clear();
  textsCache = null;
}
