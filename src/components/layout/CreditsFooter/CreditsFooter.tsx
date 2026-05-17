"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import TextLink from "@/components/ui/TextLink";
import styles from "./CreditsFooter.module.css";

interface CreditsFooterProps {
  /** "panel" = about 전체화면 패널, "section" = 일반 페이지 하단 */
  variant?: "panel" | "section";
  className?: string;
}

export default function CreditsFooter({
  variant = "section",
  className,
}: CreditsFooterProps) {
  const siteConfig = useSiteConfig();
  const { t } = useLanguage();
  const parts = t("aboutPage.credits").split("❤");

  return (
    <div
      className={`${styles.credits} ${styles[variant]} ${className ?? ""}`}
    >
      <p className={styles.text}>
        {parts[0]}
        <span className={styles.heart}>❤</span>
        {parts[1]} {siteConfig.personal.nickname}
      </p>
      {variant === "panel" && (
        <TextLink href="/design-system" external className={styles.designSystemLink}>
          Design System
        </TextLink>
      )}
    </div>
  );
}
