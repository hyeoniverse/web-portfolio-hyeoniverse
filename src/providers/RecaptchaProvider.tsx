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
      // Already loaded
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

    // Load on first deliberate user interaction
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

  // Always render children in the same tree structure — no conditional wrapping
  return (
    <RecaptchaContext.Provider
      value={{ executeRecaptcha: ready ? executeRecaptcha : undefined, ready }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}
