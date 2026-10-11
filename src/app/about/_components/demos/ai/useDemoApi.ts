"use client";

/* 네 데모가 함께 쓰는 서버 호출(/api/demo/{kind}) — 처음에 오늘 남은 횟수를 받아 두고, 보낼 때마다 고친다.
   실패하면 이유를 토스트로 알리고 같은 문장을 데모 아래 상태 줄에도 남긴다. 공급자가 실패했으면 공급자별 원인
   (예: "Hugging Face: 결제 · 크레딧 부족")을 붙인다. 서버 문장은 한국어뿐이라 상태 코드로 화면 언어 문장을 고른다
   (입력 검사 400 만 서버 문장 그대로).
   서버가 아직 없어 GET 이 404 · 503 이면 남은 횟수 없이 하루 상한만 보인다. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { common, type DemoKind } from "./data";

export interface Quota {
  remaining: number;
  perIp: number;
  total: number;
  /** 지금 쓸 수 없다(설정에서 꺼짐 · 부를 공급자 없음 · 사람이 고쳐야 하는 이유로 실패) — 남은 횟수 대신 "쓸 수 없음" */
  unavailable?: boolean;
}

/** 사람이 고쳐야 풀리는 실패 원인 — lib/ai/providers FATAL_KINDS 와 같다. 이것들로만 실패했으면 다시 눌러도 같다 */
const FATAL = new Set(["invalid_key", "expired", "forbidden", "quota", "billing", "no_key"]);

type Fail = { message?: unknown; remaining?: unknown; failures?: unknown };
type FailureKindKey = keyof typeof common.failureKind;
const isFailureList = (v: unknown): v is { provider: string; kind: string }[] =>
  Array.isArray(v) && v.every((f) => f && typeof f.provider === "string" && typeof f.kind === "string");

const isQuota = (v: unknown): v is Quota =>
  !!v && typeof v === "object" && typeof (v as Quota).remaining === "number";

export function useDemoApi<T extends object>(kind: DemoKind) {
  const { language } = useLanguage();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* 진행 중인 요청 — 떠나면(언마운트) 끊는다 */
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/demo/${kind}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : res.status === 503 ? { remaining: 0, perIp: 0, total: 0, unavailable: true } : null))
      .then((data: unknown) => { if (isQuota(data)) setQuota(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [kind]);

  useEffect(() => () => pending.current?.abort(), []);

  /** 보내고 결과를 돌려준다. 실패하면 null(이유는 error 에) */
  const run = useCallback(
    async (body: object): Promise<T | null> => {
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/demo/${kind}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as T & Fail;
        /* 다 썼으면(429) 남은 횟수가 실려 오지 않을 수 있다 */
        const remaining = typeof data.remaining === "number" ? data.remaining : res.status === 429 ? 0 : null;
        if (remaining !== null) setQuota((now) => (now ? { ...now, remaining } : now));
        if (!res.ok) {
          const reason = Array.isArray(data.message) ? data.message[0] : data.message;
          const serverText = typeof reason === "string" && reason ? reason : null;
          let text =
            res.status === 429 ? common.usedUp[language]
            : res.status === 503 ? common.unavailable[language]
            : res.status === 400 && serverText ? serverText
            : common.failed[language];
          /* 공급자별 원인 — "AI 공급자가 모두 실패했습니다. Hugging Face: 결제 · 크레딧 부족" */
          if (isFailureList(data.failures) && data.failures.length) {
            const why = data.failures
              .map((f) => `${f.provider}: ${(common.failureKind[f.kind as FailureKindKey] ?? common.failureKind.unknown)[language]}`)
              .join(" · ");
            text = `${res.status === 503 ? common.unavailable[language] : common.providersFailed[language]} ${why}`;
          }
          setError(text);
          showToast(text, "error");
          /* 기능이 꺼졌거나, 공급자가 모두 사람이 고쳐야 하는 이유로 실패했으면 — 남은 횟수 대신 "쓸 수 없음" */
          const fatal = isFailureList(data.failures) && data.failures.length > 0 && data.failures.every((f) => FATAL.has(f.kind));
          if (res.status === 503 || fatal) setQuota((now) => ({ remaining: now?.remaining ?? 0, perIp: now?.perIp ?? 0, total: now?.total ?? 0, unavailable: true }));
          return null;
        }
        return data;
      } catch (e) {
        if ((e as Error).name === "AbortError") return null;
        setError(common.network[language]);
        showToast(common.network[language], "error");
        return null;
      } finally {
        if (pending.current === controller) {
          pending.current = null;
          setBusy(false);
        }
      }
    },
    [kind, language],
  );

  /** 서버가 아닌 화면에서 막은 이유(빈 글 · 글자 수 등)를 같은 자리에 */
  const fail = useCallback((message: string) => {
    setError(message);
    showToast(message, "error");
  }, []);
  const clearError = useCallback(() => setError(null), []);

  return { quota, busy, error, run, fail, clearError };
}
