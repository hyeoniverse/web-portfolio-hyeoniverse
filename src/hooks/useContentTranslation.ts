"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { matchVisitorLanguage, normalizeTranslationLang } from "@/lib/translationLanguages";
import type { ContentFields } from "@/lib/api/contentTranslate";

/** 방문자가 고른 읽기 언어 — 언어 코드, 또는 "original"(원문으로 보겠다고 고른 것) */
export const CONTENT_LANG_STORAGE_KEY = "contentTranslateLang";
const ORIGINAL = "original";

export type ContentTranslateError = "failed" | "rateLimited";

function readSaved(): string | null {
  try { return localStorage.getItem(CONTENT_LANG_STORAGE_KEY); } catch { return null; }
}
function writeSaved(v: string | null) {
  try {
    if (v) localStorage.setItem(CONTENT_LANG_STORAGE_KEY, v);
    else localStorage.removeItem(CONTENT_LANG_STORAGE_KEY);
  } catch { /* 저장소를 못 쓰면 이번 방문에만 */ }
}

/**
 * 글·작업물 상세의 "다른 언어로 읽기" — ko · en 이 아닌 언어(lib/translationLanguages)로 번역해 보여 준다.
 *
 * targetLang 이 null 이면 지금처럼 KO/EN(viewLang)으로 본다.
 * 처음 언어:
 *   - 저장된 선택이 있으면 그것("original" 이면 번역하지 않는다)
 *   - 없으면 브라우저 언어(navigator.languages)의 첫 언어가 ko · en 이 아닐 때 그 언어로 바로 번역해 보여 준다.
 *     번역은 서버에 저장돼(content_translations) 두 번째 방문자부터는 공급자를 부르지 않고, 캐시에 없는 요청은
 *     서버가 IP 당 상한을 둔다. 대신 화면에 "기계 번역" 안내와 원문 보기를 늘 띄운다.
 *     자동으로 건 번역이 서버 설정 때문에 안 되면(번역 꺼짐 · 키 없음) 조용히 원문으로 돌아간다 — 방문자가 고른 게 아니다.
 * 고르면 저장한다. 원문 보기 · KO/EN 토글은 "original" 로 저장해 다음 방문에 자동 번역이 다시 걸리지 않게 한다.
 * 상세 화면은 ISR 이라 언어 판단은 브라우저에서만 한다(마운트 뒤).
 */
const noopSubscribe = () => () => {};
/** 처음 언어(브라우저에서만) — 저장된 선택 › 브라우저 언어. "original" 이면 null */
function initialLang(): { lang: string | null; auto: boolean } {
  const saved = readSaved();
  if (saved === ORIGINAL) return { lang: null, auto: false };
  const fromSaved = normalizeTranslationLang(saved);
  if (fromSaved) return { lang: fromSaved, auto: false };
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return { lang: matchVisitorLanguage(langs), auto: true };
}
/* useSyncExternalStore 는 같은 값을 돌려받아야 하므로 페이지 수명 동안 한 번만 읽는다 */
let initialCache: { lang: string | null; auto: boolean } | null = null;
const getInitial = () => (initialCache ??= initialLang());
const getServerInitial = () => null;

export function useContentTranslation({ type, id, enabled }: { type: "post" | "work"; id: string; enabled: boolean }) {
  /* 서버 · 하이드레이션 때는 null(원문), 그 뒤 브라우저 값 — effect 안에서 상태를 바꾸지 않고 얻는다 */
  const initial = useSyncExternalStore(noopSubscribe, getInitial, getServerInitial);
  /* undefined = 아직 고르지 않았다(처음 언어를 따른다) */
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const [results, setResults] = useState<Record<string, ContentFields>>({});
  const [errors, setErrors] = useState<Record<string, ContentTranslateError>>({});

  const auto = chosen === undefined;
  const targetLang = !enabled ? null : auto ? initial?.lang ?? null : chosen;
  /* 자동으로 건 번역인가 — 서버 설정 때문에 못 하면 조용히 물러난다 */
  const isAuto = auto && !!initial?.auto;

  const fields = targetLang ? results[targetLang] ?? null : null;
  const error = targetLang ? errors[targetLang] ?? null : null;
  const translating = !!targetLang && !fields && !error;

  useEffect(() => {
    if (!translating || !targetLang) return;
    const ac = new AbortController();
    const fail = (e: ContentTranslateError) => setErrors((prev) => ({ ...prev, [targetLang]: e }));
    fetch("/api/content-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, lang: targetLang }),
      signal: ac.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { fields?: ContentFields };
          setResults((prev) => ({ ...prev, [targetLang]: data.fields ?? {} }));
          return;
        }
        /* 자동으로 건 번역 — 서버가 못 하면(번역 꺼짐 · 키 없음 · 번역할 본문 없음) 저장하지 않고 원문 그대로 */
        if (isAuto && (res.status === 503 || res.status === 404)) {
          setChosen(null);
          return;
        }
        fail(res.status === 429 ? "rateLimited" : "failed");
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") fail("failed");
      });
    return () => ac.abort();
  }, [translating, targetLang, type, id, isAuto]);

  /** 언어 고르기 — null 이면 원문(KO/EN)으로. 고른 것은 저장한다(원문은 "original") */
  const selectLang = useCallback((lang: string | null) => {
    setChosen(lang);
    if (lang) setErrors((prev) => { const next = { ...prev }; delete next[lang]; return next; });
    writeSaved(lang ?? ORIGINAL);
  }, []);

  /** 실패한 언어 다시 시도 — 오류를 지우면 위 effect 가 다시 부른다 */
  const retry = useCallback(() => {
    if (!targetLang) return;
    setErrors((prev) => { const next = { ...prev }; delete next[targetLang]; return next; });
  }, [targetLang]);

  return { targetLang, fields, translating, error, selectLang, retry };
}
