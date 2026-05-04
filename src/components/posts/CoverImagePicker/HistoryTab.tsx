"use client";

import { useCallback } from "react";
import { Check, Copy, Download, Palette, Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { extractPalette } from "@/components/admin/CoverImageField/extractPalette";
import type { HistoryItem } from "./useHistory";
import styles from "./CoverImagePicker.module.css";

interface HistoryTabProps {
  items: HistoryItem[];
  /** 항목 클릭 — 해당 url 로 cover 설정 (picker 안 닫음) */
  onPick: (url: string) => void;
  onRemove: (url: string) => void;
  /** 현재 cover 로 사용 중인 url — active 표시용 */
  currentUrl?: string;
}

const SOURCE_KEY: Record<HistoryItem["source"], string> = {
  ai: "sourceAi",
  unsplash: "sourceUnsplash",
  preset: "sourcePreset",
};

export default function HistoryTab({ items, onPick, onRemove, currentUrl }: HistoryTabProps) {
  const { t } = useLanguage();

  const downloadUrl = useCallback(async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = (blob.type.split("/")[1] || "png").replace(/[^a-z0-9]/g, "");
      const safe = name.trim().slice(0, 30).replace(/[^a-z0-9가-힣]+/gi, "_") || "cover";
      a.download = `${safe}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* swallow */ }
  }, []);

  const copy = useCallback((text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, []);

  /** 이미지에서 palette 추출 후 hex 들을 콤마로 join 해 클립보드 복사 */
  const copyPalette = useCallback(async (url: string) => {
    try {
      const colors = await extractPalette(url, 5);
      copy(colors.join(", "));
    } catch { /* swallow */ }
  }, [copy]);

  if (items.length === 0) {
    return (
      <div className={styles.tabSection}>
        <p className={styles.emptyMsg}>{t("admin.posts.coverPicker.historyEmpty")}</p>
      </div>
    );
  }

  // preset/unsplash 와 동일한 grid (4-col, 1200/630 aspect, gap 0, edge-to-edge)
  return (
    <div className={styles.presetGrid}>
      {items.map((item) => {
        const isActive = currentUrl === item.url;
        return (
          <div
            key={item.url}
            className={`${styles.presetItem} ${styles.historyGridItem} ${isActive ? styles.historyGridItemActive : ""}`}
          >
            <button
              type="button"
              className={styles.historyThumbBtn}
              onClick={() => onPick(item.url)}
              title={item.meta}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.meta} className={styles.historyThumbImg} />
            </button>
            {/* 우상단 — active 체크 (항상 visible 일 때만) */}
            {isActive && (
              <span className={styles.historyActiveBadge} aria-hidden>
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            {/* 좌하단 — source 라벨 + meta */}
            <span className={styles.historySourceTag}>
              <span className={styles.historySourceLabel}>
                {t(`admin.posts.coverPicker.${SOURCE_KEY[item.source]}`)}
              </span>
              {item.meta && (
                <>
                  <span className={styles.historySourceSep}>·</span>
                  <span className={styles.historySourceMeta}>{item.meta}</span>
                </>
              )}
            </span>
            {/* 좌상단 — tool button cluster (hover): 제거 / 키워드 복사 / 색상표 복사 / 다운로드 */}
            <div className={styles.historyActions}>
              <button
                type="button"
                className={styles.historyOverlayBtn}
                onClick={(e) => { e.stopPropagation(); onRemove(item.url); }}
                aria-label="Remove"
                title="Remove"
              >
                <Trash2 size={11} strokeWidth={2} />
              </button>
              {item.meta && (
                <button
                  type="button"
                  className={styles.historyOverlayBtn}
                  onClick={(e) => { e.stopPropagation(); copy(item.meta); }}
                  aria-label="Copy keyword"
                  title="키워드 복사"
                >
                  <Copy size={11} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                className={styles.historyOverlayBtn}
                onClick={(e) => { e.stopPropagation(); copyPalette(item.url); }}
                aria-label="Copy palette"
                title="색상표 복사"
              >
                <Palette size={11} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={styles.historyOverlayBtn}
                onClick={(e) => { e.stopPropagation(); downloadUrl(item.url, item.meta); }}
                aria-label={t("admin.posts.coverPicker.download")}
                title={t("admin.posts.coverPicker.download")}
              >
                <Download size={11} strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
