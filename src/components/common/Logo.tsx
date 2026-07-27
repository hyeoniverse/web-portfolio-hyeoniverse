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
  // 업로드 로고 리컬러 색 (설정에서 지정 시) — 이미지를 이 색으로 마스크 채움. 빈 값 = 원본
  const tint =
    variant === "short"
      ? (isDark ? siteConfig.brand.logoShortColorDark : siteConfig.brand.logoShortColor)
      : (isDark ? siteConfig.brand.logoFullColorDark : siteConfig.brand.logoFullColor);

  const combined = className ? `${styles.logo} ${className}` : styles.logo;
  const alt = variant === "short" ? SHORT : FULL;

  const content = logoUrl ? (
    tint ? (
      // 리컬러 — 숨긴 img 로 종횡비/폭 확보하고, 그 형태를 mask 로 tint 색 채움 (다크 invert 미적용)
      <span
        className={styles.logoTinted}
        style={{ backgroundColor: tint, maskImage: `url("${logoUrl}")`, WebkitMaskImage: `url("${logoUrl}")` }}
        role="img"
        aria-label={alt}
      >
        <Image src={logoUrl} alt="" width={variant === "short" ? 32 : 120} height={32} unoptimized />
      </span>
    ) : (
      <Image
        src={logoUrl}
        alt={alt}
        width={variant === "short" ? 32 : 120}
        height={32}
        className={styles.logoImage}
        unoptimized
      />
    )
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
