import enAdmin from "@/locales/en.admin.json";
import { adminUiHash, sanitizeSiteUi, siteUiSource, type SiteUiSource } from "@/lib/siteTranslation";
import { setAdminUi, setAdminUiLoading } from "@/lib/siteLang";

/**
 * 관리자 화면 글(locales/en.admin.json)의 "다른 언어" 번역 — 사이트 언어(lib/siteLang)와 같은 언어를 쓴다.
 * 관리자 사전을 공개 화면 번들에 싣지 않으려고 lib/siteLang 과 떼어 두고, 관리 화면(AdminDictProvider)만 부른다.
 * 받은 번역은 siteLang 스냅숏의 adminUi 로 넘겨 t() 가 얹는다. 저장은 메모리 + localStorage(해시가 지금 사전과 같을 때만).
 * 받는 동안 · 실패하면 관리자 글은 영어 사전으로 보인다.
 */
const CACHE_PREFIX = "adminUi:";

let sourceCache: { source: SiteUiSource; hash: string } | null = null;
export function adminUiSourceInfo() {
  if (!sourceCache) {
    const source = siteUiSource(enAdmin);
    sourceCache = { source, hash: adminUiHash(source) };
  }
  return sourceCache;
}

/* 실패한 언어는 이번 방문 동안 다시 묻지 않는다 */
const done = new Set<string>();
const inflight = new Set<string>();

function readCache(lang: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lang);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { h?: unknown; s?: unknown };
    const { source, hash } = adminUiSourceInfo();
    if (parsed.h !== hash) return null;
    const s = sanitizeSiteUi(source, parsed.s);
    return Object.keys(s).length ? s : null;
  } catch { return null; }
}

/** 지금 언어의 관리자 화면 글 번역을 받아 온다 — 이미 있거나 받는 중 · 실패했으면 아무것도 안 한다 */
export async function ensureAdminUi(lang: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (done.has(lang) || inflight.has(lang)) return;
  const stored = readCache(lang);
  if (stored) {
    done.add(lang);
    setAdminUi(lang, stored);
    return;
  }
  inflight.add(lang);
  setAdminUiLoading(lang, true);
  try {
    const res = await fetcher("/api/admin/site-translate-ui", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    done.add(lang);
    if (!res.ok) return;
    const data = (await res.json()) as { strings?: unknown; hash?: unknown; complete?: unknown };
    const { source, hash } = adminUiSourceInfo();
    const strings = sanitizeSiteUi(source, data.strings);
    setAdminUi(lang, strings);
    if (data.complete === true && data.hash === hash) {
      try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify({ h: hash, s: strings })); } catch { /* 메모리에만 */ }
    }
  } catch {
    done.add(lang);
  } finally {
    inflight.delete(lang);
    setAdminUiLoading(lang, false);
  }
}

/** 테스트용 */
export function __resetAdminLangForTest() {
  done.clear();
  inflight.clear();
  sourceCache = null;
}
