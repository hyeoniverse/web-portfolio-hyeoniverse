"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { Languages, MessageSquareMore, RotateCcw, Undo2, Clock, ChevronLeft, ChevronRight, Trash2, ChevronDown, CalendarClock, CalendarX, Loader2, ExternalLink, PanelRight, X } from "@/components/icons";
import DateTimePicker from "@/components/ui/DatePicker/DateTimePicker";
import { useLenis } from "@/providers/LenisProvider";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import BackLink from "@/components/ui/BackLink";
import LinkedText from "@/components/ui/LinkedText";
import Checkbox from "@/components/ui/Checkbox";
import Popover, { type PopoverPlacement } from "@/components/ui/Popover";
import Tooltip from "@/components/ui/Tooltip";
import LanguageToggle from "@/components/ui/LanguageToggle";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./AdminEditorShell.module.css";
import type { AdminEditorShellProps, RevisionMetaGroup } from "./types";
import { formatTime, formatStatusTime, lineDiff, wordDiff, isImageUrl, isUrl } from "./utils";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import Badge from "@/components/ui/Badge";
import { ControlSizeScope } from "@/components/ui/controlSize";
import { FieldVariantScope } from "@/components/ui/fieldVariant";

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
  onTogglePublished,
  hidePublish = false,
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
  sidebar,
  wide,
  scheduledAt,
  onScheduledChange,
  minScheduledDate,
  children,
}: AdminEditorShellProps) {
  const { t } = useLanguage();
  const [showSchedule, setShowSchedule] = useState(false);
  /* 좁은 화면에서 속성 서랍이 열렸는가 — 넓은 화면에서는 패널이 늘 보여 쓰지 않는다 */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /* 속성 패널 스크롤 표시 — 위 · 아래로 더 있으면 그 가장자리를 흐리게(data-more-above · data-more-below).
     다시 그리지 않게 DOM 속성만 바꾼다 */
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const update = () => {
      const above = el.scrollTop > 1;
      const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      el.toggleAttribute("data-more-above", above);
      el.toggleAttribute("data-more-below", below);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [sidebar]);
  /* 넓은 화면의 속성 열 높이 — 지금 화면에서 실제로 남은 높이까지만(--_sidebar-room).
     높이 상한이 "위에 붙었을 때" 기준이라, 페이지 맨 위처럼 열이 아직 아래에서 시작하면 아래쪽이 화면 밖으로 나갔다.
     열 안 스크롤은 끝에서 페이지로 넘어가지 않아(overscroll-behavior: contain) 그 부분은 페이지를 내리기 전까지 볼 수 없었다 */
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const wide = window.matchMedia("(width > 1024px)");
    let frame = 0;
    const fit = () => {
      frame = 0;
      if (!wide.matches) { el.style.removeProperty("--_sidebar-room"); return; }
      const room = window.innerHeight - el.getBoundingClientRect().top - 24;
      el.style.setProperty("--_sidebar-room", `${Math.max(240, Math.round(room))}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
    fit();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    wide.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      wide.removeEventListener("change", schedule);
    };
  }, [sidebar]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);
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
        <Pressable noTapScale
          className={styles.scheduleClearBtn}
          onClick={() => {
            onScheduledChange?.(null);
            close();
          }}
        >
          <CalendarX size={12} />
          {labels.scheduledClear ?? "Clear"}
        </Pressable>
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
          className={styles.saveBtn}
          onClick={onPreview}
          soundDisabled
        >
          {labels.preview ?? "Preview"}
        </Button>
      )}
      <Button
        variant="outline"
        className={styles.saveBtn}
        onClick={onSaveDraft}
        disabled={saving || !isDirty}
        soundDisabled
      >
        {saving ? labels.saving : labels.saveDraft}
      </Button>
      {/* 미발행 글은 별도 발행 버튼 숨김 — 저장 버튼(+발행 여부 모달)으로 발행 일원화 (hidePublish) */}
      {!hidePublish && (canSchedule ? (
        <div className={`${styles.splitPublish}${hasSchedule ? ` ${styles.splitPublishScheduled}` : ""}`}>
          <Button
            variant="primary"
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
            /* 불투명 — 유리(기본)면 뒤의 속성 패널 글자가 날짜 · 시간 칸 사이로 비쳤다 */
            variant="solid"
            maxHeight={false}
            sheetTitle={labels.scheduledAt ?? "Schedule"}
            trigger={
              <Tooltip content={labels.publishOptions ?? labels.scheduledAt ?? "Schedule"} placement="bottom">
                <Button
                  variant="primary"
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
          className={styles.publishBtn}
          onClick={onPublish}
          disabled={saving || (isEdit && published && !isDirty)}
          soundDisabled
        >
          {published ? labels.update : labels.publish}
        </Button>
      ))}
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
  const [revisionLang, setRevisionLang] = useStateFromProp<"ko" | "en">(editorLang);
  /* 지금 편집 내용 — 저장 기록 하나를 펼쳐 볼 때만 쓴다. 본문 HTML 을 글자로 바꾸는 일이라, 렌더마다 하면
     본문을 칠 때마다 그만큼 늦어진다(#850) */
  const currentSnapshot = viewingRevision !== null ? getCurrentSnapshot?.(revisionLang) : undefined;
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
  useSyncRef(revisionsRef, revisions);
  const onLoadRevisionDetailRef = useRef(onLoadRevisionDetail);
  useSyncRef(onLoadRevisionDetailRef, onLoadRevisionDetail);

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
    const emptyLabel = t("admin.inline.adminEditorShell.none");
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
                        {/* eslint-disable-next-line @next/next/no-img-element -- 리비전에 기록된 과거 URL 이라 도메인이 무엇이든 그대로 띄운다 */}
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

  /* 편집 화면의 단추 · 입력 · 셀렉트 · 세그먼트를 한 높이(md)로 — 파일마다 size 가 달라 28 · 32 가 섞였다.
     본문 편집기처럼 자체 배치가 있는 부품은 안에서 범위를 푼다 */
  /* 삭제 — 이름을 적어 확인하게 하는 경우(deleteTargetName)는 확인 창을 먼저 */
  const requestDelete = () => {
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
  };

  return (
    <ControlSizeScope size="md">
    {/* 적는 칸은 밑줄, 고르는 것은 알약(docs/editor-ui.md 2-1) — 안의 Input · Textarea 는 따로 정하지 않으면 밑줄 */}
    <FieldVariantScope variant="underline">
    {/* data-solid-popups — 안에서 여는 셀렉트 목록은 불투명(편집 칸이 빽빽해 유리 패널이면 뒤가 비쳐 읽기 어렵다) */}
    <div className={styles.container} data-solid-popups>
      {coverSlot}
      {/* topBar 핀 감지용 sentinel — topBar 바로 위(자연 위치) */}
      <div ref={topBarSentinelRef} className={styles.topBarSentinel} aria-hidden />
      <div
        className={`${styles.topBar}${topBarHidden ? ` ${styles.topBarHidden}` : ""}${
          topBarPinned ? ` ${styles.topBarPinned}` : ""
        }`}
      >
        {/* 한 줄 — 왼쪽: 뒤로 · 발행 상태 / 가운데: 언어 · 아이콘 동작 / 오른쪽: 저장 묶음.
            예전에는 두 줄(아래에 상태 칩 · 저장)에 맨 아래 저장 바까지 있어 같은 단추가 세 군데였다 */}
        <div className={styles.topBarRow}>
        <div className={styles.navGroup}>
          <BackLink href={backHref} label={backLabel} />
          <StatusBadge
            className={styles.statusBadge}
            variant={published ? "published" : hasSchedule ? "scheduled" : "draft"}
            /* 목록의 칩처럼 눌러서 발행/미발행을 바꾼다(#1116). 예약 대기 칩은 누르지 않는다 — 누르면 예약을 건너뛰고 바로 발행된다 */
            onClick={onTogglePublished && (published || !hasSchedule) ? onTogglePublished : undefined}
            title={onTogglePublished && (published || !hasSchedule) ? t(published ? "admin.posts.clickToUnpublish" : "admin.posts.clickToPublish") : undefined}
            disabled={saving}
          >
            {/* 편집 화면 문구라 관리자 화면 언어를 따른다(편집 중인 글의 언어 탭이 아니라) */}
            {t(published ? "admin.common.statusPublished" : hasSchedule ? "admin.common.statusScheduled" : "admin.common.statusDraft")}
          </StatusBadge>
          {/* 공개 글 보기(↗) — 발행 상태 바로 옆 */}
          {viewHref && (
            <Tooltip content={labels.view ?? "View"} placement="bottom">
              <Button
                variant="ghost"
                shape="circle"
                href={viewHref}
                external
                soundDisabled
                aria-label={labels.view ?? "View"}
                icon={<ExternalLink size={14} />}
              />
            </Tooltip>
          )}
          {topBarSecondRowLeft}
          {topBarFirstRowExtra}
          {/* 속성 패널 여닫기 — 패널이 옆에 서지 못하는 좁은 화면에서만 보인다(CSS). 첫 줄 오른쪽 끝 */}
          {sidebar && (
            <Button
              variant="ghost"
              className={styles.sidebarToggle}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-expanded={sidebarOpen}
              aria-controls="editor-properties"
              soundDisabled
              icon={<PanelRight size={14} />}
            >
              {t("admin.common.editorProperties")}
            </Button>
          )}
        </div>

        {/* ── 오른쪽: 상태 알림 + 두 묶음, 사이에 세로선 하나
               언어 [KO|EN · 번역 · 요약] │ 저장 [기록 · 되돌리기(고쳤을 때) · 미리보기 · 임시저장 · 저장]
               보기(↗)는 왼쪽 발행 상태 옆, 삭제는 속성 패널 맨 아래로 나눴다 ── */}
        <div className={styles.topBarActions}>
          {(status || error) && (
            <span className={error ? styles.errorBanner : statusType === "success" ? styles.successBanner : styles.statusBanner}>
              {/* 문구 안의 [글](주소) 는 새 탭 링크로 — 실패 안내에서 알림 · 설정으로 바로 간다 */}
              <LinkedText text={error || status || ""} />{statusTime && <span className={styles.statusTime}> · {statusTime}</span>}
            </span>
          )}
          <div className={styles.actionGroup}>
            {/* 1. 언어 — 편집 언어와 그 언어를 다루는 AI(번역 · 요약) */}
            <div className={styles.barGroup}>
            <span className={styles.barLabel}>{t("admin.common.barGroupLang")}</span>
            <div className={styles.actionGroupAi}>
            <LanguageToggle lang={editorLang} onLangChange={onEditorLangChange} size="sm" />
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
                      variant="ghost"
                      shape="circle"
                      className={styles.retranslateBtn}
                      aria-label={retranslateDisabled ? (labels.retranslateDisabled ?? "API key not configured") : (labels.retranslate ?? "Retranslate")}
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
                    <Pressable noTapScale
                      className={styles.retranslateItem}
                      onClick={() => {
                        onRetranslate?.();
                        close();
                      }}
                    >
                      {labels.retranslateAll ?? "All"}
                    </Pressable>
                    {retranslateOptions.map((opt) => (
                      <Pressable noTapScale
                        key={opt.key}
                        className={styles.retranslateItem}
                        onClick={() => {
                          onRetranslate?.([opt.key]);
                          close();
                        }}
                      >
                        {opt.label}
                      </Pressable>
                    ))}
                  </>
                )}
              </Popover>
            )}
            {(onGenerateSummary || aiSummaryDisabled) && (
              <Tooltip content={aiSummaryDisabled ? (labels.generateSummaryDisabled ?? "API key not configured") : (labels.generateSummary ?? "Generate AI Summary")} placement="bottom">
                <Button
                  variant="ghost"
                  shape="circle"
                  aria-label={aiSummaryDisabled ? (labels.generateSummaryDisabled ?? "API key not configured") : (labels.generateSummary ?? "Generate AI Summary")}
                  onClick={aiSummaryDisabled ? undefined : onGenerateSummary}
                  disabled={saving || generatingSummary || aiSummaryDisabled}
                  soundDisabled
                  icon={generatingSummary ? <Loader2 size={14} className={styles.spinIcon} /> : <MessageSquareMore size={14} />}
                />
              </Tooltip>
            )}
            </div>
            </div>
          </div>
          <span className={styles.barDivider} aria-hidden="true" />
          {/* 3. 저장 — 미리보기 · 임시저장 · 저장 */}
          <div className={styles.barGroup}>
            <span className={styles.barLabel}>{t("admin.common.barGroupSave")}</span>
            <div className={styles.saveGroup}>
              {/* 기록 — 저장해 온 판들 */}
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
                        variant="ghost"
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
                        <div className={styles.revisionEmpty}>{t("admin.common.noRevisions")}</div>
                      ) : viewingRevision !== null && revisions[viewingRevision] ? (
                        /* ── Detail view (clip-path reveal) ── */
                        <div className={styles.revisionDetail}>
                          <div className={styles.revisionDetailHeader}>
                            {/* Row 1 (sticky) — back + timestamp | restore/delete */}
                            <div className={`${styles.revisionDetailHeaderRow} ${styles.revisionDetailHeaderRowSticky}`}>
                              <div className={styles.revisionDetailHeaderLeft}>
                                <Pressable noTapScale
                                  className={styles.revisionBackBtn}
                                  onClick={() => setViewingRevision(null)}
                                >
                                  <ChevronLeft size={14} />
                                  {labels.revisionHistory ?? "History"}
                                </Pressable>
                                <span className={styles.revisionTime}>
                                  {formatTime(revisions[viewingRevision].timestamp)}
                                </span>
                              </div>
                              <div className={styles.revisionDetailActions}>
                                <Tooltip content={labels.restore ?? "Restore"} placement="bottom">
                                  <Pressable noTapScale
                                    className={styles.revisionIconBtn}
                                    onClick={() => {
                                      onRestoreRevision?.(viewingRevision);
                                      setShowRevisions(false);
                                      setViewingRevision(null);
                                    }}
                                    aria-label={labels.restore ?? "Restore"}
                                  >
                                    <Undo2 size={12} />
                                  </Pressable>
                                </Tooltip>
                                {onDeleteRevision && (
                                  <Tooltip content={labels.delete} placement="bottom">
                                    <Pressable noTapScale
                                      className={styles.revisionIconBtn}
                                      aria-label={labels.delete}
                                      onClick={async () => {
                                        openModal(
                                          <ModalPrompt
                                            hint={t("admin.common.deleteLogPrompt")}
                                            placeholder={t("admin.common.deleteLogConfirm")}
                                            validate={(v) => v === t("admin.common.deleteLogConfirm")}
                                            confirmText={t("admin.common.delete")}
                                            danger
                                            onConfirm={async () => {
                                              const ok = await onDeleteRevision(viewingRevision);
                                              if (ok) {
                                                setViewingRevision(null);
                                                if (revisions && revisions.length <= 1) setShowRevisions(false);
                                              }
                                            }}
                                          />,
                                          { id: "rev-delete", header: { title: t("admin.common.deleteLog") }, closeButton: true, width: "400px" },
                                        );
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </Pressable>
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
                                  <Badge tone="success" uppercase dot>
                                    {t("admin.common.sameAsCurrent")}
                                  </Badge>
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
                            const titleLabel = labels.title ?? t("admin.inline.adminEditorShell.title");
                            const subtitleLabel = labels.subtitle ?? t("admin.inline.adminEditorShell.subtitle");
                            const excerptLabel = labels.excerpt ?? t("admin.inline.adminEditorShell.description");
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
                                  label={selectedRevisions.size > 0 ? fillTemplate(t("admin.common.selectedItems"), { count: selectedRevisions.size }) : t("admin.common.selectAll")}
                                  className={styles.revisionSelectAll}
                                />
                                <div className={styles.revisionSelectActions}>
                                  {selectedRevisions.size > 0 && (
                                    <Pressable noTapScale
                                      className={styles.revisionDeleteSelectedBtn}
                                      onClick={async () => {
                                        if (!onDeleteRevision) return;
                                        const count = String(selectedRevisions.size);
                                        openModal(
                                          <ModalPrompt
                                            hint={fillTemplate(t("admin.common.bulkDeletePrompt"), { count })}
                                            placeholder={count}
                                            validate={(v) => v === count}
                                            confirmText={t("admin.common.delete")}
                                            danger
                                            onConfirm={async () => {
                                              const indices = Array.from(selectedRevisions);
                                              await Promise.all(indices.map((idx) => onDeleteRevision(idx)));
                                              setSelectedRevisions(new Set());
                                              setIsSelectMode(false);
                                              if (revisions.length <= indices.length) setShowRevisions(false);
                                            }}
                                          />,
                                          { id: "bulk-rev-delete", header: { title: fillTemplate(t("admin.common.deleteCount"), { n: count }) }, closeButton: true, width: "400px" },
                                        );
                                      }}
                                    >
                                      {t("admin.common.delete")}
                                    </Pressable>
                                  )}
                                  <Pressable noTapScale
                                    className={styles.revisionSelectCancel}
                                    onClick={() => {
                                      setIsSelectMode(false);
                                      setSelectedRevisions(new Set());
                                    }}
                                  >
                                    {t("admin.common.cancel")}
                                  </Pressable>
                                </div>
                              </>
                            ) : (
                              <>
                                <span>{labels.revisionHistory ?? "History"}</span>
                                {onDeleteRevision && (
                                  <Pressable noTapScale
                                    className={styles.revisionSelectToggle}
                                    onClick={() => setIsSelectMode(true)}
                                  >
                                    {t("admin.common.select")}
                                  </Pressable>
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
              {/* 되돌리기 — 고친 내용이 있을 때만(저장 전 상태로) */}
              {onRevert && isDirty && (
                <Tooltip content={labels.revert ?? "Revert"} placement="bottom">
                  <Button
                    variant="ghost"
                    shape="circle"
                    className={styles.revertBtn}
                    aria-label={labels.revert ?? "Revert"}
                    onClick={onRevert}
                    disabled={saving}
                    soundDisabled
                    icon={<RotateCcw size={14} />}
                  />
                </Tooltip>
              )}
              {!sidebar && isEdit && onDelete && (
                <Tooltip content={labels.delete} placement="bottom">
                  <Button variant="ghost" shape="circle" onClick={requestDelete} disabled={deleting} aria-label={labels.delete} soundDisabled icon={<Trash2 size={14} />} />
                </Tooltip>
              )}
              {renderSaveGroup(showSchedule, setShowSchedule)}
            </div>
          </div>
        </div>
        </div>
      </div>

      {sidebar ? (
        <div className={styles.layout}>
          <div className={styles.main}>{children}</div>
          {/* 넓은 화면: 본문 옆에 붙어 따라오는 열. 좁은 화면: 오른쪽에서 나오는 서랍 */}
          <aside
            ref={sidebarRef}
            id="editor-properties"
            className={`${styles.sidebar}${sidebarOpen ? ` ${styles.sidebarOpen}` : ""}`}
            aria-label={t("admin.common.editorProperties")}
            data-lenis-prevent
          >
            <div className={styles.sidebarHead}>
              <span className={styles.sidebarTitle}>{t("admin.common.editorProperties")}</span>
              {/* 페이지 삭제 — 패널을 열면 바로 보이는 제목 줄 오른쪽. 패널 맨 아래는 끝까지 내려야 보여 찾기 어려웠다 */}
              {isEdit && onDelete && (
                <Button
                  variant="ghost"
                  className={`${styles.toolBtn} ${styles.sidebarDelete}`}
                  onClick={requestDelete}
                  disabled={deleting}
                  soundDisabled
                  icon={<Trash2 size={14} />}
                >
                  {t("admin.common.deletePage")}
                </Button>
              )}
              <Button
                variant="ghost"
                shape="circle"
                className={styles.sidebarClose}
                onClick={() => setSidebarOpen(false)}
                aria-label={t("admin.common.editorPropertiesClose")}
                soundDisabled
                icon={<X size={14} />}
              />
            </div>
            {sidebar}
          </aside>
          {sidebarOpen && <div className={styles.sidebarScrim} onClick={() => setSidebarOpen(false)} aria-hidden />}
        </div>
      ) : children}
      {sidebar && wide && <div className={styles.wide}>{wide}</div>}
    </div>
    </FieldVariantScope>
    </ControlSizeScope>
  );
}
