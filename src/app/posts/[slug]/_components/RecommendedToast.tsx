"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import T from "@/components/ui/T";
import type { RecommendedPost } from "./types";
import styles from "../PostDetail.module.css";

interface RecommendedToastProps {
  post: RecommendedPost;
  viewLang: string;
  onDismiss: () => void;
}

export default function RecommendedToast({ post, viewLang, onDismiss }: RecommendedToastProps) {
  const title = viewLang === "en" && post.title_en ? post.title_en : post.title;
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className={`${styles.toast} ${footerVisible ? styles.toastHidden : ""}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: footerVisible ? 0 : 1, y: footerVisible ? 40 : 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={styles.toastHeader}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span className={styles.toastLabel}><T k="postDetail.recommended" /></span>
        <button type="button" className={styles.toastClose} onClick={onDismiss} data-clickable="true" aria-label="Close">
          <span className={styles.toastCloseIcon}>
            <span className={styles.toastCloseLine} />
            <span className={styles.toastCloseLine} />
          </span>
        </button>
      </div>
      <Link href={`/posts/${post.slug}`} className={styles.toastItem} data-clickable="true">
        <div className={styles.toastThumb}>
          {post.cover_image ? (
            <Image src={post.cover_image} alt="" fill sizes="48px" className={styles.toastThumbImg} />
          ) : (
            <svg className={styles.toastThumbPlaceholder} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <span className={styles.toastTitle}>{title}</span>
      </Link>
    </motion.div>
  );
}
