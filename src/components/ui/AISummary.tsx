"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import T from "@/components/ui/T";
import LoadingDots from "@/components/ui/LoadingDots";
import styles from "./AISummary.module.css";

interface AISummaryProps {
  summaryKo: string;
  summaryEn: string;
  /** "ko" | "en" — synced with the detail page language toggle */
  lang: "ko" | "en";
  /** Whether the summary is currently being generated */
  generating?: boolean;
}

export default function AISummary({ summaryKo, summaryEn, lang, generating = false }: AISummaryProps) {
  const [open, setOpen] = useState(true);

  const text = lang === "ko" ? summaryKo : summaryEn;

  if (!generating && !summaryKo && !summaryEn) return null;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.headerLeft}>
          {/* Sparkle icon */}
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className={styles.label}><T k="aiSummary.label" /></span>
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.body}
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className={styles.bodyInner}>
              {generating ? (
                <span className={styles.generating}>
                  <LoadingDots />
                  <T k="aiSummary.generating" />
                </span>
              ) : (
                <p className={styles.text}>{text || (lang === "ko" ? summaryEn : summaryKo)}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
