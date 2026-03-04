"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { cn } from "@/utils/cn";
import styles from "./Footer.module.css";

/** Footer 숨김 경로 (exact match) — 가로 스크롤·특수 레이아웃 페이지 */
const HIDDEN_ROUTES = ["/", "/works", "/profile", "/about"];

interface FooterProps {
  className?: string;
  /** minimal: 조회수 + 저작권만 표시 (nav 링크 없음) */
  variant?: "full" | "minimal";
}

export default function Footer({ className, variant = "full" }: FooterProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);

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
    ? ["/admin/settings", "/admin/works", "/admin/posts"].find((h) => pathname.startsWith(h)) ?? (pathname === "/" ? "/" : null)
    : ["/works", "/posts", "/profile", "/about", "/privacy", "/design-system"].find(
        (h) => pathname === h || pathname.startsWith(h + "/"),
      ) ?? null;

  const targetHref = hoveredLink ?? activeLinkHref;

  useEffect(() => {
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
  }, [targetHref, language]);

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then((data) => setVisits(data))
      .catch(() => {});
  }, []);

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
              {visitsBlock}
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
                  <Link href="/" ref={setLinkRef("/")} onMouseEnter={() => setHoveredLink("/")}>Home</Link>
                </>
              ) : (
                <>
                  <Link href="/works" ref={setLinkRef("/works")} onMouseEnter={() => setHoveredLink("/works")} className={pathname.startsWith("/works") ? styles.activeLink : ""}>Works</Link>
                  <Link href="/posts" ref={setLinkRef("/posts")} onMouseEnter={() => setHoveredLink("/posts")} className={pathname.startsWith("/posts") ? styles.activeLink : ""}>Posts</Link>
                  <Link href="/profile" ref={setLinkRef("/profile")} onMouseEnter={() => setHoveredLink("/profile")} className={pathname.startsWith("/profile") ? styles.activeLink : ""}>Profile</Link>
                  <Link href="/about" ref={setLinkRef("/about")} onMouseEnter={() => setHoveredLink("/about")} className={pathname.startsWith("/about") ? styles.activeLink : ""}>About</Link>
                  <span className={styles.divider}>✧</span>
                  <Link href="/privacy" ref={setLinkRef("/privacy")} onMouseEnter={() => setHoveredLink("/privacy")} className={pathname === "/privacy" ? styles.activeLink : ""}>Privacy Policy</Link>
                  <Link href="/design-system" ref={setLinkRef("/design-system")} onMouseEnter={() => setHoveredLink("/design-system")} className={pathname === "/design-system" ? styles.activeLink : ""}>Design System</Link>
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
      </div>
    </footer>
  );
}
