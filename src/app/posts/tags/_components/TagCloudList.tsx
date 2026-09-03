"use client";

import Chip from "@/components/ui/Chip";
import Tooltip from "@/components/ui/Tooltip";
import type { TagEntry } from "../types";
import styles from "./TagCloudList.module.css";

/* 태그 클라우드 — pill 나열. count 기반 글자 크기(fontFor), 인기 top N 강조, hover 한 태그의 연관 태그 glow.
   터치에선 설명/연관이 있는 태그를 탭하면 링크 대신 시트(onTap). */
export default function TagCloudList({
  items,
  popularSet,
  relatedToHovered,
  fontFor,
  isTouch,
  onHover,
  onTap,
}: {
  items: TagEntry[];
  popularSet: Set<string>;
  relatedToHovered: Set<string>;
  fontFor: (count: number) => number;
  isTouch: boolean;
  onHover: (tag: string | null) => void;
  onTap: (t: TagEntry) => void;
}) {
  return (
    <ul className={styles.list}>
      {items.map((t) => {
        const isRelated = relatedToHovered.has(t.tag);
        const hasExtras = !!t.description || t.related.length > 0;
        return (
          <li
            key={t.tag}
            className={styles.tagItem}
            onMouseEnter={() => onHover(t.tag)}
            onMouseLeave={() => onHover(null)}
          >
            <Tooltip
              content={t.description}
              placement="top"
              delay={200}
              disabled={isTouch || !t.description}
            >
              <Chip
                variant="capsule"
                href={`/posts/tags/${encodeURIComponent(t.tag)}`}
                count={t.count}
                className={`${styles.tagItemPill} ${popularSet.has(t.tag) ? styles.tagItemPopular : ""} ${isRelated ? styles.tagItemRelated : ""}`}
                onClick={isTouch && hasExtras ? (e) => {
                  e.preventDefault();
                  onTap(t);
                } : undefined}
              >
                <span style={{ fontSize: `${fontFor(t.count)}px` }}>#{t.tag}</span>
              </Chip>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
