"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import LanguageToggle from "@/components/ui/LanguageToggle";
import styles from "./AdminEditorShell.module.css";

export { default as adminEditorStyles } from "./AdminEditorShell.module.css";

interface EditorLabels {
  delete: string;
  deleting: string;
  preview?: string;
  saving: string;
  saveDraft: string;
  update: string;
  publish: string;
}

interface AdminEditorShellProps {
  backHref: string;
  backLabel: string;
  editorLang: "ko" | "en";
  onEditorLangChange: (lang: "ko" | "en") => void;
  isEdit: boolean;
  saving: boolean;
  deleting: boolean;
  published: boolean;
  onDelete?: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview?: () => void;
  status?: string;
  error?: string;
  labels: EditorLabels;
  children: ReactNode;
}

export default function AdminEditorShell({
  backHref,
  backLabel,
  editorLang,
  onEditorLangChange,
  isEdit,
  saving,
  deleting,
  published,
  onDelete,
  onSaveDraft,
  onPublish,
  onPreview,
  status,
  error,
  labels,
  children,
}: AdminEditorShellProps) {
  const { setInfinite, lenis } = useLenis();

  useEffect(() => {
    setInfinite(false);
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    return () => {
      setInfinite(true);
    };
  }, [setInfinite, lenis]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href={backHref} className={styles.backLink}>
            {backLabel}
          </Link>
          <LanguageToggle lang={editorLang} onLangChange={onEditorLangChange} />
        </div>
        <div className={styles.actions}>
          {isEdit && onDelete && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? labels.deleting : labels.delete}
            </button>
          )}
          <div className={styles.actionsDivider} />
          {onPreview && (
            <button
              type="button"
              className={styles.saveBtn}
              onClick={onPreview}
            >
              {labels.preview ?? "Preview"}
            </button>
          )}
          <button
            type="button"
            className={styles.saveBtn}
            onClick={onSaveDraft}
            disabled={saving}
          >
            {saving ? labels.saving : labels.saveDraft}
          </button>
          <button
            type="button"
            className={styles.publishBtn}
            onClick={onPublish}
            disabled={saving}
          >
            {published ? labels.update : labels.publish}
          </button>
        </div>
      </div>

      {(status || error) && (
        <div className={styles.statusBar}>
          {status && <span className={styles.status}>{status}</span>}
          {error && <span className={styles.error}>{error}</span>}
        </div>
      )}

      {children}
    </div>
  );
}
