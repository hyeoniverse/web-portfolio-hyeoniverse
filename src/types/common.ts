import type { Language } from "./app";

/** 한국어/영어 이중언어 카테고리 */
export interface BilingualCategory {
  ko: string;
  en: string;
  /** 카테고리 설명 (선택) — list/hero 등에 표시. legacy: string (= en) / 신규: { ko, en } */
  description?: string | LocalizedText;
  /**
   * 소분류 (2단계 카테고리). 대분류(top-level)만 가질 수 있고 최대 1단계까지 중첩.
   * 없으면 flat 카테고리(= leaf). posts.category 에는 항상 leaf 문자열이 저장되고
   * 부모는 이 트리에서 도출한다 (DB 마이그레이션 불필요).
   */
  children?: BilingualCategory[];
}

/** 한국어/영어 이중언어 텍스트 */
export type LocalizedText = Record<Language, string>;

/** LocalizedText 를 현재 언어 문자열로 — 반대 언어로 fallback (문자열 컨텍스트: alt/title 속성 등) */
export function pickLocalized(lt: LocalizedText, lang: Language): string {
  return lang === "en" ? (lt.en || lt.ko) : (lt.ko || lt.en);
}
