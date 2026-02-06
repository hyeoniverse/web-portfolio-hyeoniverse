"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./error.module.css";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const { t } = useLanguage();

  useEffect(() => {
    // Log the error to an error reporting service (server-side only in production)
    // In production, consider sending to a proper error tracking service like Sentry
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Error Icon */}
        <motion.div
          className={styles.iconWrapper}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "backOut" }}
        >
          <div className={styles.icon}>
            <span className={styles.iconText}>!</span>
          </div>
        </motion.div>

        {/* Error Message - User-friendly, no technical details */}
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {t("errorPage.title")}
        </motion.h1>

        <motion.p
          className={styles.description}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {t("errorPage.description")}
        </motion.p>

        {/* Error Reference ID for support (digest is safe to show) */}
        {error.digest && (
          <motion.p
            className={styles.errorRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            {t("errorPage.reference")}: {error.digest}
          </motion.p>
        )}

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button onClick={reset} className={styles.primaryButton}>
            {t("errorPage.tryAgain")}
          </button>
          <Link href="/" className={styles.secondaryButton}>
            {t("errorPage.goHome")}
          </Link>
        </motion.div>
      </motion.div>

      {/* Decorative Elements */}
      <div className={styles.decorOval1} />
      <div className={styles.decorOval2} />
    </div>
  );
}
