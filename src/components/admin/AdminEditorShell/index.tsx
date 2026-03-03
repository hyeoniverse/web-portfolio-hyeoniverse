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
  revert?: string;
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
  isDirty?: boolean;
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
  onLoadRevisionDetail?: (index: number) => Promise<{ excerpt?: string; content?: string } | null>;
  onRevert?: () => void;
  onRetranslate?: (fields?: string[]) => void;
  retranslateOptions?: RetranslateOption[];
  currentSnapshot?: { title: string; excerpt?: string; content?: string };
  children: ReactNode;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type DiffLine = { type: "same" | "add" | "del"; text: string };

function lineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  if (oldLines.length + newLines.length > 2000) {
    return [
      ...oldLines.map((t) => ({ type: "del" as const, text: t })),
      ...newLines.map((t) => ({ type: "add" as const, text: t })),
    ];
  }
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: "same", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

export default function AdminEditorShell({
  backHref,
  backLabel,
  editorLang,
  onEditorLangChange,
  isEdit,
  isDirty = true,
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
  onLoadRevisionDetail,
  onRevert,
  onRetranslate,
  retranslateOptions,
  currentSnapshot,
  children,
}: AdminEditorShellProps) {
  const { setInfinite, lenis } = useLenis();
  const [showRevisions, setShowRevisions] = useState(false);
  const [viewingRevision, setViewingRevision] = useState<number | null>(null);
  const [revisionDetail, setRevisionDetail] = useState<{ excerpt?: string; content?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  // 리비전 상세 비동기 로딩
  useEffect(() => {
    if (viewingRevision === null) {
      setRevisionDetail(null);
      return;
    }
    const rev = revisions?.[viewingRevision];
    if (!rev) return;

    // 이미 excerpt/content가 있으면 (sessionStorage 방식 호환) 그대로 사용
    if (rev.excerpt !== undefined || rev.content !== undefined) {
      setRevisionDetail({ excerpt: rev.excerpt, content: rev.content });
      return;
    }

    // DB 방식: onLoadRevisionDetail 콜백으로 비동기 로드
    if (onLoadRevisionDetail) {
      setDetailLoading(true);
      onLoadRevisionDetail(viewingRevision)
        .then((detail) => setRevisionDetail(detail))
        .finally(() => setDetailLoading(false));
    }
  }, [viewingRevision, revisions, onLoadRevisionDetail]);

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
        <div className={styles.topBarNav}>
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
                    {detailLoading ? (
                      <div className={styles.revisionDetailMeta}>
                        <span className={styles.revisionTime}>Loading…</span>
                      </div>
                    ) : (
                    <>
                    <div className={styles.revisionDetailMeta}>
                      <span className={styles.revisionTime}>
                        {formatTime(revisions[viewingRevision].timestamp)}
                      </span>
                      <strong className={`${styles.revisionDetailTitle} ${
                        currentSnapshot && revisions[viewingRevision].title !== currentSnapshot.title ? styles.diffDel : ""
                      }`}>
                        {revisions[viewingRevision].title || "(untitled)"}
                      </strong>
                      {currentSnapshot && revisions[viewingRevision].title !== currentSnapshot.title && (
                        <strong className={`${styles.revisionDetailTitle} ${styles.diffAdd}`}>
                          {currentSnapshot.title || "(untitled)"}
                        </strong>
                      )}
                    </div>
                    {revisionDetail?.excerpt && (
                      <p className={`${styles.revisionDetailExcerpt} ${
                        currentSnapshot && revisionDetail.excerpt !== (currentSnapshot.excerpt ?? "") ? styles.diffDel : ""
                      }`}>
                        {revisionDetail.excerpt}
                      </p>
                    )}
                    {currentSnapshot && revisionDetail?.excerpt !== (currentSnapshot.excerpt ?? "") && currentSnapshot.excerpt && (
                      <p className={`${styles.revisionDetailExcerpt} ${styles.diffAdd}`}>
                        {currentSnapshot.excerpt}
                      </p>
                    )}
                    {(() => {
                      const revContent = revisionDetail?.content ?? "";
                      const curContent = currentSnapshot?.content ?? "";
                      if (!revContent && !curContent) return null;
                      if (!currentSnapshot || revContent === curContent) {
                        return revContent ? (
                          <div className={styles.revisionDetailContent}>{revContent}</div>
                        ) : null;
                      }
                      const diff = lineDiff(revContent, curContent);
                      return (
                        <div className={styles.revisionDetailContent}>
                          {diff.map((line, idx) => (
                            <div
                              key={idx}
                              className={
                                line.type === "add" ? styles.diffAdd :
                                line.type === "del" ? styles.diffDel : ""
                              }
                            >
                              <span className={styles.diffPrefix}>
                                {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
                              </span>
                              {line.text || "\u00A0"}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    </>
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
        </div>
        <div className={styles.actions}>
          {(status || error) && (
            <span className={error ? styles.errorBanner : statusType === "success" ? styles.successBanner : styles.statusBanner}>
              {error || status}
            </span>
          )}
          {onRevert && (
            <button
              type="button"
              className={styles.revertBtn}
              onClick={onRevert}
              disabled={saving || !isDirty}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              {labels.revert ?? "Revert"}
            </button>
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
            disabled={saving || !isDirty}
          >
            {saving ? labels.saving : labels.saveDraft}
          </button>
          <button
            type="button"
            className={styles.publishBtn}
            onClick={onPublish}
            disabled={saving || (isEdit && published && !isDirty)}
          >
            {published ? labels.update : labels.publish}
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
