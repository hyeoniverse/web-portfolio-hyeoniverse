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
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayTheme, setDisplayTheme] = useState(theme);
  const [isLangHovered, setIsLangHovered] = useState(false);

  // Sync displayTheme when theme changes (e.g., after hydration)
  useEffect(() => {
    if (!isAnimating) {
      setDisplayTheme(theme);
    }
  }, [theme, isAnimating]);

  const handleThemeToggle = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Change icon at halfway point of rotation
    setTimeout(() => {
      setDisplayTheme(theme === "dark" ? "light" : "dark");
      toggleTheme();
    }, 150);

    setTimeout(() => setIsAnimating(false), 300);
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
          onClick={toggleLanguage}
          onMouseEnter={() => setIsLangHovered(true)}
          onMouseLeave={() => setIsLangHovered(false)}
          aria-label={`Switch to ${language === "ko" ? "English" : "Korean"}`}
        >
          <span className={styles.langText}>
            {isLangHovered
              ? language === "ko" ? "EN" : "KO"
              : language === "ko" ? "KO" : "EN"}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          className={styles.actionBtn}
          onClick={handleThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span className={`${styles.themeIconWrapper} ${isAnimating ? styles.animating : ""}`}>
            {displayTheme === "dark" ? (
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
            ) : (
              <svg
                className={styles.themeIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
}
