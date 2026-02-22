"use client";

import Link from "next/link";
import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./Logo.module.css";

interface LogoProps {
  variant?: "short" | "full";
  as?: "link" | "span";
  className?: string;
}

const SHORT = "H";

export default function Logo({ variant = "short", as = "link", className }: LogoProps) {
  const siteConfig = useSiteConfig();
  const FULL = siteConfig.loading.displayName;

  const logoUrl =
    variant === "short"
      ? siteConfig.brand.logoShortUrl
      : siteConfig.brand.logoFullUrl;

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
