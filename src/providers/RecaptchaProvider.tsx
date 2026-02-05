"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { siteConfig } from "@/config/site.config";

export default function RecaptchaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const { enabled, version } = siteConfig.recaptcha;

  // Only wrap with provider for v3
  if (!enabled || !siteKey || version !== "v3") {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
