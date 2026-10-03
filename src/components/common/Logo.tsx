"use client";

import Link from "next/link";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { logoOnBg, resolveBrandLogos } from "@/lib/brandLogos";
import ThemedLogoImage from "./ThemedLogoImage";
import styles from "./Logo.module.css";

interface LogoProps {
  variant?: "short" | "full";
  as?: "link" | "span";
  className?: string;
  /** 로고가 놓일 배경의 밝기. 테마와 다른 면(모바일 메뉴 드로어 등) 위라면 잰 값을 넘긴다 — 없으면 테마를 따른다 */
  bg?: "light" | "dark";
}

export default function Logo({ variant = "short", as = "link", className, bg }: LogoProps) {
  const siteConfig = useSiteConfig();
  const { theme } = useTheme();
  const SHORT = siteConfig.brand.logoText || "H";
  const FULL = siteConfig.brand.logoFullText || siteConfig.loading.displayName;

  const isDark = (bg ?? theme) === "dark";
  // 숏/풀 중 한쪽만 커스텀 업로드면 그 업로드본을 양쪽에 쓴다 (lib/brandLogos).
  // logoMode=system 이면 이미지 대신 텍스트로 그린다.
  const logos = resolveBrandLogos(siteConfig.brand);
  // 화면 배경에 맞는 변형 — 없으면 반대쪽 변형을 명암만 뒤집어 쓴다(lib/brandLogos 의 logoOnBg)
  const pick = logoOnBg(variant === "short" ? logos.short : logos.full, isDark ? "dark" : "light");
  const logoUrl = siteConfig.brand.logoMode === "system" ? "" : pick.url;
  // 업로드 로고 리컬러 색 (설정에서 지정 시) — 이미지를 이 색으로 마스크 채움. 빈 값 = 원본
  const tint = pick.tint;

  const combined = className ? `${styles.logo} ${className}` : styles.logo;
  const alt = variant === "short" ? SHORT : FULL;

  const content = logoUrl ? (
    <ThemedLogoImage
      src={logoUrl}
      bg={isDark ? "dark" : "light"}
      width={variant === "short" ? 32 : 120}
      alt={alt}
      tint={tint}
      invert={pick.invert}
      classNames={{ image: styles.logoImage, invert: styles.logoImageInvert, tinted: styles.logoTinted }}
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
