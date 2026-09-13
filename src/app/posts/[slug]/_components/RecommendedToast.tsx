"use client";

import { useState, useEffect } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import TransitionLink from "@/components/ui/TransitionLink";
import { motion } from "framer-motion";
import { BookOpen, ImageIcon } from "@/components/icons";
import T from "@/components/ui/T";
import type { RecommendedPost } from "./types";
import styles from "./RecommendedToast.module.css";
import Pressable from "@/components/ui/Pressable";

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
        <BookOpen size={14} />
        <span className={styles.toastLabel}><T k="postDetail.recommended" /></span>
        <Pressable className={styles.toastClose} onClick={onDismiss} data-clickable="true" aria-label="Close">
          <span className={styles.toastCloseIcon}>
            <span className={styles.toastCloseLine} />
            <span className={styles.toastCloseLine} />
          </span>
        </Pressable>
      </div>
      <TransitionLink href={`/posts/${post.slug}`} image={post.cover_image || ""} className={styles.toastItem} data-clickable="true">
        <div className={styles.toastThumb}>
          {post.cover_image ? (
            <MediaThumb src={post.cover_image} fill sizes="48px" className={styles.toastThumbImg} />
          ) : (
            <ImageIcon className={styles.toastThumbPlaceholder} size={16} strokeWidth={1} />
          )}
        </div>
        <span className={styles.toastTitle}>{title}</span>
      </TransitionLink>
    </motion.div>
  );
}
