"use client";

import { useCallback, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./MarkdownEditor.module.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  compact?: boolean;
  editLabel?: string;
  previewLabel?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  compact,
  editLabel,
  previewLabel,
}: MarkdownEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const handleEditorScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const preview = previewRef.current;
      if (!preview) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const ratio = el.scrollTop / maxScroll;
      preview.scrollTop =
        ratio * (preview.scrollHeight - preview.clientHeight);
    },
    []
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;

      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const url = await onImageUpload(file);
          const textarea = e.currentTarget;
          const pos = textarea.selectionStart;
          const before = value.slice(0, pos);
          const after = value.slice(pos);
          onChange(`${before}![image](${url})${after}`);
          break;
        }
      }
    },
    [value, onChange, onImageUpload]
  );

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compact : ""}`}>
      <div className={styles.editorPane}>
        <span className={styles.label}>{editLabel ?? "Editor"}</span>
        <textarea
          className={styles.textarea}
          data-lenis-prevent
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleEditorScroll}
          onPaste={handlePaste}
          placeholder="Write your content in Markdown..."
          spellCheck={false}
        />
      </div>
      <div className={styles.previewPane}>
        <span className={styles.label}>{previewLabel ?? "Preview"}</span>
        <div ref={previewRef} className={styles.preview} data-lenis-prevent>
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <span className={styles.emptyPreview}>Preview will appear here</span>
          )}
        </div>
      </div>
    </div>
  );
}
