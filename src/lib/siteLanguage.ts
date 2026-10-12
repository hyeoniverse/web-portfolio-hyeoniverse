import type { Language } from "@/types";
import { TRANSLATION_LANGUAGES, normalizeTranslationLang } from "@/lib/translationLanguages";

/**
 * 사이트 기본 언어(#1406, site.config metadata.siteLanguage) 도우미 — 서버 · 브라우저 모두 쓴다.
 *
 * ko · en 은 사전(ko.json · en.json)이 따로 있어 그대로 그린다. 그 밖(ja 등)은 사전이 없어
 * 서버는 영어로 그리고 브라우저에서 기계 번역을 건다(lib/siteLang).
 */

/** 고를 수 있는 값으로 고친다 — 모르는 값이면 ko */
export function normalizeSiteLanguage(code: unknown): string {
  if (code === "ko" || code === "en") return code;
  return normalizeTranslationLang(code) ?? "ko";
}

/** 화면을 그릴 사전 — ko 면 ko, 그 밖은 en */
export function baseLanguageOf(code: unknown): Language {
  return normalizeSiteLanguage(code) === "ko" ? "ko" : "en";
}

/** ko · en 밖의 기본 언어인지 */
export function isForeignSiteLanguage(code: unknown): boolean {
  const n = normalizeSiteLanguage(code);
  return n !== "ko" && n !== "en";
}

/** 관리자 편집 화면의 원문 칸(ko) 배지 — 기본 언어가 ko · en 밖이면 그 언어 코드(JA 등), 아니면 KO */
export function sourceBadgeOf(code: unknown): string {
  return isForeignSiteLanguage(code) ? normalizeSiteLanguage(code).toUpperCase() : "KO";
}

/** 고를 수 있는 언어 목록(설정 화면) — ko · en + 🌐 메뉴와 같은 번역 언어 */
export const SITE_LANGUAGE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  ...TRANSLATION_LANGUAGES.map((l) => ({ value: l.code, label: l.native })),
];
