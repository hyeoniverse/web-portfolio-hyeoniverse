import en from "@/locales/en.json";
import { matchVisitorLanguage, normalizeTranslationLang } from "@/lib/translationLanguages";
import { sanitizeSiteUi, siteUiHash, siteUiSource, type SiteUiSource } from "@/lib/siteTranslation";

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
 * 화면 글 번역은 언어마다 한 벌 — 메모리 + localStorage(해시가 지금 사전과 같을 때만 쓴다)에 두어
 * 화면을 옮길 때마다 다시 받지 않는다. 서버는 /api/site-translate/ui.
 */
export const CONTENT_LANG_STORAGE_KEY = "contentTranslateLang";
const ORIGINAL = "original";
const UI_CACHE_PREFIX = "siteUi:";

export type SiteUiStatus = "idle" | "loading" | "ready" | "failed" | "rateLimited";

export interface SiteLangSnapshot {
  /** 지금 걸린 언어 — null 이면 원문(ko/en) */
  lang: string | null;
  /** 저장된 선택이 아니라 브라우저 언어로 건 것 — 서버 설정 때문에 못 하면 조용히 물러난다 */
  auto: boolean;
  /** 지금 언어의 화면 글 번역(열쇠 → 글) — 아직 없으면 null */
  ui: Readonly<Record<string, string>> | null;
  uiStatus: SiteUiStatus;
  /** 지금 언어의 사이트 내용 글 번역(원문 → 글, lib/siteContent — 홈 글 · 카테고리 · 태그) — 아직 없으면 null */
  content: Readonly<Record<string, string>> | null;
}

const SERVER_SNAPSHOT: SiteLangSnapshot = { lang: null, auto: false, ui: null, uiStatus: "idle", content: null };

/** 저장된 선택 › 브라우저 언어 — 순수 함수(테스트용으로 뗀다) */
export function resolveInitialLang(saved: string | null, browserLangs: readonly string[]): { lang: string | null; auto: boolean } {
  if (saved === ORIGINAL) return { lang: null, auto: false };
  const fromSaved = normalizeTranslationLang(saved);
  if (fromSaved) return { lang: fromSaved, auto: false };
  return { lang: matchVisitorLanguage(browserLangs), auto: true };
}

function readSaved(): string | null {
  try { return localStorage.getItem(CONTENT_LANG_STORAGE_KEY); } catch { return null; }
}
function writeSaved(v: string) {
  try { localStorage.setItem(CONTENT_LANG_STORAGE_KEY, v); } catch { /* 저장소를 못 쓰면 이번 방문에만 */ }
}

/* 영어 사전을 펼친 원문과 해시 — 처음 쓸 때 한 번 */
let sourceCache: { source: SiteUiSource; hash: string } | null = null;
export function siteUiSourceInfo() {
  if (!sourceCache) {
    const source = siteUiSource(en);
    sourceCache = { source, hash: siteUiHash(source) };
  }
  return sourceCache;
}

/* 화면 글 번역 — 메모리. 실패/상한은 그 언어에 대해 이번 방문 동안 기억한다(다시 고르면 지운다) */
const uiMemory = new Map<string, Record<string, string>>();
const uiErrors = new Map<string, "failed" | "rateLimited">();
const uiInflight = new Set<string>();

function readUiCache(lang: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(UI_CACHE_PREFIX + lang);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { h?: unknown; s?: unknown };
    const { source, hash } = siteUiSourceInfo();
    if (parsed.h !== hash) return null;
    const s = sanitizeSiteUi(source, parsed.s);
    return Object.keys(s).length ? s : null;
  } catch { return null; }
}
function writeUiCache(lang: string, strings: Record<string, string>) {
  try {
    localStorage.setItem(UI_CACHE_PREFIX + lang, JSON.stringify({ h: siteUiSourceInfo().hash, s: strings }));
  } catch { /* 저장소가 가득 차거나 막혔으면 메모리에만 */ }
}
function uiFor(lang: string): Record<string, string> | null {
  const mem = uiMemory.get(lang);
  if (mem) return mem;
  const stored = readUiCache(lang);
  if (stored) uiMemory.set(lang, stored);
  return stored;
}

/* 사이트 내용 글 번역 — 메모리 + localStorage(원문 목록은 서버만 알아 해시로 고르지 않는다 — 저장된 것을 먼저 쓰고,
   이번 방문에 한 번 서버에서 새로 받아 덮는다. 새 태그 · 설정 수정이 다음 화면부터 반영된다) */
const CONTENT_CACHE_PREFIX = "siteContent:";
const contentMemory = new Map<string, Record<string, string>>();
const contentFetched = new Set<string>();
function contentFor(lang: string): Record<string, string> | null {
  const mem = contentMemory.get(lang);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_PREFIX + lang);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === "object") {
      const strings = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>;
      contentMemory.set(lang, strings);
      return strings;
    }
  } catch { /* 저장소를 못 쓰면 받아 올 때까지 원문 */ }
  return null;
}

/* ── 저장소 ── */
let state: { lang: string | null; auto: boolean } | null = null;
let enabled = true;
let snapshot: SiteLangSnapshot | null = null;
const listeners = new Set<() => void>();

function current() {
  if (!state) {
    const langs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
    state = resolveInitialLang(readSaved(), langs);
  }
  return state;
}

function build(): SiteLangSnapshot {
  const { lang: chosen, auto } = current();
  const lang = enabled ? chosen : null;
  if (!lang) return { lang: null, auto: false, ui: null, uiStatus: "idle", content: null };
  const ui = uiFor(lang);
  const err = uiErrors.get(lang);
  const uiStatus: SiteUiStatus = ui ? "ready" : err ?? (uiInflight.has(lang) ? "loading" : "idle");
  return { lang, auto, ui, uiStatus, content: contentFor(lang) };
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

/** 언어 고르기 — null 이면 원문. 고른 것은 저장한다(원문은 "original" 로 — 다음 방문에 자동 번역이 다시 걸리지 않게) */
export function selectSiteLang(lang: string | null) {
  const next = normalizeTranslationLang(lang);
  state = { lang: next, auto: false };
  if (next) uiErrors.delete(next);
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

/** 사이트 설정에서 번역이 꺼졌으면 언어가 걸리지 않는다 */
export function setSiteLangEnabled(on: boolean) {
  if (enabled === on) return;
  enabled = on;
  emit();
}

/**
 * 지금 언어의 화면 글 번역을 받아 온다 — 메모리/저장소에 있거나 받는 중이거나 이미 실패했으면 아무것도 안 한다.
 * 다 받지 못한 번역(complete:false)은 메모리에만 둔다 — 다음 방문에 다시 받아 빈자리를 채운다.
 */
export async function ensureSiteUi(lang: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (uiFor(lang) || uiInflight.has(lang) || uiErrors.has(lang)) return;
  uiInflight.add(lang);
  emit();
  try {
    const res = await fetcher("/api/site-translate/ui", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    if (res.ok) {
      const data = (await res.json()) as { strings?: unknown; hash?: unknown; complete?: unknown };
      const { source, hash } = siteUiSourceInfo();
      const strings = sanitizeSiteUi(source, data.strings);
      uiMemory.set(lang, strings);
      if (data.complete === true && data.hash === hash) writeUiCache(lang, strings);
    } else if (res.status === 503 && current().auto) {
      dismissAutoSiteLang();
    } else {
      uiErrors.set(lang, res.status === 429 ? "rateLimited" : "failed");
    }
  } catch {
    uiErrors.set(lang, "failed");
  } finally {
    uiInflight.delete(lang);
    emit();
  }
}

/**
 * 지금 언어의 사이트 내용 글 번역을 받아 온다 — 이번 방문에 한 번(저장된 것이 있어도 새로 받아 덮는다).
 * 실패하면 저장된 것(없으면 원문)을 그대로 쓴다.
 */
export async function ensureSiteContent(lang: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (contentFetched.has(lang)) return;
  contentFetched.add(lang);
  try {
    const res = await fetcher("/api/site-translate/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { strings?: unknown };
    if (!data.strings || typeof data.strings !== "object") return;
    const strings = Object.fromEntries(
      Object.entries(data.strings as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v.trim()),
    ) as Record<string, string>;
    contentMemory.set(lang, strings);
    try { localStorage.setItem(CONTENT_CACHE_PREFIX + lang, JSON.stringify(strings)); } catch { /* 메모리에만 */ }
    emit();
  } catch { /* 저장된 것 · 원문을 그대로 쓴다 */ }
}

/** 테스트용 — 모듈 상태를 처음으로 */
export function __resetSiteLangForTest() {
  state = null;
  enabled = true;
  snapshot = null;
  uiMemory.clear();
  uiErrors.clear();
  uiInflight.clear();
  contentMemory.clear();
  contentFetched.clear();
  sourceCache = null;
}
