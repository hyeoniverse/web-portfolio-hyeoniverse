"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSoundStore } from "@/stores/soundStore";
import { useContactStore } from "@/stores/contactStore";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useMotionValue, useSpring } from "framer-motion";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import Logo from "@/components/common/Logo";
import Button from "@/components/ui/Button";
import styles from "./Navigation.module.css";

function MagneticWrapper({
  children,
  strength = 0.4,
  radius = 80,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const restCenterX = rect.left - springX.get() + rect.width / 2;
      const restCenterY = rect.top - springY.get() + rect.height / 2;
      const deltaX = e.clientX - restCenterX;
      const deltaY = e.clientY - restCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < radius) {
        x.set(deltaX * strength);
        y.set(deltaY * strength);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, springX, springY, strength, radius]);

  return (
    <motion.div ref={wrapperRef} style={{ x: springX, y: springY }} className={className}>
      {children}
    </motion.div>
  );
}

const navItems = [
  { key: "works", href: "/works" },
  { key: "posts", href: "/posts" },
  { key: "profile", href: "/profile" },
  { key: "about", href: "/about" },
];

const menuItems = [
  { key: "home", href: "/" },
  ...navItems,
  { key: "contacts", href: null },
];

const adminNavItems = [
  { key: "admin-posts", href: "/admin/posts", label: "Posts" },
  { key: "admin-works", href: "/admin/works", label: "Works" },
  { key: "admin-settings", href: "/admin/settings", label: "Settings" },
];

const adminMenuItems = [
  ...adminNavItems,
  { key: "logout", href: null as string | null, label: "Logout" },
];

const SKIP_LOADING_PAGES = ["/privacy"];

export default function Navigation() {
  const siteConfig = useSiteConfig();
  const router = useRouter();

  // Loading logo: full display name with per-letter animation
  const DISPLAY_NAME = siteConfig.loading.displayName;
  const EXTRA_LETTERS = DISPLAY_NAME.slice(1).split("");

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { isLoading, isTransitioning } = useLoadingScreen();
  const { isMuted, toggleMute, hydrate: hydrateSound } = useSoundStore();

  useEffect(() => {
    hydrateSound();
  }, [hydrateSound]);
  const { openForm } = useContactStore();
  const { stop: lenisStop, start: lenisStart } = useLenis();

  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    if (!isAdminPage) return;
    const supabase = createSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email ?? "");
    });
  }, [isAdminPage]);

  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname) || isAdminPage;
  const showLoadingLogo = isLoading && !shouldSkipLoading;

  // ── Mobile menu drawer (clip-path, ContactDrawer pattern) ──
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuClipOpen, setMenuClipOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  useEffect(() => setMenuMounted(true), []);
  useEffect(() => setIsMenuOpen(false), [pathname]);

  useEffect(() => {
    let rafId: number;
    let unmountTimer: ReturnType<typeof setTimeout>;

    if (isMenuOpen) {
      setShowMenu(true);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setMenuClipOpen(true);
        });
      });
    } else {
      setMenuClipOpen(false);
      unmountTimer = setTimeout(() => {
        setShowMenu(false);
      }, 800);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(unmountTimer);
    };
  }, [isMenuOpen]);

  // ── Menu scroll lock ──
  useEffect(() => {
    if (isMenuOpen) {
      lenisStop();
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top, 10) * -1);
      lenisStart();
    }
  }, [isMenuOpen, lenisStop, lenisStart]);

  // ── Nav sliding indicator ──
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // active key from pathname (detail 페이지도 부모 경로로 매칭)
  const currentNavItems = isAdminPage ? adminNavItems : navItems;
  const activeNavKey =
    currentNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    )?.key ?? null;
  const targetKey = hoveredNav ?? activeNavKey;

  useEffect(() => {
    if (!targetKey) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const el = navLinkRefs.current[targetKey];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - parentRect.left,
      width: elRect.width,
      opacity: 1,
    });
  }, [targetKey, language]);

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

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }, [router]);

  return (
    <nav className={`${styles.nav} ${showLoadingLogo ? styles.navLoading : ""} ${isAdminPage ? styles.navAdmin : ""}`}>
      <div className={styles.logoGroup}>
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
          <Link href={isAdminPage ? "/admin/posts" : "/"} className={styles.logo}>
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
        {isAdminPage && <span className={styles.adminBadge}>Admin</span>}
      </div>

      <div
        className={styles.navCenter}
        onMouseLeave={() => setHoveredNav(null)}
      >
        {isAdminPage
          ? adminNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                ref={(el) => { navLinkRefs.current[item.key] = el; }}
                className={`${styles.navLink} glith-on-hover`}
                onMouseEnter={() => setHoveredNav(item.key)}
              >
                {item.label}
              </Link>
            ))
          : navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                ref={(el) => { navLinkRefs.current[item.key] = el; }}
                className={`${styles.navLink} glith-on-hover`}
                onMouseEnter={() => setHoveredNav(item.key)}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
        <span
          className={`${styles.navIndicator} ${indicatorStyle.opacity === 0 ? styles.navIndicatorHidden : ""}`}
          style={indicatorStyle}
        />
      </div>

      <div className={styles.navActions}>
        {isAdminPage ? (
          <>
            {adminEmail && <span className={styles.adminEmail}>{adminEmail}</span>}
            <Button
              variant="outline"
              size="xs"
              className={styles.logoutBtn}
              onClick={handleLogout}
              soundDisabled
            >
              Logout
            </Button>
          </>
        ) : (
          /* Get in Touch */
          <Button
            variant="outline"
            size="xs"
            className={styles.contactBtn}
            onClick={openForm}
            soundDisabled
          >
            Get in Touch
          </Button>
        )}

        {/* 언어 토글 — admin에서도 표시 */}
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

        {/* 사운드 토글 — admin에서 숨김 */}
        {!isAdminPage && (
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
        )}

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

        {/* 메뉴 버튼 (≤1024px) — 2×2 dot grid + magnetic */}
        <MagneticWrapper strength={0.5} radius={50} className={styles.menuBtnWrapper}>
          <button
            className={`${styles.actionBtn} ${styles.menuBtn}`}
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className={styles.menuDots}>
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
              <span className={styles.menuDot} />
            </span>
          </button>
        </MagneticWrapper>
      </div>

      {/* 메뉴 서랍 (clip-path, ContactDrawer pattern) */}
      {menuMounted && showMenu &&
        createPortal(
          <div
            className={styles.menuClipWrapper}
            style={{
              clipPath: menuClipOpen ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
              transition: menuClipOpen
                ? "clip-path 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)"
                : "clip-path 0.8s cubic-bezier(0.4, 0, 0.6, 1)",
            }}
          >
            <div
              className={styles.menuBackdrop}
              onClick={() => setIsMenuOpen(false)}
            />
            <div className={styles.menuDrawer}>
              {/* Header: logo center */}
              <div className={styles.menuHeader}>
                <Logo variant="full" as="span" className={styles.menuLogo} />
              </div>

              {/* Close button — nav 햄버거와 동일한 우상단 위치 + magnetic */}
              <MagneticWrapper strength={0.5} radius={50} className={styles.menuCloseBtn}>
                <button
                  className={styles.menuCloseBtnInner}
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <span className={styles.menuCloseDots}>
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                    <span className={styles.menuCloseDot} />
                  </span>
                </button>
              </MagneticWrapper>

              <nav className={styles.menuNav}>
                {(isAdminPage ? adminMenuItems : menuItems).map((item) => {
                  if (!item.href) {
                    return (
                      <button
                        key={item.key}
                        className={`${styles.menuLink} glith-on-hover`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (isAdminPage) {
                            handleLogout();
                          } else {
                            openForm();
                          }
                        }}
                      >
                        {isAdminPage ? (item as typeof adminMenuItems[number]).label : t(`nav.${item.key}`)}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`${styles.menuLink} glith-on-hover ${pathname === item.href || pathname.startsWith(item.href + "/") ? styles.menuLinkActive : ""}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {isAdminPage ? (item as typeof adminMenuItems[number]).label : t(`nav.${item.key}`)}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer: email */}
              <div className={styles.menuFooter}>
                <span className={styles.menuFooterLabel}>Say Hi!</span>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className={styles.menuFooterEmail}
                >
                  {siteConfig.contact.email}
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </nav>
  );
}
