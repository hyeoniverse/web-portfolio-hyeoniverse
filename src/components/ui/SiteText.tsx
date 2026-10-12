"use client";

import { useLanguage } from "@/providers/LanguageProvider";

/** 사이트 내용 글(설정 · DB 에서 온 원문 — 태그 이름 등)을 걸린 다른 언어로. 다른 언어가 꺼져 있거나 번역이 없으면 원문 그대로 */
export default function SiteText({ text }: { text: string }) {
  const { tx } = useLanguage();
  return <>{tx(text)}</>;
}
