"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLenis } from "@/providers/LenisProvider";
import { content, type Language, type Section } from "@/data/privacyContent";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { AnimatedSection } from "./components";
import styles from "./Privacy.module.css";

// 애니메이션 배리언트
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

// 섹션 콘텐츠 렌더러
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

export default function PrivacyPage() {
  const [lang, setLang] = useState<Language>("ko");
  const t = content[lang];
  const router = useRouter();
  const { setInfinite, lenis, stop, start } = useLenis();

  // 뒤로 가기 또는 홈으로 이동
  const handleBack = useCallback(() => {
    // 히스토리에 이전 페이지가 있는지 확인 (현재 페이지 이상인 경우)
    if (window.history.length > 1 && document.referrer) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // 이 페이지에서 무한 스크롤 비활성화
  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      }
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);

  const formatDate = (locale: string) => {
    return new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={styles.privacy}>
      <motion.div
        className={styles.container}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 헤더 */}
        <motion.div className={styles.header} variants={itemVariants}>
          <Button
            variant="outline"
            size="sm"
            className={styles.backLink}
            onClick={handleBack}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            {t.backLink}
          </Button>

          <LanguageToggle lang={lang} onLangChange={setLang} />
        </motion.div>

        {/* 타이틀 */}
        <motion.h1 className={styles.title} variants={itemVariants}>
          {t.title}
        </motion.h1>
        <motion.p className={styles.lastUpdated} variants={itemVariants}>
          {t.lastUpdated}: {formatDate(lang)}
        </motion.p>

        {/* 섹션 */}
        {t.sections.map((section, index) => (
          <AnimatedSection key={index} delay={index * 0.05}>
            <SectionContent section={section} />
          </AnimatedSection>
        ))}

      </motion.div>
    </div>
  );
}
