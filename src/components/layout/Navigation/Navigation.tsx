"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { siteConfig } from "@/config/site.config";
import styles from "./Navigation.module.css";

const navItems = [
  { key: "works", href: "/works" },
  { key: "about", href: "/about" },
  { key: "webflow", href: "/webflow" },
];

// Loading logo: full display name with per-letter animation
const DISPLAY_NAME = siteConfig.loading.displayName;
const EXTRA_LETTERS = DISPLAY_NAME.slice(1).split("");
const SKIP_LOADING_PAGES = ["/privacy"];

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { isLoading, isTransitioning } = useLoadingScreen();

  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);
  const showLoadingLogo = isLoading && !shouldSkipLoading;

  // --- 로고 중앙→nav 이동 애니메이션 ---
  const logoRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const hasMeasured = useRef(false);

  const measureLogo = useCallback(() => {
    const el = logoRef.current;
    if (!el) return;

    // 스케일 비율 먼저 계산 (오프셋 계산에 필요)
    const tempEl = document.createElement("span");
    tempEl.style.cssText =
      "font-size:var(--fluid-font-size-6xl);position:absolute;visibility:hidden;";
    tempEl.textContent = "H";
    document.body.appendChild(tempEl);
    const loadingFontSize = parseFloat(getComputedStyle(tempEl).fontSize);
    document.body.removeChild(tempEl);

    const navFontSize = parseFloat(getComputedStyle(el).fontSize);
    const scale = navFontSize > 0 ? loadingFontSize / navFontSize : 1;
    setScaleFactor(scale);

    // transformOrigin: "left center" 기준 → 스케일된 너비를 반영한 중앙 오프셋
    const rect = el.getBoundingClientRect();
    setCenterOffset({
      x: window.innerWidth / 2 - rect.left - (rect.width * scale) / 2,
      y: window.innerHeight / 2 - (rect.top + rect.height / 2),
    });
  }, []);

  useEffect(() => {
    if (!showLoadingLogo || hasMeasured.current || !logoRef.current) return;
    hasMeasured.current = true;
    requestAnimationFrame(measureLogo);
  }, [showLoadingLogo, measureLogo]);

  // 로딩이 완전히 끝나면 다음 로딩을 위해 측정 플래그 리셋
  useEffect(() => {
    if (!isLoading) {
      hasMeasured.current = false;
    }
  }, [isLoading]);

  // 테마 상태
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [displayTheme, setDisplayTheme] = useState(theme);
  const themeDisplayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const themeAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 언어 상태
  const [isLangAnimating, setIsLangAnimating] = useState(false);
  const [isLangClicking, setIsLangClicking] = useState(false);
  const [displayLang, setDisplayLang] = useState(language);
  const langDisplayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const langAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 실제 값이 변경되면 표시 값 동기화
  useEffect(() => setDisplayTheme(theme), [theme]);
  useEffect(() => setDisplayLang(language), [language]);

  const handleThemeToggle = () => {
    if (isThemeAnimating) return;
    toggleTheme();
  };

  const handleThemeMouseEnter = () => {
    if (isThemeAnimating) return;
    clearTimeout(themeDisplayTimer.current);
    clearTimeout(themeAnimTimer.current);
    setIsThemeAnimating(true);
    themeDisplayTimer.current = setTimeout(() => {
      setDisplayTheme(theme === "dark" ? "light" : "dark");
    }, 150);
    themeAnimTimer.current = setTimeout(() => setIsThemeAnimating(false), 300);
  };

  const handleThemeMouseLeave = () => {
    clearTimeout(themeDisplayTimer.current);
    clearTimeout(themeAnimTimer.current);
    setIsThemeAnimating(true);
    themeDisplayTimer.current = setTimeout(() => {
      setDisplayTheme(theme);
    }, 150);
    themeAnimTimer.current = setTimeout(() => setIsThemeAnimating(false), 300);
  };

  return (
    <nav className={`${styles.nav} ${showLoadingLogo ? styles.navLoading : ""}`}>
      <motion.div
        ref={logoRef}
        className={styles.logoWrapper}
        animate={
          showLoadingLogo && !isTransitioning
            ? { x: centerOffset.x, y: centerOffset.y, scale: scaleFactor }
            : { x: 0, y: 0, scale: 1 }
        }
        transition={{
          duration: isTransitioning ? 0.7 : 0,
          ease: [0.76, 0, 0.24, 1],
          delay: isTransitioning ? 0.25 : 0,
        }}
        style={{ transformOrigin: "left center" }}
      >
        <Link href="/" className={styles.logo}>
          <motion.span
            className="glith-on-hover"
            initial={showLoadingLogo ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              opacity: { duration: 0.5, delay: 0.1, ease: "easeOut" },
              y: { duration: 0.5, delay: 0.1, ease: "easeOut" },
            }}
          >
            H
          </motion.span>
          {showLoadingLogo &&
            EXTRA_LETTERS.map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: isTransitioning ? 0 : 1,
                  y: 0,
                }}
                transition={{
                  opacity: {
                    duration: isTransitioning ? 0.2 : 0.5,
                    delay: isTransitioning
                      ? (EXTRA_LETTERS.length - 1 - i) * 0.04
                      : 0.1,
                    ease: "easeOut",
                  },
                  y: { duration: 0.5, delay: 0.1, ease: "easeOut" },
                }}
              >
                {char}
              </motion.span>
            ))}
        </Link>
      </motion.div>

      <div className={styles.navCenter}>
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`${styles.navLink} glith-on-hover`}
          >
            {t(`nav.${item.key}`)}
          </Link>
        ))}
      </div>

      <div className={styles.navActions}>
        {/* 언어 토글 */}
        <button
          className={styles.actionBtn}
          onClick={() => {
            if (isLangClicking) return;
            setIsLangClicking(true);
            toggleLanguage();
            setTimeout(() => {
              setIsLangClicking(false);
            }, 300);
          }}
          onMouseEnter={() => {
            if (isLangAnimating || isLangClicking) return;
            clearTimeout(langDisplayTimer.current);
            clearTimeout(langAnimTimer.current);
            setIsLangAnimating(true);
            langDisplayTimer.current = setTimeout(() => {
              setDisplayLang(language === "ko" ? "en" : "ko");
            }, 150);
            langAnimTimer.current = setTimeout(() => setIsLangAnimating(false), 300);
          }}
          onMouseLeave={() => {
            if (isLangClicking) return;
            clearTimeout(langDisplayTimer.current);
            clearTimeout(langAnimTimer.current);
            setIsLangAnimating(true);
            langDisplayTimer.current = setTimeout(() => {
              setDisplayLang(language);
            }, 150);
            langAnimTimer.current = setTimeout(() => setIsLangAnimating(false), 300);
          }}
          aria-label={`${language === "ko" ? "KO" : "EN"} - Switch to ${language === "ko" ? "English" : "Korean"}`}
        >
          <span className={`${styles.langText} ${isLangAnimating && !isLangClicking ? styles.animating : ""} ${isLangClicking ? styles.clicking : ""}`}>
            {displayLang === "ko" ? "KO" : "EN"}
          </span>
        </button>

        {/* 테마 토글 */}
        <button
          className={styles.actionBtn}
          onClick={handleThemeToggle}
          onMouseEnter={handleThemeMouseEnter}
          onMouseLeave={handleThemeMouseLeave}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span className={`${styles.themeIconWrapper} ${isThemeAnimating ? styles.animating : ""}`}>
            {displayTheme === "dark" ? (
              <svg
                className={styles.themeIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                className={styles.themeIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
}
