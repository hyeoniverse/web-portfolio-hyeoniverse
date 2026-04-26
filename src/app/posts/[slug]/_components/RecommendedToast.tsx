"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion } from "framer-motion";
import { BookOpen, ImageIcon } from "lucide-react";
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
  const { navigateWithTransition } = usePageTransition();
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
        <BookOpen size={14} />
        <span className={styles.toastLabel}><T k="postDetail.recommended" /></span>
        <button type="button" className={styles.toastClose} onClick={onDismiss} data-clickable="true" aria-label="Close">
          <span className={styles.toastCloseIcon}>
            <span className={styles.toastCloseLine} />
            <span className={styles.toastCloseLine} />
          </span>
        </button>
      </div>
      <div onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect); }} style={{ cursor: "pointer" }} className={styles.toastItem} data-clickable="true">
        <div className={styles.toastThumb}>
          {post.cover_image ? (
            <Image src={post.cover_image} alt="" fill sizes="48px" className={styles.toastThumbImg} />
          ) : (
            <ImageIcon className={styles.toastThumbPlaceholder} size={16} strokeWidth={1} />
          )}
        </div>
        <span className={styles.toastTitle}>{title}</span>
      </div>
    </motion.div>
  );
}
