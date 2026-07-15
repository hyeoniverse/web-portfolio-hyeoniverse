"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import MediaThumb from "@/components/ui/MediaThumb";
import styles from "./RelatedChips.module.css";

export type PreviewItem = { title: string; image?: string; category?: string; desc?: string };

/**
 * 관련 칩/카드 hover 시 admin 리스트풍 미리보기 카드를 띄우는 훅.
 * show(item, el) / hide() 를 요소의 onMouseEnter/Leave 에 연결하고, 반환된 node 를 렌더한다.
 * 데스크톱(hover 가능)에서만 동작.
 */
export function useHoverPreview() {
  const [preview, setPreview] = useState<{ item: PreviewItem; top: number; left: number } | null>(null);

  const show = useCallback((item: PreviewItem, el: HTMLElement) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = el.getBoundingClientRect();
    const W = 256;
    const H = item.image ? 232 : 104;
    const gap = 8;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 8));
    let top = rect.top > H + gap ? rect.top - H - gap : rect.bottom + gap;
    top = Math.max(8, Math.min(top, window.innerHeight - H - 8)); // 상·하 뷰포트 안으로
    setPreview({ item, top, left });
  }, []);

  const hide = useCallback(() => setPreview(null), []);

  const node = preview && typeof document !== "undefined"
    ? createPortal(
        <div className={styles.preview} style={{ top: preview.top, left: preview.left }} aria-hidden>
          {preview.item.image && (
            <div className={styles.previewImg}>
              <MediaThumb src={preview.item.image} alt="" fill sizes="256px" className={styles.img} />
            </div>
          )}
          <div className={styles.previewBody}>
            <p className={styles.previewTitle}>{preview.item.title}</p>
            {preview.item.desc && <p className={styles.previewDesc}>{preview.item.desc}</p>}
            {preview.item.category && <span className={styles.previewCat}>{preview.item.category}</span>}
          </div>
        </div>,
        document.body,
      )
    : null;

  return { show, hide, node };
}
