import React, { useRef } from "react";
import { EMOJI_MIN, EMOJI_MAX, EMOJI_RECOMMENDED } from "./resizeEmojiImage";

interface UploadTabProps {
  uploading: boolean;
  uploadError: string;
  currentValue?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onUpload: (file: File) => void;
  onClose: () => void;
  onSelect: (value: string) => void;
  t: (ko: string, en: string) => string;
}

export function UploadTab({
  uploading,
  uploadError,
  currentValue,
  onImageUpload,
  onUpload,
  onClose,
  onSelect,
  t,
}: UploadTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 12px", gap: 8 }}>
      <button
        type="button"
        disabled={uploading || !onImageUpload}
        style={{
          width: "100%", padding: "18px 16px",
          border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-md)",
          background: "var(--bg-tertiary)", cursor: uploading ? "wait" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
          opacity: uploading ? 0.5 : 1,
        }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
        {uploading ? t("업로드 중...", "Uploading...") : t("이미지 업로드", "Upload Image")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>
        {t(
          `권장 ${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px · 최소 ${EMOJI_MIN} · 최대 ${EMOJI_MAX}px`,
          `${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px recommended · ${EMOJI_MIN}–${EMOJI_MAX}px`
        )}
        <br />
        {t("또는 ⌘+V로 이미지나 링크를 붙여넣으세요.", "Or paste image/link with ⌘+V.")}
      </span>
      {uploadError && (
        <span style={{ fontSize: 11, color: "var(--color-error, #e05252)", textAlign: "center" }}>{uploadError}</span>
      )}
      {/* 취소 / 저장 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
        <button
          type="button"
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
        >
          {t("취소", "Cancel")}
        </button>
        {currentValue && (
          <button
            type="button"
            style={{
              border: "none", background: "transparent", cursor: "pointer",
              color: "var(--color-error, #e05252)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(""); onClose(); }}
          >
            {t("제거", "Remove")}
          </button>
        )}
      </div>
    </div>
  );
}
