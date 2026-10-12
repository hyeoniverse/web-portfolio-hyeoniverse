"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { getAdminTextsVersion, lookupAdminText, requestAdminTexts, subscribeAdminTexts } from "@/lib/adminTexts";

/**
 * 관리자 화면의 시스템 글(알림 제목 · 본문 등)을 고른 다른 언어로 — lib/adminTexts.
 * texts 는 지금 보이는 글들. 다른 언어가 걸려 있지 않거나 번역이 아직 없으면 원문을 돌려준다.
 */
export function useAdminTexts(texts: readonly (string | null | undefined)[]): (text: string) => string {
  const { foreignLang } = useLanguage();
  const version = useSyncExternalStore(subscribeAdminTexts, getAdminTextsVersion, () => 0);
  const key = foreignLang ? texts.filter(Boolean).join("\u0000") : "";
  useEffect(() => {
    if (foreignLang && key) requestAdminTexts(foreignLang, key.split("\u0000"));
  }, [foreignLang, key]);
  return useCallback(
    (text: string) => (foreignLang && text ? lookupAdminText(foreignLang, text) ?? text : text),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version 이 바뀌면 새 번역을 읽는다
    [foreignLang, version],
  );
}
