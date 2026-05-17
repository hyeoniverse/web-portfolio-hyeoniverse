import type { Language } from "@/providers/LanguageProvider";

/** 한국어/영어 이중언어 카테고리 */
export interface BilingualCategory {
  ko: string;
  en: string;
  /** 카테고리 설명 (선택) — list/hero 등에 표시 */
  description?: string;
}

/** 한국어/영어 이중언어 텍스트 */
export type LocalizedText = Record<Language, string>;
