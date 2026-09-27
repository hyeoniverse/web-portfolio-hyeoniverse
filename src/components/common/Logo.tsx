"use client";

import Link from "next/link";
import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { resolveBrandLogos } from "@/lib/brandLogos";
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
  // 숏/풀 중 한쪽만 커스텀 업로드면 그 업로드본을 양쪽에 쓴다 (lib/brandLogos).
  // logoMode=system 이면 이미지 대신 텍스트로 그린다.
  const logos = resolveBrandLogos(siteConfig.brand);
  const slot = variant === "short" ? logos.short : logos.full;
  const logoUrl = siteConfig.brand.logoMode === "system" ? "" : (isDark && slot.dark) || slot.light;
  // 업로드 로고 리컬러 색 (설정에서 지정 시) — 이미지를 이 색으로 마스크 채움. 빈 값 = 원본
  const tint = isDark ? slot.colorDark : slot.colorLight;

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
