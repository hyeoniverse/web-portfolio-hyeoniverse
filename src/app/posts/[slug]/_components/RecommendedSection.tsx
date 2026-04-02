"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import T from "@/components/ui/T";
import CategoryLabel from "@/components/ui/CategoryLabel";
import type { RecommendedPost } from "./types";
import styles from "../PostDetail.module.css";

interface RecommendedSectionProps {
  posts: RecommendedPost[];
  viewLang: string;
}

export default function RecommendedSection({ posts, viewLang }: RecommendedSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const first = posts[0];
  const rest = posts.slice(1);

  const itemVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
  };

  const renderItem = (rp: RecommendedPost) => (
    <Link key={rp.id} href={`/posts/${rp.slug}`} className={styles.recommendedItem}>
      <div className={styles.recommendedItemThumb}>
        {rp.cover_image ? (
          <Image src={rp.cover_image} alt="" fill sizes="64px" className={styles.recommendedItemImg} />
        ) : (
          <svg className={styles.recommendedItemPlaceholder} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <div className={styles.recommendedItemBody}>
        <span className={styles.recommendedItemTitle}>
          {viewLang === "en" && rp.title_en ? rp.title_en : rp.title}
        </span>
        {rp.category && <span className={styles.recommendedItemCategory}><CategoryLabel category={rp.category} /></span>}
      </div>
    </Link>
  );

  return (
    <section className={styles.recommendedSection}>
      <div className={styles.recommendedHeader}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span className={styles.recommendedLabel}><T k="postDetail.recommended" /></span>
        {rest.length > 0 && (
          <button
            className={styles.recommendedMoreBtn}
            onClick={() => setExpanded(!expanded)}
            data-clickable="true"
          >
            {expanded ? <T k="common.close" /> : <>+{rest.length} <T k="postDetail.more" /></>}
            <svg
              className={`${styles.recommendedMoreChevron} ${expanded ? styles.recommendedMoreChevronOpen : ""}`}
              width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.recommendedList}>
        {renderItem(first)}
        <AnimatePresence initial={false}>
          {expanded && rest.map((rp, i) => (
            <motion.div
              key={rp.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ overflow: "hidden" }}
            >
              {renderItem(rp)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
