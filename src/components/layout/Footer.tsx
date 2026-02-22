"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { cn } from "@/utils/cn";
import styles from "./Footer.module.css";

/** Footer 숨김 경로 (exact match) — 가로 스크롤·특수 레이아웃 페이지 */
const HIDDEN_ROUTES = ["/works", "/profile", "/about"];

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const siteConfig = useSiteConfig();

  const isHidden = HIDDEN_ROUTES.includes(pathname);

  if (isHidden) return null;

  return (
    <footer className={cn(styles.footer, className)}>
      <div className={styles.content}>
        <div className={styles.links}>
          <Link href="/works" className={pathname.startsWith("/works") ? styles.activeLink : ""}>{t("nav.works")}</Link>
          <Link href="/posts" className={pathname.startsWith("/posts") ? styles.activeLink : ""}>{t("nav.posts")}</Link>
          <Link href="/profile" className={pathname.startsWith("/profile") ? styles.activeLink : ""}>{t("nav.profile")}</Link>
          <Link href="/about" className={pathname.startsWith("/about") ? styles.activeLink : ""}>{t("nav.about")}</Link>
          <span className={styles.divider}>✧</span>
          <Link href="/privacy" className={pathname === "/privacy" ? styles.activeLink : ""}>Privacy Policy</Link>
        </div>

        <div className={styles.bottom}>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className={styles.email}
          >
            {siteConfig.contact.email}
          </a>
          <span className={styles.copyright}>
            HYEON © {new Date().getFullYear()}, {t("footer.copyright")}
          </span>
        </div>
      </div>
    </footer>
  );
}
