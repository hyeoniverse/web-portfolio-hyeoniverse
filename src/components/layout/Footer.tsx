"use client";

import { useState, useEffect } from "react";
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
  const { t, language } = useLanguage();
  const siteConfig = useSiteConfig();
  const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);

  // variant가 명시적으로 전달되면 항상 표시, 아니면 HIDDEN_ROUTES 체크
  const isHidden = variant === "full" && HIDDEN_ROUTES.includes(pathname);

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then((data) => setVisits(data))
      .catch(() => {});
  }, []);

  if (isHidden) return null;

  const isMinimal = variant === "minimal";
  const isAdmin = pathname.startsWith("/admin");

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

  return (
    <footer className={cn(styles.footer, isMinimal && styles.footerMinimal, className)}>
      <div className={styles.content}>
        {isMinimal ? (
          <div className={styles.bottomMinimal}>
            {emailLink}
            <div className={styles.bottomRight}>
              {visitsBlock}
              {copyrightText}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.links}>
              {isAdmin ? (
                <>
                  <Link href="/admin/settings" className={pathname.startsWith("/admin/settings") ? styles.activeLink : ""}>Settings</Link>
                  <Link href="/admin/works" className={pathname.startsWith("/admin/works") ? styles.activeLink : ""}>Works</Link>
                  <Link href="/admin/posts" className={pathname.startsWith("/admin/posts") ? styles.activeLink : ""}>Posts</Link>
                  <span className={styles.divider}>✧</span>
                  <Link href="/">Home</Link>
                </>
              ) : (
                <>
                  <Link href="/works" className={pathname.startsWith("/works") ? styles.activeLink : ""}>{t("nav.works")}</Link>
                  <Link href="/posts" className={pathname.startsWith("/posts") ? styles.activeLink : ""}>{t("nav.posts")}</Link>
                  <Link href="/profile" className={pathname.startsWith("/profile") ? styles.activeLink : ""}>{t("nav.profile")}</Link>
                  <Link href="/about" className={pathname.startsWith("/about") ? styles.activeLink : ""}>{t("nav.about")}</Link>
                  <span className={styles.divider}>✧</span>
                  <Link href="/privacy" className={pathname === "/privacy" ? styles.activeLink : ""}>Privacy Policy</Link>
                  <Link href="/design-system" className={pathname === "/design-system" ? styles.activeLink : ""}>Design System</Link>
                </>
              )}
            </div>
            <div className={styles.bottom}>
              {emailLink}
              <div className={styles.bottomRight}>
                {visitsBlock}
                {copyrightText}
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
