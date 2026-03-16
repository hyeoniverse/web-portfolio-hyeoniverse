import React from "react";
import CloseIcon from "@/components/ui/CloseIcon";
import type { EditorImageInfo } from "./types";
import styles from "../RichTextEditor.module.css";

export function ImagePanel({
  images,
  onSelect,
  onReorder,
  onRemove,
}: {
  images: EditorImageInfo[];
  onSelect: (path: number[]) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRemove: (path: number[]) => void;
}) {
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

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

  return (
    <div className={styles.imagePanel}>
      <span className={styles.imagePanelLabel}>첨부된 이미지 ({images.length})</span>
      <div className={styles.imagePanelList}>
        {images.length === 0 && (
          <span className={styles.imagePanelEmpty}>첨부된 이미지가 없습니다</span>
        )}
        {images.map((img, i) => {
          const fileName = decodeURIComponent(img.url.split("/").pop()?.split("?")[0] || "");
          const isDragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx !== i;
          return (
            <div
              key={`${img.url}-${i}`}
              className={styles.imagePanelItem}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={onDragEnd}
              onClick={() => onSelect(img.path)}
              title={fileName}
              style={{
                opacity: isDragging ? 0.4 : 1,
                outline: isOver ? "2px solid var(--color-accent)" : undefined,
                outlineOffset: isOver ? -2 : undefined,
              }}
            >
              <img src={img.url} alt={fileName} draggable={false} />
              <span className={styles.imagePanelName}>{fileName}</span>
              <button
                type="button"
                className={styles.imagePanelRemove}
                onClick={(e) => { e.stopPropagation(); onRemove(img.path); }}
                title="이미지 제거"
                aria-label="이미지 제거"
                data-close-trigger
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
