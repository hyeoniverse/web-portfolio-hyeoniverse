"use client";

import { useCallback } from "react";
import { Check, Copy, Download, Palette, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { extractPalette } from "@/components/admin/CoverImageField/extractPalette";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { downloadFile } from "./downloadFile";
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
              {isVideoUrl(item.url) ? (
                <video
                  src={item.url}
                  className={styles.historyThumbImg}
                  muted
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt={item.meta} className={styles.historyThumbImg} />
              )}
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
              <Tooltip content={t("admin.posts.coverPicker.remove")} placement="top">
                <Button
                  variant="ghost"
                  shape="circle"
                  size="xs"
                  className={styles.historyOverlayBtn}
                  icon={<Trash2 size={11} strokeWidth={2} />}
                  onClick={(e) => { e.stopPropagation(); onRemove(item.url); }}
                  aria-label={t("admin.posts.coverPicker.remove")}
                />
              </Tooltip>
              {item.meta && (
                <Tooltip content={t("admin.posts.coverPicker.copyKeyword")} placement="top">
                  <Button
                    variant="ghost"
                    shape="circle"
                    size="xs"
                    className={styles.historyOverlayBtn}
                    icon={<Copy size={11} strokeWidth={2} />}
                    onClick={(e) => { e.stopPropagation(); copy(item.meta); }}
                    aria-label={t("admin.posts.coverPicker.copyKeyword")}
                  />
                </Tooltip>
              )}
              <Tooltip content={t("admin.posts.coverPicker.copyPalette")} placement="top">
                <Button
                  variant="ghost"
                  shape="circle"
                  size="xs"
                  className={styles.historyOverlayBtn}
                  icon={<Palette size={11} strokeWidth={2} />}
                  onClick={(e) => { e.stopPropagation(); copyPalette(item.url); }}
                  aria-label={t("admin.posts.coverPicker.copyPalette")}
                />
              </Tooltip>
              <Tooltip content={t("admin.posts.coverPicker.download")} placement="top">
                <Button
                  variant="ghost"
                  shape="circle"
                  size="xs"
                  className={styles.historyOverlayBtn}
                  icon={<Download size={11} strokeWidth={2} />}
                  onClick={(e) => { e.stopPropagation(); downloadFile(item.url, item.meta); }}
                  aria-label={t("admin.posts.coverPicker.download")}
                />
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
}
