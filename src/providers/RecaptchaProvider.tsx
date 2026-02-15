"use client";

import {
  useState,
  useEffect,
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
}

const RecaptchaContext = createContext<RecaptchaContextValue>({
  executeRecaptcha: undefined,
  ready: false,
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

  useEffect(() => {
    if (!enabled || !siteKey || version !== "v3") return;

    const loadScript = () => {
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
    };

    // 첫 번째 의도적인 사용자 상호작용 시 로드
    const handler = () => {
      loadScript();
      cleanup();
    };
    const events = ["click", "touchstart", "keydown"] as const;
    const cleanup = () => {
      events.forEach((e) => document.removeEventListener(e, handler));
    };

    events.forEach((e) =>
      document.addEventListener(e, handler, { once: true, passive: true })
    );

    return cleanup;
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
      value={{ executeRecaptcha: ready ? executeRecaptcha : undefined, ready }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}
