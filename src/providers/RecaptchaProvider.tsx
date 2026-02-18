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
}

const RecaptchaContext = createContext<RecaptchaContextValue>({
  executeRecaptcha: undefined,
  ready: false,
  load: () => {},
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
      value={{ executeRecaptcha: ready ? executeRecaptcha : undefined, ready, load }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}
