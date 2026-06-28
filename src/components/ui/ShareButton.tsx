"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Share } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import styles from "./ShareButton.module.css";

export default function ShareButton({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast(t("editor.linkCopied"), "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [t]);

  return (
    <button
      type="button"
      className={`${styles.btn} ${copied ? styles.copied : ""} ${className ?? ""}`}
      onClick={handleShare}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            className={styles.inner}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={12} strokeWidth={2.5} />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="share"
            className={styles.inner}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <Share size={12} />
            Share
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
