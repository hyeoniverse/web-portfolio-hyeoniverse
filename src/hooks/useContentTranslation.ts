"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  dismissAutoSiteLang,
  getSiteDefaultLang,
  getServerSiteLangSnapshot,
  getSiteLangSnapshot,
  selectSiteLang,
  subscribeSiteLang,
} from "@/lib/siteLang";
import type { ContentFields } from "@/lib/api/contentTranslate";
import type { BodyLabels } from "@/lib/bodyLabels";

export type ContentTranslateError = "failed" | "rateLimited";

/**
 * 글 상세의 "다른 언어로 읽기" — ko · en 이 아닌 언어(lib/translationLanguages)로 번역해 보여 준다.
 *
 * 언어는 사이트 전체가 나눠 쓰는 하나의 상태(lib/siteLang)다 — 내비게이션의 🌐 메뉴에서 고른 언어가 여기에도,
 * 상세 헤더의 메뉴에서 고른 언어가 목록 · 화면 글에도 걸린다. targetLang 이 null 이면 지금처럼 KO/EN(viewLang)으로 본다.
 * 처음 언어(저장된 선택 › 브라우저 언어)와 저장 규칙도 lib/siteLang 에 있다.
 *   번역은 서버에 저장돼(content_translations) 두 번째 방문자부터는 공급자를 부르지 않고, 캐시에 없는 요청은
 *   서버가 IP 당 상한을 둔다. 대신 화면에 "기계 번역" 안내와 원문 보기를 늘 띄운다.
 *   자동으로 건 번역이 서버 설정 때문에 안 되면(번역 꺼짐 · 키 없음) 조용히 원문으로 돌아간다 — 방문자가 고른 게 아니다.
 *   번역할 본문이 없는 글(404)은 이 글만 원문으로 둔다 — 사이트의 언어는 그대로.
 * 상세 화면은 ISR 이라 언어 판단은 브라우저에서만 한다(마운트 뒤).
 */
export function useContentTranslation({ type, id, enabled }: { type: "post"; id: string; enabled: boolean }) {
  /* 서버 · 하이드레이션 때는 null(원문), 그 뒤 브라우저 값 — 사이트 전체의 언어 */
  const site = useSyncExternalStore(subscribeSiteLang, getSiteLangSnapshot, getServerSiteLangSnapshot);
  /* 번역할 본문이 없다고 서버가 답한 언어 — 이 글만 원문으로 */
  const [nothing, setNothing] = useState<Record<string, true>>({});
  const [results, setResults] = useState<Record<string, ContentFields>>({});
  /* 본문 안 라벨(코드 블록 단추 · 투표 …)의 번역 — 응답에 없으면(라벨 번역 실패) 빈 자리, 화면 언어 라벨을 쓴다 */
  const [uiResults, setUiResults] = useState<Record<string, Partial<BodyLabels>>>({});
  const [errors, setErrors] = useState<Record<string, ContentTranslateError>>({});

  /* 사이트 기본 언어(ko · en 밖)는 번역하지 않는다 — 글의 ko 칸이 이미 그 언어의 원문이다(#1406) */
  const targetLang = !enabled || !site.lang || nothing[site.lang] || site.lang === getSiteDefaultLang() ? null : site.lang;
  /* 자동으로 건 번역인가 — 서버 설정 때문에 못 하면 조용히 물러난다 */
  const isAuto = site.auto;

  const fields = targetLang ? results[targetLang] ?? null : null;
  /* 본문과 같은 때에 바뀌어야 본문 후처리가 한 번에 새 라벨로 다시 걸린다 — 본문(fields)이 있을 때만 */
  const bodyLabels = fields && targetLang ? uiResults[targetLang] ?? null : null;
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
          const data = (await res.json()) as { fields?: ContentFields; ui?: Partial<BodyLabels> };
          if (data.ui && typeof data.ui === "object") setUiResults((prev) => ({ ...prev, [targetLang]: data.ui! }));
          setResults((prev) => ({ ...prev, [targetLang]: data.fields ?? {} }));
          return;
        }
        /* 번역할 본문이 없는 글 — 이 글만 원문으로(사이트 언어는 그대로) */
        if (res.status === 404) {
          setNothing((prev) => ({ ...prev, [targetLang]: true }));
          return;
        }
        /* 자동으로 건 번역 — 서버가 못 하면(번역 꺼짐 · 키 없음) 저장하지 않고 원문 그대로 */
        if (isAuto && res.status === 503) {
          dismissAutoSiteLang();
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
    if (lang) setErrors((prev) => { const next = { ...prev }; delete next[lang]; return next; });
    selectSiteLang(lang);
  }, []);

  /** 실패한 언어 다시 시도 — 오류를 지우면 위 effect 가 다시 부른다 */
  const retry = useCallback(() => {
    if (!targetLang) return;
    setErrors((prev) => { const next = { ...prev }; delete next[targetLang]; return next; });
  }, [targetLang]);

  return { targetLang, fields, bodyLabels, translating, error, selectLang, retry };
}
