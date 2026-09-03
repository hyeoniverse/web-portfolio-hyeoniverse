"use client";

import Image from "next/image";
import { Monitor, Image as ImageIcon } from "@/components/icons";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useHoverPreview } from "@/components/ui/RelatedChips/useHoverPreview";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./RelatedWorksCarousel.module.css";

export type RelatedWork = {
  id: string;
  slug?: string;
  title: string;
  title_en: string;
  subtitle_ko: string;
  subtitle_en: string;
  image: string;
  year: string;
  categories_ko?: string[];
  categories_en?: string[];
};

/** 관련 프로젝트 — 가로 캐러셀(항목 적음). hover 시 미리보기 툴팁. 상세/프리뷰 공용. */
export default function RelatedWorksCarousel({
  works,
  viewLang,
  onNavigate,
}: {
  works: RelatedWork[];
  viewLang: "ko" | "en";
  onNavigate: (href: string, image: string, rect: DOMRect) => void;
}) {
  const { show, hide, node } = useHoverPreview();
  if (!works.length) return null;
  return (
    <section className={styles.relatedSection}>
      <div className={styles.relatedHeader}>
        <Monitor size={16} />
        <span className={styles.relatedLabel}>{viewLang === "en" ? "Related Works" : "관련 프로젝트"}</span>
      </div>
      <HorizontalCarousel className={styles.relatedGrid}>
        {works.map((w) => {
          const title = viewLang === "en" ? (w.title_en || w.title) : (w.title || w.title_en);
          const subtitle = viewLang === "en" ? (w.subtitle_en || w.subtitle_ko) : (w.subtitle_ko || w.subtitle_en);
          const cats = viewLang === "en"
            ? (w.categories_en?.length ? w.categories_en : w.categories_ko ?? [])
            : (w.categories_ko?.length ? w.categories_ko : w.categories_en ?? []);
          const category = cats[0] || "";
          return (
            <div
              key={w.id}
              onClick={(e) => onNavigate(`/works/${w.slug || w.id}`, w.image || "", e.currentTarget.getBoundingClientRect())}
              onMouseEnter={(e) => show({ title, image: w.image || undefined, category: category || undefined, desc: subtitle || undefined }, e.currentTarget)}
              onMouseLeave={hide}
              style={{ cursor: "pointer" }}
              className={styles.relatedCard}
            >
              <div className={styles.relatedCardImage}>
                {w.image ? (
                  isVideoUrl(w.image) ? (
                    <video
                      src={w.image}
                      className={styles.relatedCardImg}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <Image src={w.image} alt={title} fill sizes="(max-width: 768px) 50vw, 220px" className={styles.relatedCardImg} />
                  )
                ) : (
                  <ImageIcon className={styles.relatedCardPlaceholder} size={32} strokeWidth={1.5} />
                )}
              </div>
              <div className={styles.relatedCardBody}>
                <div className={styles.relatedCardMeta}>
                  {w.year && <span className={styles.relatedCardOrder}>{w.year}</span>}
                  {category && <span className={styles.relatedCardCategory}>{category}</span>}
                </div>
                <span className={styles.relatedCardTitle}>{title}</span>
                {subtitle && <span className={styles.relatedCardExcerpt}>{subtitle}</span>}
              </div>
            </div>
          );
        })}
      </HorizontalCarousel>
      {node}
    </section>
  );
}
