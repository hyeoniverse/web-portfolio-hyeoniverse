"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Languages, MessageSquareMore, RotateCcw, Undo2, Clock, ChevronLeft, ChevronRight, Trash2, ChevronDown, CalendarClock, CalendarX, Loader2, ExternalLink } from "@/components/icons";
import DateTimePicker from "@/components/ui/DatePicker/DateTimePicker";
import { useLenis } from "@/providers/LenisProvider";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import BackLink from "@/components/ui/BackLink";
import Checkbox from "@/components/ui/Checkbox";
import Popover, { type PopoverPlacement } from "@/components/ui/Popover";
import Tooltip from "@/components/ui/Tooltip";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./AdminEditorShell.module.css";
import type { AdminEditorShellProps, RevisionMetaGroup } from "./types";
import { formatTime, formatStatusTime, lineDiff, wordDiff, isImageUrl, isUrl } from "./utils";

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
  viewHref,
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
  retranslating = false,
  onGenerateSummary,
  generatingSummary = false,
  aiSummaryDisabled = false,
  getCurrentSnapshot,
  topBarSecondRowLeft,
  topBarFirstRowExtra,
  coverSlot,
  scheduledAt,
  onScheduledChange,
  minScheduledDate,
  children,
}: AdminEditorShellProps) {
  const [showScheduleTop, setShowScheduleTop] = useState(false);
  const [showScheduleBottom, setShowScheduleBottom] = useState(false);
  const hasSchedule = !!scheduledAt;
  const canSchedule = !!onScheduledChange;
  const publishLabel = hasSchedule
    ? (labels.publishScheduled ?? labels.publish)
    : (published ? labels.update : labels.publish);

  const renderScheduleContent = (close: () => void) => (
    <div className={styles.scheduleMenu}>
      <div className={styles.scheduleMenuHeader}>
        <CalendarClock size={12} />
        <span>{labels.scheduledAt ?? "Schedule"}</span>
      </div>
      {labels.scheduledHint && (
        <p className={styles.scheduleMenuHint}>{labels.scheduledHint}</p>
      )}
      <DateTimePicker
        value={scheduledAt ?? null}
        onChange={(iso) => onScheduledChange?.(iso)}
        minDate={minScheduledDate ?? new Date()}
        inline
      />
      {hasSchedule && (
        <button
          type="button"
          className={styles.scheduleClearBtn}
          onClick={() => {
            onScheduledChange?.(null);
            close();
          }}
        >
          <CalendarX size={12} />
          {labels.scheduledClear ?? "Clear"}
        </button>
      )}
    </div>
  );

  const renderSaveGroup = (
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    schedulePlacement: PopoverPlacement = "bottom-end",
  ) => (
    <>
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
      {canSchedule ? (
        <div className={`${styles.splitPublish}${hasSchedule ? ` ${styles.splitPublishScheduled}` : ""}`}>
          <Button
            variant="primary"
            size="sm"
            className={`${styles.publishBtn} ${styles.publishMainBtn}`}
            onClick={onPublish}
            disabled={saving || (isEdit && published && !isDirty && !hasSchedule)}
            soundDisabled
          >
            {hasSchedule && <CalendarClock size={12} />}
            {publishLabel}
          </Button>
          <Popover
            open={isOpen}
            onOpenChange={setOpen}
            placement={schedulePlacement}
            contentClassName={styles.scheduleDropdown}
            maxHeight={false}
            sheetTitle={labels.scheduledAt ?? "Schedule"}
            trigger={
              <Tooltip content={labels.publishOptions ?? labels.scheduledAt ?? "Schedule"} placement="bottom">
                <Button
                  variant="primary"
                  size="sm"
                  className={`${styles.publishBtn} ${styles.publishChevronBtn}`}
                  disabled={saving}
                  soundDisabled
                  aria-label={labels.publishOptions ?? labels.scheduledAt ?? "Schedule"}
                  icon={<ChevronDown size={14} />}
                />
              </Tooltip>
            }
          >
            {({ close }) => renderScheduleContent(close)}
          </Popover>
        </div>
      ) : (
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
      )}
    </>
  );
  const { setInfinite, lenis } = useLenis();
  const { openModal } = useModalStore();
  // topBar — 아래로 스크롤하면 접고(translateY), 위로 스크롤하면 펼침. position:sticky 와 병행.
  // 에디터 본문(60vh + data-lenis-prevent)은 페이지와 분리된 내부 스크롤 → capture 단계로 함께 감지.
  // 이모지 피커가 열려 있는 동안엔 토글 보류 — 피커 내부/overscroll 스크롤이 topBar 를 움직이지 않게.
  const [topBarHidden, setTopBarHidden] = useState(false);
  // topBar frost/접힘은 핀(nav 에 닿아 고정)됐을 때만 — 핀 전(커버 보일 때)엔 frost 숨김 + 항상 펼침.
  // sentinel 은 topBar 의 '자연 위치'(스크롤에 따라 같이 올라옴, transform 영향 없음).
  const [topBarPinned, setTopBarPinned] = useState(false);
  const topBarSentinelRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);
  useEffect(() => {
    const positions = new WeakMap<HTMLElement, number>();
    let lastPage = 0;
    // per-event delta 가 작은 느린 스크롤도 동작하도록 같은 방향으로 누적해 임계값 도달 시 토글.
    // 핀 직후 바로 접히지 않도록 임계값을 크게 — nav 에 닿은 뒤 충분히 더 내려야 접힘.
    let accum = 0;
    const THRESH = 120;
    const HEADER = 64; // --header-height
    const setPinned = (p: boolean) => {
      if (pinnedRef.current === p) return;
      pinnedRef.current = p;
      setTopBarPinned(p);
      // 핀 해제(다시 커버 영역으로 올라옴) 시 접힘도 즉시 해제
      if (!p) { setTopBarHidden(false); accum = 0; }
    };
    const decide = (delta: number) => {
      // 아직 nav 에 안 닿았으면(미핀) 접지 않고 펼침 유지
      if (!pinnedRef.current) { setTopBarHidden(false); accum = 0; return; }
      if (delta === 0) return;
      // 방향이 바뀌면 누적 리셋
      if ((delta > 0 && accum < 0) || (delta < 0 && accum > 0)) accum = 0;
      accum += delta;
      if (accum > THRESH) { setTopBarHidden(true); accum = 0; }
      else if (accum < -THRESH) { setTopBarHidden(false); accum = 0; }
    };
    const updatePinned = () => {
      const sentinel = topBarSentinelRef.current;
      // sentinel(topBar 자연 위치 상단)이 nav 아래 라인에 닿으면(=topBar 핀) 핀으로 간주
      if (sentinel) setPinned(sentinel.getBoundingClientRect().top <= HEADER);
    };
    const onScroll = (e: Event) => {
      // 이모지 피커 등 팝업이 열려 있으면 topBar 토글 보류
      if (document.querySelector("[data-emoji-picker]")) return;
      // 핀 여부를 sentinel 실제 위치로 매 스크롤마다 동기 측정 (IO 지연 없이 정확)
      updatePinned();
      const tgt = e.target;
      if (tgt === document || tgt === document.documentElement || tgt === document.body) {
        const y = window.scrollY;
        decide(y - lastPage);
        lastPage = y;
      } else if (
        tgt instanceof HTMLElement &&
        (tgt.closest("[data-slate-editor]") || tgt.querySelector("[data-slate-editor]"))
      ) {
        // 에디터 본문 스크롤만 반영 — 그 외 팝업 내부 스크롤은 제외
        const y = tgt.scrollTop;
        const last = positions.get(tgt) ?? 0;
        decide(y - last);
        positions.set(tgt, y);
      }
    };
    updatePinned(); // 초기 1회 (새로고침 시 이미 스크롤된 상태 대응)
    // capture=true — scroll 은 버블 안 하므로 중첩 스크롤(본문)까지 잡으려면 캡처 단계로
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const [showRevisions, setShowRevisions] = useState(false);
  const [viewingRevision, setViewingRevision] = useState<number | null>(null);
  const [revisionDetail, setRevisionDetail] = useState<{ title?: string; subtitle?: string; excerpt?: string; content?: string; meta?: RevisionMetaGroup[]; headerLabels?: { title?: string; subtitle?: string; excerpt?: string } } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  /** revision panel 전용 lang — 기본 editorLang sync, header 토글로 독립 전환 가능. */
  const [revisionLang, setRevisionLang] = useState<"ko" | "en">(editorLang);
  useEffect(() => { setRevisionLang(editorLang); }, [editorLang]);
  const currentSnapshot = getCurrentSnapshot?.(revisionLang);
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

    // DB 방식: onLoadRevisionDetail 콜백으로 비동기 로드 — revisionLang 바뀌면 재호출
    if (onLoadRevisionDetailRef.current) {
      setDetailLoading(true);
      onLoadRevisionDetailRef.current(viewingRevision, revisionLang)
        .then((detail) => setRevisionDetail(detail))
        .finally(() => setDetailLoading(false));
    }
  }, [viewingRevision, revisionLang]);

  /** revision meta group 한 개 렌더 — items 모드 vs fields 모드 분기. */
  const renderMetaGroup = (group: RevisionMetaGroup) => {
    const curGroup = currentSnapshot?.meta?.find((g) => g.label === group.label);
    const emptyLabel = revisionLang === "ko" ? "없음" : "None";
    if (group.items && group.items.length > 0) {
      return (
        <div key={group.label} className={styles.revisionMetaGroup}>
          <div className={styles.revisionMetaGroupLabel}>{group.label}</div>
          <ul className={styles.revisionMetaList}>
            {group.items.map((item, itemIdx) => {
              const curItem = curGroup?.items?.[itemIdx];
              const isLast = itemIdx === group.items!.length - 1;
              return (
                <React.Fragment key={`${item.title ?? ""}-${itemIdx}`}>
                  {item.title !== undefined && (
                    <li className={styles.revisionMetaSubHeaderItem}>
                      <span className={styles.revisionMetaSubHeader}>{item.title || emptyLabel}</span>
                      <span />
                    </li>
                  )}
                  {item.rows.map((row, rowIdx) => {
                    const curVal = curItem?.rows?.[rowIdx]?.value ?? "";
                    const val = row.value;
                    const changed = !!currentSnapshot && val !== curVal;
                    return (
                      <li key={rowIdx} className={styles.revisionMetaItem}>
                        <span className={styles.revisionMetaKey}>{row.label}</span>
                        {changed ? (
                          <span className={styles.revisionMetaVal}>
                            {wordDiff(curVal || "", val || "").map((p, i) => (
                              <span key={i} className={p.type === "add" ? styles.diffAddInline : p.type === "del" ? styles.diffDelInline : ""}>{p.text}</span>
                            ))}
                          </span>
                        ) : (
                          <span className={styles.revisionMetaVal}>{val || emptyLabel}</span>
                        )}
                      </li>
                    );
                  })}
                  {!isLast && (
                    <li className={styles.revisionMetaSeparator}>
                      <span /><span />
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      );
    }
    if (!group.fields) return null;
    const entries = Object.entries(group.fields);
    if (entries.length === 0) return null;
    return (
      <div key={group.label} className={styles.revisionMetaGroup}>
        <div className={styles.revisionMetaGroupLabel}>{group.label}</div>
        <ul className={`${styles.revisionMetaList}${group.separateRows ? ` ${styles.revisionMetaListSeparated}` : ""}`}>
          {entries.map(([key, val]) => {
            const curVal = curGroup?.fields?.[key] ?? "";
            const changed = !!currentSnapshot && val !== curVal;
            const isMulti = (val || "").includes("\n") || (curVal || "").includes("\n") || (!!group.bulletValues && !!(val || curVal));
            if (!isMulti && (isImageUrl(val) || isImageUrl(curVal))) {
              const imgSrc = isImageUrl(val) ? val : curVal;
              return (
                <li key={key} className={styles.revisionMetaItem}>
                  <span className={styles.revisionMetaKey}>{key}</span>
                  <span className={styles.revisionMetaVal}>
                    {imgSrc && (
                      <a href={imgSrc} target="_blank" rel="noopener noreferrer" className={styles.revisionMetaImgLink}>
                        <img src={imgSrc} alt="" className={styles.revisionMetaImg} />
                      </a>
                    )}
                    {changed
                      ? wordDiff(curVal || "", val || "").map((p, i) => (
                          <span key={i} className={p.type === "add" ? styles.diffAddInline : p.type === "del" ? styles.diffDelInline : ""}>{p.text}</span>
                        ))
                      : val ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className={styles.revisionMetaLink}>{val}</a>
                      ) : emptyLabel}
                  </span>
                </li>
              );
            }
            if (isMulti) {
              const lines = changed
                ? lineDiff(curVal || "", val || "")
                : (val || "").split("\n").map((t) => ({ type: "same" as const, text: t }));
              // indent (2+ leading spaces) 는 직전 top-level li 의 nested ul 로 묶음
              const tree: { line: typeof lines[number]; children: typeof lines }[] = [];
              for (const ln of lines) {
                if (/^\s{2,}/.test(ln.text) && tree.length > 0) {
                  tree[tree.length - 1].children.push({ ...ln, text: ln.text.replace(/^\s+/, "") });
                } else {
                  tree.push({ line: ln, children: [] });
                }
              }
              // multi-line 안에서는 thumbnail 없이 단순 링크로만 — gallery 처럼 많을 때 가독성
              const renderLineContent = (text: string) => {
                if (isUrl(text)) {
                  return <a href={text} target="_blank" rel="noopener noreferrer" className={styles.revisionMetaLink}>{text}</a>;
                }
                return text || "—";
              };
              return (
                <li key={key} className={styles.revisionMetaItem}>
                  <span className={styles.revisionMetaKey}>{key}</span>
                  <ul className={styles.revisionMetaValList}>
                    {tree.map((node, i) => (
                      <li key={i} className={node.line.type === "add" ? styles.diffAddInline : node.line.type === "del" ? styles.diffDelInline : ""}>
                        {renderLineContent(node.line.text)}
                        {node.children.length > 0 && (
                          <ul className={styles.revisionMetaValSubList}>
                            {node.children.map((c, j) => (
                              <li key={j} className={c.type === "add" ? styles.diffAddInline : c.type === "del" ? styles.diffDelInline : ""}>
                                {renderLineContent(c.text)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }
            return (
              <li key={key} className={styles.revisionMetaItem}>
                <span className={styles.revisionMetaKey}>{key}</span>
                {changed ? (
                  <span className={styles.revisionMetaVal}>
                    {wordDiff(curVal || "", val || "").map((p, i) => (
                      <span key={i} className={p.type === "add" ? styles.diffAddInline : p.type === "del" ? styles.diffDelInline : ""}>{p.text}</span>
                    ))}
                  </span>
                ) : (
                  <span className={styles.revisionMetaVal}>
                    {val ? (
                      isUrl(val) ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className={styles.revisionMetaLink}>{val}</a>
                      ) : val
                    ) : emptyLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {coverSlot}
      {/* topBar 핀 감지용 sentinel — topBar 바로 위(자연 위치) */}
      <div ref={topBarSentinelRef} className={styles.topBarSentinel} aria-hidden />
      <div
        className={`${styles.topBar}${topBarHidden ? ` ${styles.topBarHidden}` : ""}${
          topBarPinned ? ` ${styles.topBarPinned}` : ""
        }`}
      >
        <div className={styles.topBarRow}>
        {/* ── 왼쪽: BackLink + extra(Checkbox) + LanguageToggle 한 묶음 ── */}
        <div className={styles.navGroup}>
          <BackLink href={backHref} label={backLabel} />
          {/* 발행글이면 공개 글로 나가는 링크 — 목록으로(BackLink)와 같은 네비게이션 묶음 */}
          {viewHref && (
            <Button
              variant="ghost"
              size="sm"
              shape="circle"
              icon={<ExternalLink size={16} />}
              href={viewHref}
              external
              soundDisabled
              title={labels.view ?? "View"}
              aria-label={labels.view ?? "View"}
            />
          )}
          {topBarFirstRowExtra}
          <LanguageToggle lang={editorLang} onLangChange={onEditorLangChange} />
        </div>

        {/* ── 오른쪽: 상태 banner + icon action group (retranslate / summary / revert / revisions / delete) ── */}
        <div className={styles.topBarActions}>
          {(status || error) && (
            <span className={error ? styles.errorBanner : statusType === "success" ? styles.successBanner : styles.statusBanner}>
              {error || status}{statusTime && <span className={styles.statusTime}> · {statusTime}</span>}
            </span>
          )}
          <div className={styles.actionGroup}>
            <div className={styles.actionGroupAi}>
            {(onRetranslate || retranslateDisabled) && retranslateOptions && (
              <Popover
                open={showRetranslate}
                onOpenChange={setShowRetranslate}
                placement="bottom-start"
                contentClassName={styles.retranslateDropdown}
                sheetTitle={labels.retranslate ?? "Retranslate"}
                trigger={
                  <Tooltip content={retranslateDisabled ? (labels.retranslateDisabled ?? "API key not configured") : (labels.retranslate ?? "Retranslate")} placement="bottom">
                    <Button
                      variant="outline"
                      shape="circle"
                      size="xs"
                      className={styles.retranslateBtn}
                      onClick={retranslateDisabled ? undefined : () => { /* Popover toggle */ }}
                      disabled={saving || retranslateDisabled}
                      soundDisabled
                      icon={retranslating ? <Loader2 size={14} className={styles.spinIcon} /> : <Languages size={14} />}
                    />
                  </Tooltip>
                }
              >
                {({ close }) => (
                  <>
                    <button
                      type="button"
                      className={styles.retranslateItem}
                      onClick={() => {
                        onRetranslate?.();
                        close();
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
                          close();
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
              </Popover>
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
                  icon={generatingSummary ? <Loader2 size={14} className={styles.spinIcon} /> : <MessageSquareMore size={14} />}
                />
              </Tooltip>
            )}
            </div>
            <div className={styles.actionGroupEdit}>
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
              <Popover
                open={showRevisions}
                onOpenChange={(next) => {
                  setShowRevisions(next);
                  if (next) {
                    setViewingRevision(null);
                    setIsSelectMode(false);
                    setSelectedRevisions(new Set());
                  }
                }}
                placement="bottom-end"
                contentRef={dropdownRef}
                contentClassName={`${styles.revisionDropdown} ${viewingRevision !== null ? styles.revisionDropdownWide : ""}`}
                sheetTitle={labels.revisionHistory ?? "History"}
                trigger={
                  <Tooltip content={labels.revisionHistory ?? "History"} placement="bottom">
                    <Button
                      variant="outline"
                      size="xs"
                      className={styles.revisionBtn}
                      soundDisabled
                    >
                      <Clock size={14} />
                      <span className={styles.revisionBadge}>{revisions.length}</span>
                    </Button>
                  </Tooltip>
                }
              >
                <div data-lenis-prevent>
                    {revisions.length === 0 ? (
                      <div className={styles.revisionEmpty}>저장된 기록이 없습니다.</div>
                    ) : viewingRevision !== null && revisions[viewingRevision] ? (
                      /* ── Detail view (clip-path reveal) ── */
                      <div className={styles.revisionDetail}>
                        <div className={styles.revisionDetailHeader}>
                          {/* Row 1 (sticky) — back + timestamp | restore/delete */}
                          <div className={`${styles.revisionDetailHeaderRow} ${styles.revisionDetailHeaderRowSticky}`}>
                            <div className={styles.revisionDetailHeaderLeft}>
                              <button
                                type="button"
                                className={styles.revisionBackBtn}
                                onClick={() => setViewingRevision(null)}
                              >
                                <ChevronLeft size={14} />
                                {labels.revisionHistory ?? "History"}
                              </button>
                              <span className={styles.revisionTime}>
                                {formatTime(revisions[viewingRevision].timestamp)}
                              </span>
                            </div>
                            <div className={styles.revisionDetailActions}>
                              <Tooltip content={labels.restore ?? "Restore"} placement="bottom">
                                <button
                                  type="button"
                                  className={styles.revisionIconBtn}
                                  onClick={() => {
                                    onRestoreRevision?.(viewingRevision);
                                    setShowRevisions(false);
                                    setViewingRevision(null);
                                  }}
                                  aria-label={labels.restore ?? "Restore"}
                                >
                                  <Undo2 size={12} />
                                </button>
                              </Tooltip>
                              {onDeleteRevision && (
                                <Tooltip content={labels.delete} placement="bottom">
                                  <button
                                    type="button"
                                    className={styles.revisionIconBtn}
                                    aria-label={labels.delete}
                                    onClick={async () => {
                                      openModal(
                                        <ModalPrompt
                                          hint="이 로그를 삭제하려면 &quot;삭제&quot;를 입력하세요."
                                          placeholder="삭제"
                                          validate={(v) => v === "삭제"}
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
                          {/* Row 2 — 동일 배지 | lang toggle */}
                          <div className={styles.revisionDetailHeaderRow}>
                            {(() => {
                              if (detailLoading || !currentSnapshot || !revisionDetail) return <span />;
                              const revTitle = revisionDetail.title ?? revisions[viewingRevision].title ?? "";
                              const sameTitle = revTitle === currentSnapshot.title;
                              const sameSubtitle = (revisionDetail.subtitle ?? "") === (currentSnapshot.subtitle ?? "");
                              const sameExcerpt = (revisionDetail.excerpt ?? "") === (currentSnapshot.excerpt ?? "");
                              const sameContent = (revisionDetail.content ?? "") === (currentSnapshot.content ?? "");
                              const sameMeta = JSON.stringify(revisionDetail.meta ?? {}) === JSON.stringify(currentSnapshot.meta ?? {});
                              if (!(sameTitle && sameSubtitle && sameExcerpt && sameContent && sameMeta)) return <span />;
                              return (
                                <div className={styles.revisionCurrentBadge}>
                                  <span className={styles.revisionCurrentDot} />
                                  현재 편집 내용과 동일
                                </div>
                              );
                            })()}
                            <LanguageToggle lang={revisionLang} onLangChange={setRevisionLang} size="sm" />
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
                        {/* Title + 부제목 + 설명 — label | value grid (meta groups 와 동일 패턴) */}
                        {(() => {
                          const labels = revisionDetail?.headerLabels ?? currentSnapshot?.headerLabels ?? {};
                          const isKo = revisionLang === "ko";
                          const titleLabel = labels.title ?? (isKo ? "제목" : "Title");
                          const subtitleLabel = labels.subtitle ?? (isKo ? "부제목" : "Subtitle");
                          const excerptLabel = labels.excerpt ?? (isKo ? "설명" : "Description");
                          const oldT = currentSnapshot?.title ?? "";
                          const newT = revisionDetail?.title ?? revisions[viewingRevision].title ?? "";
                          const oldS = currentSnapshot?.subtitle ?? "";
                          const newS = revisionDetail?.subtitle ?? "";
                          const oldE = currentSnapshot?.excerpt ?? "";
                          const newE = revisionDetail?.excerpt ?? "";
                          const rows: { label: string; old: string; new: string; valueClass: string; emphasize?: boolean }[] = [
                            { label: titleLabel, old: oldT, new: newT || "(untitled)", valueClass: styles.revisionDetailTitle, emphasize: true },
                          ];
                          if (oldS || newS) rows.push({ label: subtitleLabel, old: oldS, new: newS, valueClass: styles.revisionDetailSubtitle });
                          if (oldE || newE) rows.push({ label: excerptLabel, old: oldE, new: newE, valueClass: styles.revisionDetailExcerpt });
                          return (
                            <ul className={styles.revisionDetailMeta}>
                              {rows.map((row) => {
                                const same = !currentSnapshot || row.old === row.new;
                                return (
                                  <li key={row.label} className={styles.revisionMetaItem}>
                                    <span className={styles.revisionMetaKey}>{row.label}</span>
                                    <span className={row.valueClass}>
                                      {row.emphasize ? (
                                        <strong>
                                          {same ? row.new : wordDiff(row.old, row.new).map((p, i) => (
                                            <span key={i} className={p.type === "add" ? styles.diffAddInline : p.type === "del" ? styles.diffDelInline : ""}>{p.text}</span>
                                          ))}
                                        </strong>
                                      ) : (
                                        same ? row.new : wordDiff(row.old, row.new).map((p, i) => (
                                          <span key={i} className={p.type === "add" ? styles.diffAddInline : p.type === "del" ? styles.diffDelInline : ""}>{p.text}</span>
                                        ))
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        })()}
                        {(() => {
                          // primary meta — content 위, 중요 정보
                          const primary = (revisionDetail?.meta ?? []).filter((g) => !g.secondary);
                          if (primary.length === 0) return null;
                          return (
                            <div className={styles.revisionMetaSection}>
                              {primary.map(renderMetaGroup)}
                            </div>
                          );
                        })()}
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
                        {(() => {
                          // secondary meta — content 아래, 중요도 낮은 보조 정보
                          const secondary = (revisionDetail?.meta ?? []).filter((g) => g.secondary);
                          if (secondary.length === 0) return null;
                          return (
                            <div className={`${styles.revisionMetaSection} ${styles.revisionMetaSecondary}`}>
                              {secondary.map(renderMetaGroup)}
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
                            data-clickable
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
                </div>
              </Popover>
            )}
            {isEdit && onDelete && (
              <>
                <div className={styles.actionsDivider} />
                <Tooltip content={labels.delete} placement="bottom">
                  <Button
                    variant="outline"
                    shape="circle"
                    size="xs"
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
        </div>
        </div>

        {/* ── 둘째 줄: 저장 그룹 ── */}
        <div className={styles.topBarRow}>
          {topBarSecondRowLeft && <div style={{ marginRight: "auto", display: "flex", alignItems: "flex-end" }}>{topBarSecondRowLeft}</div>}
          <div className={styles.saveGroup}>
            {renderSaveGroup(showScheduleTop, setShowScheduleTop)}
          </div>
        </div>
      </div>

      {children}

      {/* ── Bottom Bar: 미리보기 / 임시저장 / 저장 ── */}
      <div className={styles.bottomBar}>
        <div className={styles.saveGroup}>
          {renderSaveGroup(showScheduleBottom, setShowScheduleBottom, "top-end")}
        </div>
      </div>
    </div>
  );
}
