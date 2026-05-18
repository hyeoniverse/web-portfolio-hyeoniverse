"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import T from "@/components/ui/T";
import styles from "@/app/error.module.css";

export default function AccessDeniedPage() {
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  return (
    <div className={styles.container} style={{ marginTop: "calc(-1 * var(--spacing-6xl))" }}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
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

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <T k="errorPage.accessDeniedTitle" />
        </motion.h1>

        <motion.p
          className={styles.description}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <T k="errorPage.accessDeniedDescription" />
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Link href="/admin/login" className={styles.primaryButton}>
            <T k="errorPage.signIn" />
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            <T k="errorPage.goHome" />
          </Link>
        </motion.div>
      </motion.div>

      <div className={styles.decorOval1} />
      <div className={styles.decorOval2} />
    </div>
  );
}
