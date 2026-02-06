"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Navigation.module.css";

const navItems = [
  { key: "works", href: "/works" },
  { key: "about", href: "/about" },
  { key: "webflow", href: "/webflow" },
];

export default function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Theme state
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [isThemeHovered, setIsThemeHovered] = useState(false);
  const [displayTheme, setDisplayTheme] = useState(theme);

  // Language state
  const [isLangHovered, setIsLangHovered] = useState(false);
  const [isLangAnimating, setIsLangAnimating] = useState(false);
  const [isLangClicking, setIsLangClicking] = useState(false);
  const [displayLang, setDisplayLang] = useState(language);

  // Sync displayTheme when theme changes (e.g., after hydration)
  useEffect(() => {
    if (!isThemeHovered) {
      setDisplayTheme(theme);
    }
  }, [theme, isThemeHovered]);

  // Sync displayLang when language changes
  useEffect(() => {
    if (!isLangHovered) {
      setDisplayLang(language);
    }
  }, [language, isLangHovered]);

  const handleThemeToggle = () => {
    if (isThemeAnimating) return;
    toggleTheme();
  };

  const handleThemeMouseEnter = () => {
    if (isThemeAnimating) return;
    setIsThemeAnimating(true);
    setTimeout(() => {
      setDisplayTheme(theme === "dark" ? "light" : "dark");
    }, 150);
    setTimeout(() => setIsThemeAnimating(false), 300);
    setIsThemeHovered(true);
  };

  const handleThemeMouseLeave = () => {
    if (isThemeAnimating) return;
    setIsThemeAnimating(true);
    setTimeout(() => {
      setDisplayTheme(theme);
    }, 150);
    setTimeout(() => setIsThemeAnimating(false), 300);
    setIsThemeHovered(false);
  };

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className="glith-on-hover">H</span>
      </Link>

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
        {/* Language Toggle */}
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
            setIsLangAnimating(true);
            setTimeout(() => {
              setDisplayLang(language === "ko" ? "en" : "ko");
            }, 150);
            setTimeout(() => setIsLangAnimating(false), 300);
            setIsLangHovered(true);
          }}
          onMouseLeave={() => {
            if (isLangAnimating || isLangClicking) return;
            setIsLangAnimating(true);
            setTimeout(() => {
              setDisplayLang(language);
            }, 150);
            setTimeout(() => setIsLangAnimating(false), 300);
            setIsLangHovered(false);
          }}
          aria-label={`Switch to ${language === "ko" ? "English" : "Korean"}`}
        >
          <span className={`${styles.langText} ${isLangAnimating && !isLangClicking ? styles.animating : ""} ${isLangClicking ? styles.clicking : ""}`}>
            {displayLang === "ko" ? "KO" : "EN"}
          </span>
        </button>

        {/* Theme Toggle */}
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
