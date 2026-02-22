"use client";

import { useCallback } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./MarkdownEditor.module.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
}: MarkdownEditorProps) {
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
    <div className={styles.wrapper}>
      <div className={styles.editorPane}>
        <span className={styles.label}>Editor</span>
        <textarea
          className={styles.textarea}
          data-lenis-prevent
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder="Write your content in Markdown..."
          spellCheck={false}
        />
      </div>
      <div className={styles.previewPane}>
        <span className={styles.label}>Preview</span>
        <div className={styles.preview} data-lenis-prevent>
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
