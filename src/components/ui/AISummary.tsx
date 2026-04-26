"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ChevronDown } from "lucide-react";
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
          <Sparkles className={styles.icon} size={16} strokeWidth={1.5} />
          <span className={styles.label}><T k="aiSummary.label" /></span>
        </span>
        <ChevronDown
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          size={16}
          strokeWidth={1.5}
        />
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
