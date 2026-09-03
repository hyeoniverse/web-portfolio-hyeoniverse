"use client";

import Image from "next/image";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { ImageIcon } from "@/components/icons";
import type { SeriesPreview } from "./useSeriesPanel";
import styles from "./SeriesPreviewTooltip.module.css";

/* 시리즈 목록 항목 hover 미리보기 — position: fixed 툴팁(좌표는 useSeriesPanel 이 계산).
   DetailLayout 안의 transform 컨테이너에 갇히지 않도록 PostDetailClient 가 레이아웃 밖에서 렌더한다. */
export default function SeriesPreviewTooltip({ preview, viewLang }: { preview: SeriesPreview | null; viewLang: "ko" | "en" }) {
  if (!preview) return null;
  return (
    <div
      className={styles.seriesPreview}
      style={{ top: preview.top, left: preview.left }}
    >
      <div className={styles.seriesPreviewImg}>
        {preview.post.cover_image ? (
          isVideoUrl(preview.post.cover_image) ? (
            <video
              src={preview.post.cover_image}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Image
              src={preview.post.cover_image}
              alt={preview.post.title}
              width={240}
              height={135}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          )
        ) : (
          <div className={styles.seriesPreviewPlaceholder}>
            <ImageIcon size={32} strokeWidth={1} />
          </div>
        )}
      </div>
      <div className={styles.seriesPreviewBody}>
        <span className={styles.seriesPreviewTitle}>
          {viewLang === "en" && preview.post.title_en ? preview.post.title_en : preview.post.title}
        </span>
        {(() => {
          const excerpt = viewLang === "en" && preview.post.excerpt_en ? preview.post.excerpt_en : preview.post.excerpt;
          return excerpt ? <p className={styles.seriesPreviewExcerpt}>{excerpt}</p> : null;
        })()}
        {preview.post.tags && preview.post.tags.length > 0 && (
          <div className={styles.seriesPreviewTags}>
            {preview.post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className={styles.seriesPreviewTag}>{tag}</span>
            ))}
          </div>
        )}
        <span className={styles.seriesPreviewDate}>
          {new Date(preview.post.created_at).toLocaleDateString(viewLang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
