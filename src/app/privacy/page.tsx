"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site.config";
import { useLenis } from "@/providers/LenisProvider";
import { content, type Language, type Section } from "@/data/privacyContent";
import { LanguageToggle, AnimatedSection } from "./components";
import styles from "./Privacy.module.css";

// Animation variants
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

// Section content renderer
function SectionContent({ section }: { section: Section }) {
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

  // Navigate back or to home
  const handleBack = useCallback(() => {
    // Check if there's a previous page in history (more than the current page)
    if (window.history.length > 1 && document.referrer) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // Disable infinite scroll on this page
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
        {/* Header */}
        <motion.div className={styles.header} variants={itemVariants}>
          <button onClick={handleBack} className={styles.backLink}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.backLink}
          </button>

          <LanguageToggle lang={lang} onLangChange={setLang} />
        </motion.div>

        {/* Title */}
        <motion.h1 className={styles.title} variants={itemVariants}>
          {t.title}
        </motion.h1>
        <motion.p className={styles.lastUpdated} variants={itemVariants}>
          {t.lastUpdated}: {formatDate(lang)}
        </motion.p>

        {/* Sections */}
        {t.sections.map((section, index) => (
          <AnimatedSection key={index} delay={index * 0.05}>
            <SectionContent section={section} />
          </AnimatedSection>
        ))}

        {/* Footer */}
        <motion.div
          className={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.personal.nickname}.{" "}
            {t.footer}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
