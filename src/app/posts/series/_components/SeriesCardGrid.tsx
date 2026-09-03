"use client";

import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import HighlightedText from "@/components/ui/HighlightedText";
import { Flame } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SeriesEntry } from "../types";
import card from "../../_components/IndexCard.module.css";
import styles from "./SeriesCardGrid.module.css";

/* 시리즈 카드 그리드 — 공용 IndexCard 골격 위에 HOT 배지 · 카테고리 · 설명. 터치에선 링크 대신 시트(onTap). */
export default function SeriesCardGrid({
  items,
  featuredSet,
  isTouch,
  onTap,
}: {
  items: SeriesEntry[];
  featuredSet: Set<string>;
  isTouch: boolean;
  onTap: (s: SeriesEntry) => void;
}) {
  const { language } = useLanguage();
  return (
    <ul className={card.grid}>
      {items.map((s) => {
        const title = language === "en" ? (s.title_en || s.title) : s.title;
        const description = language === "en" ? (s.description_en || s.description) : s.description;
        const cover = s.cover_image || s.first_cover || s.auto_cover_url;
        const isFeatured = featuredSet.has(s.id);
        return (
          <li key={s.id}>
            <Link
              href={`/posts?series=${s.id}`}
              className={`${card.card} ${isFeatured ? card.cardFeatured : ""}`}
              onClick={isTouch ? (e) => {
                e.preventDefault();
                onTap(s);
              } : undefined}
            >
              {isFeatured && (
                <span className={styles.cardHotBadge}>
                  <Flame size={11} fill="currentColor" stroke="none" aria-hidden />
                  HOT
                </span>
              )}
              <div className={card.cover}>
                {cover ? (
                  <MediaThumb
                    src={cover}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    className={card.coverImg}
                    unoptimized
                  />
                ) : (
                  <span className={card.coverPlaceholder}>{(title || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={card.body}>
                <span className={card.meta2}>
                  {s.category && <span className={styles.category}>{s.category}</span>}
                  <span>{s.post_count}개의 글</span>
                </span>
                <span className={card.cardTitle}><HighlightedText text={title} /></span>
                {description && <span className={styles.cardDesc}><HighlightedText text={description} /></span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
