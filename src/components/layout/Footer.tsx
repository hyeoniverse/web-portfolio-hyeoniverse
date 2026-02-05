"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <span className={styles.copyright}>{siteConfig.footer.copyright}</span>
        <div className={styles.links}>
          <Link href="/works">Works</Link>
          <Link href="/about">About</Link>
          <Link href="/webflow">WebFlow</Link>
        </div>
        <span className={styles.location}>{siteConfig.personal.location}</span>
      </div>
    </footer>
  );
}
