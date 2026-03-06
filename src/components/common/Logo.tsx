"use client";

import Link from "next/link";
import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useTheme } from "@/providers/ThemeProvider";
import styles from "./Logo.module.css";

interface LogoProps {
  variant?: "short" | "full";
  as?: "link" | "span";
  className?: string;
}

export default function Logo({ variant = "short", as = "link", className }: LogoProps) {
  const siteConfig = useSiteConfig();
  const { theme } = useTheme();
  const SHORT = siteConfig.brand.logoText || "H";
  const FULL = siteConfig.brand.logoFullText || siteConfig.loading.displayName;

  const isDark = theme === "dark";
  const logoUrl =
    variant === "short"
      ? (isDark && siteConfig.brand.logoShortDarkUrl) || siteConfig.brand.logoShortUrl
      : (isDark && siteConfig.brand.logoFullDarkUrl) || siteConfig.brand.logoFullUrl;

  const combined = className ? `${styles.logo} ${className}` : styles.logo;

  const content = logoUrl ? (
    <Image
      src={logoUrl}
      alt={variant === "short" ? SHORT : FULL}
      width={variant === "short" ? 32 : 120}
      height={32}
      className={styles.logoImage}
      unoptimized
    />
  ) : (
    variant === "full" ? FULL : SHORT
  );

  if (as === "span") {
    return <span className={combined}>{content}</span>;
  }

  return (
    <Link href="/" className={combined}>
      {content}
    </Link>
  );
}
