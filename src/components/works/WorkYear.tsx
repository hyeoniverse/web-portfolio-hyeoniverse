"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { formatWorkYear } from "@/utils/formatWorkYear";

/**
 * 작업물 연도 — 기간으로 저장된 값(JSON)을 "2024.03 - 2024.06" 처럼 풀어서 찍는다(#1115).
 * 진행 중이면 "현재/Present" 가 붙어 언어를 탄다. 상세처럼 보는 언어가 따로 있으면 lang 으로 넘긴다.
 */
export default function WorkYear({ value, lang }: { value: string | number | null | undefined; lang?: "ko" | "en" }) {
  const { language } = useLanguage();
  return <>{formatWorkYear(value, lang ?? language)}</>;
}
