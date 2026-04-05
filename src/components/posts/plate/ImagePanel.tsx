import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@/components/ui/CloseIcon";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import type { EditorImageInfo } from "./types";
import styles from "../RichTextEditor.module.css";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImagePanel({
  images,
  onSelect,
  onReorder,
  onRemove,
  onImageUpload,
  onVideoUpload,
  onBulkInsert,
  onReinsert,
  onRemoveDetached,
}: {
  images: EditorImageInfo[];
  onSelect: (path: number[]) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRemove: (path: number[]) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onVideoUpload?: (file: File) => Promise<string>;
  onBulkInsert?: (paths: number[][]) => void;
  /** detached 미디어를 본문에 재삽입 */
  onReinsert?: (url: string, mediaType?: string) => void;
  /** detached 미디어를 패널에서 완전 삭제 */
  onRemoveDetached?: (url: string) => void;
}) {
  const { t } = useLanguage();
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);
  const [fileDragOver, setFileDragOver] = React.useState(false);
  const [totalSize, setTotalSize] = React.useState<number | null>(null);
  const prevUrlsRef = React.useRef<string>("");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 이미지 변경 시 선택 상태 리셋
  React.useEffect(() => {
    setSelected(new Set());
  }, [images.length]);

  // 이미지 용량 합산 (HEAD 요청)
  React.useEffect(() => {
    const urls = images.map((img) => img.url).join(",");
    if (urls === prevUrlsRef.current) return;
    prevUrlsRef.current = urls;

    if (images.length === 0) {
      setTotalSize(0);
      return;
    }

    let cancelled = false;
    (async () => {
      let sum = 0;
      await Promise.all(
        images.map(async (img) => {
          try {
            const res = await fetch(img.url, { method: "HEAD" });
            const cl = res.headers.get("content-length");
            if (cl) sum += parseInt(cl, 10);
          } catch {
            /* ignore */
          }
        }),
      );
      if (!cancelled) setTotalSize(sum);
    })();
    return () => { cancelled = true; };
  }, [images]);

  // ── 썸네일 드래그 재정렬 ──
  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      onReorder(dragIdx, idx);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const onDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  // ── 외부 파일 드래그앤드롭 ──
  const fileDropCounter = React.useRef(0);

  const handleFileDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    fileDropCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setFileDragOver(true);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    fileDropCounter.current--;
    if (fileDropCounter.current <= 0) {
      fileDropCounter.current = 0;
      setFileDragOver(false);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const uploadFile = async (file: File) => {
    if (file.type.startsWith("video/")) {
      if (onVideoUpload) await onVideoUpload(file);
    } else {
      if (onImageUpload) await onImageUpload(file);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    fileDropCounter.current = 0;
    setFileDragOver(false);
    if (!onImageUpload && !onVideoUpload) return;

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    for (const file of files) {
      try {
        await uploadFile(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : t("editor.imageUploadFail"));
      }
    }
  };

  // ── 파일 첨부 버튼 ──
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if ((!onImageUpload && !onVideoUpload) || !e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    for (const file of files) {
      try {
        await uploadFile(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : t("editor.imageUploadFail"));
      }
    }
    e.target.value = "";
  };

  // ── 멀티 셀렉트 ──
  const toggleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(images.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleBulkInsert = () => {
    if (selected.size === 0) return;
    const paths = Array.from(selected)
      .sort((a, b) => a - b)
      .map((idx) => images[idx].path);
    onBulkInsert?.(paths);
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    const sorted = Array.from(selected).sort((a, b) => b - a);
    for (const idx of sorted) {
      const img = images[idx];
      if (!img) continue;
      if (img.detached) onRemoveDetached?.(img.url);
      else onRemove(img.path);
    }
    setSelected(new Set());
  };

  const handleBulkReinsert = () => {
    if (selected.size === 0) return;
    const sorted = Array.from(selected).sort((a, b) => a - b);
    for (const idx of sorted) {
      const img = images[idx];
      if (img.detached) onReinsert?.(img.url, img.mediaType);
    }
    setSelected(new Set());
  };

  // 선택된 항목 중 detached / content 구분
  const selectedDetachedCount = Array.from(selected).filter((i) => images[i]?.detached).length;
  const selectedContentCount = selected.size - selectedDetachedCount;

  const sizeLabel = totalSize !== null && totalSize > 0 ? ` (${formatBytes(totalSize)})` : "";
  const hasSelection = selected.size > 0;

  return (
    <div
      className={`${styles.imagePanel} ${fileDragOver ? styles.imagePanelDragOver : ""}`}
      onMouseDown={(e) => { if (!(e.target as HTMLElement).closest("input, button")) e.preventDefault(); }}
      onDragEnter={handleFileDragEnter}
      onDragLeave={handleFileDragLeave}
      onDragOver={handleFileDragOver}
      onDrop={handleFileDrop}
    >
      {/* ── 헤더: 라벨 + 멀티셀렉트 액션 ── */}
      <div className={styles.imagePanelHeader}>
        <span className={styles.imagePanelLabel}>
          {t("editor.imageCount").replace("{count}", String(images.length))}{sizeLabel}
        </span>
        {images.length > 0 && (
          <div className={styles.imagePanelActions}>
            {!hasSelection && (
              <button type="button" className={styles.imagePanelActionBtn} onClick={selectAll}>
                {t("editor.imageSelectAll")}
              </button>
            )}
            {hasSelection && (
              <>
                {selectedDetachedCount > 0 && (
                  <button type="button" className={styles.imagePanelActionBtn} onClick={handleBulkReinsert}>
                    {t("editor.mediaReinsert")} ({selectedDetachedCount})
                  </button>
                )}
                {selectedContentCount > 0 && onBulkInsert && (
                  <button type="button" className={styles.imagePanelActionBtn} onClick={handleBulkInsert}>
                    {t("editor.imageInsertSelected")} ({selectedContentCount})
                  </button>
                )}
                <button type="button" className={styles.imagePanelActionBtn} onClick={deselectAll}>
                  {t("editor.imageDeselectAll")}
                </button>
                <button type="button" className={`${styles.imagePanelActionBtn} ${styles.imagePanelActionDanger}`} onClick={handleBulkDelete}>
                  {t("editor.imageDeleteSelected")} ({selected.size})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 이미지 목록 ── */}
      {(() => {
        const contentImages = images.filter((img) => !img.detached);
        const detachedImages = images.filter((img) => img.detached);
        const renderItem = (img: typeof images[0], i: number) => {
          const fileName = decodeURIComponent(img.url.split("/").pop()?.split("?")[0] || "");
          const isDetached = !!img.detached;
          const globalIdx = images.indexOf(img);
          const isDragging = dragIdx === globalIdx;
          const isOver = overIdx === globalIdx && dragIdx !== globalIdx;
          const isSelected = selected.has(globalIdx);
          const isVideo = img.mediaType === "media_embed" || img.mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(img.url);
          return (
            <div
              key={`${img.url}-${i}`}
              className={`${styles.imagePanelItem} ${isSelected ? styles.imagePanelItemSelected : ""}`}
              draggable={!isDetached}
              onDragStart={isDetached ? undefined : (e) => onDragStart(e, globalIdx)}
              onDragOver={isDetached ? undefined : (e) => onDragOver(e, globalIdx)}
              onDrop={isDetached ? undefined : (e) => onDrop(e, globalIdx)}
              onDragEnd={isDetached ? undefined : onDragEnd}
              onClick={(e) => toggleSelect(globalIdx, e)}
              onDoubleClick={() => { if (!isDetached) onSelect(img.path); }}
              title={isDetached ? t("editor.mediaReinsertHint") : fileName}
              style={{
                opacity: isDragging ? 0.4 : 1,
                outline: isOver ? "2px solid var(--color-accent)" : undefined,
                outlineOffset: isOver ? -2 : undefined,
              }}
            >
              <span
                className={styles.imagePanelCheck}
                onClick={(e) => toggleSelect(globalIdx, e)}
              >
                <span className={`${styles.imagePanelCheckbox} ${isSelected ? styles.imagePanelCheckboxChecked : ""}`}>
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2.5 6.5 5 9 9.5 3.5" />
                    </svg>
                  )}
                </span>
              </span>
              {isVideo
                ? <video src={img.url} draggable={false} muted preload="metadata" style={isDetached ? { opacity: 0.7 } : undefined} />
                : <img src={img.url} alt={fileName} draggable={false} style={isDetached ? { opacity: 0.7 } : undefined} /> // eslint-disable-line @next/next/no-img-element
              }
              <span className={styles.imagePanelName}>{fileName}</span>
              <button
                type="button"
                className={styles.imagePanelRemove}
                onClick={(e) => { e.stopPropagation(); if (isDetached) onRemoveDetached?.(img.url); else onRemove(img.path); }}
                title={t("editor.imageRemove")}
                aria-label={t("editor.imageRemove")}
                data-close-trigger
              >
                <CloseIcon />
              </button>
            </div>
          );
        };
        return (
          <>
            <div className={styles.imagePanelList}>
              {contentImages.length === 0 && detachedImages.length === 0 && (
                <span className={styles.imagePanelEmpty}>
                  {fileDragOver ? t("editor.imageDragDrop") : t("editor.imageDragHint")}
                </span>
              )}
              {contentImages.map((img, i) => renderItem(img, i))}
            </div>
            <AnimatePresence>
              {detachedImages.length > 0 && (
                <motion.div
                  className={styles.imagePanelDetachedSection}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className={styles.imagePanelDivider}>
                    <span className={styles.imagePanelDividerLabel}>{t("editor.detachedMedia")}</span>
                  </div>
                  <div className={styles.imagePanelList}>
                    {detachedImages.map((img, i) => renderItem(img, i))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
      })()}

      {/* ── 하단: 파일 첨부 버튼 + 안내 텍스트 ── */}
      <div className={styles.imagePanelFooter}>
        <Tooltip
          content={t("editor.imageSizeLimit")}
          placement="top"
          delay={200}
        >
          <button type="button" className={styles.imagePanelAttachBtn} onClick={handleAttachClick}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8.5l-5.5 5.5a4 4 0 01-5.66-5.66l5.5-5.5a2.67 2.67 0 013.77 3.77l-5.5 5.5a1.33 1.33 0 01-1.88-1.88l5-5" />
            </svg>
            {t("editor.imageAttach")}
          </button>
        </Tooltip>
        <span className={styles.imagePanelInfoText}>
          {t("editor.imageAttachInfo")}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  );
}
