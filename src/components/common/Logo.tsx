"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import styles from "./Logo.module.css";

interface LogoProps {
  variant?: "short" | "full";
  as?: "link" | "span";
  className?: string;
}

const SHORT = "H";
const FULL = siteConfig.loading.displayName;

export default function Logo({ variant = "short", as = "link", className }: LogoProps) {
  const text = variant === "full" ? FULL : SHORT;
  const combined = className ? `${styles.logo} ${className}` : styles.logo;

  if (as === "span") {
    return <span className={combined}>{text}</span>;
  }

  return (
    <Link href="/" className={combined}>
      {text}
    </Link>
  );
}
