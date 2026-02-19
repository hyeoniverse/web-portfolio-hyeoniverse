"use client";

import {
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { siteConfig } from "@/config/site.config";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

interface RecaptchaContextValue {
  executeRecaptcha: ((action: string) => Promise<string>) | undefined;
  ready: boolean;
  /** reCAPTCHA 스크립트 로드 요청 — 실제로 필요한 시점에 호출 */
  load: () => void;
  /** reCAPTCHA 스크립트/iframe 완전 제거 — cross-origin iframe 충돌 방지 */
  unload: () => void;
}

const RecaptchaContext = createContext<RecaptchaContextValue>({
  executeRecaptcha: undefined,
  ready: false,
  load: () => {},
  unload: () => {},
});

export function useRecaptcha() {
  return useContext(RecaptchaContext);
}

export default function RecaptchaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const { enabled, version } = siteConfig.recaptcha;
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(() => {
    if (!enabled || !siteKey || version !== "v3" || loadedRef.current) return;
    loadedRef.current = true;

    // 이미 로드됨
    if (document.querySelector('script[src*="recaptcha/api.js"]')) {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => setReady(true));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => {
      window.grecaptcha.ready(() => setReady(true));
    };
    document.head.appendChild(script);
  }, [enabled, siteKey, version]);

  const unload = useCallback(() => {
    // 스크립트 제거
    document.querySelectorAll('script[src*="recaptcha/api.js"]').forEach((el) => el.remove());
    // cross-origin iframe 제거
    document.querySelectorAll('iframe[src*="recaptcha"]').forEach((el) => el.remove());
    // 뱃지 제거
    document.querySelectorAll(".grecaptcha-badge").forEach((el) => el.remove());
    // 글로벌 객체 정리
    delete (window as unknown as Record<string, unknown>).grecaptcha;
    loadedRef.current = false;
    setReady(false);
  }, []);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      if (!window.grecaptcha) {
        throw new Error("reCAPTCHA not loaded");
      }
      return window.grecaptcha.execute(siteKey, { action });
    },
    [siteKey]
  );

  // 항상 동일한 트리 구조로 children을 렌더링 — 조건부 래핑 없음
  return (
    <RecaptchaContext.Provider
      value={{ executeRecaptcha: ready ? executeRecaptcha : undefined, ready, load, unload }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}
