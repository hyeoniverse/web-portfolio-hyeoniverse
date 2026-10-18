import en from "@/locales/en.json";
import { matchVisitorLanguage, normalizeTranslationLang } from "@/lib/translationLanguages";
import { isForeignSiteLanguage } from "@/lib/siteLanguage";
import { SITE_UI_KEYS_MAX, siteUiSource, siteUiSrcOf, validSiteUi, type SiteUiCache } from "@/lib/siteTranslation";

/**
 * 방문자가 고른 "다른 언어" — 사이트 전체가 나눠 쓰는 하나의 상태(브라우저 쪽 저장소).
 *
 * 내비게이션의 🌐 메뉴 · 글/작업물 상세의 메뉴 · 상세 본문 번역(useContentTranslation) · 목록 카드 · 화면 글(t)이
 * 모두 여기를 구독한다. 어느 화면에서 고르든 다른 화면에도 그대로 걸린다.
 *
 * 처음 언어: 저장된 선택(CONTENT_LANG_STORAGE_KEY — 상세 화면이 쓰던 열쇠 그대로) › 브라우저 언어.
 * "original" 이면 번역하지 않는다. 서버 · 하이드레이션 때는 늘 꺼진 상태(SERVER_SNAPSHOT) — 화면은 ko/en 으로
 * 먼저 그려지고, 하이드레이션 뒤 저장된 번역(localStorage)으로 곧장 바뀐다.
 *
 * 화면 글 번역은 사전을 통째로 받지 않는다 — t() 가 번역에 없는 열쇠를 만나면(requestSiteUiKey) 모아 두었다가
 * 잠깐 뒤 그 열쇠만 묻는다(보는 화면의 글만). 받은 것은 언어마다 메모리 + localStorage(문장마다 원문 해시가 같을 때만 쓴다)에
 * 쌓여 화면을 옮겨도 다시 받지 않는다. 서버는 /api/site-translate/ui, 관리자 사전 열쇠(admin.*)는 lib/adminLang.
 */
export const CONTENT_LANG_STORAGE_KEY = "contentTranslateLang";
const ORIGINAL = "original";
const UI_CACHE_PREFIX = "siteUi:";

type SiteUiStatus = "idle" | "loading" | "ready" | "failed" | "rateLimited";

export interface SiteLangSnapshot {
  /** 지금 걸린 언어 — null 이면 원문(ko/en) */
  lang: string | null;
  /** 저장된 선택이 아니라 브라우저 언어로 건 것 — 서버 설정 때문에 못 하면 조용히 물러난다 */
  auto: boolean;
  /** 지금 언어의 화면 글 번역 — 받은 만큼(열쇠 → 글). 하나도 없으면 null */
  ui: Readonly<Record<string, string>> | null;
  uiStatus: SiteUiStatus;
  /** 지금 언어의 사이트 내용 글 번역(원문 → 글, lib/siteContent — 홈 글 · 카테고리 · 태그) — 아직 없으면 null */
  content: Readonly<Record<string, string>> | null;
  /** 지금 언어의 관리자 화면 글 번역(lib/adminLang — 관리 화면에서만 받는다) — 아직 없으면 null */
  adminUi: Readonly<Record<string, string>> | null;
  /** 관리자 화면 글 번역을 받는 중인가 */
  adminUiLoading: boolean;
}

const SERVER_SNAPSHOT: SiteLangSnapshot = { lang: null, auto: false, ui: null, uiStatus: "idle", content: null, adminUi: null, adminUiLoading: false };

/** 저장된 선택 › 사이트 기본 언어(ko · en 밖일 때) › 브라우저 언어 — 순수 함수(테스트용으로 뗀다) */
export function resolveInitialLang(
  saved: string | null,
  browserLangs: readonly string[],
  siteDefault: string | null = null,
): { lang: string | null; auto: boolean } {
  if (saved === ORIGINAL) return { lang: null, auto: false };
  const fromSaved = normalizeTranslationLang(saved);
  if (fromSaved) return { lang: fromSaved, auto: false };
  /* 기본 언어도 고른 것이 아니라 자동으로 건 것 — 번역이 막힌 사이트면 조용히 영어로 물러난다 */
  const fromSite = isForeignSiteLanguage(siteDefault) ? normalizeTranslationLang(siteDefault) : null;
  if (fromSite) return { lang: fromSite, auto: true };
  return { lang: matchVisitorLanguage(browserLangs), auto: true };
}

function readSaved(): string | null {
  try { return localStorage.getItem(CONTENT_LANG_STORAGE_KEY); } catch { return null; }
}
function writeSaved(v: string) {
  try { localStorage.setItem(CONTENT_LANG_STORAGE_KEY, v); } catch { /* 저장소를 못 쓰면 이번 방문에만 */ }
}

/* 영어 사전 — 열쇠 → 원문. 처음 쓸 때 한 번 */
let textsCache: Map<string, string> | null = null;
export function siteUiTexts(): ReadonlyMap<string, string> {
  return (textsCache ??= new Map(siteUiSource(en)));
}

/* 화면 글 번역 — 언어마다 받은 만큼. 상한에 걸린 언어는 이번 방문 동안 더 묻지 않는다(다시 고르면 지운다) */
const uiMemory = new Map<string, Record<string, string>>();
const uiErrors = new Map<string, "failed" | "rateLimited">();

function readUiCache(lang: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(UI_CACHE_PREFIX + lang);
    if (!raw) return null;
    const s = validSiteUi(siteUiTexts(), JSON.parse(raw));
    return Object.keys(s).length ? s : null;
  } catch { return null; }
}
function writeUiCache(lang: string, strings: Record<string, string>) {
  try {
    const cache: SiteUiCache = { strings, src: siteUiSrcOf(siteUiTexts(), Object.keys(strings)) };
    localStorage.setItem(UI_CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch { /* 저장소가 가득 차거나 막혔으면 메모리에만 */ }
}
function uiFor(lang: string): Record<string, string> | null {
  const mem = uiMemory.get(lang);
  if (mem) return mem;
  const stored = readUiCache(lang);
  if (stored) uiMemory.set(lang, stored);
  return stored;
}

/* 사이트 내용 글 번역 — 묶음(site: 설정 · DB 글, about: About 코드의 글)마다 메모리 + localStorage. 원문 목록은 서버만 알아
   해시로 고르지 않는다 — 저장된 것을 먼저 쓰고, 이번 방문에 한 번 서버에서 새로 받아 덮는다(새 태그 · 설정 수정이 반영된다) */
type Bundle = "site" | "about";
const CONTENT_CACHE_PREFIX: Record<Bundle, string> = { site: "siteContent:", about: "siteAbout:" };
const contentMemory = new Map<string, Record<string, string>>();
const contentFetched = new Set<string>();
function bundleFor(bundle: Bundle, lang: string): Record<string, string> | null {
  const key = `${bundle}:${lang}`;
  const mem = contentMemory.get(key);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_PREFIX[bundle] + lang);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === "object") {
      const strings = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>;
      contentMemory.set(key, strings);
      return strings;
    }
  } catch { /* 저장소를 못 쓰면 받아 올 때까지 원문 */ }
  return null;
}
/* 화면이 찾는 번역 — 두 묶음을 합친 것. 같은 원문이면 About 쪽이 먼저(About 화면 글) */
const mergedCache = new Map<string, { site: object | null; about: object | null; merged: Record<string, string> | null }>();
function contentFor(lang: string): Record<string, string> | null {
  const site = bundleFor("site", lang);
  const about = bundleFor("about", lang);
  const hit = mergedCache.get(lang);
  if (hit && hit.site === site && hit.about === about) return hit.merged;
  const merged = site || about ? { ...(site ?? {}), ...(about ?? {}) } : null;
  mergedCache.set(lang, { site, about, merged });
  return merged;
}

/* 관리자 화면 글 번역 — 받아 오기 · 저장소는 lib/adminLang(관리자 사전을 공개 번들에 싣지 않으려고 따로 둔다). 여기는 메모리만 */
const adminUiMemory = new Map<string, Record<string, string>>();
const adminUiInflight = new Map<string, number>();
export function setAdminUiLoading(lang: string, loading: boolean) {
  const n = (adminUiInflight.get(lang) ?? 0) + (loading ? 1 : -1);
  if (n > 0) adminUiInflight.set(lang, n); else adminUiInflight.delete(lang);
  emit();
}
export const getAdminUi = (lang: string): Record<string, string> | null => adminUiMemory.get(lang) ?? null;
export function setAdminUi(lang: string, strings: Record<string, string>) {
  adminUiMemory.set(lang, strings);
  emit();
}

/* ── 저장소 ── */
let state: { lang: string | null; auto: boolean } | null = null;
/** 사이트 기본 언어(ko · en 밖일 때만) — LanguageProvider 가 서버 설정에서 받아 넣는다 */
let siteDefault: string | null = null;
let enabled = true;
let snapshot: SiteLangSnapshot | null = null;
const listeners = new Set<() => void>();

function current() {
  if (!state) {
    const langs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
    state = resolveInitialLang(readSaved(), langs, siteDefault);
  }
  return state;
}

function build(): SiteLangSnapshot {
  const { lang: chosen, auto } = current();
  const lang = enabled ? chosen : null;
  if (!lang) return { lang: null, auto: false, ui: null, uiStatus: "idle", content: null, adminUi: null, adminUiLoading: false };
  const ui = uiFor(lang);
  const err = uiErrors.get(lang);
  const uiStatus: SiteUiStatus = (uiInflight.get(lang) ?? 0) > 0 ? "loading" : err ?? "ready";
  return { lang, auto, ui, uiStatus, content: contentFor(lang), adminUi: adminUiMemory.get(lang) ?? null, adminUiLoading: adminUiInflight.has(lang) };
}

function emit() {
  snapshot = build();
  listeners.forEach((l) => l());
}

export function subscribeSiteLang(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}
export function getSiteLangSnapshot(): SiteLangSnapshot {
  return (snapshot ??= build());
}
export const getServerSiteLangSnapshot = () => SERVER_SNAPSHOT;

/** 서버가 미리 읽어 둔 기본 언어 화면 글(#1406)로 그린 서버 스냅숏 — 하이드레이션도 이 값으로 맞춘다 */
export function serverSnapshotFor(lang: string, ui: Readonly<Record<string, string>>): SiteLangSnapshot {
  return { ...SERVER_SNAPSHOT, lang, auto: true, ui, uiStatus: "ready" };
}

/** 서버가 넘긴 기본 언어 화면 글을 메모리에 넣어 둔다 — 브라우저가 다시 받지 않는다. 저장된 것과 합친다. 이미 있으면 그대로 */
export function primeSiteUi(lang: string, strings: Record<string, string>) {
  if (typeof window === "undefined" || uiMemory.has(lang)) return;
  uiMemory.set(lang, { ...(readUiCache(lang) ?? {}), ...strings });
}

/** 언어 고르기 — null 이면 원문. 고른 것은 저장한다(원문은 "original" 로 — 다음 방문에 자동 번역이 다시 걸리지 않게) */
export function selectSiteLang(lang: string | null) {
  const next = normalizeTranslationLang(lang);
  state = { lang: next, auto: false };
  if (next) { uiErrors.delete(next); asked.delete(next); }
  writeSaved(next ?? ORIGINAL);
  emit();
}

/** 자동으로 건 번역을 조용히 거둔다(번역 꺼짐 · 키 없음) — 저장하지 않는다. 방문자가 고른 언어면 그대로 둔다 */
export function dismissAutoSiteLang() {
  const s = current();
  if (!s.auto || !s.lang) return;
  state = { lang: null, auto: false };
  emit();
}

/**
 * 사이트 기본 언어를 알린다(#1406) — ko · en 이거나 모르는 코드면 null 로 둔다.
 * 자동으로 건 언어는 새 기본값으로 다시 정한다. 방문자가 고른 언어는 그대로 둔다
 */
export function setSiteDefaultLang(code: string | null | undefined) {
  const next = isForeignSiteLanguage(code) ? normalizeTranslationLang(code) : null;
  if (siteDefault === next) return;
  siteDefault = next;
  if (state?.auto) {
    state = null;
    if (snapshot) emit();
  }
}

/** 사이트 기본 언어(ko · en 밖일 때만) — 없으면 null. 이 언어가 걸리면 번역이 아니라 원문(ko 칸)을 그 언어로 본다 */
export const getSiteDefaultLang = () => siteDefault;

/** 사이트 설정에서 번역이 꺼졌으면 언어가 걸리지 않는다(관리 화면도 같은 언어를 쓴다) */
export function setSiteLangEnabled(on: boolean) {
  if (enabled === on) return;
  enabled = on;
  emit();
}

/* ── 화면 글 — 보는 화면의 열쇠만 ──
 * t() 가 번역에 없는 열쇠를 만나면 모아 두었다가 잠깐 뒤 한 번에 묻는다. 물은 열쇠는 이번 방문 동안 다시 묻지 않는다
 * (번역이 깨져 버린 글이 그릴 때마다 다시 물리지 않게 — 그 글은 영어로 남는다). 관리자 사전 열쇠(admin.*)는
 * lib/adminLang 이 등록한 쪽이 묻는다(관리자 사전을 공개 번들에 싣지 않으려고). */
const ADMIN_PREFIX = "admin.";
const asked = new Map<string, Set<string>>();
const pending = new Map<string, Set<string>>();
const uiInflight = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
type KeyFetcher = (lang: string, keys: string[]) => Promise<void>;
let adminFetcher: KeyFetcher | null = null;
export function registerAdminUiFetcher(fetcher: KeyFetcher) {
  adminFetcher = fetcher;
}

/** 화면이 찾았는데 번역에 없는 열쇠 — 그리는 중에 불려도 상태는 바꾸지 않고 묻기만 예약한다 */
export function requestSiteUiKey(lang: string, key: string) {
  if (typeof window === "undefined" || !enabled || uiErrors.has(lang)) return;
  let seen = asked.get(lang);
  if (!seen) asked.set(lang, (seen = new Set()));
  if (seen.has(key)) return;
  seen.add(key);
  let wait = pending.get(lang);
  if (!wait) pending.set(lang, (wait = new Set()));
  wait.add(key);
  flushTimer ??= setTimeout(flushSiteUi, 30);
}

function flushSiteUi() {
  flushTimer = null;
  for (const [lang, set] of pending) {
    pending.delete(lang);
    const keys = [...set];
    const site = keys.filter((k) => !k.startsWith(ADMIN_PREFIX));
    const admin = keys.filter((k) => k.startsWith(ADMIN_PREFIX));
    for (let i = 0; i < site.length; i += SITE_UI_KEYS_MAX) void fetchSiteUiKeys(lang, site.slice(i, i + SITE_UI_KEYS_MAX));
    if (adminFetcher) for (let i = 0; i < admin.length; i += SITE_UI_KEYS_MAX) void adminFetcher(lang, admin.slice(i, i + SITE_UI_KEYS_MAX));
  }
}

/**
 * 열쇠들의 화면 글 번역을 받아 지금 것에 더한다(메모리 + localStorage). 상한(429)에 걸리면 이 언어는 이번 방문 동안 더 묻지 않는다.
 * 그 밖의 실패는 그 열쇠들만 영어로 남는다(다시 묻지 않는다).
 */
export async function fetchSiteUiKeys(lang: string, keys: string[], fetcher: typeof fetch = fetch): Promise<void> {
  if (!keys.length) return;
  uiInflight.set(lang, (uiInflight.get(lang) ?? 0) + 1);
  emit();
  try {
    const res = await fetcher("/api/site-translate/ui", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, keys }),
    });
    if (res.ok) {
      const data = (await res.json()) as { strings?: unknown };
      const raw = data.strings && typeof data.strings === "object" ? (data.strings as Record<string, string>) : {};
      const texts = siteUiTexts();
      const got = validSiteUi(texts, { strings: raw, src: siteUiSrcOf(texts, Object.keys(raw)) });
      if (Object.keys(got).length) {
        const merged = { ...(uiFor(lang) ?? {}), ...got };
        uiMemory.set(lang, merged);
        writeUiCache(lang, merged);
      }
    } else if (res.status === 503 && current().auto) {
      dismissAutoSiteLang();
    } else if (res.status === 429) {
      uiErrors.set(lang, "rateLimited");
    }
  } catch {
    /* 그 열쇠들은 영어로 남는다 */
  } finally {
    const n = (uiInflight.get(lang) ?? 1) - 1;
    if (n > 0) uiInflight.set(lang, n); else uiInflight.delete(lang);
    emit();
  }
}

/**
 * 지금 언어의 사이트 내용 글 번역을 받아 온다 — 이번 방문에 한 번(저장된 것이 있어도 새로 받아 덮는다).
 * 실패하면 저장된 것(없으면 원문)을 그대로 쓴다.
 */
export async function ensureSiteContent(lang: string, bundle: Bundle = "site", fetcher: typeof fetch = fetch): Promise<void> {
  const key = `${bundle}:${lang}`;
  if (contentFetched.has(key)) return;
  contentFetched.add(key);
  try {
    const res = await fetcher("/api/site-translate/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, bundle }),
    });
    /* 실패하면 다음 기회(다른 화면으로 옮김 · About 재진입)에 다시 묻는다 — 이번 방문 내내 원문으로 굳지 않게 */
    if (!res.ok) { contentFetched.delete(key); return; }
    const data = (await res.json()) as { strings?: unknown };
    if (!data.strings || typeof data.strings !== "object") return;
    const strings = Object.fromEntries(
      Object.entries(data.strings as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v.trim()),
    ) as Record<string, string>;
    contentMemory.set(key, strings);
    try { localStorage.setItem(CONTENT_CACHE_PREFIX[bundle] + lang, JSON.stringify(strings)); } catch { /* 메모리에만 */ }
    emit();
  } catch {
    /* 저장된 것 · 원문을 그대로 쓰고, 다음 기회에 다시 묻는다 */
    contentFetched.delete(key);
  }
}

/** 테스트용 — 모듈 상태를 처음으로 */
export function __resetSiteLangForTest() {
  state = null;
  siteDefault = null;
  enabled = true;
  snapshot = null;
  uiMemory.clear();
  uiErrors.clear();
  uiInflight.clear();
  asked.clear();
  pending.clear();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  contentMemory.clear();
  contentFetched.clear();
  mergedCache.clear();
  adminUiMemory.clear();
  adminUiInflight.clear();
  textsCache = null;
}
