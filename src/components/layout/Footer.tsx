"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Footer.module.css";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <span className={styles.copyright}>
          HYEON © {new Date().getFullYear()}, {t("footer.copyright")}
        </span>
        <div className={styles.links}>
          <Link href="/works">{t("nav.works")}</Link>
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/webflow">{t("nav.webflow")}</Link>
        </div>
        <span className={styles.location}>{t("footer.location")}</span>
      </div>
    </footer>
  );
}
