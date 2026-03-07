"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/utils";
import styles from "./TextLink.module.css";

interface TextLinkProps {
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}

export default function TextLink({ href, external, className, children }: TextLinkProps) {
  const classes = cn(styles.textLink, className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
