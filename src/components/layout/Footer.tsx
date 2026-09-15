"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { cn } from "@/utils/cn";
import { hasAuthCookie } from "@/lib/supabase/hasAuthCookie";
import ViewModeToggle from "./ViewModeToggle";
import styles from "./Footer.module.css";

/** Supabase 클라이언트 동적 로드 (번들 절약) */
const loadSupabaseClient = () => import("@/lib/supabase/client").then(m => m.createClient());

/** Footer 숨김 경로 (exact match) — 가로 스크롤·특수 레이아웃 페이지 */
const HIDDEN_ROUTES = ["/", "/works", "/profile", "/about"];

interface FooterProps {
  className?: string;
  /** minimal: 조회수 + 저작권만 표시 (nav 링크 없음) */
  variant?: "full" | "minimal";
}

export default function Footer({ className, variant = "full" }: FooterProps) {
  const pathname = usePathname();
  // design-system(쇼케이스)에선 데스크톱에서도 footer 의 ViewModeToggle 을 보이게 강제.
  const isDesignSystem = !!pathname?.startsWith("/design-system");
  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // variant가 명시적으로 전달되면 항상 표시, 아니면 HIDDEN_ROUTES 체크
  const isHidden = variant === "full" && HIDDEN_ROUTES.includes(pathname);

  /* ── Sliding indicator ── */
  const linksRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const setLinkRef = useCallback(
    (href: string) => (el: HTMLAnchorElement | null) => {
      linkRefs.current[href] = el;
    },
    [],
  );

  const isAdmin = !isHidden && pathname.startsWith("/admin");

  const activeLinkHref = isAdmin
    ? ["/admin/settings", "/admin/works", "/admin/posts"].find((h) => pathname.startsWith(h)) ?? (pathname === "/design-system" ? "/design-system" : pathname === "/" ? "/" : null)
    : ["/works", "/posts", "/profile", "/about", "/privacy", "/design-system"].find(
        (h) => pathname === h || pathname.startsWith(h + "/"),
      ) ?? null;

  const targetHref = hoveredLink ?? activeLinkHref;

  const updateIndicator = useCallback(() => {
    if (!targetHref) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const el = linkRefs.current[targetHref];
    const parent = linksRef.current;
    if (!el || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - parentRect.left,
      width: elRect.width,
      opacity: 1,
    });
  }, [targetHref]);

  // paint 전 위치 계산 (깜빡임 방지)
  // isAuthenticated: Admin 링크 추가/제거 시 레이아웃 재계산
  useLayoutEffect(updateIndicator, [updateIndicator, language, isAuthenticated]);

  // 리사이즈·폰트 로드 시 재계산
  useEffect(() => {
    const parent = linksRef.current;
    if (!parent) return;

    // 폰트 로드 후 재계산
    document.fonts.ready.then(updateIndicator);

    // 컨테이너 크기 변경 감지 (window resize 포함)
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [updateIndicator]);

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then((data) => setVisits(data))
      .catch(() => {});
  }, []);

  // Admin 세션 체크 (공개 페이지에서만)
  useEffect(() => {
    if (isAdmin) return;
    // 로그인 흔적이 없으면 Supabase 클라이언트(313 KiB)를 받지 않는다 — 답이 정해져 있다.
    if (!hasAuthCookie()) return;
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    loadSupabaseClient().then(async (supabase) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setIsAuthenticated(!!user);

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setIsAuthenticated(!!session?.user);
      });
      // unmount 가 promise resolve 보다 먼저 일어났다면 즉시 정리
      if (cancelled) sub.unsubscribe();
      else subscription = sub;
    }).catch(() => {});
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [isAdmin]);

  if (isHidden) return null;

  const isMinimal = variant === "minimal";

  const visitsBlock = visits && (
    <div className={styles.visits}>
      <span className={styles.visitItem}>
        <span className={styles.visitLabel}>Today</span>
        <span className={styles.visitCount}>{visits.today.toLocaleString()}</span>
      </span>
      <span className={styles.visitDot} />
      <span className={styles.visitItem}>
        <span className={styles.visitLabel}>Total</span>
        <span className={styles.visitCount}>{visits.total.toLocaleString()}</span>
      </span>
    </div>
  );

  const emailLink = (
    <a
      href={`mailto:${siteConfig.contact.email}`}
      className={styles.email}
    >
      {siteConfig.contact.email}
    </a>
  );

  const copyrightText = (
    <span className={styles.copyright}>
      {language === "ko" ? siteConfig.footer.copyright_ko : siteConfig.footer.copyright}
    </span>
  );

  const { musicCreditTitle, musicCreditArtist, musicCreditUrl } = siteConfig.footer;
  const musicCreditText = musicCreditTitle ? (() => {
    const titlePart = musicCreditUrl
      ? <a href={musicCreditUrl} target="_blank" rel="noopener noreferrer">{musicCreditTitle}</a>
      : <>{musicCreditTitle}</>;
    const suffix = language === "ko"
      ? " · 모든 저작권은 원작자에게 있습니다"
      : " · All rights belong to the original creator";
    return (
      <span className={styles.musicCredit}>
        BGM: {titlePart}{musicCreditArtist && ` by ${musicCreditArtist}`}{suffix}
      </span>
    );
  })() : null;

  /* 새 탭으로 여는 링크(Design System·Admin)는 prefetch={false}. Link 는 화면에 들어오면 대상 페이지를
     미리 받는데, 새 탭은 이 탭이 받아 둔 것을 쓰지 못한다. 그런데도 미리 받은 페이지의 스크립트까지 내려받아,
     푸터가 보이는 화면마다 Design System 의 청크 12개(three.js 포함)를 쓰지도 않고 받았다.
     Login 은 같은 탭으로 열지만(로그인=관리 진입), 방문자 대부분이 누르지 않으므로 마찬가지로 prefetch 하지 않는다. */
  return (
    <footer className={cn(styles.footer, isMinimal && styles.footerMinimal, className)}>
      <div className={styles.content}>
        {isMinimal ? (
          <div className={styles.bottomMinimal}>
            <div className={styles.bottomLeft}>
              {emailLink}
              {copyrightText}
            </div>
            <div className={styles.bottomRight}>
              <div className={styles.visits}>
                <Link href="/privacy" className={styles.adminLink}>Privacy</Link>
                <span className={styles.divider}>✧</span>
                <Link href="/design-system" target="_blank" prefetch={false} className={styles.adminLink}>Design System</Link>
                <span className={styles.divider}>✧</span>
                {/* full variant 와 같게 — 로그아웃 상태에서도 들어갈 자리는 남겨 둔다 */}
                {isAuthenticated ? (
                  <Link href="/admin" target="_blank" prefetch={false} className={styles.adminLink}>Admin</Link>
                ) : (
                  <Link href="/admin/login?next=/admin" prefetch={false} className={styles.adminLink}>Login</Link>
                )}
                {visits && (
                  <>
                    <span className={styles.stretchLine} />
                    <span className={styles.visitItem}>
                      <span className={styles.visitLabel}>Today</span>
                      <span className={styles.visitCount}>{visits.today.toLocaleString()}</span>
                    </span>
                    <span className={styles.visitDot} />
                    <span className={styles.visitItem}>
                      <span className={styles.visitLabel}>Total</span>
                      <span className={styles.visitCount}>{visits.total.toLocaleString()}</span>
                    </span>
                  </>
                )}
              </div>
              {musicCreditText}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.links} ref={linksRef} onMouseLeave={() => setHoveredLink(null)}>
              {isAdmin ? (
                <>
                  <Link href="/admin/settings" ref={setLinkRef("/admin/settings")} onMouseEnter={() => setHoveredLink("/admin/settings")} className={pathname.startsWith("/admin/settings") ? styles.activeLink : ""}>Settings</Link>
                  <Link href="/admin/works" ref={setLinkRef("/admin/works")} onMouseEnter={() => setHoveredLink("/admin/works")} className={pathname.startsWith("/admin/works") ? styles.activeLink : ""}>Works</Link>
                  <Link href="/admin/posts" ref={setLinkRef("/admin/posts")} onMouseEnter={() => setHoveredLink("/admin/posts")} className={pathname.startsWith("/admin/posts") ? styles.activeLink : ""}>Posts</Link>
                  <span className={styles.divider}>✧</span>
                  <Link href="/design-system" target="_blank" prefetch={false} ref={setLinkRef("/design-system")} onMouseEnter={() => setHoveredLink("/design-system")} className={pathname === "/design-system" ? styles.activeLink : ""}>Design System</Link>
                  <Link href="/" ref={setLinkRef("/")} onMouseEnter={() => setHoveredLink("/")}>Home</Link>
                </>
              ) : (
                <>
                  <Link href="/" ref={setLinkRef("/")} onMouseEnter={() => setHoveredLink("/")} className={pathname === "/" ? styles.activeLink : ""}>Home</Link>
                  <Link href="/works" ref={setLinkRef("/works")} onMouseEnter={() => setHoveredLink("/works")} className={pathname.startsWith("/works") ? styles.activeLink : ""}>Works</Link>
                  <Link href="/posts" ref={setLinkRef("/posts")} onMouseEnter={() => setHoveredLink("/posts")} className={pathname.startsWith("/posts") ? styles.activeLink : ""}>Posts</Link>
                  <Link href="/profile" ref={setLinkRef("/profile")} onMouseEnter={() => setHoveredLink("/profile")} className={pathname.startsWith("/profile") ? styles.activeLink : ""}>Profile</Link>
                  <Link href="/about" ref={setLinkRef("/about")} onMouseEnter={() => setHoveredLink("/about")} className={pathname.startsWith("/about") ? styles.activeLink : ""}>About</Link>
                  <span className={styles.divider}>✧</span>
                  <Link href="/privacy" ref={setLinkRef("/privacy")} onMouseEnter={() => setHoveredLink("/privacy")} className={pathname === "/privacy" ? styles.activeLink : ""}>Privacy Policy</Link>
                  <Link href="/design-system" target="_blank" prefetch={false} ref={setLinkRef("/design-system")} onMouseEnter={() => setHoveredLink("/design-system")} className={pathname === "/design-system" ? styles.activeLink : ""}>Design System</Link>
                  <span className={styles.divider}>✧</span>
                  {isAuthenticated ? (
                    <Link href="/admin" target="_blank" prefetch={false} ref={setLinkRef("/admin")} onMouseEnter={() => setHoveredLink("/admin")}>Admin</Link>
                  ) : (
                    <Link href="/admin/login?next=/admin" prefetch={false} ref={setLinkRef("/admin/login")} onMouseEnter={() => setHoveredLink("/admin/login")}>Login</Link>
                  )}
                </>
              )}
              <span
                className={`${styles.footerIndicator} ${indicatorStyle.opacity === 0 ? styles.footerIndicatorHidden : ""}`}
                style={indicatorStyle}
              />
            </div>
            <div className={styles.bottom}>
              <div className={styles.bottomLeft}>
                {emailLink}
                {copyrightText}
              </div>
              <div className={styles.bottomRight}>
                {visitsBlock}
                {musicCreditText}
              </div>
            </div>
          </>
        )}
        <ViewModeToggle forceShow={isDesignSystem} />
      </div>
    </footer>
  );
}
