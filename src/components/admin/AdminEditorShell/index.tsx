"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, MessageSquareMore, RotateCcw, Clock, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useLenis } from "@/providers/LenisProvider";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./AdminEditorShell.module.css";
import type { AdminEditorShellProps } from "./types";
import { formatTime, formatStatusTime, lineDiff } from "./utils";

export type { RetranslateOption, RevisionEntry } from "./types";
export { default as adminEditorStyles } from "./AdminEditorShell.module.css";

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
  onGenerateSummary,
  generatingSummary = false,
  aiSummaryDisabled = false,
  currentSnapshot,
  topBarSecondRowLeft,
  topBarFirstRowExtra,
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
  const revDragStart = useRef<number | null>(null);
  const revDragAdding = useRef(true);
  useEffect(() => {
    const onUp = () => { revDragStart.current = null; };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);
  const revisionRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);

  useEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;
    // 로딩 중: 이전 높이를 그대로 유지 (skeleton 으로의 중간 전환 없이 시각적 정지)
    if (detailLoading) {
      const prev = prevHeightRef.current;
      if (prev) {
        el.style.height = `${prev}px`;
        el.style.overflow = "hidden";
        el.style.transition = "none";
      }
      return;
    }
    // 로딩 종료 (또는 viewingRevision 변경 후 즉시 데이터가 있는 경우):
    // 자연 높이로 한 번만 애니메이션
    el.style.height = "auto";
    el.style.overflow = "";
    const newHeight = el.scrollHeight;
    const oldHeight = prevHeightRef.current;
    if (oldHeight && Math.abs(oldHeight - newHeight) > 2) {
      el.style.height = `${oldHeight}px`;
      el.style.overflow = "hidden";
      el.style.transition = "none";
      // 강제 reflow
      void el.offsetHeight;
      el.style.transition = "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.height = `${newHeight}px`;
      const onEnd = () => {
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    }
    prevHeightRef.current = newHeight;
  }, [viewingRevision, detailLoading]);
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
  // useLayoutEffect 로 detailLoading=true 를 paint 전에 set 해서
  // 빈 detail panel 이 잠깐 렌더되어 height effect 가 잘못된 높이로 애니메이션 트리거하는 flash 방지
  useLayoutEffect(() => {
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
          {topBarFirstRowExtra && (
            <>
              <div className={styles.actionsDivider} />
              {topBarFirstRowExtra}
            </>
          )}
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
                  icon={<Languages size={14} />}
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
          {(onGenerateSummary || aiSummaryDisabled) && (
            <Tooltip content={aiSummaryDisabled ? (labels.generateSummaryDisabled ?? "API key not configured") : (labels.generateSummary ?? "Generate AI Summary")} placement="bottom">
              <Button
                variant="outline"
                shape="circle"
                size="xs"
                onClick={aiSummaryDisabled ? undefined : onGenerateSummary}
                disabled={saving || generatingSummary || aiSummaryDisabled}
                soundDisabled
                icon={<MessageSquareMore size={14} />}
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
                  icon={<RotateCcw size={14} />}
                />
              </Tooltip>
            )}
            {revisions && (
              <div className={styles.revisionWrap} ref={revisionRef}>
                <Tooltip content={labels.revisionHistory ?? "History"} placement="bottom">
                  <Button
                    variant="outline"
                    size="xs"
                    className={styles.revisionBtn}
                    onClick={() => {
                      setShowRevisions((v) => !v);
                      setViewingRevision(null);
                      setIsSelectMode(false);
                      setSelectedRevisions(new Set());
                    }}
                    soundDisabled
                  >
                    <Clock size={14} />
                    <span className={styles.revisionBadge}>{revisions.length}</span>
                  </Button>
                </Tooltip>
                <AnimatePresence>
                {showRevisions && (
                  <motion.div
                    ref={dropdownRef}
                    className={`${styles.revisionDropdown} ${viewingRevision !== null ? styles.revisionDropdownWide : ""}`}
                    data-lenis-prevent
                    initial={{ opacity: 0, scale: 0.7, y: -8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        scale: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                        y: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                        opacity: { duration: 0.14, ease: "easeOut" },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.7,
                      y: -8,
                      // 종료 시 scale 축소가 충분히 보이도록 opacity 는 마지막에 페이드아웃
                      transition: {
                        scale: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                        y: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                        opacity: { duration: 0.14, delay: 0.18, ease: "easeIn" },
                      },
                    }}
                    style={{ transformOrigin: "top right" }}
                  >
                    {revisions.length === 0 ? (
                      <div className={styles.revisionEmpty}>저장된 기록이 없습니다.</div>
                    ) : viewingRevision !== null && revisions[viewingRevision] ? (
                      /* ── Detail view (clip-path reveal) ── */
                      <div className={styles.revisionDetail}>
                        <div className={styles.revisionDetailHeader}>
                          <button
                            type="button"
                            className={styles.revisionBackBtn}
                            onClick={() => setViewingRevision(null)}
                          >
                            <ChevronLeft size={14} />
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
                                    openModal(
                                      <ModalPrompt
                                        hint="이 로그를 삭제하려면 &quot;삭제&quot;를 입력하세요."
                                        placeholder="삭제"
                                        validate={(v) => v === "삭제"}
                                        cancelText="취소"
                                        confirmText="삭제"
                                        danger
                                        onConfirm={async () => {
                                          const ok = await onDeleteRevision(viewingRevision);
                                          if (ok) {
                                            setViewingRevision(null);
                                            if (revisions && revisions.length <= 1) setShowRevisions(false);
                                          }
                                        }}
                                      />,
                                      { id: "rev-delete", header: { title: "로그 삭제" }, closeButton: true, width: "400px" },
                                    );
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        {detailLoading ? (
                          <div className={styles.revisionDetailSkeleton}>
                            <SkeletonLine width="80px" height={12} />
                            <SkeletonLine width="60%" height={16} />
                            <SkeletonLine width="40%" height={12} />
                            <SkeletonLine width="100%" height={80} />
                            <SkeletonLine width="90%" height={80} />
                          </div>
                        ) : (
                        <>
                        <div className={styles.revisionDetailMeta}>
                          <span className={styles.revisionTime}>
                            {formatTime(revisions[viewingRevision].timestamp)}
                          </span>
                          <strong className={`${styles.revisionDetailTitle} ${
                            currentSnapshot && revisions[viewingRevision].title !== currentSnapshot.title ? styles.diffAdd : ""
                          }`}>
                            {revisions[viewingRevision].title || "(untitled)"}
                          </strong>
                          {currentSnapshot && revisions[viewingRevision].title !== currentSnapshot.title && (
                            <strong className={`${styles.revisionDetailTitle} ${styles.diffDel}`}>
                              {currentSnapshot.title || "(untitled)"}
                            </strong>
                          )}
                        </div>
                        {revisionDetail?.excerpt && (
                          <p className={`${styles.revisionDetailExcerpt} ${
                            currentSnapshot && revisionDetail.excerpt !== (currentSnapshot.excerpt ?? "") ? styles.diffAdd : ""
                          }`}>
                            {revisionDetail.excerpt}
                          </p>
                        )}
                        {currentSnapshot && revisionDetail?.excerpt !== (currentSnapshot.excerpt ?? "") && currentSnapshot.excerpt && (
                          <p className={`${styles.revisionDetailExcerpt} ${styles.diffDel}`}>
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
                                  <span className={`${styles.revisionMetaVal} ${changed ? styles.diffAdd : ""}`}>
                                    {val || "—"}
                                  </span>
                                  {changed && (
                                    <span className={`${styles.revisionMetaVal} ${styles.diffDel}`}>
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
                          const diff = lineDiff(curContent, revContent);
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
                      <div className={styles.revisionListView}>
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
                                      const count = String(selectedRevisions.size);
                                      openModal(
                                        <ModalPrompt
                                          hint={`${selectedRevisions.size}개 로그를 삭제하려면 "${count}"을(를) 입력하세요.`}
                                          placeholder={count}
                                          validate={(v) => v === count}
                                          cancelText="취소"
                                          confirmText="삭제"
                                          danger
                                          onConfirm={async () => {
                                            const indices = Array.from(selectedRevisions);
                                            await Promise.all(indices.map((idx) => onDeleteRevision(idx)));
                                            setSelectedRevisions(new Set());
                                            setIsSelectMode(false);
                                            if (revisions.length <= indices.length) setShowRevisions(false);
                                          }}
                                        />,
                                        { id: "bulk-rev-delete", header: { title: `삭제 (${count})` }, closeButton: true, width: "400px" },
                                      );
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
                            onMouseDown={(e) => {
                              if (!isSelectMode || e.button !== 0) return;
                              e.preventDefault();
                              revDragStart.current = i;
                              revDragAdding.current = !selectedRevisions.has(i);
                            }}
                            onMouseEnter={() => {
                              if (revDragStart.current === null || revDragStart.current === i) return;
                              const start = Math.min(revDragStart.current, i);
                              const end = Math.max(revDragStart.current, i);
                              setSelectedRevisions((prev) => {
                                const next = new Set(prev);
                                for (let j = start; j <= end; j++) {
                                  if (revDragAdding.current) next.add(j);
                                  else next.delete(j);
                                }
                                return next;
                              });
                            }}
                            onMouseUp={() => { revDragStart.current = null; }}
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
                            {!isSelectMode && (
                              <ChevronRight className={styles.revisionChevron} size={12} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
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
                  icon={<Trash2 size={14} />}
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
