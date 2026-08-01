"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import type { Point } from "@/types";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Bell, ArrowRight } from "@/components/icons";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSoundStore } from "@/stores/soundStore";
import { useContactStore } from "@/stores/contactStore";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import {
  resolveFaviconShadow,
  firstGrapheme,
  graphemes,
  FaviconBadge,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  type FaviconRenderInput,
  type FaviconShape,
  type FaviconWeight,
} from "@/lib/favicon";
// Supabase client는 admin 페이지에서만 동적으로 로드 (630KB 번들 절약)
const loadSupabaseClient = () => import("@/lib/supabase/client").then(m => m.createClient());
import Image from "next/image";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import MagneticWrapper from "./MagneticWrapper";
import MobileMenu from "./MobileMenu";
import {
  navDescs, navItems, menuItems,
  adminNavItems, adminMenuItems, SKIP_LOADING_PAGES,
} from "./navigationData";
import styles from "./Navigation.module.css";

/* notification dropdown 항목 — 5개 + 추가 5개에서 동일하게 사용되도록 helper 로 추출 */
type NotifItemData = { id: string; type: string; title: string; message: string; metadata: Record<string, string>; read: boolean; created_at: string };
function renderNotifItem(n: NotifItemData, language: "ko" | "en", onClick: () => void) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (mins < 1) return language === "ko" ? "방금 전" : "just now";
    if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return language === "ko" ? `${days}일 전` : `${days}d ago`;
    return d.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
  };
  return (
    <Link
      href={n.metadata?.url || "/admin/notifications"}
      className={styles.notifDropdownItemLink}
      onClick={onClick}
    >
      <div className={styles.notifDropdownItemTop}>
        <span className={styles.notifDropdownItemTitle}>{n.title}</span>
        <span className={styles.notifDropdownItemTime}>{formatTime(n.created_at)}</span>
      </div>
      <span className={styles.notifDropdownItemMessage}>{n.message}</span>
    </Link>
  );
}

export default function Navigation() {
  const siteConfig = useSiteConfig();
  const router = useRouter();

  // Loading logo: full display name with per-letter animation.
  // logoText(숏 글리프)가 브랜드명 첫 글자를 대체 — 비면 브랜드명 첫 글자 그대로. 이모지 보존 위해 grapheme 단위.
  const DISPLAY_NAME = siteConfig.brand.logoFullText || siteConfig.loading.displayName;
  const NAME_GRAPHEMES = graphemes(DISPLAY_NAME);
  const LOGO_TEXT = firstGrapheme(siteConfig.brand.logoText) || NAME_GRAPHEMES[0] || "";
  const EXTRA_LETTERS = NAME_GRAPHEMES.slice(1);

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
  // 업로드 로고 리컬러 색 (설정 지정 시) — 이미지를 마스크로 그 색 채움. 빈 값 = 원본
  const shortTint = (isDark ? siteConfig.brand.logoShortColorDark : siteConfig.brand.logoShortColor) || "";
  const fullTint = (isDark ? siteConfig.brand.logoFullColorDark : siteConfig.brand.logoFullColor) || "";
  const loadingTint = hasDistinctFullLogo ? fullTint : shortTint;
  // nav/loading 로고 그림자 — 로고 이미지(숏·풀)에 CSS drop-shadow 로 적용. favicon SVG 와 별개 설정.
  // logoShadow 가 활성이면 그 값을, 미설정이면 favicon 로고 그림자(faviconImageShadow)를 상속(기존 동작 보존).
  // drop-shadow 는 outer 만 지원하므로 inset 이면 미적용.
  const _logoShadowCfg = siteConfig.brand.logoShadow?.enabled ? siteConfig.brand.logoShadow : siteConfig.brand.faviconImageShadow;
  const _imgShadow = resolveFaviconShadow(_logoShadowCfg);
  const logoShadowFilter = _imgShadow && !_imgShadow.inset
    ? `drop-shadow(${_imgShadow.dx}px ${_imgShadow.dy}px ${_imgShadow.blur}px ${_imgShadow.color})`
    : undefined;
  // 텍스트 글리프·배지 nav/로딩 로고 그림자 (drop-shadow). favicon SVG(브라우저 탭)와 별개.
  const toDropShadow = (cfg: typeof siteConfig.brand.logoShadow) => {
    const s = resolveFaviconShadow(cfg);
    return s && !s.inset ? `drop-shadow(${s.dx}px ${s.dy}px ${s.blur}px ${s.color})` : undefined;
  };
  const useSeparateLogoShadow = !!siteConfig.brand.logoShadow?.enabled;

  // nav 로고를 favicon 배지(배경+글리프)로 — 브라우저 탭 아이콘과 통일. 배경 없음(shape=none)이거나
  // 업로드 이미지 로고면 미적용(각각 텍스트 리빌 / 이미지 유지).
  const navVariant: "light" | "dark" = isDark ? "dark" : "light";
  const useBadgeLogo = !hasImageLogo && (siteConfig.brand.faviconShape ?? "circle") !== "none";
  // 텍스트 글리프·배지 nav/로딩 로고 그림자:
  // - 별도 그림자 ON → glyph·badge 모두 logoShadow 적용 (배지의 구운 그림자는 navFaviconInput 에서 끔)
  // - OFF → glyph 는 favicon 텍스트 그림자를 상속(배지는 SVG 에 구워지므로 여기선 미적용)
  const navGlyphShadowFilter = useSeparateLogoShadow
    ? toDropShadow(siteConfig.brand.logoShadow)
    : (!useBadgeLogo ? toDropShadow(siteConfig.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW) : undefined);
  const navFaviconInput: FaviconRenderInput = {
    shape: (siteConfig.brand.faviconShape ?? "circle") as FaviconShape,
    faviconRadius: siteConfig.brand.faviconRadius ?? "",
    faviconBgRatio: siteConfig.brand.faviconBgRatio ?? "1",
    faviconBorderWidth: siteConfig.brand.faviconBorderWidth ?? "0",
    faviconBorderColorLight: siteConfig.brand.faviconBorderColorLight ?? "",
    faviconBorderColorDark: siteConfig.brand.faviconBorderColorDark ?? "",
    weight: (siteConfig.brand.faviconWeight ?? "light") as FaviconWeight,
    logoText: siteConfig.brand.logoText ?? "",
    logoFont: siteConfig.brand.logoFont ?? "",
    logoFontStretch: siteConfig.brand.logoFontStretch ?? "",
    faviconBgLight: siteConfig.brand.faviconBgLight ?? "",
    faviconBgDark: siteConfig.brand.faviconBgDark ?? "",
    faviconFontSize: siteConfig.brand.faviconFontSize ?? "20",
    faviconColor: siteConfig.brand.faviconColor ?? "",
    faviconColorDark: siteConfig.brand.faviconColorDark ?? "",
    // 별도 nav 로고 그림자가 켜져 있으면 배지에 굽는 favicon 그림자는 끈다 (sepLogoShadowFilter 와 이중 적용 방지).
    faviconTextShadow: useSeparateLogoShadow ? { ...DEFAULT_FAVICON_TEXT_SHADOW, enabled: false } : (siteConfig.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW),
    faviconBgShadow: useSeparateLogoShadow ? { ...DEFAULT_FAVICON_BG_SHADOW, enabled: false } : (siteConfig.brand.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW),
    presetLight: siteConfig.brand.logoColor || siteConfig.theme.lightText,
    presetDark: siteConfig.brand.logoColorDark || siteConfig.theme.darkText,
  };
  // 리컬러 있으면 숨긴 img 로 폭 확보 + mask 로 tint 채움, 없으면 원본 Image. 그림자는 공통 적용.
  const renderLogoImg = (src: string, w: number, altText: string, tintColor: string) =>
    tintColor ? (
      <span
        className={styles.logoImageTinted}
        style={{ backgroundColor: tintColor, maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")`, filter: logoShadowFilter }}
        role="img"
        aria-label={altText}
      >
        <Image src={src} alt="" width={w} height={32} unoptimized />
      </span>
    ) : (
      <Image src={src} alt={altText} width={w} height={32} className={styles.logoImage} unoptimized style={logoShadowFilter ? { filter: logoShadowFilter } : undefined} />
    );
  const { isLoading, isTransitioning } = useLoadingScreen();
  const { isMuted, toggleMute } = useSoundStore();
  const { openForm } = useContactStore();
  const { stop: lenisStop, start: lenisStart } = useLenis();

  const isAdminPage = pathname.startsWith("/admin");

  // 로고 폰트가 Google Fonts 면 동적 로드 — CSS font-family string 에서 첫 family 이름 추출.
  // "'Roboto', sans-serif" / "Roboto, sans-serif" / "Roboto" 모두 처리.
  useEffect(() => {
    const v = siteConfig.brand.logoFont;
    if (!v) return;
    const fontName = v.replace(/["']/g, "").split(",")[0].trim();
    if (fontName) loadGoogleFont(fontName);
  }, [siteConfig.brand.logoFont]);

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setAdminEmail(data.user?.email ?? "");
      });
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setAdminEmail(session?.user?.email ?? "");
      });
      // unmount 가 promise resolve 보다 먼저 일어났다면 즉시 정리
      if (cancelled) sub.unsubscribe();
      else subscription = sub;
    });
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Notification 상태 — admin 로그인 시 60s 폴링. 드롭다운에서 미리보기 표시.
  type NavNotif = { id: string; type: string; title: string; message: string; metadata: Record<string, string>; read: boolean; created_at: string };
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<NavNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  // 한 번 +5 펼치고 접을 수 있는 toggle (option B) — 5 ↔ 10
  const [notifExpanded, setNotifExpanded] = useState(false);
  const notifWrapRef = useRef<HTMLButtonElement | null>(null);

  // 드롭다운 닫힐 때 expanded 리셋
  useEffect(() => { if (!notifOpen) setNotifExpanded(false); }, [notifOpen]);

  const fetchNotifs = useCallback(() => {
    fetch("/api/admin/notifications")
      .then(async (r) => {
        if (!r.ok) { setNotifs([]); setUnreadCount(0); return; }
        const d = await r.json() as { unreadCount?: number; notifications?: NavNotif[] };
        setNotifs(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => { setNotifs([]); setUnreadCount(0); });
  }, []);

  // 로그인 상태면 어느 페이지든 60s 간격 polling — 알림 버튼이 모든 페이지에 노출되므로 데이터 최신화 필요.
  // pathname 을 deps 에서 뺌 → 라우트 이동마다 추가 fetch 하지 않음.
  useEffect(() => {
    if (!adminEmail) { setUnreadCount(0); setNotifs([]); return; }
    fetchNotifs();
    const id = window.setInterval(fetchNotifs, 60_000);
    return () => { window.clearInterval(id); };
  }, [adminEmail, fetchNotifs]);

  // 포털 dropdown 위치 — trigger 의 viewport 좌표를 기준으로 계산
  const notifDropdownRef = useRef<HTMLDivElement | null>(null);
  const [notifPos, setNotifPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateNotifPos = useCallback(() => {
    const el = notifWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 트리거 우측 정렬 — top: trigger bottom + 8gap, right: viewport - trigger right
    setNotifPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
  }, []);

  useLayoutEffect(() => {
    if (!notifOpen) return;
    updateNotifPos();
  }, [notifOpen, updateNotifPos]);

  useEffect(() => {
    if (!notifOpen) return;
    const onUpdate = () => updateNotifPos();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [notifOpen, updateNotifPos]);

  // 드롭다운 외부 클릭 / Escape 시 닫기 — trigger + portal dropdown 둘 다 확인
  useEffect(() => {
    if (!notifOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const trigger = notifWrapRef.current;
      const dropdown = notifDropdownRef.current;
      const target = e.target as Node;
      if (trigger?.contains(target)) return;
      if (dropdown?.contains(target)) return;
      setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  // pathname 변경 시 드롭다운 닫기 + refetch (알림 페이지에서 읽음 처리됐을 수 있음)
  useEffect(() => { setNotifOpen(false); }, [pathname]);

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
  // drawer 열릴 때 notification dropdown 도 같이 닫음 (위로 겹쳐 보이는 거 방지)
  useEffect(() => {
    if (isMenuOpen) setNotifOpen(false);
  }, [isMenuOpen]);

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

  // ── nav hover 드롭다운 — children 있는 항목의 하위 메뉴 (사용자 Posts / admin Settings).
  //    .nav 직속 자식으로 렌더해 difference blend 상속. subMenuKey = 현재 열린 부모 항목 key. ──
  const [subMenuKey, setSubMenuKey] = useState<string | null>(null);
  const [subMenuPos, setSubMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const subMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openSubMenu = useCallback((key: string) => {
    if (subMenuCloseTimer.current) clearTimeout(subMenuCloseTimer.current);
    const el = navLinkRefs.current[key];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // .nav(position:fixed, top/left 0) padding box 기준 = viewport 좌표. 부모 링크 좌측 정렬.
    setSubMenuPos({ top: rect.bottom + 3, left: rect.left });
    setSubMenuKey(key);
  }, []);

  const scheduleSubMenuClose = useCallback(() => {
    if (subMenuCloseTimer.current) clearTimeout(subMenuCloseTimer.current);
    subMenuCloseTimer.current = setTimeout(() => setSubMenuKey(null), 160);
  }, []);

  const cancelSubMenuClose = useCallback(() => {
    if (subMenuCloseTimer.current) clearTimeout(subMenuCloseTimer.current);
  }, []);

  // pathname 변경(라우팅) / resize / Escape 시 닫기 — nav 가 fixed 라 scroll 은 무시
  useEffect(() => { setSubMenuKey(null); }, [pathname]);
  useEffect(() => {
    if (!subMenuKey) return;
    const close = () => setSubMenuKey(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSubMenuKey(null); };
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [subMenuKey]);

  /* 하위 항목 활성 여부 — 일반 경로는 pathname 비교, 쿼리형 href(settings ?tab=)는
     경로 + tab 파라미터 비교. settings 는 tab 미지정 시 general 이 기본.
     window.location.search 로 읽어 전역 nav 가 useSearchParams 로 static 렌더를 deopt 하지 않게 한다.
     (드롭다운은 hover 시에만 렌더돼 SSR 되지 않으므로 hydration 불일치 없음) */
  const isChildActive = (href: string) => {
    const qIdx = href.indexOf("?");
    if (qIdx === -1) return pathname === href || pathname.startsWith(href + "/");
    if (pathname !== href.slice(0, qIdx)) return false;
    const wantTab = new URLSearchParams(href.slice(qIdx + 1)).get("tab");
    const curTab = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) ?? "general";
    return curTab === wantTab;
  };

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  // resize 중엔 transition 비활성화 — 그래야 indicator 가 메뉴 위치를 즉시 따라감
  const [indicatorInstant, setIndicatorInstant] = useState(false);

  // active key from pathname (detail 페이지도 부모 경로로 매칭)
  const currentNavItems = isAdminPage ? adminNavItems : navItems;
  // 현재 열린 하위 메뉴의 children (없으면 빈 배열 → 드롭다운 미표시)
  const subMenuChildren = (subMenuKey ? currentNavItems.find((i) => i.key === subMenuKey)?.children : undefined) ?? [];
  // 서브메뉴가 열려 선택된 자식이 있으면 메인 인디케이터를 감추고, ▶ 가 부모 항목에서 그 자식으로 타고 내려온다.
  const subMenuHandoff = subMenuKey != null && subMenuChildren.some((c) => isChildActive(c.href));

  // ── travel 인디케이터 — ▶ 가 부모 항목 위치에서 선택된 서브 항목까지 타고 내려온다 ──
  const activeSubItemRef = useRef<HTMLElement | null>(null);
  const [travelPos, setTravelPos] = useState<{ from: Point; to: Point } | null>(null);

  // 부모 nav 링크 rect(출발) + 선택된 서브 항목 rect(도착)을 측정 → 그 값으로 span 을 새로 마운트해 from→to 재생.
  useLayoutEffect(() => {
    if (!subMenuHandoff) { setTravelPos(null); return; }
    const parent = subMenuKey ? navLinkRefs.current[subMenuKey] : null;
    const child = activeSubItemRef.current;
    if (!parent || !child) { setTravelPos(null); return; }
    const pr = parent.getBoundingClientRect();
    const cr = child.getBoundingClientRect();
    // ▶ 중심 좌표(viewport = .nav fixed 기준). from = 부모 항목 메인 ▶ 자리, to = 선택 서브 항목 왼쪽.
    setTravelPos({
      from: { x: pr.left - 6, y: pr.top + pr.height / 2 },
      to: { x: cr.left - 7, y: cr.top + cr.height / 2 },
    });
  }, [subMenuHandoff, subMenuKey]);
  // 가장 구체적인(긴 href) 항목 우선 매칭 — admin/posts 같은 하위 경로가 admin 보다 우선
  const activeNavKey =
    [...currentNavItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.key ?? null;
  const targetKey = hoveredNav ?? activeNavKey;

  const updateIndicator = useCallback(() => {
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
  }, [targetKey]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator, language]);

  // ResizeObserver 는 mount 시 1회만 — updateIndicator 를 dep 로 넣으면 hover 마다 (targetKey 변경)
  // useCallback 새 ref → effect cleanup/setup → observe() 호출이 즉시 fire 트리거 → instant=true 가 영구화돼
  // indicator 가 transition 없이 점프함. ref 로 latest updateIndicator 잡아 쓰기.
  const updateIndicatorRef = useRef(updateIndicator);
  useEffect(() => { updateIndicatorRef.current = updateIndicator; }, [updateIndicator]);

  useEffect(() => {
    const container = navCenterRef.current;
    const navEl = container?.parentElement;
    if (!container) return;
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      setIndicatorInstant(true);
      updateIndicatorRef.current();
      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(() => setIndicatorInstant(false), 120);
    };
    // nav 전체 + navCenter 둘 다 관찰 — 좌측 로고/우측 actions 가 변해도 indicator 재계산
    const ro = new ResizeObserver(tick);
    ro.observe(container);
    if (navEl) ro.observe(navEl);
    window.addEventListener("resize", tick);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", tick);
      if (endTimer) clearTimeout(endTimer);
    };
  }, []);

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
    if (pathname.startsWith("/admin")) {
      router.push("/admin/login");
    }
    router.refresh();
  }, [router, pathname]);

  return (
    <>
    {/* 로고 + admin 배지 flex 부모. .nav 와 동일 패턴 — mix-blend-mode 를 부모에 두면
        전체가 page backdrop 과 한 번에 blend (자식에 두면 부모 stacking context 안에서 갇혀 무효) */}
    <Link
      href={isAdminPage ? "/admin" : "/"}
      aria-label={useBadgeLogo ? DISPLAY_NAME : undefined}
      className={`${styles.logoNavBar} ${siteConfig.brand.logoDifference === false ? styles.logoNavBarNoDifference : ""} ${showLoadingLogo || elevatedZ ? styles.logoNavBarElevated : ""} ${siteConfig.brand.logoGlitch ? "glith-on-hover" : ""}`}
    >
        {(() => {
          // 장평 — scaleX. 빈/invalid 면 0.8 default. 배지 로고(SVG)는 정사각이라 장평 미적용(1).
          const rawStretch = parseFloat(siteConfig.brand.logoFontStretch ?? "");
          const stretchN = useBadgeLogo ? 1 : (Number.isFinite(rawStretch) && rawStretch > 0 ? rawStretch : 0.8);
          // 로고 색상 (테마별 override). 커스텀 미지정(기본)이고 difference 를 끈 상태면
          // 블렌드가 없어 색 기준이 사라지므로 text-primary 로 명시.
          const customColor = isDark ? siteConfig.brand.logoColorDark : siteConfig.brand.logoColor;
          const color = customColor || (siteConfig.brand.logoDifference === false ? "var(--text-primary)" : "");
          const inlineStyle: React.CSSProperties = {
            transformOrigin: "left center",
            visibility: showLoadingLogo && !logoMeasured ? "hidden" : "visible",
          };
          if (siteConfig.brand.logoFont) inlineStyle.fontFamily = siteConfig.brand.logoFont;
          if (color) inlineStyle.color = color;
          // 텍스트 글리프·배지 nav/로딩 로고 그림자 (이미지 로고는 img 자체에 logoShadowFilter 를 걸므로 제외).
          if (!hasImageLogo && navGlyphShadowFilter) inlineStyle.filter = navGlyphShadowFilter;
          return (
            <motion.span
              ref={logoRef}
              className={styles.logo}
              animate={
                showLoadingLogo && !isTransitioning
                  ? { x: centerOffset.x, y: centerOffset.y, scaleX: scaleFactor * stretchN, scaleY: scaleFactor }
                  : { x: 0, y: 0, scaleX: stretchN, scaleY: 1 }
              }
              transition={{
                duration: isTransitioning ? 0.8 : 0,
                ease: [0.76, 0, 0.24, 1],
                delay: isTransitioning ? 0.05 : 0,
              }}
              style={inlineStyle}
            >
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
                  {renderLogoImg(loadingLogoUrl!, 120, DISPLAY_NAME, loadingTint)}
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
                {renderLogoImg(shortLogoUrl!, 32, LOGO_TEXT, shortTint)}
              </motion.span>
            </>
          ) : useBadgeLogo ? (
            <FaviconBadge
              input={navFaviconInput}
              variant={navVariant}
              size={34}
              idPrefix="navfav"
              className={styles.logoBadge}
            />
          ) : (
            <>
              {LOGO_TEXT}
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
            </motion.span>
          );
        })()}
      {/* Admin 배지 — logoNavBar flex 자식. blend 는 부모(.logoNavBar) 가 통째로 처리 */}
      {isAdminPage && (
        <span className={`${styles.adminBadge} ${styles.adminBadgeFixed}`}>Admin</span>
      )}
    </Link>

    <nav className={`${styles.nav} ${showLoadingLogo ? styles.navLoading : ""} ${elevatedZ ? styles.navElevated : ""} ${isAdminPage ? styles.navAdmin : ""} ${showMenu ? styles.navMenuOpen : ""}`}>
      <div
        ref={navCenterRef}
        className={styles.navCenter}
        onMouseLeave={() => setHoveredNav(null)}
      >
        {isAdminPage
          ? adminNavItems.map((item) => {
              const hasChildren = !!item.children?.length;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  ref={(el) => { navLinkRefs.current[item.key] = el; }}
                  className={`${styles.navLink} glith-on-hover`}
                  onMouseEnter={() => {
                    setHoveredNav(item.key);
                    if (hasChildren) openSubMenu(item.key);
                  }}
                  onMouseLeave={hasChildren ? scheduleSubMenuClose : undefined}
                >
                  {item.label}
                </Link>
              );
            })
          : navItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const link = (
                <Link
                  key={item.key}
                  href={item.href}
                  ref={(el) => { navLinkRefs.current[item.key] = el; }}
                  className={`${styles.navLink} glith-on-hover`}
                  onMouseEnter={() => {
                    setHoveredNav(item.key);
                    if (hasChildren) openSubMenu(item.key);
                  }}
                  onMouseLeave={hasChildren ? scheduleSubMenuClose : undefined}
                >
                  {item.label}
                </Link>
              );
              // children 있는 항목(Posts)은 hover 드롭다운이 대신하므로 Tooltip 생략
              return hasChildren ? (
                link
              ) : (
                <Tooltip
                  key={item.key}
                  content={navDescs[item.key]?.[language] ?? ""}
                  delay={600}
                  placement="bottom"
                >
                  {link}
                </Tooltip>
              );
            })}
        {(() => {
          // 서브메뉴로 넘길 땐 메인 인디케이터를 숨긴다(opacity 0 → 선택 항목의 ▶ 가 대신).
          const effStyle = subMenuHandoff ? { ...indicatorStyle, opacity: 0 } : indicatorStyle;
          return (
            <span
              className={`${styles.navIndicator} ${effStyle.opacity === 0 ? styles.navIndicatorHidden : ""}`}
              style={indicatorInstant ? { ...effStyle, transition: "none" } : effStyle}
            />
          );
        })()}
      </div>

      <div className={styles.navActions}>
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
              <Moon className={styles.themeIcon} strokeWidth={1.5} />
            ) : (
              <Sun className={styles.themeIcon} strokeWidth={1.5} />
            )}
            </span>
          </button>
        </Tooltip>

        {/* 액션 항목들 (email + Bell + Logout/GetInTouch) — navActions 직속 자식 */}
        {isAdminPage && adminEmail && (
          <span className={styles.adminEmail}>{adminEmail}</span>
        )}
        {adminEmail && (
          <Tooltip
            content={unreadCount > 0
              ? (language === "ko" ? `읽지 않은 알림 ${unreadCount}개` : `${unreadCount} unread`)
              : (language === "ko" ? "알림" : "Notifications")}
            placement="bottom"
            delay={200}
            disabled={notifOpen}
          >
            <button
              ref={notifWrapRef}
              type="button"
              className={`${styles.actionBtn} ${styles.notifBtn}`}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) fetchNotifs(); }}
            >
              <Bell size={16} strokeWidth={1.8} />
              {unreadCount > 0 && <span className={styles.notifDot} aria-hidden />}
            </button>
          </Tooltip>
        )}

        {/* Notification dropdown — createPortal 로 body 에 렌더 (nav 의 mix-blend-mode + z-index 격리) */}
        {adminEmail && typeof window !== "undefined" && createPortal(
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                ref={notifDropdownRef}
                key="notif-dropdown"
                className={styles.notifDropdown}
                role="dialog"
                aria-label="Notifications"
                style={{ top: notifPos.top, right: notifPos.right - 24, transformOrigin: "top right" }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className={styles.notifDropdownInner}>
                  <div className={styles.notifDropdownHeader}>
                    <span className={styles.notifDropdownTitle}>
                      {language === "ko" ? "알림" : "Notifications"}
                    </span>
                    {unreadCount > 0 && (
                      <span className={styles.notifDropdownBadge}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    <Link
                      href="/admin/notifications"
                      className={styles.notifDropdownViewAll}
                      onClick={() => setNotifOpen(false)}
                    >
                      <span>{language === "ko" ? "모두 보기" : "View all"}</span>
                      <ArrowRight size={12} strokeWidth={2} className={styles.notifDropdownViewAllArrow} aria-hidden />
                    </Link>
                  </div>
                  {notifs.length === 0 ? (
                    <div className={styles.notifDropdownEmpty}>
                      {language === "ko" ? "알림이 없습니다" : "No notifications"}
                    </div>
                  ) : (
                    <ul className={styles.notifDropdownList} data-lenis-prevent>
                      {notifs.slice(0, 5).map((n) => (
                        <li key={n.id} className={`${styles.notifDropdownItem} ${!n.read ? styles.notifDropdownItemUnread : ""}`}>
                          {renderNotifItem(n, language, () => setNotifOpen(false))}
                        </li>
                      ))}
                      {/* 펼친 추가 5개 — clip-path 위에서 아래로 reveal + height 자연 확장 */}
                      <AnimatePresence initial={false}>
                        {notifExpanded && notifs.slice(5, 10).map((n, i) => (
                          <motion.li
                            key={n.id}
                            className={`${styles.notifDropdownItem} ${!n.read ? styles.notifDropdownItemUnread : ""}`}
                            initial={{ opacity: 0, height: 0, clipPath: "inset(0 0 100% 0)" }}
                            animate={{ opacity: 1, height: "auto", clipPath: "inset(0 0 0% 0)" }}
                            exit={{ opacity: 0, height: 0, clipPath: "inset(0 0 100% 0)" }}
                            transition={{
                              duration: 0.32,
                              delay: i * 0.04,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            style={{ overflow: "hidden" }}
                          >
                            {renderNotifItem(n, language, () => setNotifOpen(false))}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                  {notifs.length > 5 && (
                    <button
                      type="button"
                      className={styles.notifDropdownMore}
                      onClick={() => setNotifExpanded((v) => !v)}
                    >
                      {notifExpanded
                        ? (language === "ko" ? "접기" : "Collapse")
                        : (language === "ko" ? "더 보기 +5" : "Load more +5")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
        {adminEmail ? (
          <Tooltip
            content={adminEmail}
            placement="bottom"
            delay={200}
          >
            <Button
              variant="outline"
              size="xs"
              className={styles.logoutBtn}
              onClick={handleLogout}
              soundDisabled
            >
              Logout
            </Button>
          </Tooltip>
        ) : !isAdminPage ? (
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

        {/* 메뉴 버튼 (≤1024px) — 2×2 dot grid + magnetic */}
        <MagneticWrapper strength={0.5} radius={50} className={styles.menuBtnWrapper}>
          <button
            className={`${styles.actionBtn} ${styles.menuBtn}`}
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={isMenuOpen}
          >
            {/* SVG 9개 circle — span 작은 사이즈 (2~3px) 에서 subpixel 안티앨리어싱이
               dot 마다 달라 타원처럼 보이던 문제를 vector circle 로 해결. viewBox 8x8,
               각 circle r=1 + cx/cy 정수 → 어떤 픽셀 크기에서도 일관된 원. */}
            <svg
              className={`${styles.menuDots} ${isMenuOpen ? styles.menuDotsOpen : ""} ${showMenu && !isMenuOpen ? styles.menuDotsClosing : ""}`}
              viewBox="0 0 8 8"
              aria-hidden
            >
              <circle className={styles.menuDot} cx="1" cy="1" r="1" />
              <circle className={styles.menuDot} cx="4" cy="1" r="1" />
              <circle className={styles.menuDot} cx="7" cy="1" r="1" />
              <circle className={styles.menuDot} cx="1" cy="4" r="1" />
              <circle className={styles.menuDot} cx="4" cy="4" r="1" />
              <circle className={styles.menuDot} cx="7" cy="4" r="1" />
              <circle className={styles.menuDot} cx="1" cy="7" r="1" />
              <circle className={styles.menuDot} cx="4" cy="7" r="1" />
              <circle className={styles.menuDot} cx="7" cy="7" r="1" />
            </svg>
          </button>
        </MagneticWrapper>
      </div>

      {/* 메뉴 서랍 (clip-path, ContactDrawer pattern) */}
      <MobileMenu
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

      {/* nav 하위 드롭다운 — children 있는 항목(사용자 Posts / admin Settings) hover 시.
         .nav 직속 자식 → difference blend 상속. 카드 없이 흰 텍스트가 page backdrop 과 blend. */}
      <AnimatePresence>
        {subMenuChildren.length > 0 && (
          <motion.div
            key={`sub-nav-dropdown-${subMenuKey}`}
            className={styles.subNavDropdown}
            role="menu"
            style={{ top: subMenuPos.top, left: subMenuPos.left }}
            onMouseEnter={cancelSubMenuClose}
            onMouseLeave={scheduleSubMenuClose}
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
              show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
            }}
          >
            {/* 연결선 — 먼저 위→아래로 draw */}
            <motion.span
              className={styles.subNavDropdownLine}
              aria-hidden="true"
              variants={{ hidden: { scaleY: 0, opacity: 0 }, show: { scaleY: 1, opacity: 1 } }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            />
            {subMenuChildren.map((child) => {
              const active = isChildActive(child.href);
              return (
                <motion.div
                  key={child.key}
                  className={styles.subNavDropdownItemWrap}
                  /* 선택 항목은 스태거(x offset) 제외 — travel ink 가 도착할 위치를 안정적으로 측정하기 위해 */
                  variants={active ? undefined : { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                  initial={active ? { opacity: 0 } : undefined}
                  animate={active ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    ref={active ? (el) => { activeSubItemRef.current = el; } : undefined}
                    href={child.href}
                    role="menuitem"
                    className={`${styles.subNavDropdownItem} ${active ? styles.subNavDropdownItemActive : ""}`}
                    onClick={() => setSubMenuKey(null)}
                  >
                    {child.label}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* travel 인디케이터 — 부모 항목의 ▶ 자리에서 선택된 서브 항목으로 타고 내려온다.
         .nav 직속 자식이라 difference blend 상속 + clip 밖(뷰포트 좌표)이라 안 잘림.
         key 를 subMenuKey 로 둬 부모가 바뀌면 새로 마운트 → 매번 from→to 재생. */}
      <AnimatePresence>
        {travelPos && (
          <motion.span
            key={`travel-${subMenuKey}`}
            className={styles.travelInk}
            aria-hidden
            initial={{ x: travelPos.from.x, y: travelPos.from.y, opacity: 1 }}
            animate={{ x: travelPos.to.x, y: travelPos.to.y, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            ▶︎
          </motion.span>
        )}
      </AnimatePresence>
    </nav>
    </>
  );
}
