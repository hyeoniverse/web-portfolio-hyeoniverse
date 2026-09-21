"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import type { Point } from "@/types";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Moon, Sun, Bell, ArrowRight, Settings } from "@/components/icons";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSoundStore } from "@/stores/soundStore";
import { useContactStore } from "@/stores/contactStore";
import { useLenis } from "@/providers/LenisProvider";
import { SYMBOL_FONT_FAMILY } from "@/config/symbolFont.generated";
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
import { isPending } from "@/lib/notificationTypes";
import styles from "./Navigation.module.css";
import Pressable from "@/components/ui/Pressable";
import { formatRelativeTime } from "@/utils/relativeTime";
import { useNow } from "@/hooks/useNow";
import { useNavNotifications } from "./useNavNotifications";
import { useAdminAccess } from "./useAdminAccess";
import { adminEntryHref, canOpenAdminPage, visibleAdminItems } from "@/lib/adminAccess";
import { useLogoMeasure } from "./useLogoMeasure";
import { useToggleAnimation } from "./useToggleAnimation";
import { useMobileMenu } from "./useMobileMenu";

// 서브메뉴 항목 링크 — active 항목의 bold/indent 를 접힘 시 순차 애니로 풀려면 motion 링크가 필요.
const MotionLink = motion.create(Link);
// 서브메뉴 열림/접힘 공통 ease
const SUB_EASE = [0.22, 1, 0.36, 1] as const;

/* notification dropdown 항목 — 5개 + 추가 5개에서 동일하게 사용되도록 helper 로 추출 */
type NotifItemData = { id: string; type: string; title: string; message: string; metadata: Record<string, string>; read: boolean; created_at: string };
function renderNotifItem(n: NotifItemData, language: "ko" | "en", now: number, onClick: () => void) {
  const formatTime = (iso: string) => formatRelativeTime(iso, now, language, { withYear: false });
  return (
    /* 알림 목록의 그 항목으로 보낸다 — 페이지가 ?id 로 찾아 스크롤하고 활성 표시를 건다.
       대상 글·댓글로 바로 가는 것은 거기서 열리는 상세의 "바로가기" 가 맡는다. */
    <Link
      href={`/admin/notifications?id=${encodeURIComponent(n.id)}`}
      className={styles.notifDropdownItemLink}
      onClick={onClick}
    >
      <div className={styles.notifDropdownItemTop}>
        <span className={styles.notifDropdownItemTitle}>{n.title}</span>
        {/* 결정을 내려야 하는 알림 — 정보성 알림 사이에서 지나치지 않게 표시한다 */}
        {isPending(n) && (
          <span className={styles.notifDropdownItemAction}>
            {language === "ko" ? "처리 필요" : "Action"}
          </span>
        )}
        <span className={styles.notifDropdownItemTime}>{formatTime(n.created_at)}</span>
      </div>
      <span className={styles.notifDropdownItemMessage}>{n.message}</span>
    </Link>
  );
}

/**
 * 글꼴 목록의 첫 글꼴 바로 뒤에 next/font 가 만든 "너비를 맞춘 대체 글꼴"을 끼운다.
 *
 * 로고 글꼴은 설정에서 `'Instrument Serif', serif` 같은 문자열로 온다. 그대로 쓰면 웹폰트가 오기
 * 전에는 serif(Times)로 그려지는데 글자 너비가 40% 가량 달라서, 웹폰트가 도착하는 순간 로딩
 * 워드마크의 글자들이 밀린다(레이아웃 밀림, 원인 "Web font loaded"). next/font 는 이를 막으려고
 * `'<이름> Fallback'` 을 너비를 맞춰 만들어 두는데, 설정 문자열에는 빠져 있었다. 그런 글꼴이 없는
 * 경우(next/font 로 불러오지 않은 글꼴)에는 브라우저가 건너뛰므로 해가 없다.
 */
function withMetricFallback(stack: string): string {
  const [first, ...rest] = stack.split(",").map((part) => part.trim());
  const name = first.replace(/^['"]|['"]$/g, "");
  if (!name || /\bfallback$/i.test(name)) return stack;
  /* 기호 글꼴은 브랜드 글꼴 바로 뒤, 나머지(serif 같은 총칭 이름)보다 **앞에** 둔다 — 브랜드 글꼴에
     ✦ 같은 기호가 없어서, 뒤에 두면 총칭 이름이 먼저 걸려 기기에 깔린 글꼴이 그리고 탭 아이콘
     (외곽선으로 굳힌 것)과 모양이 갈린다(#1048). 영문은 맨 앞의 브랜드 글꼴이 그대로 맡는다 */
  return [first, `'${name} Fallback'`, `'${SYMBOL_FONT_FAMILY}'`, ...rest].join(", ");
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
  // 풀→숏 char-cut morph(로딩에 풀 텍스트, 전환 때 뒤 글자 퇴장→첫 글자만)는 숏 글리프가 풀 텍스트의
  // 첫 글자와 같을 때만 성립한다. 다르면(예: 숏="✦", 풀="HYEONIVERSE") 로딩엔 실제 풀 워드마크를 보이고
  // 전환 때 숏 글리프로 crossfade 한다(이미지 로고의 풀↔숏 교체와 같은 패턴).
  const morphIsCharCut = LOGO_TEXT === NAME_GRAPHEMES[0];

  const pathname = useRoutePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  /* 알림 목록의 상대시간 기준 시각. 렌더에서 Date.now() 를 부르면 매 렌더 값이 달라진다. */
  const now = useNow();

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

  /* 권한으로 열 수 없는 관리자 메뉴 항목과 알림 종은 뺀다(#883). 메뉴는 권한을 확인하기 전에는 지금처럼 모두 보여 준다 —
     대부분인 소유자의 메뉴가 늦게 나타나 흔들리지 않게. 주소로 들어온 작성자는 proxy 가 돌려보낸다.
     알림 종과 알림 받아 오기는 확인한 뒤에만 한다. 오른쪽 끝이라 늦게 나타나도 흔들리지 않고, 작성자에게 403 이 날 요청을 보내지 않는다 */
  const adminAccess = useAdminAccess(pathname);
  const adminNav = useMemo(() => visibleAdminItems(adminNavItems, adminAccess), [adminAccess]);
  const adminMenu = useMemo(() => visibleAdminItems(adminMenuItems, adminAccess), [adminAccess]);
  const canSeeNotifications = !!adminAccess && canOpenAdminPage("/admin/notifications", adminAccess);

  // 로고 폰트가 Google Fonts 면 동적 로드 — CSS font-family string 에서 첫 family 이름 추출.
  // "'Roboto', sans-serif" / "Roboto, sans-serif" / "Roboto" 모두 처리.
  useEffect(() => {
    const v = siteConfig.brand.logoFont;
    if (!v) return;
    const fontName = v.replace(/["']/g, "").split(",")[0].trim();
    if (fontName) loadGoogleFont(fontName);
  }, [siteConfig.brand.logoFont]);

  const {
    adminEmail, unreadCount, notifs,
    notifOpen, setNotifOpen, notifExpanded, setNotifExpanded,
    notifWrapRef, notifDropdownRef, notifPos, fetchNotifs,
  } = useNavNotifications(pathname, canSeeNotifications);

  /* 관리 화면으로 들어가는 자리 — 로그인해 두고도 주소를 직접 쳐야 들어갈 수 있었다.
     보일지는 로그인 여부만 본다(화면 크기와 무관). 갈 곳은 권한이 정한다.
     상단바(로그아웃 왼쪽 톱니바퀴)와 모바일 메뉴가 같은 값을 쓴다 */
  const adminHref = useMemo(
    () => (adminEmail ? adminEntryHref(adminAccess) : null),
    [adminEmail, adminAccess],
  );

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

  const { isMenuOpen, setIsMenuOpen, showMenu, menuClipOpen, menuMounted, clipWrapperRef } =
    useMobileMenu(pathname, setNotifOpen, lenisStop, lenisStart);
  // ── Nav sliding indicator ──
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const navCenterRef = useRef<HTMLDivElement>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  // 서브메뉴(드롭다운)에서 hover 중인 항목 — 이게 있으면 ▶ 가 그 항목으로 이동하고 메인 인디케이터는 숨는다
  const [hoveredSubKey, setHoveredSubKey] = useState<string | null>(null);

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
  const pathnameChanged = useDepsChanged([pathname]);
  if (pathnameChanged) setSubMenuKey(null);
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
  const currentNavItems = isAdminPage ? adminNav : navItems;
  // 현재 열린 하위 메뉴의 children (없으면 빈 배열 → 드롭다운 미표시)
  const subMenuChildren = (subMenuKey ? currentNavItems.find((i) => i.key === subMenuKey)?.children : undefined) ?? [];
  // 서브메뉴가 열려 선택된 자식이 있으면 메인 인디케이터를 감추고, ▶ 가 부모 항목에서 그 자식으로 타고 내려온다.
  const subMenuHandoff = subMenuKey != null && subMenuChildren.some((c) => isChildActive(c.href));

  // ── travel 인디케이터 — ▶ 가 부모 항목 위치에서 대상 서브 항목까지 타고 내려온다 ──
  // 서브 항목별 wrap ref (위치 측정). active 뿐 아니라 hover 대상도 재려면 전부 필요.
  const subItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [travelPos, setTravelPos] = useState<{ from: Point; to: Point } | null>(null);

  // ▶ 도착 대상: hover 중인 서브 항목 우선, 없으면 현재 선택된 서브 항목.
  const activeChildKey = subMenuKey
    ? subMenuChildren.find((c) => isChildActive(c.href))?.key ?? null
    : null;
  const travelTargetKey = hoveredSubKey ?? activeChildKey;

  // 부모 nav 링크 rect(출발) + 대상 서브 항목 rect(도착)을 측정 → span 을 그 값으로 애니.
  useLayoutEffect(() => {
    const parent = subMenuKey ? navLinkRefs.current[subMenuKey] : null;
    const child = travelTargetKey ? subItemRefs.current[travelTargetKey] : null;
    if (!parent || !child) { setTravelPos(null); return; }
    const pr = parent.getBoundingClientRect();
    const cr = child.getBoundingClientRect();
    // ▶ 중심 좌표(viewport = .nav fixed 기준). from = 부모 항목 ▶ 자리, to = 대상 서브 항목 왼쪽.
    setTravelPos({
      from: { x: pr.left - 6, y: pr.top + pr.height / 2 },
      to: { x: cr.left - 7, y: cr.top + cr.height / 2 },
    });
  }, [subMenuKey, travelTargetKey]);

  // 드롭다운이 바뀌거나 닫히면 hover 서브 상태 초기화
  const subMenuChanged = useDepsChanged([subMenuKey]);
  if (subMenuChanged) setHoveredSubKey(null);
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
  // 장평 — scaleX. 빈/invalid 면 0.8 default. 배지 로고(SVG)는 정사각이라 장평 미적용(1).
  const rawStretch = parseFloat(siteConfig.brand.logoFontStretch ?? "");
  const stretchN = useBadgeLogo ? 1 : (Number.isFinite(rawStretch) && rawStretch > 0 ? rawStretch : 0.8);
  /* 글자 로고는 로딩 상태(화면 한가운데 · 큰 글자)를 CSS 로 그린다. 서버 HTML 부터 보여서
     자바스크립트를 기다리지 않는다. 이미지·배지 로고는 크기 비율을 CSS 로 낼 수 없어 예전처럼
     재고 나서 보인다. */
  const cssLoadingLogo = showLoadingLogo && !hasImageLogo && !useBadgeLogo;
  /* 로고 transform 을 framer 에 맡기되 값은 여기서 쥔다. 잰 순간 이 값들을 바로 맞춰 두어야,
     그 뒤 다시 그릴 때 framer 가 옛 값(0)으로 한 프레임 네비게이션 자리를 그리지 않는다. */
  const logoX = useMotionValue(0);
  const logoY = useMotionValue(0);
  const logoScaleX = useMotionValue(stretchN);
  const logoScaleY = useMotionValue(1);
  const logoMotion = useMemo(
    () => ({ x: logoX, y: logoY, scaleX: logoScaleX, scaleY: logoScaleY }),
    [logoX, logoY, logoScaleX, logoScaleY],
  );
  const { logoMeasured } = useLogoMeasure(
    logoRef,
    { showLoadingLogo, isLoading, isTransitioning },
    { cssLoadingClass: cssLoadingLogo ? styles.logoCssLoading : undefined, stretch: stretchN, motion: logoMotion },
  );

  // 사운드 상태
  const [isSoundClicking, setIsSoundClicking] = useState(false);
  const [isSoundHovered, setIsSoundHovered] = useState(false);
  // 누른 직후에는 hover 미리보기 대신 실제 상태를 보여 준다. 표시를 바꾸는 값이라 상태로 둔다.
  const [isSoundLocked, setIsSoundLocked] = useState(false);
  const showMutedIcon = isSoundLocked ? isMuted : isMuted !== isSoundHovered;

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
    setIsSoundLocked(true);
    setShowSoundTip(false);
    toggleMute();
    setTimeout(() => setIsSoundClicking(false), 300);
  };

  /* 테마·언어 단추는 연출이 같다. 마우스를 올리면 바뀔 값을 미리 보여 주고, 누르면 실제로 바꾼다. */
  const themeToggle = useToggleAnimation(theme, theme === "dark" ? "light" : "dark", toggleTheme);
  const langToggle = useToggleAnimation(language, language === "ko" ? "en" : "ko", toggleLanguage);

  const handleLogout = useCallback(async () => {
    const supabase = await loadSupabaseClient();
    await supabase.auth.signOut();
    if (pathname.startsWith("/admin")) {
      router.push("/admin/login");
    }
    router.refresh();
  }, [router, pathname]);

  return (
    /* header 로 감싸 로고까지 랜드마크 안에 넣는다. display:contents 는 필수다 —
       평범한 블록 박스로 두면 자식(fixed + mix-blend-mode: difference)의 합성 비용이
       올라가 GSAP 가 계속 transform 을 돌리는 /works 의 TBT 가 650 → 858ms 로 늘었다.
       박스를 지우면 자식은 header 가 없던 때와 같은 조건이 되고 랜드마크만 남는다.
       (stacking context 는 어느 쪽이든 안 생긴다. 생기면 blend 반전이 갇혀 죽는다.) */
    <header style={{ display: "contents" }}>
    {/* 로고 + admin 배지 flex 부모. .nav 와 동일 패턴 — mix-blend-mode 를 부모에 두면
        전체가 page backdrop 과 한 번에 blend (자식에 두면 부모 stacking context 안에서 갇혀 무효) */}
    <Link
      href={isAdminPage ? "/admin" : "/"}
      aria-label={useBadgeLogo || !morphIsCharCut ? DISPLAY_NAME : undefined}
      className={`${styles.logoNavBar} ${siteConfig.brand.logoDifference === false ? styles.logoNavBarNoDifference : ""} ${showLoadingLogo || elevatedZ ? styles.logoNavBarElevated : ""} ${siteConfig.brand.logoGlitch ? "glith-on-hover" : ""}`}
    >
        {(() => {
          // 로고 색상 (테마별 override). 커스텀 미지정(기본)이고 difference 를 끈 상태면
          // 블렌드가 없어 색 기준이 사라지므로 text-primary 로 명시.
          const customColor = isDark ? siteConfig.brand.logoColorDark : siteConfig.brand.logoColor;
          const color = customColor || (siteConfig.brand.logoDifference === false ? "var(--text-primary)" : "");
          const inlineStyle: React.CSSProperties = {
            transformOrigin: "left center",
            /* 글자 로고는 재기 전에도 CSS 로딩 클래스로 제자리(한가운데)에 있으니 숨기지 않는다. */
            visibility: showLoadingLogo && !logoMeasured && !cssLoadingLogo ? "hidden" : "visible",
            ["--logo-stretch" as string]: stretchN,
            ["--logo-chars" as string]: 1 + EXTRA_LETTERS.length,
          };
          if (siteConfig.brand.logoFont) inlineStyle.fontFamily = withMetricFallback(siteConfig.brand.logoFont);
          if (color) inlineStyle.color = color;
          // 텍스트 글리프·배지 nav/로딩 로고 그림자 (이미지 로고는 img 자체에 logoShadowFilter 를 걸므로 제외).
          if (!hasImageLogo && navGlyphShadowFilter) inlineStyle.filter = navGlyphShadowFilter;
          return (
            <motion.span
              ref={logoRef}
              className={`${styles.logo} ${cssLoadingLogo && !logoMeasured ? styles.logoCssLoading : ""}`}
              /* transform 은 useLogoMeasure 가 motion value 로 직접 움직인다(animate prop 을 쓰지 않는 이유는 그쪽 설명). */
              style={{ ...inlineStyle, x: logoX, y: logoY, scaleX: logoScaleX, scaleY: logoScaleY }}
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
          ) : morphIsCharCut ? (
            /* 숏 글리프 = 풀 텍스트 첫 글자 → char-cut morph. 첫 글자는 로딩·nav 에 그대로 있고
               뒤 글자만 로딩 때 등장·전환 때 퇴장해 첫 글자만 남는다. */
            <>
              {LOGO_TEXT}
              {showLoadingLogo &&
                EXTRA_LETTERS.map((char, i) => (
                  /* 등장은 CSS 애니메이션이라 서버 HTML 부터 돈다. framer 의 initial 로 두면
                     opacity 0 으로 나가 하이드레이션 전까지 안 보였다. 퇴장은 전환 때 클래스로. */
                  <span
                    key={i}
                    data-loading-letter
                    className={`${styles.logoLetter} ${isTransitioning ? styles.logoLetterOut : ""}`}
                    style={{ ["--i" as string]: i, ["--j" as string]: EXTRA_LETTERS.length - 1 - i }}
                  >
                    {char}
                  </span>
                ))}
            </>
          ) : (
            /* 숏 글리프 ≠ 풀 텍스트 첫 글자(커스텀 숏 로고) → crossfade. 로딩엔 실제 풀 워드마크를
               보이고 전환 때 숏 글리프로 교체한다(이미지 로고의 풀↔숏 crossfade 와 같은 연출).
               숏 글리프는 로딩 동안 absolute 로 겹쳐 폭을 워드마크에 맡겨(중앙 정렬이 맞는다) 숨겼다가,
               전환 때 나타나고 로딩이 끝나면 inline 으로 돌아와 nav 폭을 잡는다. */
            <>
              <span
                className={`${styles.logoCrossShort} ${showLoadingLogo ? styles.logoCrossShortFloat : ""} ${showLoadingLogo && !isTransitioning ? styles.logoCrossHidden : ""}`}
              >
                {LOGO_TEXT}
              </span>
              {showLoadingLogo && (
                /* 풀 워드마크 — inline 이라 자연 폭을 잡아 로딩 중앙 정렬 계산이 맞는다. 글자는
                   char-cut 과 같은 CSS 등장(떠오름+선명해짐), 전환 땐 통째로 흐려지며 사라진다. */
                <span
                  className={`${styles.logoCrossFull} ${isTransitioning ? styles.logoCrossFullOut : ""}`}
                  aria-hidden="true"
                >
                  {NAME_GRAPHEMES.map((char, i) => (
                    <span
                      key={i}
                      data-loading-letter
                      className={styles.logoLetter}
                      style={{ ["--i" as string]: i, ["--j" as string]: NAME_GRAPHEMES.length - 1 - i }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              )}
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

    <nav aria-label={language === "ko" ? "주요 메뉴" : "Main menu"} className={`${styles.nav} ${showLoadingLogo ? styles.navLoading : ""} ${elevatedZ ? styles.navElevated : ""} ${isAdminPage ? styles.navAdmin : ""} ${showMenu ? styles.navMenuOpen : ""}`}>
      <div
        ref={navCenterRef}
        className={styles.navCenter}
        onMouseLeave={() => setHoveredNav(null)}
      >
        {isAdminPage
          ? adminNav.map((item) => {
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
          // 서브메뉴로 넘어갈 땐(선택 항목이 있거나 서브 항목을 hover 중) 메인 인디케이터를
          // 숨긴다 — ▶ (travelInk)가 그 서브 항목에서 대신 표시된다.
          const effStyle = subMenuHandoff || hoveredSubKey != null ? { ...indicatorStyle, opacity: 0 } : indicatorStyle;
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
          <Pressable noTapScale
            className={styles.actionBtn}
            onClick={langToggle.handleToggle}
            onMouseEnter={langToggle.handleMouseEnter}
            onMouseLeave={langToggle.handleMouseLeave}
            aria-label={`${language === "ko" ? "KO" : "EN"} - Switch to ${language === "ko" ? "English" : "Korean"}`}
            aria-pressed={language === "ko"}
          >
            <span className={`${styles.langText} ${langToggle.isAnimating && !langToggle.isClicking ? styles.animating : ""} ${langToggle.isClicking ? styles.clicking : ""}`}>
              {langToggle.display === "ko" ? "KO" : "EN"}
            </span>
          </Pressable>
        </Tooltip>

        {/* 사운드 토글 — admin 에서도 보인다. 배경음은 루트 레이아웃이 재생하므로 admin 에서도
            계속 나는데, 버튼을 숨겨 두면 끌 방법이 없었다. 처음 오는 사람에게 띄우는 안내
            말풍선만 공개 화면 몫이다(위 showSoundTip 효과가 admin 을 건너뛴다) */}
        <div className={styles.soundBtnWrap}>
          <Tooltip content={language === "ko" ? "배경 음악" : "Background music"} delay={600} placement="bottom">
            <Pressable noTapScale
              className={styles.actionBtn}
              onClick={handleSoundToggle}
              onMouseEnter={() => { setIsSoundHovered(true); setShowSoundTip(false); }}
              onMouseLeave={() => { setIsSoundLocked(false); setIsSoundHovered(false); }}
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
            </Pressable>
          </Tooltip>
          {showSoundTip && (
            <span className={styles.soundTip} onClick={() => setShowSoundTip(false)}>
              {language === "ko" ? "BGM을 켤 수 있어요" : "Enable BGM"}
            </span>
          )}
        </div>

        {/* 테마 토글 */}
        <Tooltip content={language === "ko" ? "테마 전환" : "Toggle theme"} delay={600} placement="bottom">
          <Pressable noTapScale
            className={styles.actionBtn}
            onClick={themeToggle.handleToggle}
            onMouseEnter={themeToggle.handleMouseEnter}
            onMouseLeave={themeToggle.handleMouseLeave}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
          >
          <span className={`${styles.themeIconWrapper} ${themeToggle.isAnimating && !themeToggle.isClicking ? styles.animating : ""} ${themeToggle.isClicking ? styles.clicking : ""}`}>
            {themeToggle.display === "dark" ? (
              <Moon className={styles.themeIcon} strokeWidth={1.5} />
            ) : (
              <Sun className={styles.themeIcon} strokeWidth={1.5} />
            )}
            </span>
          </Pressable>
        </Tooltip>

        {/* 액션 항목들 (email + Bell + Logout/GetInTouch) — navActions 직속 자식 */}
        {isAdminPage && adminEmail && (
          <span className={styles.adminEmail}>{adminEmail}</span>
        )}
        {adminEmail && canSeeNotifications && (
          <Tooltip
            content={unreadCount > 0
              ? (language === "ko" ? `읽지 않은 알림 ${unreadCount}개` : `${unreadCount} unread`)
              : (language === "ko" ? "알림" : "Notifications")}
            placement="bottom"
            delay={200}
            disabled={notifOpen}
          >
            <Pressable noTapScale
              ref={notifWrapRef}
              className={`${styles.actionBtn} ${styles.notifBtn}`}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) fetchNotifs(); }}
            >
              <Bell size={16} strokeWidth={1.8} />
              {unreadCount > 0 && <span className={styles.notifDot} aria-hidden />}
            </Pressable>
          </Tooltip>
        )}

        {/* Notification dropdown — createPortal 로 body 에 렌더 (nav 의 mix-blend-mode + z-index 격리) */}
        {adminEmail && canSeeNotifications && typeof window !== "undefined" && createPortal(
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
                          {renderNotifItem(n, language, now, () => setNotifOpen(false))}
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
                            {renderNotifItem(n, language, now, () => setNotifOpen(false))}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                  {notifs.length > 5 && (
                    <Pressable noTapScale
                      className={styles.notifDropdownMore}
                      onClick={() => setNotifExpanded((v) => !v)}
                    >
                      {notifExpanded
                        ? (language === "ko" ? "접기" : "Collapse")
                        : (language === "ko" ? "더 보기 +5" : "Load more +5")}
                    </Pressable>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
        {/* 관리 화면으로 — 로그아웃 왼쪽. 로그인해 두고도 주소를 직접 쳐야 들어갈 수 있었다.
            이미 관리 화면이면 그릴 이유가 없다(상단바가 관리 메뉴로 바뀌어 있다) */}
        {!isAdminPage && adminHref && (
          <Tooltip content={language === "ko" ? "관리 화면" : "Admin"} delay={200} placement="bottom">
            <Link href={adminHref} className={styles.actionBtn} aria-label={language === "ko" ? "관리 화면" : "Admin"}>
              <Settings size={18} strokeWidth={1.5} />
            </Link>
          </Tooltip>
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
          <Pressable noTapScale
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
          </Pressable>
        </MagneticWrapper>
      </div>

      {/* 메뉴 서랍 (clip-path, ContactDrawer pattern) */}
      <MobileMenu
        showMenu={showMenu}
        menuClipOpen={menuClipOpen}
        clipWrapperRef={clipWrapperRef}
        menuMounted={menuMounted}
        pathname={pathname}
        isAdminPage={isAdminPage}
        menuItems={isAdminPage ? adminMenu : menuItems}
        adminHref={isAdminPage ? null : adminHref}
        contactEmail={siteConfig.contact.email}
        onClose={() => setIsMenuOpen(false)}
        onContactOpen={openForm}
        onLogout={handleLogout}
      />

      {/* nav 하위 드롭다운 — children 있는 항목(사용자 Posts / admin Settings) hover 시.
         .nav 직속 자식 → difference blend 상속. 카드 없이 흰 텍스트가 page backdrop 과 blend. */}
      <AnimatePresence>
        {subMenuChildren.length > 0 && (() => {
          // 접힘 4단계 타이밍: 1) active bold 해제 → 2) indent 해제 + 화살표 접기 →
          // 3) 항목을 아래→위 순차 접기 → 4) 왼쪽 줄 마지막에 접기.
          const n = subMenuChildren.length;
          const STAGGER = 0.05;
          const ITEMS_BASE = 0.24; // bold·indent·화살표(1·2단계) 뒤 항목 접기(3단계) 시작
          const itemExitDelay = (i: number) => ITEMS_BASE + (n - 1 - i) * STAGGER; // 아래(마지막)부터
          const lineExitDelay = ITEMS_BASE + n * STAGGER + 0.03; // 줄은 항목 다 접힌 뒤
          return (
            <motion.div
              key={`sub-nav-dropdown-${subMenuKey}`}
              className={styles.subNavDropdown}
              role="menu"
              style={{ top: subMenuPos.top, left: subMenuPos.left }}
              onMouseEnter={cancelSubMenuClose}
              onMouseLeave={() => { scheduleSubMenuClose(); setHoveredSubKey(null); }}
            >
              {/* 왼쪽 연결선 — 열릴 때 위→아래 draw, 접힐 때 맨 마지막(4단계)에 위로 접힘 */}
              <motion.span
                className={styles.subNavDropdownLine}
                aria-hidden="true"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1, transition: { duration: 0.32, ease: SUB_EASE } }}
                exit={{ scaleY: 0, opacity: 0, transition: { duration: 0.24, delay: lineExitDelay, ease: SUB_EASE } }}
              />
              {subMenuChildren.map((child, index) => {
                const active = isChildActive(child.href);
                return (
                  <motion.div
                    key={child.key}
                    ref={(el) => { subItemRefs.current[child.key] = el; }}
                    className={styles.subNavDropdownItemWrap}
                    /* 열림: 위→아래 스태거. active 는 x offset 제외(travelInk 도착 위치 안정 측정). */
                    initial={{ opacity: 0, x: active ? 0 : -12 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.34, delay: 0.04 + index * 0.055, ease: SUB_EASE } }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.22, delay: itemExitDelay(index), ease: SUB_EASE } }}
                  >
                    <MotionLink
                      href={child.href}
                      role="menuitem"
                      className={`${styles.subNavDropdownItem} ${active ? styles.subNavDropdownItemActive : ""}`}
                      onMouseEnter={() => setHoveredSubKey(child.key)}
                      onClick={() => setSubMenuKey(null)}
                      /* bold/indent 는 CSS(.subNavDropdownItemActive) 가 steady 상태를 담당.
                         접힐 때만 framer 가 이어받아 1) bold 해제(즉시) → 2) indent 해제(약간 뒤) 순으로 푼다. */
                      initial={false}
                      exit={active ? {
                        fontWeight: 400,
                        marginLeft: 0,
                        transition: {
                          fontWeight: { duration: 0.14 },
                          marginLeft: { duration: 0.18, delay: 0.1, ease: SUB_EASE },
                        },
                      } : undefined}
                    >
                      {child.label}
                    </MotionLink>
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })()}
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
            initial={{ x: travelPos.from.x, y: travelPos.from.y, opacity: 1, scale: 1 }}
            animate={{ x: travelPos.to.x, y: travelPos.to.y, opacity: 1, scale: 1 }}
            /* 접힘 2단계 — indent 해제와 함께 화살표를 접는다(shrink + fade) */
            exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.2, delay: 0.1, ease: SUB_EASE } }}
            transition={{ duration: 0.42, ease: SUB_EASE }}
          >
            ▶︎
          </motion.span>
        )}
      </AnimatePresence>
    </nav>
    </header>
  );
}
