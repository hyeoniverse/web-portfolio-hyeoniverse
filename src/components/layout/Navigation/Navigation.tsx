"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSoundStore } from "@/stores/soundStore";
import { useContactStore } from "@/stores/contactStore";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
// Supabase client는 admin 페이지에서만 동적으로 로드 (630KB 번들 절약)
const loadSupabaseClient = () => import("@/lib/supabase/client").then(m => m.createClient());
import Image from "next/image";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import MagneticWrapper from "./MagneticWrapper";
import MobileMenu from "./MobileMenu";
import styles from "./Navigation.module.css";

const navDescs: Record<string, Record<string, string>> = {
  works: { ko: "프로젝트 포트폴리오", en: "Project portfolio" },
  posts: { ko: "블로그 & 아티클", en: "Blog & articles" },
  profile: { ko: "소개 & 이력", en: "Introduction & career" },
  about: { ko: "사이트 소개", en: "About this site" },
};

const navItems = [
  { key: "works", href: "/works", label: "Works" },
  { key: "posts", href: "/posts", label: "Posts" },
  { key: "profile", href: "/profile", label: "Profile" },
  { key: "about", href: "/about", label: "About" },
];

const menuItems = [
  { key: "home", href: "/", label: "Home" },
  ...navItems,
  { key: "contacts", href: null, label: "Contacts" },
];

const adminNavItems = [
  { key: "admin-settings", href: "/admin/settings", label: "Settings" },
  { key: "admin-works", href: "/admin/works", label: "Works" },
  { key: "admin-posts", href: "/admin/posts", label: "Posts" },
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
  const LOGO_TEXT = siteConfig.brand.logoText || "H";
  const DISPLAY_NAME = siteConfig.brand.logoFullText || siteConfig.loading.displayName;
  const EXTRA_LETTERS = DISPLAY_NAME.slice(LOGO_TEXT.length).split("");

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  // 이미지 로고 URL (다크모드 우선 폴백)
  const isDark = theme === "dark";
  const shortLogoUrl = (isDark && siteConfig.brand.logoShortDarkUrl) || siteConfig.brand.logoShortUrl;
  const fullLogoUrl = (isDark && siteConfig.brand.logoFullDarkUrl) || siteConfig.brand.logoFullUrl;
  const hasImageLogo = !!shortLogoUrl;
  const loadingLogoUrl = fullLogoUrl || shortLogoUrl;
  const hasDistinctFullLogo = !!fullLogoUrl && fullLogoUrl !== shortLogoUrl;
  const { isLoading, isTransitioning } = useLoadingScreen();
  const { isMuted, toggleMute } = useSoundStore();
  const { openForm } = useContactStore();
  const { stop: lenisStop, start: lenisStart } = useLenis();

  const isAdminPage = pathname.startsWith("/admin");

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    if (!isAdminPage) return;
    let subscription: { unsubscribe: () => void } | undefined;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        setAdminEmail(data.user?.email ?? "");
      });
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setAdminEmail(session?.user?.email ?? "");
      });
      subscription = sub;
    });
    return () => subscription?.unsubscribe();
  }, [isAdminPage]);

  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname) || isAdminPage;
  const showLoadingLogo = isLoading && !shouldSkipLoading;

  // 로딩→nav 전환 시 z-index 유지: LoadingScreen 페이드아웃 완료까지 nav를 overlay 위에 유지
  const [elevatedZ, setElevatedZ] = useState(false);
  useEffect(() => {
    if (showLoadingLogo) {
      setElevatedZ(true);
    } else if (elevatedZ) {
      // LoadingScreen 페이드아웃(0.5s) + 여유 → 그 후 z-index 정상화
      const timer = setTimeout(() => setElevatedZ(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showLoadingLogo, elevatedZ]);

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
  const navCenterRef = useRef<HTMLDivElement>(null);
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
    const container = navCenterRef.current;
    if (!container) return;
    const parentRect = container.getBoundingClientRect();
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

  // 사운드 툴팁 (로딩 완료 후 매번 표시)
  const [showSoundTip, setShowSoundTip] = useState(false);
  const soundTipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isAdminPage || isLoading || isTransitioning) return;
    soundTipTimer.current = setTimeout(() => {
      setShowSoundTip(true);
      soundTipTimer.current = setTimeout(() => setShowSoundTip(false), 5000);
    }, 2000);
    return () => { if (soundTipTimer.current) clearTimeout(soundTipTimer.current); };
  }, [isAdminPage, isLoading, isTransitioning]);

  const handleSoundToggle = () => {
    if (isSoundClicking) return;
    setIsSoundClicking(true);
    isSoundLocked.current = true;
    setShowSoundTip(false);
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
    const supabase = await loadSupabaseClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }, [router]);

  return (
    <nav className={`${styles.nav} ${showLoadingLogo ? styles.navLoading : ""} ${elevatedZ ? styles.navElevated : ""} ${isAdminPage ? styles.navAdmin : ""}`}>
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
            duration: isTransitioning ? 0.8 : 0,
            ease: [0.76, 0, 0.24, 1],
            delay: isTransitioning ? 0.05 : 0,
          }}
          style={{
            transformOrigin: "left center",
            visibility: showLoadingLogo && !logoMeasured ? "hidden" : "visible",
          }}
        >
          <Link href={isAdminPage ? "/admin/posts" : "/"} className={styles.logo}>
          {hasImageLogo ? (
            <>
              {/* 로딩 중 풀 로고 이미지 (숏과 다를 때만) */}
              {showLoadingLogo && hasDistinctFullLogo && (
                <motion.span
                  className={styles.logoImageWrap}
                  initial={{ opacity: 0, filter: "blur(12px)" }}
                  animate={{
                    opacity: isTransitioning ? 0 : 1,
                    filter: isTransitioning ? "blur(6px)" : "blur(0px)",
                  }}
                  transition={{
                    opacity: { duration: isTransitioning ? 0.3 : 0.6, delay: 0.1, ease: "easeOut" },
                    filter: { duration: isTransitioning ? 0.3 : 1.0, delay: 0.1, ease: "easeOut" },
                  }}
                  style={{ position: "absolute" }}
                >
                  <Image src={loadingLogoUrl!} alt={DISPLAY_NAME} width={120} height={32} className={styles.logoImage} unoptimized />
                </motion.span>
              )}
              {/* 숏 로고 이미지 */}
              <motion.span
                className={styles.logoImageWrap}
                initial={showLoadingLogo ? { opacity: 0, filter: "blur(12px)" } : false}
                animate={{
                  opacity: showLoadingLogo && hasDistinctFullLogo && !isTransitioning ? 0 : 1,
                  filter: "blur(0px)",
                }}
                transition={{
                  opacity: { duration: 0.6, delay: showLoadingLogo ? 0.1 : 0, ease: "easeOut" },
                  filter: { duration: 1.0, delay: 0.1, ease: "easeOut" },
                }}
              >
                <Image src={shortLogoUrl!} alt={LOGO_TEXT} width={32} height={32} className={styles.logoImage} unoptimized />
              </motion.span>
            </>
          ) : (
            <>
              <motion.span
                className={siteConfig.brand.logoGlitch ? "glith-on-hover" : undefined}
                initial={showLoadingLogo ? { opacity: 0, y: 20, filter: "blur(12px)" } : false}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.1, ease: "easeOut" },
                  y: { duration: 0.7, delay: 0.1, ease: "easeOut" },
                  filter: { duration: 1.0, delay: 0.1, ease: "easeOut" },
                }}
                style={(isDark ? siteConfig.brand.logoColorDark : siteConfig.brand.logoColor)
                  ? { color: isDark ? siteConfig.brand.logoColorDark : siteConfig.brand.logoColor }
                  : undefined}
              >
                {LOGO_TEXT}
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
            </>
          )}
        </Link>
        </motion.div>
        {isAdminPage && <span className={styles.adminBadge}>Admin</span>}
      </div>

      <div
        ref={navCenterRef}
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
              <Tooltip
                key={item.key}
                content={navDescs[item.key]?.[language] ?? ""}
                delay={600}
                placement="bottom"
              >
                <Link
                  href={item.href}
                  ref={(el) => { navLinkRefs.current[item.key] = el; }}
                  className={`${styles.navLink} glith-on-hover`}
                  onMouseEnter={() => setHoveredNav(item.key)}
                >
                  {item.label}
                </Link>
              </Tooltip>
            ))}
        <span
          className={`${styles.navIndicator} ${indicatorStyle.opacity === 0 ? styles.navIndicatorHidden : ""}`}
          style={indicatorStyle}
        />
      </div>

      <div className={styles.navActions}>
        <AnimatePresence mode="wait">
          {isAdminPage && adminEmail ? (
            <motion.div
              key="admin-actions"
              className={styles.adminActions}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span className={styles.adminEmail}>{adminEmail}</span>
              <Button
                variant="outline"
                size="xs"
                className={styles.logoutBtn}
                onClick={handleLogout}
                soundDisabled
              >
                Logout
              </Button>
            </motion.div>
          ) : !isAdminPage ? (
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
        ) : null}
        </AnimatePresence>

        {/* 언어 토글 — admin에서도 표시 */}
        <Tooltip content={language === "ko" ? "언어 전환" : "Switch language"} delay={600} placement="bottom">
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
            aria-pressed={language === "ko"}
          >
            <span className={`${styles.langText} ${isLangAnimating && !isLangClicking ? styles.animating : ""} ${isLangClicking ? styles.clicking : ""}`}>
              {displayLang === "ko" ? "KO" : "EN"}
            </span>
          </button>
        </Tooltip>

        {/* 사운드 토글 — admin에서 숨김 */}
        {!isAdminPage && (
          <div className={styles.soundBtnWrap}>
            <Tooltip content={language === "ko" ? "배경 음악" : "Background music"} delay={600} placement="bottom">
              <button
                className={styles.actionBtn}
                onClick={handleSoundToggle}
                onMouseEnter={() => { setIsSoundHovered(true); setShowSoundTip(false); }}
                onMouseLeave={() => { isSoundLocked.current = false; setIsSoundHovered(false); }}
                aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
                aria-pressed={!isMuted}
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
            </Tooltip>
            {showSoundTip && (
              <span className={styles.soundTip} onClick={() => setShowSoundTip(false)}>
                {language === "ko" ? "BGM을 켤 수 있어요" : "Enable BGM"}
              </span>
            )}
          </div>
        )}

        {/* 테마 토글 */}
        <Tooltip content={language === "ko" ? "테마 전환" : "Toggle theme"} delay={600} placement="bottom">
          <button
            className={styles.actionBtn}
            onClick={handleThemeToggle}
            onMouseEnter={handleThemeMouseEnter}
            onMouseLeave={handleThemeMouseLeave}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
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
        </Tooltip>

        {/* 메뉴 버튼 (≤1024px) — 2×2 dot grid + magnetic */}
        <MagneticWrapper strength={0.5} radius={50} className={styles.menuBtnWrapper}>
          <button
            className={`${styles.actionBtn} ${styles.menuBtn}`}
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={isMenuOpen}
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
      <MobileMenu
        isOpen={isMenuOpen}
        showMenu={showMenu}
        menuClipOpen={menuClipOpen}
        menuMounted={menuMounted}
        pathname={pathname}
        isAdminPage={isAdminPage}
        menuItems={isAdminPage ? adminMenuItems : menuItems}
        contactEmail={siteConfig.contact.email}
        onClose={() => setIsMenuOpen(false)}
        onContactOpen={openForm}
        onLogout={handleLogout}
      />
    </nav>
  );
}
