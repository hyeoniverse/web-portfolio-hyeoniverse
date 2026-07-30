import React, { useRef, useState } from "react";
import { ImageIcon, Upload } from "@/components/icons";
import { EMOJI_MIN, EMOJI_MAX, EMOJI_RECOMMENDED } from "./resizeEmojiImage";
import styles from "./EmojiPicker.module.css";

interface UploadTabProps {
  uploading: boolean;
  uploadError: string;
  onImageUpload?: (file: File) => Promise<string>;
  onUpload: (file: File) => void;
  t: (ko: string, en: string) => string;
}

export function UploadTab({
  uploading,
  uploadError,
  onImageUpload,
  onUpload,
  t,
}: UploadTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const disabled = uploading || !onImageUpload;

  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onUpload(file);
  };

  return (
    <div className={styles.uploadTab}>
      {/* 드롭존 겸 클릭 업로드 — drag indicator 는 이 버튼에만 표시 */}
      <button
        type="button"
        disabled={disabled}
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={(e) => {
          e.preventDefault();
          // 버튼 내부 자식으로 이동할 땐 유지, 버튼 밖으로 나갈 때만 해제 (깜빡임 방지)
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
      >
        {dragOver ? <Upload size={22} /> : <ImageIcon size={22} />}
        {uploading
          ? t("업로드 중...", "Uploading...")
          : dragOver
            ? t("여기에 놓기", "Drop here")
            : t("이미지를 끌어다 놓거나 클릭", "Drag & drop or click")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className={styles.uploadHint}>
        {t(
          `권장 ${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px · 최소 ${EMOJI_MIN} · 최대 ${EMOJI_MAX}px`,
          `${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px recommended · ${EMOJI_MIN}–${EMOJI_MAX}px`
        )}
        <br />
        {t("또는 ⌘+V로 이미지나 링크를 붙여넣으세요.", "Or paste image/link with ⌘+V.")}
      </span>
      {uploadError && (
        <span className={styles.uploadError}>{uploadError}</span>
      )}
    </div>
  );
}
