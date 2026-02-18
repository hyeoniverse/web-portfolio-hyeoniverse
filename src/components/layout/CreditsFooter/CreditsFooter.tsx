"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";
import styles from "./CreditsFooter.module.css";

interface CreditsFooterProps {
  /** "panel" = behind 전체화면 패널, "section" = 일반 페이지 하단 */
  variant?: "panel" | "section";
  className?: string;
}

export default function CreditsFooter({
  variant = "section",
  className,
}: CreditsFooterProps) {
  const { t } = useLanguage();
  const parts = t("behind.credits").split("❤");

  return (
    <div
      className={`${styles.credits} ${styles[variant]} ${className ?? ""}`}
    >
      <p className={styles.text}>
        {parts[0]}
        <span className={styles.heart}>❤</span>
        {parts[1]} {siteConfig.personal.nickname}
      </p>
    </div>
  );
}
