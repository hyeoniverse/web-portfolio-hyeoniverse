"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./error.module.css";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* 404 Icon */}
        <motion.div
          className={styles.iconWrapper}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "backOut" }}
        >
          <div className={styles.icon}>
            <span className={styles.iconText}>?</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Page Not Found
        </motion.h1>

        <motion.p
          className={styles.description}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {t("errorPage.notFoundDescription")}
        </motion.p>

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Link href="/" className={styles.primaryButton}>
            Go Home
          </Link>
          <Link href="/works" className={styles.secondaryButton}>
            View Works
          </Link>
        </motion.div>
      </motion.div>

      {/* Decorative Elements */}
      <div className={styles.decorOval1} />
      <div className={styles.decorOval2} />
    </div>
  );
}
