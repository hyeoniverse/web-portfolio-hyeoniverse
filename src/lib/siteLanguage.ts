import type { Language } from "@/types";
import { TRANSLATION_LANGUAGES, normalizeTranslationLang } from "@/lib/translationLanguages";

/**
 * 사이트 기본 언어(#1406, site.config metadata.defaultLanguage) 도우미 — 서버 · 브라우저 모두 쓴다.
 *
 * ko · en 은 사전(ko.json · en.json)이 따로 있어 그대로 그린다. 그 밖(ja 등)은 ko 자리를 대신한다 —
 * 글의 ko 칸이 그 언어의 원문이고, 화면 글은 사전이 없어 서버는 영어로 그리고 브라우저에서 기계 번역을 건다(lib/siteLang).
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

/** 글을 쓰는 칸 — en 이면 en, 그 밖(ko · ja 등)은 원문 칸 ko */
export function authoringLangOf(code: unknown): Language {
  return normalizeSiteLanguage(code) === "en" ? "en" : "ko";
}

/** ko 자리 배지(토글 · 편집 칸) — 기본 언어가 ko · en 밖이면 그 언어 코드(JA 등), 아니면 KO */
export function sourceBadgeOf(code: unknown): string {
  return isForeignSiteLanguage(code) ? normalizeSiteLanguage(code).toUpperCase() : "KO";
}

/** 고를 수 있는 언어 목록(설정 화면) — ko · en + 🌐 메뉴와 같은 번역 언어 */
export const SITE_LANGUAGE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  ...TRANSLATION_LANGUAGES.map((l) => ({ value: l.code, label: l.native })),
];

/**
 * 원문 칸(ko)을 써야 할 언어(#1425) — 기본 언어가 en 이면 원문은 en 칸이라 ko 칸은 건드리지 않는다(null).
 * ko 면 ko, 그 밖은 그 언어 코드. 원문 칸의 언어(source_lang · metadata.sourceLanguage)가 이와 다르면 번역해 덮어쓴다
 */
export function sourceTargetOf(code: unknown): string | null {
  const n = normalizeSiteLanguage(code);
  return n === "en" ? null : n;
}
