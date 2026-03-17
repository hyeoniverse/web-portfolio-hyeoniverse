"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import styles from "./AdminEditorShell.module.css";

export { default as adminEditorStyles } from "./AdminEditorShell.module.css";

interface EditorLabels {
  delete: string;
  deleting: string;
  deleteConfirm?: string;
  deleteConfirmInput?: string;
  deleteCancel?: string;
  deleteRevisionConfirm?: string;
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
  retranslateDisabled?: string;
  regenerateSummary?: string;
  regenerateSummaryDisabled?: string;
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
  deleteTargetName?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview?: () => void;
  status?: string;
  statusType?: "info" | "success";
  statusTimestamp?: number;
  error?: string;
  labels: EditorLabels;
  revisions?: RevisionEntry[];
  onRestoreRevision?: (index: number) => void;
  onLoadRevisionDetail?: (index: number) => Promise<{ excerpt?: string; content?: string; meta?: Record<string, string> } | null>;
  onDeleteRevision?: (index: number) => Promise<boolean>;
  onRevert?: () => void;
  onRetranslate?: (fields?: string[]) => void;
  retranslateOptions?: RetranslateOption[];
  retranslateDisabled?: boolean;
  onRegenerateSummary?: () => void;
  regeneratingSummary?: boolean;
  aiSummaryDisabled?: boolean;
  currentSnapshot?: { title: string; excerpt?: string; content?: string; meta?: Record<string, string> };
  topBarSecondRowLeft?: ReactNode;
  children: ReactNode;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatStatusTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return time;
  }
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date} ${time}`;
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
  deleteTargetName,
  onSaveDraft,
  onPublish,
  onPreview,
  status,
  statusType = "info",
  statusTimestamp,
  error,
  labels,
  revisions,
  onRestoreRevision,
  onLoadRevisionDetail,
  onDeleteRevision,
  onRevert,
  onRetranslate,
  retranslateOptions,
  retranslateDisabled = false,
  onRegenerateSummary,
  regeneratingSummary = false,
  aiSummaryDisabled = false,
  currentSnapshot,
  topBarSecondRowLeft,
  children,
}: AdminEditorShellProps) {
  const { setInfinite, lenis } = useLenis();
  const { openModal } = useModalStore();
  const [showRevisions, setShowRevisions] = useState(false);
  const [viewingRevision, setViewingRevision] = useState<number | null>(null);
  const [revisionDetail, setRevisionDetail] = useState<{ excerpt?: string; content?: string; meta?: Record<string, string> } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusTime, setStatusTime] = useState("");
  const [showRetranslate, setShowRetranslate] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedRevisions, setSelectedRevisions] = useState<Set<number>>(new Set());
  const revisionRef = useRef<HTMLDivElement>(null);
  const retranslateRef = useRef<HTMLDivElement>(null);
  const revisionsRef = useRef(revisions);
  revisionsRef.current = revisions;
  const onLoadRevisionDetailRef = useRef(onLoadRevisionDetail);
  onLoadRevisionDetailRef.current = onLoadRevisionDetail;

  useEffect(() => {
    if (status || error) {
      setStatusTime(statusTimestamp ? formatStatusTime(statusTimestamp) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }
  }, [status, error, statusTimestamp]);

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
    const rev = revisionsRef.current?.[viewingRevision];
    if (!rev) return;

    // 이미 excerpt/content가 있으면 (sessionStorage 방식 호환) 그대로 사용
    if (rev.excerpt !== undefined || rev.content !== undefined) {
      setRevisionDetail({ excerpt: rev.excerpt, content: rev.content });
      return;
    }

    // DB 방식: onLoadRevisionDetail 콜백으로 비동기 로드
    if (onLoadRevisionDetailRef.current) {
      setDetailLoading(true);
      onLoadRevisionDetailRef.current(viewingRevision)
        .then((detail) => setRevisionDetail(detail))
        .finally(() => setDetailLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingRevision]);

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
        <div className={styles.topBarRow}>
        {/* ── 왼쪽: 네비게이션 + 언어 ── */}
        <div className={styles.topLeft}>
          <Link href={backHref} className={styles.backLink}>
            {backLabel}
          </Link>
          <div className={styles.actionsDivider} />
          <LanguageToggle lang={editorLang} onLangChange={onEditorLangChange} />
          {(onRetranslate || retranslateDisabled) && retranslateOptions && (
            <div className={styles.retranslateWrap} ref={retranslateRef}>
              <Tooltip content={retranslateDisabled ? (labels.retranslateDisabled ?? "API key not configured") : (labels.retranslate ?? "Retranslate")} placement="bottom">
                <Button
                  variant="outline"
                  shape="circle"
                  size="xs"
                  className={styles.retranslateBtn}
                  onClick={retranslateDisabled ? undefined : () => setShowRetranslate((v) => !v)}
                  disabled={saving || retranslateDisabled}
                  soundDisabled
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 8l6 6" />
                      <path d="M4 14l6-6 2-3" />
                      <path d="M2 5h12" />
                      <path d="M7 2h1" />
                      <path d="M22 22l-5-10-5 10" />
                      <path d="M14 18h6" />
                    </svg>
                  }
                />
              </Tooltip>
              {showRetranslate && (
                <div className={styles.retranslateDropdown}>
                  <button
                    type="button"
                    className={styles.retranslateItem}
                    onClick={() => {
                      onRetranslate?.();
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
                        onRetranslate?.([opt.key]);
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
          {(onRegenerateSummary || aiSummaryDisabled) && (
            <Tooltip content={aiSummaryDisabled ? (labels.regenerateSummaryDisabled ?? "API key not configured") : (labels.regenerateSummary ?? "Regenerate AI Summary")} placement="bottom">
              <Button
                variant="outline"
                shape="circle"
                size="xs"
                onClick={aiSummaryDisabled ? undefined : onRegenerateSummary}
                disabled={saving || regeneratingSummary || aiSummaryDisabled}
                soundDisabled
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                }
              />
            </Tooltip>
          )}
        </div>

        {/* ── 첫 줄 오른쪽: 상태 + 히스토리 ── */}
        <div className={styles.topBarActions}>
          {(status || error) && (
            <span className={error ? styles.errorBanner : statusType === "success" ? styles.successBanner : styles.statusBanner}>
              {error || status}{statusTime && <span className={styles.statusTime}> · {statusTime}</span>}
            </span>
          )}
          <div className={styles.actionGroup}>
            {onRevert && (
              <Tooltip content={labels.revert ?? "Revert"} placement="bottom">
                <Button
                  variant="outline"
                  shape="circle"
                  size="xs"
                  className={styles.revertBtn}
                  onClick={onRevert}
                  disabled={saving || !isDirty}
                  soundDisabled
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  }
                />
              </Tooltip>
            )}
            {revisions && revisions.length > 0 && (
              <div className={styles.revisionWrap} ref={revisionRef}>
                <Tooltip content={labels.revisionHistory ?? "History"} placement="bottom">
                  <button
                    type="button"
                    className={styles.revisionBtn}
                    onClick={() => {
                      setShowRevisions((v) => !v);
                      setViewingRevision(null);
                      setIsSelectMode(false);
                      setSelectedRevisions(new Set());
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className={styles.revisionBadge}>{revisions.length}</span>
                  </button>
                </Tooltip>
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
                          <div className={styles.revisionDetailActions}>
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
                            {onDeleteRevision && (
                              <Tooltip content={labels.delete} placement="bottom">
                                <button
                                  type="button"
                                  className={styles.revisionDeleteBtn}
                                  onClick={async () => {
                                    if (!confirm(labels.deleteRevisionConfirm ?? "이 로그를 삭제하시겠습니까?")) return;
                                    const ok = await onDeleteRevision(viewingRevision);
                                    if (ok) {
                                      setViewingRevision(null);
                                      if (revisions && revisions.length <= 1) setShowRevisions(false);
                                    }
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </button>
                              </Tooltip>
                            )}
                          </div>
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
                        {revisionDetail?.meta && Object.keys(revisionDetail.meta).length > 0 && (
                          <div className={styles.revisionMetaSection}>
                            {Object.entries(revisionDetail.meta).map(([key, val]) => {
                              const curVal = currentSnapshot?.meta?.[key] ?? "";
                              if (!val && !curVal) return null;
                              const changed = !!currentSnapshot && val !== curVal;
                              return (
                                <div key={key} className={styles.revisionMetaRow}>
                                  <span className={styles.revisionMetaKey}>{key}</span>
                                  <span className={`${styles.revisionMetaVal} ${changed ? styles.diffDel : ""}`}>
                                    {val || "—"}
                                  </span>
                                  {changed && (
                                    <span className={`${styles.revisionMetaVal} ${styles.diffAdd}`}>
                                      {curVal || "—"}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
                          {isSelectMode ? (
                            <>
                              <Checkbox
                                shape="square"
                                checked={selectedRevisions.size === revisions.length && revisions.length > 0}
                                indeterminate={selectedRevisions.size > 0 && selectedRevisions.size < revisions.length}
                                onChange={(checked) => {
                                  if (checked) {
                                    setSelectedRevisions(new Set(revisions.map((_, i) => i)));
                                  } else {
                                    setSelectedRevisions(new Set());
                                  }
                                }}
                                label={selectedRevisions.size > 0 ? `${selectedRevisions.size}개 선택됨` : "전체 선택"}
                                className={styles.revisionSelectAll}
                              />
                              <div className={styles.revisionSelectActions}>
                                {selectedRevisions.size > 0 && (
                                  <button
                                    type="button"
                                    className={styles.revisionDeleteSelectedBtn}
                                    onClick={async () => {
                                      if (!onDeleteRevision) return;
                                      if (!confirm(labels.deleteRevisionConfirm ?? `선택한 ${selectedRevisions.size}개 로그를 삭제하시겠습니까?`)) return;
                                      const indices = Array.from(selectedRevisions);
                                      await Promise.all(indices.map((idx) => onDeleteRevision(idx)));
                                      setSelectedRevisions(new Set());
                                      setIsSelectMode(false);
                                      if (revisions.length <= indices.length) setShowRevisions(false);
                                    }}
                                  >
                                    삭제
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={styles.revisionSelectCancel}
                                  onClick={() => {
                                    setIsSelectMode(false);
                                    setSelectedRevisions(new Set());
                                  }}
                                >
                                  취소
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span>{labels.revisionHistory ?? "History"}</span>
                              {onDeleteRevision && (
                                <button
                                  type="button"
                                  className={styles.revisionSelectToggle}
                                  onClick={() => setIsSelectMode(true)}
                                >
                                  선택
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {revisions.map((rev, i) => (
                          <div
                            key={`${rev.timestamp}-${i}`}
                            className={`${styles.revisionItem} ${isSelectMode && selectedRevisions.has(i) ? styles.revisionItemSelected : ""}`}
                            onClick={() => {
                              if (isSelectMode) {
                                setSelectedRevisions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(i)) next.delete(i);
                                  else next.add(i);
                                  return next;
                                });
                              } else {
                                setViewingRevision(i);
                              }
                            }}
                          >
                            {isSelectMode ? (
                              <span onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  shape="square"
                                  checked={selectedRevisions.has(i)}
                                  onChange={(checked) => {
                                    setSelectedRevisions((prev) => {
                                      const next = new Set(prev);
                                      if (checked) next.add(i);
                                      else next.delete(i);
                                      return next;
                                    });
                                  }}
                                />
                              </span>
                            ) : null}
                            <span className={styles.revisionTime}>{formatTime(rev.timestamp)}</span>
                            <span className={styles.revisionTitle}>
                              {rev.title || "(untitled)"}
                            </span>
                            {!isSelectMode && onDeleteRevision && (
                              <Tooltip content={labels.delete} placement="left">
                                <button
                                  type="button"
                                  className={styles.revisionItemDelete}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(labels.deleteRevisionConfirm ?? "이 로그를 삭제하시겠습니까?")) return;
                                    const ok = await onDeleteRevision(i);
                                    if (ok && revisions.length <= 1) setShowRevisions(false);
                                  }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </Tooltip>
                            )}
                            {!isSelectMode && (
                              <svg className={styles.revisionChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {isEdit && onDelete && (
            <>
              <div className={styles.actionsDivider} />
              <Tooltip content={labels.delete} placement="bottom">
                <Button
                  variant="outline"
                  shape="circle"
                  size="xs"
                  className={styles.deleteBtn}
                  onClick={() => {
                    if (!deleteTargetName) {
                      onDelete?.();
                      return;
                    }
                    openModal(
                      <ModalPrompt
                        hint={labels.deleteConfirmInput}
                        placeholder={deleteTargetName}
                        validate={(v) => v === deleteTargetName}
                        cancelText={labels.deleteCancel}
                        confirmText={labels.delete}
                        danger
                        onConfirm={() => onDelete?.()}
                      />,
                      {
                        id: "delete-confirm",
                        closeButton: false,
                        width: "400px",
                        header: { title: `\u201C${deleteTargetName}\u201D` },
                      },
                    );
                  }}
                  disabled={deleting}
                  aria-label={labels.delete}
                  soundDisabled
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  }
                />
              </Tooltip>
            </>
          )}
        </div>
        </div>

        {/* ── 둘째 줄: 저장 그룹 ── */}
        <div className={styles.topBarRow}>
          {topBarSecondRowLeft && <div style={{ marginRight: "auto", display: "flex", alignItems: "flex-end" }}>{topBarSecondRowLeft}</div>}
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              className={styles.saveBtn}
              onClick={onPreview}
              soundDisabled
            >
              {labels.preview ?? "Preview"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={styles.saveBtn}
            onClick={onSaveDraft}
            disabled={saving || !isDirty}
            soundDisabled
          >
            {saving ? labels.saving : labels.saveDraft}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className={styles.publishBtn}
            onClick={onPublish}
            disabled={saving || (isEdit && published && !isDirty)}
            soundDisabled
          >
            {published ? labels.update : labels.publish}
          </Button>
        </div>
      </div>

      {children}

      {/* ── Bottom Bar: 미리보기 / 임시저장 / 저장 ── */}
      <div className={styles.bottomBar}>
        {onPreview && (
          <Button
            variant="outline"
            size="sm"
            className={styles.saveBtn}
            onClick={onPreview}
            soundDisabled
          >
            {labels.preview ?? "Preview"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={styles.saveBtn}
          onClick={onSaveDraft}
          disabled={saving || !isDirty}
          soundDisabled
        >
          {saving ? labels.saving : labels.saveDraft}
        </Button>
        <Button
          variant="primary"
          size="sm"
          className={styles.publishBtn}
          onClick={onPublish}
          disabled={saving || (isEdit && published && !isDirty)}
          soundDisabled
        >
          {published ? labels.update : labels.publish}
        </Button>
      </div>
    </div>
  );
}
