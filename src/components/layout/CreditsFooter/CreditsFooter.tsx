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
  const { t, language } = useLanguage();
  /* 저작자 표시 문구는 로케일 고정 — admin 에서 덮어쓸 수 없다.
     덧붙이는 것만 허용: 공동 제작자 이름(creditsNames) + 아래 한 줄(creditsNote) */
  const about = siteConfig.about as {
    creditsNames?: string[]; creditsNote?: string; creditsNote_ko?: string;
    creditsNoteFontSize?: string; creditsNoteFontFamily?: string; creditsNoteLineHeight?: string; creditsNoteAlign?: string;
  };
  const parts = t("aboutPage.credits").split("❤");
  const names = [siteConfig.personal.nickname, ...(about.creditsNames ?? []).map((n) => n.trim()).filter(Boolean)];
  const note = (language === "ko" ? about.creditsNote_ko : about.creditsNote)?.trim();

  return (
    <div
      className={`${styles.credits} ${styles[variant]} ${className ?? ""}`}
    >
      <p className={styles.text}>
        {parts[0]}
        <span className={styles.heart}>❤</span>
        {parts[1]} {names.join(", ")}
      </p>
      {note && (
        <p className={styles.note} style={{
          fontSize: about.creditsNoteFontSize || undefined,
          fontFamily: about.creditsNoteFontFamily || undefined,
          lineHeight: about.creditsNoteLineHeight || undefined,
          textAlign: (about.creditsNoteAlign as "left" | "center" | "right") || "left",
        }}>
          {note}
        </p>
      )}
      {variant === "panel" && (
        <TextLink href="/design-system" external className={styles.designSystemLink}>
          Design System
        </TextLink>
      )}
    </div>
  );
}
