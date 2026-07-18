"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { content, lastUpdatedDate, type Language, type Section } from "@/data/privacy";
import DetailLayout from "@/components/layout/DetailLayout";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { AnimatedSection } from "./components";
import styles from "./Privacy.module.css";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] as const },
});

function SectionContent({ section }: { section: Section }) {
  const siteConfig = useSiteConfig();
  return (
    <>
      <h2>{section.title}</h2>
      <p>
        {section.contentParts
          ? section.contentParts.map((part, i) =>
              typeof part === "string" ? (
                <span key={i}>{part}</span>
              ) : (
                <span key={i} className="highlighted-text">
                  {part.highlight}
                </span>
              ),
            )
          : section.content}
        {section.email && (
          <a href={`mailto:${siteConfig.contact.email}`}>
            {siteConfig.contact.email}
          </a>
        )}
      </p>
      {section.list && (
        <ul>
          {section.list.map((item, i) => (
            <li key={i}>
              {item.strong && (
                <span className="highlighted-text">{item.strong}</span>
              )}{" "}
              {item.text}
              {item.link && (
                <>
                  {" "}
                  <a
                    href={item.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.link.text}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PrivacyClient() {
  const [lang, setLang] = useState<Language>("ko");
  const t = content[lang];

  const formatDate = (locale: string) => {
    // 항상 실제 최종 개정일 기준. 로컬 자정으로 파싱(날짜 문자열만 넘기면 UTC 로 해석돼 하루 밀릴 수 있음).
    return new Date(`${lastUpdatedDate}T00:00:00`).toLocaleDateString(
      locale === "ko" ? "ko-KR" : "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );
  };

  return (
    <DetailLayout
      backHref="/"
      backLabel={t.backLink}
      contentClassName={styles.wrapper}
    >
      <motion.div className={styles.header} {...fadeUp(0.1)}>
        <p className={styles.lastUpdated}>
          {t.lastUpdated}: {formatDate(lang)}
        </p>
        <LanguageToggle lang={lang} onLangChange={setLang} />
      </motion.div>

      <motion.h1 className={styles.title} {...fadeUp(0.2)}>{t.title}</motion.h1>
      <motion.div className={styles.divider} {...fadeUp(0.3)} />

      {t.sections.map((section, index) => (
        <AnimatedSection key={index}>
          <SectionContent section={section} />
        </AnimatedSection>
      ))}
    </DetailLayout>
  );
}
