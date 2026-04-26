"use client";

import { useState } from "react";
import Image from "next/image";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion, AnimatePresence } from "framer-motion";
import T from "@/components/ui/T";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { BookOpen, ImageIcon, ChevronDown } from "lucide-react";
import type { RecommendedPost } from "./types";
import styles from "../PostDetail.module.css";

interface RecommendedSectionProps {
  posts: RecommendedPost[];
  viewLang: string;
}

export default function RecommendedSection({ posts, viewLang }: RecommendedSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { navigateWithTransition } = usePageTransition();
  const first = posts[0];
  const rest = posts.slice(1);

  const itemVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
  };

  const renderItem = (rp: RecommendedPost) => (
    <div key={rp.id} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${rp.slug}`, rp.cover_image || "", rect); }} style={{ cursor: "pointer" }} className={styles.recommendedItem}>
      <div className={styles.recommendedItemThumb}>
        {rp.cover_image ? (
          <Image src={rp.cover_image} alt="" fill sizes="64px" className={styles.recommendedItemImg} />
        ) : (
          <ImageIcon className={styles.recommendedItemPlaceholder} size={20} strokeWidth={1} />
        )}
      </div>
      <div className={styles.recommendedItemBody}>
        <span className={styles.recommendedItemTitle}>
          {viewLang === "en" && rp.title_en ? rp.title_en : rp.title}
        </span>
        {rp.category && <span className={styles.recommendedItemCategory}><CategoryLabel category={rp.category} /></span>}
      </div>
    </div>
  );

  return (
    <section className={styles.recommendedSection}>
      <div className={styles.recommendedHeader}>
        <BookOpen size={16} />
        <span className={styles.recommendedLabel}><T k="postDetail.recommended" /></span>
        {rest.length > 0 && (
          <button
            className={styles.recommendedMoreBtn}
            onClick={() => setExpanded(!expanded)}
            data-clickable="true"
          >
            {expanded ? <T k="common.close" /> : <>+{rest.length} <T k="postDetail.more" /></>}
            <ChevronDown
              className={`${styles.recommendedMoreChevron} ${expanded ? styles.recommendedMoreChevronOpen : ""}`}
              size={12}
              strokeWidth={1.5}
              aria-hidden="true"
            />
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
