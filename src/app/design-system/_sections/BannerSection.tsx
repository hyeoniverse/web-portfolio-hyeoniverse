"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { staggerItem, viewportOpts } from "../_data/animations";
import { BANNER_LAYOUTS, BANNER_LAYOUT_LABELS, MOCK_POSTS } from "../_data/tokenData";
import styles from "../DesignSystem.module.css";

const PostsBanner = dynamic(
  () => import("@/app/posts/_components/PostsBanner/PostsBanner"),
  { ssr: false, loading: () => <div style={{ height: 300 }} /> }
);

interface BannerSectionProps {
  language: string;
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
}

function BannerSection({ language, setSectionRef }: BannerSectionProps) {
  return (
    <section id="banner" ref={setSectionRef("banner")} className={styles.section}>
      <h2 className={styles.sectionTitle} style={{ marginBottom: 8 }}>Banner Layouts</h2>
      <div>
        <motion.p className={styles.sectionSub} initial="hidden" whileInView="visible" viewport={viewportOpts} variants={staggerItem} style={{ marginTop: 0, marginBottom: 24, textTransform: "none" }}>{language === "ko" ? "Posts 배너 슬라이더의 4가지 레이아웃" : "4 layout variants for the Posts banner slider"}</motion.p>
        {BANNER_LAYOUTS.map((layout) => (
          <motion.div key={layout} className={styles.bannerLayoutItem} initial="hidden" whileInView="visible" viewport={viewportOpts} variants={staggerItem}>
            <span className={styles.bannerPreviewLabel}>{BANNER_LAYOUT_LABELS[layout][language as "ko" | "en"]}</span>
            <div className={styles.bannerPreviewBox} onClickCapture={(e) => {
              const t = e.target as HTMLElement;
              if (!t.closest("button") && !t.closest("[class*=Dot]") && !t.closest("[class*=Arrow]")) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}>
              <PostsBanner
                posts={MOCK_POSTS}
                imgErrors={new Set()}
                onImgError={() => {}}
                overrideLayout={layout}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default memo(BannerSection);
