"use client";

import { useState, useEffect } from "react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { siteConfig } from "@/config/site.config";

export default function RecaptchaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const { enabled, version } = siteConfig.recaptcha;
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!enabled || !siteKey || version !== "v3") return;

    // Load reCAPTCHA on first user interaction or after 4s idle
    const load = () => setShouldLoad(true);
    const timer = setTimeout(load, 4000);

    const events = ["scroll", "click", "touchstart", "keydown"] as const;
    const handler = () => {
      load();
      cleanup();
    };
    const cleanup = () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, handler));
    };

    events.forEach((e) =>
      document.addEventListener(e, handler, { once: true, passive: true })
    );

    return cleanup;
  }, [enabled, siteKey, version]);

  if (!enabled || !siteKey || version !== "v3" || !shouldLoad) {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
