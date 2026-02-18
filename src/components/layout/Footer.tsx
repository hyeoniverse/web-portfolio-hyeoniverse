"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";
import styles from "./Footer.module.css";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.links}>
          <Link href="/works">{t("nav.works")}</Link>
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/behind">{t("nav.behind")}</Link>
          <span className={styles.divider}>✧</span>
          <Link href="/privacy">{t("footer.privacyPolicy")}</Link>
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
