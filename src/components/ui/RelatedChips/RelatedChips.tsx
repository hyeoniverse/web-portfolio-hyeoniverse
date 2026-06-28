"use client";

import { useState } from "react";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import MediaThumb from "@/components/ui/MediaThumb";
import { useHoverPreview } from "./useHoverPreview";
import styles from "./RelatedChips.module.css";

export type RelatedChipItem = {
  id: string;
  title: string;
  href: string;
  image?: string;
  category?: string;
  /** hover 미리보기에 표시할 설명(excerpt/subtitle) */
  desc?: string;
};

/**
 * 관련 글/프로젝트 칩 목록 — info grid 등에 표시.
 * · 썸네일 + 제목 + 카테고리 capsule 칩, wrap (많아도 OK)
 * · limit 초과 시 "+N 더보기 / 접기"
 * · hover 시 admin 리스트처럼 미리보기 카드(이미지+제목+설명) 표시 (데스크톱 only)
 */
export default function RelatedChips({
  items,
  limit = 8,
  moreLabel,
  lessLabel,
}: {
  items: RelatedChipItem[];
  limit?: number;
  moreLabel: string;
  lessLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const { show, hide, node } = useHoverPreview();

  if (!items.length) return null;
  const shown = showAll ? items : items.slice(0, limit);
  const remaining = items.length - shown.length;

  return (
    <>
      <div className={styles.chips}>
        {shown.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className={styles.chip}
            onMouseEnter={(e) => show({ title: it.title, image: it.image, category: it.category, desc: it.desc }, e.currentTarget)}
            onMouseLeave={hide}
          >
            <span className={styles.thumb}>
              {it.image ? (
                <MediaThumb src={it.image} alt="" fill sizes="32px" className={styles.img} />
              ) : (
                <ImageIcon size={12} strokeWidth={1.8} />
              )}
            </span>
            <span className={styles.title}>{it.title}</span>
            {it.category && <span className={styles.cat}>{it.category}</span>}
          </Link>
        ))}
        {remaining > 0 && (
          <button type="button" className={styles.more} onClick={() => setShowAll(true)}>
            +{remaining} {moreLabel}
          </button>
        )}
        {showAll && items.length > limit && (
          <button type="button" className={styles.more} onClick={() => setShowAll(false)}>
            {lessLabel}
          </button>
        )}
      </div>

      {node}
    </>
  );
}
