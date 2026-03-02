"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
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
  revisionHistory?: string;
  restore?: string;
  retranslate?: string;
  retranslateAll?: string;
}

export interface RetranslateOption {
  key: string;
  label: string;
}

export interface RevisionEntry {
  timestamp: number;
  title: string;
  excerpt?: string;
  content?: string;
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
  statusType?: "info" | "success";
  error?: string;
  labels: EditorLabels;
  revisions?: RevisionEntry[];
  onRestoreRevision?: (index: number) => void;
  onRetranslate?: (fields?: string[]) => void;
  retranslateOptions?: RetranslateOption[];
  children: ReactNode;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  statusType = "info",
  error,
  labels,
  revisions,
  onRestoreRevision,
  onRetranslate,
  retranslateOptions,
  children,
}: AdminEditorShellProps) {
  const { setInfinite, lenis } = useLenis();
  const [showRevisions, setShowRevisions] = useState(false);
  const [viewingRevision, setViewingRevision] = useState<number | null>(null);
  const [showRetranslate, setShowRetranslate] = useState(false);
  const revisionRef = useRef<HTMLDivElement>(null);
  const retranslateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInfinite(false);
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    return () => {
      setInfinite(true);
    };
  }, [setInfinite, lenis]);

  useEffect(() => {
    if (!showRevisions && !showRetranslate) return;
    const handle = (e: MouseEvent) => {
      if (showRevisions && revisionRef.current && !revisionRef.current.contains(e.target as Node)) {
        setShowRevisions(false);
      }
      if (showRetranslate && retranslateRef.current && !retranslateRef.current.contains(e.target as Node)) {
        setShowRetranslate(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showRevisions, showRetranslate]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href={backHref} className={styles.backLink}>
            {backLabel}
          </Link>
          <LanguageToggle lang={editorLang} onLangChange={onEditorLangChange} />
          {onRetranslate && retranslateOptions && (
            <div className={styles.retranslateWrap} ref={retranslateRef}>
              <button
                type="button"
                className={styles.retranslateBtn}
                onClick={() => setShowRetranslate((v) => !v)}
                disabled={saving}
                title={labels.retranslate ?? "Retranslate"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 8l6 6" />
                  <path d="M4 14l6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="M22 22l-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              </button>
              {showRetranslate && (
                <div className={styles.retranslateDropdown}>
                  <button
                    type="button"
                    className={styles.retranslateItem}
                    onClick={() => {
                      onRetranslate();
                      setShowRetranslate(false);
                    }}
                  >
                    {labels.retranslateAll ?? "All"}
                  </button>
                  {retranslateOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={styles.retranslateItem}
                      onClick={() => {
                        onRetranslate([opt.key]);
                        setShowRetranslate(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {revisions && revisions.length > 0 && (
          <div className={styles.revisionWrap} ref={revisionRef}>
            <button
              type="button"
              className={styles.revisionBtn}
              onClick={() => {
                setShowRevisions((v) => !v);
                setViewingRevision(null);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={styles.revisionBadge}>{revisions.length}</span>
            </button>
            {showRevisions && (
              <div className={`${styles.revisionDropdown} ${viewingRevision !== null ? styles.revisionDropdownWide : ""}`} data-lenis-prevent>
                {viewingRevision !== null && revisions[viewingRevision] ? (
                  /* ── Detail view ── */
                  <div className={styles.revisionDetail}>
                    <div className={styles.revisionDetailHeader}>
                      <button
                        type="button"
                        className={styles.revisionBackBtn}
                        onClick={() => setViewingRevision(null)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        {labels.revisionHistory ?? "History"}
                      </button>
                      <button
                        type="button"
                        className={styles.revisionRestoreBtn}
                        onClick={() => {
                          onRestoreRevision?.(viewingRevision);
                          setShowRevisions(false);
                          setViewingRevision(null);
                        }}
                      >
                        {labels.restore ?? "Restore"}
                      </button>
                    </div>
                    <div className={styles.revisionDetailMeta}>
                      <span className={styles.revisionTime}>
                        {formatTime(revisions[viewingRevision].timestamp)}
                      </span>
                      <strong className={styles.revisionDetailTitle}>
                        {revisions[viewingRevision].title || "(untitled)"}
                      </strong>
                    </div>
                    {revisions[viewingRevision].excerpt && (
                      <p className={styles.revisionDetailExcerpt}>
                        {revisions[viewingRevision].excerpt}
                      </p>
                    )}
                    {revisions[viewingRevision].content && (
                      <div className={styles.revisionDetailContent}>
                        {revisions[viewingRevision].content}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── List view ── */
                  <>
                    <div className={styles.revisionHeader}>
                      {labels.revisionHistory ?? "History"}
                    </div>
                    {revisions.map((rev, i) => (
                      <div
                        key={rev.timestamp}
                        className={styles.revisionItem}
                        onClick={() => setViewingRevision(i)}
                      >
                        <span className={styles.revisionTime}>{formatTime(rev.timestamp)}</span>
                        <span className={styles.revisionTitle}>
                          {rev.title || "(untitled)"}
                        </span>
                        <svg className={styles.revisionChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <div className={styles.actions}>
          {(status || error) && (
            <span className={error ? styles.errorBanner : statusType === "success" ? styles.successBanner : styles.statusBanner}>
              {error || status}
            </span>
          )}
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

      {children}
    </div>
  );
}
