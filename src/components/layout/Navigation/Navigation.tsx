"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSoundStore } from "@/stores/soundStore";
import { useContactStore } from "@/stores/contactStore";
import { siteConfig } from "@/config/site.config";
import styles from "./Navigation.module.css";

const navItems = [
  { key: "works", href: "/works" },
  { key: "profile", href: "/profile" },
  { key: "about", href: "/about" },
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
  const { isMuted, toggleMute } = useSoundStore();
  const { openForm } = useContactStore();

  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);
  const showLoadingLogo = isLoading && !shouldSkipLoading;

  // --- 로고 중앙→nav 이동 애니메이션 ---
  const logoRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const hasMeasured = useRef(false);

  const [logoMeasured, setLogoMeasured] = useState(false);

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
    setLogoMeasured(true);
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
      setLogoMeasured(false);
    }
  }, [isLoading]);

  // 사운드 상태
  const [isSoundClicking, setIsSoundClicking] = useState(false);
  const [isSoundHovered, setIsSoundHovered] = useState(false);
  const isSoundLocked = useRef(false);
  const showMutedIcon = isSoundLocked.current ? isMuted : isMuted !== isSoundHovered;

  const handleSoundToggle = () => {
    if (isSoundClicking) return;
    setIsSoundClicking(true);
    isSoundLocked.current = true;
    toggleMute();
    setTimeout(() => setIsSoundClicking(false), 300);
  };

  // 테마 상태
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [isThemeClicking, setIsThemeClicking] = useState(false);
  const [displayTheme, setDisplayTheme] = useState(theme);
  const themeDisplayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const themeAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isThemeLocked = useRef(false);

  // 언어 상태
  const [isLangAnimating, setIsLangAnimating] = useState(false);
  const [isLangClicking, setIsLangClicking] = useState(false);
  const [displayLang, setDisplayLang] = useState(language);
  const langDisplayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const langAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLangLocked = useRef(false);

  // 실제 값이 변경되면 표시 값 동기화
  useEffect(() => setDisplayTheme(theme), [theme]);
  useEffect(() => setDisplayLang(language), [language]);

  const handleThemeToggle = () => {
    if (isThemeClicking) return;
    setIsThemeClicking(true);
    isThemeLocked.current = true;
    toggleTheme();
    setTimeout(() => setIsThemeClicking(false), 300);
  };

  const handleThemeMouseEnter = () => {
    if (isThemeAnimating || isThemeClicking) return;
    clearTimeout(themeDisplayTimer.current);
    clearTimeout(themeAnimTimer.current);
    setIsThemeAnimating(true);
    themeDisplayTimer.current = setTimeout(() => {
      setDisplayTheme(theme === "dark" ? "light" : "dark");
    }, 150);
    themeAnimTimer.current = setTimeout(() => setIsThemeAnimating(false), 300);
  };

  const handleThemeMouseLeave = () => {
    if (isThemeClicking) return;
    if (isThemeLocked.current) {
      isThemeLocked.current = false;
      return;
    }
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
        style={{
          transformOrigin: "left center",
          visibility: showLoadingLogo && !logoMeasured ? "hidden" : "visible",
        }}
      >
        <Link href="/" className={styles.logo}>
          <motion.span
            className="glith-on-hover"
            initial={showLoadingLogo ? { opacity: 0, y: 20, filter: "blur(12px)" } : false}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              opacity: { duration: 0.6, delay: 0.1, ease: "easeOut" },
              y: { duration: 0.7, delay: 0.1, ease: "easeOut" },
              filter: { duration: 1.0, delay: 0.1, ease: "easeOut" },
            }}
          >
            H
          </motion.span>
          {showLoadingLogo &&
            EXTRA_LETTERS.map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{
                  opacity: isTransitioning ? 0 : 1,
                  y: 0,
                  filter: isTransitioning ? "blur(6px)" : "blur(0px)",
                }}
                transition={{
                  opacity: {
                    duration: isTransitioning ? 0.2 : 0.6,
                    delay: isTransitioning
                      ? (EXTRA_LETTERS.length - 1 - i) * 0.04
                      : 0.15 + i * 0.04,
                    ease: "easeOut",
                  },
                  y: {
                    duration: 0.7,
                    delay: 0.15 + i * 0.04,
                    ease: "easeOut",
                  },
                  filter: {
                    duration: isTransitioning ? 0.3 : 1.0,
                    delay: isTransitioning
                      ? (EXTRA_LETTERS.length - 1 - i) * 0.04
                      : 0.2 + i * 0.05,
                    ease: "easeOut",
                  },
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
        {/* Get in Touch */}
        <button
          className={`${styles.actionBtn} ${styles.contactBtn}`}
          onClick={openForm}
          aria-label="Get in Touch"
        >
          <span className={styles.contactText}>Get in Touch</span>
        </button>

        {/* 사운드 토글 */}
        <button
          className={styles.actionBtn}
          onClick={handleSoundToggle}
          onMouseEnter={() => setIsSoundHovered(true)}
          onMouseLeave={() => { isSoundLocked.current = false; setIsSoundHovered(false); }}
          aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          <span className={`${styles.soundIconWrapper} ${isSoundClicking ? styles.clicking : ""}`}>
            <svg
              className={`${styles.soundIcon} ${showMutedIcon ? styles.soundIconMuted : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path className={styles.waveOuter} d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path className={styles.waveInner} d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <line className={styles.xLine} x1="23" y1="9" x2="17" y2="15" />
              <line className={styles.xLine} x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </span>
        </button>

        {/* 언어 토글 */}
        <button
          className={styles.actionBtn}
          onClick={() => {
            if (isLangClicking) return;
            setIsLangClicking(true);
            isLangLocked.current = true;
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
            if (isLangLocked.current) {
              isLangLocked.current = false;
              return;
            }
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
          <span className={`${styles.themeIconWrapper} ${isThemeAnimating && !isThemeClicking ? styles.animating : ""} ${isThemeClicking ? styles.clicking : ""}`}>
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
