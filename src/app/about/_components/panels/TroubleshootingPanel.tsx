"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Image from "next/image";
import { Star, Maximize2, ImageIcon, ZoomIn, ZoomOut, RotateCcw, X, ChevronDown, Folder, FileText, Filter, Check } from "lucide-react";
import type { Language } from "@/providers/LanguageProvider";
import { troubleShootingItems } from "@/data/about/troubleshooting";
import type { TroubleshootingDifficulty, TroubleshootingDiagram, TroubleshootingImage, TroubleShootingItem } from "@/data/about/types";
import { renderHighlight } from "../renderHighlight";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import FlowDiagram from "../FlowDiagram";
import { getNodeX, getNodeY } from "../_utils/flowLayout";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import { ImageViewer } from "@/components/ui/ImageViewer";
import shared from "../AboutSection.module.css";
import local from "./TroubleshootingPanel.module.css";
const styles = { ...shared, ...local };

/** 난이도별 라벨 + 색상 톤 + 한 줄 설명. tooltip 은 hover 한 등급 하나만 표시 */
const DIFFICULTY_META: Record<
  TroubleshootingDifficulty,
  {
    label: { ko: string; en: string };
    tone: "easy" | "medium" | "hard";
    desc: { ko: string; en: string };
  }
> = {
  1: {
    label: { ko: "쉬움", en: "Easy" },
    tone: "easy",
    desc: {
      ko: "문서나 빠른 검색으로 해결되는 표면적인 문제",
      en: "Surface-level issue resolved by docs or a quick search",
    },
  },
  2: {
    label: { ko: "보통", en: "Medium" },
    tone: "medium",
    desc: {
      ko: "동작 원리 이해와 어느 정도의 디버깅이 필요한 문제",
      en: "Needs understanding of how it works plus some debugging",
    },
  },
  3: {
    label: { ko: "어려움", en: "Hard" },
    tone: "hard",
    desc: {
      ko: "브라우저 또는 프레임워크 내부 동작에 대한 깊은 이해와 추적이 필요한 근본적인 문제",
      en: "Root-level issue that requires deep dives into browser or framework internals",
    },
  },
};

interface TroubleshootingPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

/** 난이도 뱃지 — "쉬움 / 보통 / 어려움" 라벨 + 색상 톤. 자체 tooltip 없음 — 부모 file row tooltip 에 통합됨. */
function DifficultyBadge({
  level,
  language,
  large,
}: {
  level: TroubleshootingDifficulty;
  language: Language;
  large?: boolean;
}) {
  const meta = DIFFICULTY_META[level];
  const className = [
    large ? local.difficultyBadgeLarge : local.difficultyBadge,
    local[`difficultyTone_${meta.tone}`],
  ].join(" ");
  return (
    <span className={className} aria-label={`${meta.label[language]} (${level}/3)`}>
      {meta.label[language]}
    </span>
  );
}

/** Flow chart 인터랙티브 풀스크린 viewer — 휠 zoom, 빈 영역 드래그 pan, 노드 드래그로 개별 이동, +/-/리셋/닫기 컨트롤 */
function DiagramFullscreenViewer({
  diagram,
  language,
  onClose,
}: {
  diagram: TroubleshootingDiagram;
  language: Language;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(() => new Map());
  const stageRef = useRef<HTMLDivElement>(null);
  // dragMode: pan = 전체 canvas 이동, node = 개별 노드 이동
  const dragRef = useRef<
    | { mode: "none" }
    | { mode: "pan"; startX: number; startY: number; panX: number; panY: number }
    | { mode: "node"; nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number }
  >({ mode: "none" });

  // ESC 로 닫기 + body 스크롤 잠금 (event 차단 방식, body 위치 변경 X — GSAP/Lenis 영향 없음)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevent = (e: Event) => {
      const target = e.target as Node | null;
      if (stageRef.current && target && stageRef.current.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("wheel", prevent, { passive: false });
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wheel", prevent);
      document.removeEventListener("touchmove", prevent);
    };
  }, [onClose]);

  // 휠 zoom — 커서 위치 기준으로 확대 (point under cursor 유지)
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((prev) => {
      const next = Math.max(0.2, Math.min(8, prev * factor));
      const actualFactor = next / prev;
      setPan((p) => ({
        x: cx - (cx - p.x) * actualFactor,
        y: cy - (cy - p.y) * actualFactor,
      }));
      return next;
    });
  }, []);

  // 드래그 시작 — 노드 위에서 시작하면 node mode, 빈 영역에서 시작하면 pan mode
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const nodeEl = target.closest("[data-node-id]") as SVGGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeId!;
      const node = diagram.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const curX = getNodeX(node, nodePositions);
      const curY = getNodeY(node, nodePositions);
      dragRef.current = {
        mode: "node",
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        nodeX: curX,
        nodeY: curY,
      };
    } else {
      dragRef.current = {
        mode: "pan",
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, [pan, diagram.nodes, nodePositions]);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.mode === "pan") {
      setPan({
        x: drag.panX + (e.clientX - drag.startX),
        y: drag.panY + (e.clientY - drag.startY),
      });
    } else if (drag.mode === "node") {
      // 화면 좌표 delta 를 SVG 좌표로 변환 (zoom 만큼 나눠줘야 함)
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(drag.nodeId, { x: drag.nodeX + dx, y: drag.nodeY + dy });
        return next;
      });
    }
  }, [zoom]);
  const onPointerUp = useCallback(() => {
    dragRef.current = { mode: "none" };
  }, []);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodePositions(new Map());
  }, []);

  if (typeof window === "undefined") return null;
  return createPortal(
    <div className={styles.diagramViewerOverlay} role="dialog" aria-label="Diagram viewer">
      {/* Header — title + close */}
      <div className={styles.diagramViewerHeader}>
        <span className={styles.diagramViewerTitle}>
          {diagram.title ? diagram.title[language] : "Flow chart"}
        </span>
        <button
          type="button"
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Stage — zoom/pan 적용되는 영역 */}
      <div
        ref={stageRef}
        className={styles.diagramViewerStage}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={styles.diagramViewerCanvas}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <FlowDiagram nodes={diagram.nodes} edges={diagram.edges} language={language} nodePositions={nodePositions} />
        </div>
      </div>

      {/* Controls — 우하단 zoom in/out/reset */}
      <div className={styles.diagramViewerControls}>
        <button
          type="button"
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={() => setZoom((z) => Math.min(8, z * 1.2))}
          aria-label="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <span className={styles.diagramViewerZoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          aria-label="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={reset}
          aria-label="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

function TroubleshootingPanel({
  language,
  scrollBy,
}: TroubleshootingPanelProps) {
  const items = troubleShootingItems;
  const isMobile = useMobileLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const { panelRef, contentRef } = usePinnedScroll(
    items.length,
    undefined,
    scrollBy,
  );

  /** 모바일/태블릿: 핀 스크롤 진행도가 활성 인덱스를 결정. */
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const [ideFontScale, setIdeFontScale] = useState(1); // IDE 텍스트 크기 사용자 조절 (0.85 ~ 1.3)
  const [enlargedDiagram, setEnlargedDiagram] = useState<TroubleshootingDiagram | null>(null);
  // sidebar: 접힌 폴더 section 키 집합 (PC explorer 펼침/접기)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 필터 — 단계별 (easy/medium/hard) 또는 추천(recommended) 만 보기
  type FilterMode = "all" | "recommended" | 1 | 2 | 3;
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!filterWrapRef.current?.contains(e.target as Node)) setFilterMenuOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [filterMenuOpen]);

  // 필터 통과한 항목 + 원래 index 보존 (handleItemClick / displayIndex 비교 용도)
  const visibleItems = useMemo(() => {
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (filterMode === "all") return true;
        if (filterMode === "recommended") return !!item.recommended;
        return item.difficulty === filterMode;
      });
  }, [items, filterMode]);

  const FILTER_OPTIONS: { key: FilterMode; label: { ko: string; en: string } }[] = [
    { key: "all", label: { ko: "전체", en: "All" } },
    { key: "recommended", label: { ko: "추천만", en: "Recommended" } },
    { key: 1, label: { ko: "쉬움", en: "Easy" } },
    { key: 2, label: { ko: "보통", en: "Medium" } },
    { key: 3, label: { ko: "어려움", en: "Hard" } },
  ];
  // 공통 ImageViewer — 클릭한 이미지가 viewer 의 시작 index, 같은 item 의 src 있는 이미지들이 list 가 됨
  const [viewerState, setViewerState] = useState<{ images: string[]; index: number; title?: string } | null>(null);
  const openImageViewer = useCallback((item: TroubleShootingItem, clickedImg: TroubleshootingImage) => {
    const srcs = (item.images ?? []).filter((i): i is TroubleshootingImage & { src: string } => !!i.src).map((i) => i.src);
    const idx = clickedImg.src ? srcs.indexOf(clickedImg.src) : 0;
    setViewerState({ images: srcs, index: Math.max(0, idx), title: item.problem[language] });
  }, [language]);

  /** \n\n 로 구분된 문단을 각각 별도 ideLine 으로 렌더 + 사이에 빈 줄 — 가독성 위해 */
  const renderParagraphs = useCallback(
    (text: string, opts?: { insightStyle?: boolean }) => {
      const paragraphs = text.split(/\n\n+/);
      return paragraphs.map((para, pi) => (
        <React.Fragment key={pi}>
          {pi > 0 && (
            <div className={`${styles.ideLine} ${styles.ideLineEmpty}`}>
              <span className={styles.ideLineNum} />
              <span className={styles.ideLineText} />
            </div>
          )}
          <div className={styles.ideLine}>
            <span className={styles.ideLineNum} />
            <span className={`${styles.ideLineText} ${opts?.insightStyle ? styles.ideInsight : ""}`}>
              {renderHighlight(para, language)}
            </span>
          </div>
        </React.Fragment>
      ));
    },
    [language],
  );

  /** 특정 position 의 이미지들만 골라서 렌더 — content 흐름 안에 자연스럽게 끼워 넣기 위함 */
  const renderImagesAt = useCallback(
    (item: TroubleShootingItem, position: "definition" | "cause" | "solution" | "insight") => {
      const images = item.images;
      if (!images || images.length === 0) return null;
      const filtered = images.filter((img) => (img.position ?? "solution") === position);
      if (filtered.length === 0) return null;
      return (
        <div className={styles.ideIndent}>
          <div className={styles.troubleImages}>
            {filtered.map((img, ii) =>
              img.src ? (
                <figure key={ii} className={styles.troubleImage}>
                  {/* wrap (relative) > 이미지 button (clip + radius) + hint button (overflow 밖, 잘림 없음) */}
                  <div className={styles.troubleImageWrap}>
                    <button
                      type="button"
                      data-clickable="true"
                      className={styles.troubleImageBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageViewer(item, img);
                      }}
                      aria-label={img.alt[language]}
                    >
                      <Image
                        src={img.src}
                        alt={img.alt[language]}
                        width={1200}
                        height={750}
                        sizes="(max-width: 1024px) 100vw, 800px"
                        className={styles.troubleImageImg}
                      />
                    </button>
                    <button
                      type="button"
                      data-clickable="true"
                      className={styles.ideDiagramHint}
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageViewer(item, img);
                      }}
                      aria-label="크게 보기"
                    >
                      <Maximize2 strokeWidth={2} className={styles.ideDiagramHintIcon} />
                      크게 보기
                    </button>
                  </div>
                  {img.caption && (
                    <figcaption className={styles.troubleImageCaption}>
                      {img.caption[language]}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <div key={ii} className={styles.troubleImagePlaceholder}>
                  <ImageIcon size={32} strokeWidth={1.5} />
                  <span className={styles.troubleImagePlaceholderTitle}>
                    {img.placeholderKeyword ?? "Screenshot needed"}
                  </span>
                  <small className={styles.troubleImagePlaceholderAlt}>
                    {img.alt[language]}
                  </small>
                </div>
              ),
            )}
          </div>
        </div>
      );
    },
    [language, openImageViewer],
  );
  // 폰트 조절 툴팁 — 패널에 진입할 때마다 표시, 사용자 클릭/키 입력 시 dismiss.
  // 스크롤은 트리거 아님 (패널에 진입하는 행위 자체가 스크롤이라 즉시 사라지는 걸 막음).
  const [showFontTooltip, setShowFontTooltip] = useState(false);
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (!isMobile) return;
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
        if (nowVisible && !wasVisibleRef.current) {
          // not-visible → visible 전환 (패널 진입) — 툴팁 표시
          setShowFontTooltip(true);
        }
        wasVisibleRef.current = nowVisible;
      },
      { threshold: [0, 0.4, 0.8] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, contentRef]);

  useEffect(() => {
    if (!showFontTooltip) return;
    const dismiss = () => setShowFontTooltip(false);
    window.addEventListener("click", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [showFontTooltip]);
  const prevIdxRef = useRef(0);
  // IDE tab bar drag-to-scroll — 모바일 터치는 native overflow scroll, 데스크톱 마우스는 manual.
  // setPointerCapture 안 씀 (button click 이 wrapper 로 가로채여서 발화 안 되는 문제) → document-level mousemove/up 으로 처리.
  const ideTabBarRef = useRef<HTMLDivElement>(null);
  const tabDragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });
  const handleTabMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ideTabBarRef.current;
    if (!el) return;
    tabDragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
  }, []);

  // document-level mousemove / mouseup — 드래그가 tabbar 바깥으로 나가도 계속 작동.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = tabDragRef.current;
      const el = ideTabBarRef.current;
      if (!drag.active || !el) return;
      const dx = e.clientX - drag.startX;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      el.scrollLeft = drag.startScroll - dx;
      // 5px 이상 움직였으면 drag 의도 확정 → 커서를 drag (grab) 로 전환
      if (drag.moved > 5 && el.getAttribute("data-cursor") !== "grab") {
        el.setAttribute("data-cursor", "grab");
      }
    };
    const onUp = () => {
      tabDragRef.current.active = false;
      const el = ideTabBarRef.current;
      if (el && el.hasAttribute("data-cursor")) el.removeAttribute("data-cursor");
      // moved 는 click 핸들러가 체크한 뒤 자동으로 다음 mousedown 에서 0 으로 리셋됨
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);
  const handleMobileIndexChange = useCallback((idx: number) => {
    prevIdxRef.current = idx;
    setMobileActiveIdx(idx);
  }, []);

  // 활성 탭이 항상 viewport 안에 들어오도록 tab bar 자동 스크롤
  useEffect(() => {
    if (!isMobile) return;
    const bar = ideTabBarRef.current;
    if (!bar) return;
    const buttons = bar.querySelectorAll(`.${styles.ideTab}`);
    const activeTab = buttons[mobileActiveIdx] as HTMLElement | undefined;
    if (!activeTab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const PADDING = 16;
    if (tabRect.left < barRect.left + PADDING) {
      bar.scrollBy({ left: tabRect.left - barRect.left - PADDING, behavior: "smooth" });
    } else if (tabRect.right > barRect.right - PADDING) {
      bar.scrollBy({ left: tabRect.right - barRect.right + PADDING, behavior: "smooth" });
    }
  }, [mobileActiveIdx, isMobile]);
  const mobileStRef = useMobilePinScroll(
    contentRef,
    items.length,
    1000,
    handleMobileIndexChange,
  );

  // IDE editor 의 탭 전환 입력 처리.
  //  룰: "처음 edge 에 닿기만 한 것" 은 전환 안 하고, "닿은 뒤 또 스크롤" 이면 전환.
  //   - 또 스크롤 = (a) release 후 새 burst (QUIET_MS 이상 active 없다가 다시 active),
  //                또는 (b) 손 안 떼고 계속 push (edge 위 active 누적이 PUSH_THRESHOLD 도달).
  //   - momentum tail (delta <ACTIVE_DELTA) 은 무시 → fling 으로 닿기만 한 케이스 안전.
  //  - Touch: 가로 swipe (|dx| > |dy| × 1.2) 로 다음/이전 탭. 세로면 native 스크롤 유지.
  // handleItemClick 은 아래에서 선언되므로 ref 로 우회 (TDZ 회피).
  const ideEditorRef = useRef<HTMLDivElement>(null);
  const ideEdgeAccRef = useRef<{ dir: "up" | "down"; accumulated: number } | null>(null);
  const activeIdxRef = useRef(mobileActiveIdx);
  const handleItemClickRef = useRef<((idx: number) => void) | null>(null);
  useEffect(() => { activeIdxRef.current = mobileActiveIdx; }, [mobileActiveIdx]);
  // 활성 변경 시 누적 리셋 — 새 컨텐츠의 edge 부터 새 누적 시작
  useEffect(() => { ideEdgeAccRef.current = null; }, [mobileActiveIdx]);
  useEffect(() => {
    if (!isMobile) return;
    const editor = ideEditorRef.current;
    if (!editor) return;
    const ACTIVE_DELTA = 15; // 이상 = 적극 스크롤
    const QUIET_MS = 100; // active wheel 사이 이 시간 이상 비면 = release 후 재스크롤
    const PUSH_THRESHOLD = 250; // edge 위 active 누적 = 손 안 떼고 계속 push 의 신호
    const COOLDOWN_MS = 250; // 전환 직후 잠금
    const EDGE_GRACE_MS = 300; // edge 도달 직후 이 시간 동안은 전환 X (fling 흡수)
    const SWIPE_THRESHOLD = 50;
    const TOUCH_LOCK_RATIO = 1.2;

    let lastActiveTime = 0; // 마지막 active wheel (edge 안팎 무관)
    let edgeEnterTime = 0; // edge 진입 시각 (0 = 아직 edge 아님)
    let cooldownUntil = 0;
    let touchStart: { x: number; y: number } | null = null;
    let touchHorizontal: boolean | null = null;

    const fireTransition = (dir: "up" | "down", now: number) => {
      const cur = activeIdxRef.current;
      const nextIdx = dir === "down"
        ? Math.min(items.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      if (nextIdx !== cur) {
        handleItemClickRef.current?.(nextIdx);
        cooldownUntil = now + COOLDOWN_MS;
      }
      ideEdgeAccRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      const content = editor.querySelector(`.${styles.ideEditorContent}`) as HTMLElement | null;
      if (!content) return;
      const atTop = content.scrollTop <= 0;
      const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
      const dir: "up" | "down" = e.deltaY > 0 ? "down" : "up";
      const atEdgeInDir = (dir === "up" && atTop) || (dir === "down" && atBottom);
      const d = Math.abs(e.deltaY);
      const now = performance.now();

      if (!atEdgeInDir) {
        // 컨텐츠 내부 스크롤 — active 시각 기록, native 통과
        if (d >= ACTIVE_DELTA) lastActiveTime = now;
        ideEdgeAccRef.current = null;
        edgeEnterTime = 0;
        return;
      }

      // edge 위 — momentum 끊기 위해 항상 preventDefault
      e.preventDefault();

      if (edgeEnterTime === 0) edgeEnterTime = now;

      if (now < cooldownUntil) {
        ideEdgeAccRef.current = null;
        return;
      }
      if (d < ACTIVE_DELTA) {
        // momentum tail — 무시 (lastActiveTime 갱신 안 함 → release 감지 가능)
        return;
      }

      const wasQuiet = now - lastActiveTime > QUIET_MS;
      lastActiveTime = now;

      // edge 도달 직후 GRACE 시간 동안은 무조건 흡수 — 강한 fling 의 active 부분이 여기서 소진됨.
      if (now - edgeEnterTime < EDGE_GRACE_MS) {
        ideEdgeAccRef.current = null;
        return;
      }

      if (wasQuiet) {
        // (a) release 후 재스크롤 = 또 스크롤 → 즉시 전환
        fireTransition(dir, now);
        return;
      }

      // 연속 active — (b) 누적 push 가 PUSH_THRESHOLD 도달하면 = 또 스크롤로 인정
      const last = ideEdgeAccRef.current;
      if (!last || last.dir !== dir) {
        ideEdgeAccRef.current = { dir, accumulated: d };
        return;
      }
      last.accumulated += d;
      if (last.accumulated >= PUSH_THRESHOLD) {
        fireTransition(dir, now);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchHorizontal = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (touchHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        touchHorizontal = Math.abs(dx) > Math.abs(dy) * TOUCH_LOCK_RATIO;
      }
      if (touchHorizontal === true) {
        // 가로 swipe 의도 확정 — native 세로 스크롤 차단
        e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touchStart;
      const horizontal = touchHorizontal;
      touchStart = null;
      touchHorizontal = null;
      if (!start || horizontal !== true) return;
      const dx = e.changedTouches[0].clientX - start.x;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      const cur = activeIdxRef.current;
      // 왼쪽 swipe (dx < 0) = 다음 탭, 오른쪽 swipe = 이전 탭
      const nextIdx = dx < 0
        ? Math.min(items.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      if (nextIdx !== cur) handleItemClickRef.current?.(nextIdx);
    };

    editor.addEventListener("wheel", onWheel, { passive: false });
    editor.addEventListener("touchstart", onTouchStart, { passive: true });
    editor.addEventListener("touchmove", onTouchMove, { passive: false });
    editor.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      editor.removeEventListener("wheel", onWheel);
      editor.removeEventListener("touchstart", onTouchStart);
      editor.removeEventListener("touchmove", onTouchMove);
      editor.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, items.length]);

  // 모바일 boundary clamp — 핀 범위 밖으로 스크롤 시도 시:
  // - 첫 항목 + 위로 이탈: 이전 패널로 (허용)
  // - 마지막 항목 + 아래로 이탈: 다음 패널로 (허용)
  // - 그 외: 핀 boundary 로 snap-back. 강한 fling 으로 중간 항목에서 패널을 통과해버리는 문제 방지.
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number | null = null;
    let snapping = false;
    const onScroll = () => {
      if (rafId !== null || snapping) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const st = mobileStRef.current?.scrollTrigger;
        if (!st) return;
        const cur = activeIdxRef.current;
        const y = window.scrollY;
        const lenis = (window as { lenis?: { scrollTo: (t: number, opts?: { duration?: number }) => void } }).lenis;
        if (y < st.start - 1 && cur > 0) {
          snapping = true;
          lenis?.scrollTo(st.start, { duration: 0.25 });
          window.setTimeout(() => { snapping = false; }, 350);
        } else if (y > st.end + 1 && cur < items.length - 1) {
          snapping = true;
          lenis?.scrollTo(st.end, { duration: 0.25 });
          window.setTimeout(() => { snapping = false; }, 350);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isMobile, items.length, mobileStRef]);

  const displayIndex = isMobile ? mobileActiveIdx : detailIndex;

  // 클릭 핸들러 — 데스크톱: detailIndex 만 set (sidebar 가 선택, IDE editor 가 해당 item 렌더) / 모바일: 즉시 점프 + index sync
  const handleItemClick = useCallback(
    (index: number) => {
      if (isMobile) {
        const handle = mobileStRef.current;
        const st = handle?.scrollTrigger;
        if (!st) return;
        const targetProgress = (index + 0.5) / items.length;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        // immediate: true → Lenis 가 animation 없이 즉시 jump → 사용자에겐 탭/내용만 바뀌는 것처럼 보임
        const lenis = (window as { lenis?: { scrollTo: (t: number, opts?: { immediate?: boolean }) => void } }).lenis;
        if (lenis) {
          lenis.scrollTo(targetScroll, { immediate: true });
        } else {
          window.scrollTo({ top: targetScroll });
        }
        // cascade 우회: 클릭 점프는 한 칸씩 step 하지 않고 한번에 목표 idx 로 sync
        handle.syncIndex(index);
        return;
      }
      // PC: sidebar 클릭 = activeIdx 변경. IDE editor 가 해당 item 렌더.
      setDetailIndex(index);
    },
    [isMobile, mobileStRef, items.length],
  );
  // ide editor wheel handler 에서 사용 가능하도록 ref 에 최신 함수 reference 보관
  useEffect(() => { handleItemClickRef.current = handleItemClick; });

  // 활성 항목 변경 시 해당 항목으로 리스트 자동 스크롤.
  // visibleItems 순서 (filter/collapse 적용 후) 의 index 로 DOM listItems 와 매칭.
  useEffect(() => {
    const scroll = listRef.current;
    if (!scroll || isMobile) return;

    const visIdx = visibleItems.findIndex((v) => v.idx === displayIndex);
    if (visIdx === -1) return; // 현재 active 항목이 filter/collapse 로 숨겨진 경우

    // 첫 번째 항목이면 맨 위로 (section label 포함)
    if (visIdx === 0) {
      scroll.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const listItems = scroll.querySelectorAll(`.${styles.troubleListItem}`);
    const item = listItems[visIdx] as HTMLElement | undefined;
    if (!item) return;

    // section label이 바로 위에 있으면 그것까지 보이도록
    const prev = item.previousElementSibling;
    const targetTop = prev?.classList.contains(styles.troubleSectionLabel)
      ? (prev as HTMLElement).offsetTop
      : item.offsetTop;

    const itemBottom = item.offsetTop + item.offsetHeight;
    const viewTop = scroll.scrollTop;
    const visibleBottom = viewTop + scroll.clientHeight;

    if (targetTop < viewTop) {
      scroll.scrollTo({ top: targetTop, behavior: "smooth" });
    } else if (itemBottom > visibleBottom) {
      scroll.scrollTo({ top: itemBottom - scroll.clientHeight, behavior: "smooth" });
    }
  }, [displayIndex, isMobile, visibleItems]);

  // PC: 패널 위 wheel → 항목 (탭/파일) advance. 마지막/처음 도달 시 wheel 통과 → 가로 다음 패널.
  // editor content 가 스크롤 가능하면 우선 editor 스크롤 (긴 항목 본문 가독성).
  // sidebar 위에서 휠 — sidebar list 자체 스크롤만, item advance 안 함.
  // Cooldown 으로 trackpad 폭주 (한 번 스크롤에 여러 step) 차단.
  const detailIndexRef = useRef(detailIndex);
  useEffect(() => {
    detailIndexRef.current = detailIndex;
  }, [detailIndex]);
  // 시간 기반 throttle — 연속 swipe 도 일정 간격 (COOLDOWN_MS) 으로 step. release 없이도 자동으로 이어 advance.
  // 누적 + cooldown 조합: 누적 ≥ threshold 일 때만 + 마지막 advance 후 cooldown 지났을 때만.
  const scrollAccumRef = useRef(0);
  const lastActiveTimeRef = useRef(0);
  const lastAdvanceRef = useRef(0);

  // displayIndex 변경 시 editor content 를 smooth 하게 맨 위로 — 새 항목 제목부터.
  // 1) 이전 motion.div (exit 중) 도 같이 smooth 하게 위로 (rewind 느낌)
  // 2) AnimatePresence wait 모드 라 새 motion.div mount 후 한 번 더 — rAF 로 paint 후
  useEffect(() => {
    if (isMobile) return;
    const editor = ideEditorRef.current;
    if (!editor) return;
    const rewind = () => {
      editor.querySelectorAll(`.${styles.ideEditorContent}`).forEach((el) => {
        (el as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    rewind(); // 즉시 — 이전 content 도 위로 rewind
    const raf = requestAnimationFrame(() => {
      // 다음 frame — 새 motion.div mount 됐으면 거기에도 적용
      rewind();
    });
    return () => cancelAnimationFrame(raf);
  }, [displayIndex, isMobile]);
  useEffect(() => {
    if (isMobile) return;
    const QUIET_MS = 100; // 이 이상 active wheel 없으면 누적 reset
    const ACTIVE_DELTA = 5;
    const ITEM_THRESHOLD = 120; // 누적 delta px — 1 항목 advance 트리거
    const PANEL_THRESHOLD = 200;
    const EDGE_TOLERANCE = 5;
    const COOLDOWN_MS = 400; // advance 후 이 시간 동안은 추가 advance 차단 → 연속 swipe 가 너무 빠르게 안 넘어감

    const handleWheel = (e: WheelEvent) => {
      const panel = panelRef.current;
      const editor = ideEditorRef.current;
      const list = listRef.current;
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      const extraWidth = panelRect.width - window.innerWidth;
      if (extraWidth <= 0) return;
      const progress = -panelRect.left / extraWidth;
      if (progress < 0.02 || progress > 0.98) return;

      // sidebar 위에서 휠 — sidebar 자체 스크롤만. 본문/패널 절대 안 건드림 (Lenis 도 차단).
      if (list && list.contains(e.target as Node)) {
        const { scrollTop: lTop, scrollHeight: lH, clientHeight: lCh } = list;
        e.stopPropagation();
        e.preventDefault();
        if (lH > lCh) {
          const lAtTop = lTop <= 0;
          const lAtBottom = lTop + lCh >= lH - 1;
          if ((e.deltaY > 0 && !lAtBottom) || (e.deltaY < 0 && !lAtTop)) {
            list.scrollBy({ top: e.deltaY });
          }
        }
        scrollAccumRef.current = 0;
        return;
      }

      // weak delta (momentum tail) — 차단 (Lenis 가 가로로 슬쩍 advance 시키지 못하도록)
      if (Math.abs(e.deltaY) < ACTIVE_DELTA) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      const now = performance.now();
      // quiet 후 새 burst — 누적 reset
      if (now - lastActiveTimeRef.current > QUIET_MS) {
        scrollAccumRef.current = 0;
      }
      lastActiveTimeRef.current = now;

      // cooldown 중 — 추가 advance 차단 (editor scroll 도 차단해서 새 content 의 scrollTop 보호).
      if (now - lastAdvanceRef.current < COOLDOWN_MS) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // editor 내부 스크롤 — 본문이 길어 자체 스크롤 가능 + edge 아닐 때
      const content = editor?.querySelector(`.${styles.ideEditorContent}`) as HTMLElement | null;
      if (content && content.scrollHeight > content.clientHeight + EDGE_TOLERANCE) {
        const atTop = content.scrollTop <= EDGE_TOLERANCE;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - EDGE_TOLERANCE;
        const goingDown = e.deltaY > 0;
        const goingUp = e.deltaY < 0;
        if ((goingDown && !atBottom) || (goingUp && !atTop)) {
          e.stopPropagation();
          e.preventDefault();
          content.scrollBy({ top: e.deltaY });
          scrollAccumRef.current = 0;
          return;
        }
      }

      // 누적
      scrollAccumRef.current += e.deltaY;

      const cur = detailIndexRef.current;
      const curVisIdx = visibleItems.findIndex((v) => v.idx === cur);
      const dir = scrollAccumRef.current > 0 ? 1 : -1;
      const nextVisIdx = dir > 0
        ? Math.min(visibleItems.length - 1, curVisIdx + 1)
        : Math.max(0, curVisIdx - 1);
      const nextOriginalIdx = visibleItems[nextVisIdx]?.idx ?? cur;
      const atBoundary = nextOriginalIdx === cur;

      // boundary — 마지막 항목 + 아래 방향 (dir > 0) 일 때만 panel advance (scrollBy 로 직접).
      if (atBoundary) {
        e.stopPropagation();
        e.preventDefault();
        if (dir > 0 && Math.abs(scrollAccumRef.current) >= PANEL_THRESHOLD && scrollBy) {
          scrollAccumRef.current = 0;
          lastAdvanceRef.current = now;
          scrollBy(window.innerWidth);
        }
        return;
      }

      // item advance 임계치 미달 — 누적 중 (Lenis 차단)
      if (Math.abs(scrollAccumRef.current) < ITEM_THRESHOLD) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // advance 1 step + cooldown 설정 → 이후 COOLDOWN_MS 동안 추가 advance 차단 (계속 스크롤해도 throttle)
      e.stopPropagation();
      e.preventDefault();
      setDetailIndex(nextOriginalIdx);
      scrollAccumRef.current = 0;
      lastAdvanceRef.current = now;
    };
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [isMobile, visibleItems, scrollBy, panelRef]);

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 (데스크톱),
          모바일에서는 useMobilePinScroll 가 contentRef 를 핀 → 100vh 뷰포트 */}
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}>
        <PinnedTitleRow
          className={`${styles.titleRowCompact} ${local.troublePinTitleRow}`}
          title={<T k="aboutPage.panels.troubleShooting" />}
          compact
          animate
        />

        {/* IDE wrapper — sidebar (PC) + main pane (breadcrumb + editor + status bar). Mobile 은 sidebar 숨김 + tab bar 노출 */}
        <div className={`${styles.ideWrap} ${styles.animate}`}>
          {/* sidebar — IDE 탐색기 (Explorer) 스타일. PC 만 노출 (mobile 은 tab bar 가 대신) */}
          <div className={styles.troubleList}>
            <div className={styles.ideExplorerHeader}>
              <span>{language === "ko" ? "탐색기" : "Explorer"}</span>
              <div ref={filterWrapRef} className={styles.ideExplorerFilterWrap}>
                <button
                  type="button"
                  data-clickable="true"
                  className={`${styles.ideExplorerFilterBtn} ${filterMode !== "all" ? styles.ideExplorerFilterBtnActive : ""}`}
                  onClick={() => setFilterMenuOpen((o) => !o)}
                  aria-label={language === "ko" ? "필터" : "Filter"}
                >
                  <Filter size={12} strokeWidth={2} />
                </button>
                {filterMenuOpen && (
                  <div className={styles.ideExplorerFilterMenu} role="menu">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={String(opt.key)}
                        type="button"
                        data-clickable="true"
                        className={`${styles.ideExplorerFilterMenuItem} ${filterMode === opt.key ? styles.ideExplorerFilterMenuItemActive : ""}`}
                        onClick={() => {
                          setFilterMode(opt.key);
                          setFilterMenuOpen(false);
                        }}
                      >
                        <span className={styles.ideExplorerFilterCheck}>
                          {filterMode === opt.key && <Check size={11} strokeWidth={2.5} />}
                        </span>
                        <span>{opt.label[language]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div ref={listRef} className={styles.troubleListScroll}>
              {visibleItems.map(({ item, idx: index }, visIdx) => {
                // 같은 section 의 첫 번째 항목일 때만 라벨 렌더 (그룹 헤더 역할) — filter 후 prev 기준
                const prev = visIdx > 0 ? visibleItems[visIdx - 1].item : null;
                const isSectionStart = !!item.section && item.section.ko !== prev?.section?.ko;
                // 그룹 내 visible 위치 — count badge 용 (filter 적용된 카운트)
                const sectionItems = visibleItems.filter((v) => v.item.section?.ko === item.section?.ko);
                const sectionKey = item.section?.ko ?? "__none__";
                const isCollapsed = collapsedSections.has(sectionKey);
                return (
                  <React.Fragment key={index}>
                    {isSectionStart && item.section && (
                      <div
                        data-clickable="true"
                        className={styles.troubleSectionLabel}
                        onClick={() => toggleSection(sectionKey)}
                      >
                        <span className={styles.troubleSectionFolder}>
                          <ChevronDown
                            size={12}
                            strokeWidth={2}
                            className={`${styles.ideExplorerChevron} ${isCollapsed ? styles.ideExplorerChevronCollapsed : ""}`}
                            aria-hidden
                          />
                          <Folder size={12} strokeWidth={2} className={styles.ideExplorerFolderIcon} aria-hidden />
                          {item.section[language]}
                        </span>
                        <span className={styles.troubleSectionCount}>{sectionItems.length}</span>
                      </div>
                    )}
                    {!isCollapsed && (
                    <Tooltip
                      placement="right"
                      delay={250}
                      wrapperStyle={{ display: "block", width: "100%", minWidth: 0 }}
                      content={
                        <div className={styles.ideExplorerFileTooltip}>
                          <div className={styles.ideExplorerFileTooltipMain}>{item.problem[language]}</div>
                          {item.problem[language === "ko" ? "en" : "ko"] !== item.problem[language] && (
                            <div className={styles.ideExplorerFileTooltipSub}>
                              {item.problem[language === "ko" ? "en" : "ko"]}
                            </div>
                          )}
                          {item.difficulty && (
                            <div className={styles.ideExplorerFileTooltipDifficulty}>
                              <span className={`${styles.difficultyBadge} ${styles[`difficultyTone_${DIFFICULTY_META[item.difficulty].tone}`]}`}>
                                {DIFFICULTY_META[item.difficulty].label[language]}
                              </span>
                              <span className={styles.ideExplorerFileTooltipDifficultyDesc}>
                                {DIFFICULTY_META[item.difficulty].desc[language]}
                              </span>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div
                        data-clickable="true"
                        className={`${styles.troubleListItem} ${styles.troubleListItemGrouped} ${
                          index === displayIndex ? styles.troubleListItemActive : ""
                        }`}
                        onClick={() => handleItemClick(index)}
                      >
                        <FileText size={12} strokeWidth={1.75} className={styles.ideExplorerFileIcon} aria-hidden />
                        <span className={styles.troubleNumber}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.troubleListTitle}>
                          {item.problem[language]}
                        </span>
                        <span className={styles.troubleListBadges}>
                          {item.difficulty && <DifficultyBadge level={item.difficulty} language={language} />}
                          {/* 별표 영역은 항상 자리 차지 (item 마다 같은 레이아웃 유지) */}
                          <span className={styles.troubleRecommendedBadge} title={item.recommended ? "추천" : undefined} aria-hidden={!item.recommended}>
                            {item.recommended && <Star size={11} fill="currentColor" strokeWidth={1.5} />}
                          </span>
                        </span>
                      </div>
                    </Tooltip>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Main pane — sidebar 오른쪽에 위치 (PC), 단독 column (mobile) */}
          <div className={styles.ideMainPane}>
          {/* Breadcrumb */}
          <div className={styles.ideBreadcrumb}>
            <span className={styles.ideBreadcrumbCrumb}>src</span>
            <span className={styles.ideBreadcrumbSep}>/</span>
            <span className={styles.ideBreadcrumbCrumb}>troubleshooting</span>
            {items[displayIndex]?.section && (
              <>
                <span className={styles.ideBreadcrumbSep}>/</span>
                <span className={styles.ideBreadcrumbCrumb}>
                  {items[displayIndex].section![language].toLowerCase().replace(/\s+/g, "-")}
                </span>
              </>
            )}
            <span className={styles.ideBreadcrumbSep}>/</span>
            <span className={styles.ideBreadcrumbFile}>
              {String(displayIndex + 1).padStart(2, "0")}.md
            </span>
          </div>

          {/* Tab bar — 모든 항목 표시, 활성만 indicator. 모바일 터치는 native overflow scroll, 데스크톱은 mouse drag */}
          <div
            ref={ideTabBarRef}
            className={styles.ideTabBar}
            data-lenis-prevent
            onMouseDown={handleTabMouseDown}
          >
            <LayoutGroup id="trouble-ide-tabs">
              {items.map((item, index) => {
                const isActive = index === displayIndex;
                const filename = `${String(index + 1).padStart(2, "0")}.md`;
                return (
                  <Tooltip
                    key={index}
                    content={item.problem[language]}
                    placement="bottom"
                    delay={150}
                  >
                    <button
                      type="button"
                      data-clickable="true"
                      className={`${styles.ideTab} ${isActive ? styles.ideTabActive : ""}`}
                      onClick={() => {
                        // 드래그 5px 이상 움직였으면 click 무시
                        if (tabDragRef.current.moved > 5) return;
                        handleItemClick(index);
                      }}
                    >
                      {item.recommended ? (
                        <Star
                          size={11}
                          fill="currentColor"
                          strokeWidth={1.5}
                          className={styles.ideTabStar}
                          aria-hidden
                        />
                      ) : (
                        <span className={styles.ideTabDot} aria-hidden />
                      )}
                      <span className={styles.ideTabName}>{filename}</span>
                      {isActive && (
                        <motion.span
                          layoutId="ide-tab-indicator"
                          className={styles.ideTabIndicator}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </LayoutGroup>
          </div>

          {/* Editor pane */}
          <div ref={ideEditorRef} className={styles.ideEditor}>
            <AnimatePresence mode="wait" initial={false}>
              {(() => {
                const item = items[displayIndex];
                if (!item) return null;
                return (
                  <motion.div
                    key={displayIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className={styles.ideEditorContent}
                    style={{ "--ide-font-scale": ideFontScale } as React.CSSProperties}
                    data-lenis-prevent
                  >
                    {/* Header (메타 정보) */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHash}>#</span>{" "}
                        <span className={styles.ideTitle}>
                          {item.problem[language]}
                          <span className={styles.ideCursor} aria-hidden>▊</span>
                        </span>
                      </span>
                    </div>
                    <div className={`${styles.ideLine} ${styles.ideLineEmpty}`}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText} />
                    </div>
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideComment}>{"// "}@section: {item.section?.[language] ?? "-"}</span>
                      </span>
                    </div>
                    {item.difficulty && (
                      <div className={styles.ideLine}>
                        <span className={styles.ideLineNum} />
                        <span className={styles.ideLineText}>
                          <span className={styles.ideComment}>
                            {"// "}@difficulty: {DIFFICULTY_META[item.difficulty].label[language]}
                          </span>
                        </span>
                      </div>
                    )}
                    {item.recommended && (
                      <div className={styles.ideLine}>
                        <span className={styles.ideLineNum} />
                        <span className={styles.ideLineText}>
                          <span className={styles.ideComment}>
                            {"// "}@recommended{item.recommendReason ? `: ${item.recommendReason[language]}` : ""}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Cause */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={styles.ideHeading}>
                          <T k="aboutPage.troubleshooting.cause" />
                        </span>
                      </span>
                    </div>
                    {renderParagraphs(item.cause[language])}
                    {renderImagesAt(item, "cause")}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Solution */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={`${styles.ideHeading} ${styles.ideHeadingAccent}`}>
                          <T k="aboutPage.troubleshooting.solution" />
                        </span>
                      </span>
                    </div>
                    {renderParagraphs(item.solution[language])}
                    {renderImagesAt(item, "solution")}

                    {item.comparisons && item.comparisons.length > 0 && (
                      <>
                        <div className={styles.ideDivider} aria-hidden />
                        <div className={styles.ideIndent}>
                          <div className={local.troubleComparisons}>
                            {item.comparisons.map((table, ti) => (
                              <div key={ti} className={local.troubleComparisonWrap}>
                                {table.label && (
                                  <span className={local.troubleComparisonLabel}>{table.label[language]}</span>
                                )}
                                <table className={local.troubleTable}>
                                  <thead>
                                    <tr>
                                      {table.headers.map((h, hi) => (
                                        <th key={hi}>{h[language]}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.rows.map((row, ri) => (
                                      <tr key={ri} className={row.highlight ? local.troubleTableRowHighlight : undefined}>
                                        {row.cells.map((cell, ci) => (
                                          <td key={ci}>{renderHighlight(cell[language], language)}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {item.diagrams && item.diagrams.length > 0 && (
                      <>
                        <div className={styles.ideDivider} aria-hidden />
                        <div className={styles.ideLine}>
                          <span className={styles.ideLineNum} />
                          <span className={styles.ideLineText}>
                            <span className={styles.ideHashH2}>##</span>{" "}
                            <span className={styles.ideHeading}>
                              <T k="aboutPage.troubleshooting.flow" />
                            </span>
                          </span>
                        </div>
                        <div className={styles.ideIndent}>
                          <div className={styles.troubleDiagrams}>
                            {item.diagrams.map((d, di) => (
                              <div key={di} className={styles.troubleDiagramItem}>
                                <div className={styles.troubleDiagramFrame}>
                                  {d.title && (
                                    <span className={local.troubleDiagramTitle}>{d.title[language]}</span>
                                  )}
                                  <FlowDiagram nodes={d.nodes} edges={d.edges} language={language} />
                                </div>
                                <button
                                  type="button"
                                  data-clickable="true"
                                  className={styles.ideDiagramHint}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnlargedDiagram(d);
                                  }}
                                  aria-label="크게 보기"
                                >
                                  <Maximize2 strokeWidth={2} className={styles.ideDiagramHintIcon} />
                                  크게 보기
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Key insight */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideComment}>
                          {"/* "}<T k="aboutPage.troubleshooting.keyInsight" />{" */"}
                        </span>
                      </span>
                    </div>
                    {renderParagraphs(item.keyInsight[language], { insightStyle: true })}
                    {renderImagesAt(item, "insight")}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Status bar — 우측에 폰트 크기 조절 버튼 */}
          <div className={styles.ideStatusBar}>
            <span className={styles.ideStatusGroup}>
              <span className={styles.ideStatusDot} aria-hidden />
              {items[displayIndex]?.section?.[language] ?? "-"}
            </span>
            <span className={styles.ideStatusGroup}>
              {String(displayIndex + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
            </span>
            <span className={styles.ideStatusGroup}>MARKDOWN</span>
            <span className={styles.ideStatusFontControls} style={{ position: "relative" }}>
              <AnimatePresence>
                {showFontTooltip && (
                  <motion.span
                    key="font-tooltip"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className={styles.ideFontTooltip}
                  >
                    글자 크기 조절
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                data-clickable="true"
                className={styles.ideStatusFontBtn}
                onClick={() => {
                  setIdeFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)));
                  setShowFontTooltip(false);
                }}
                disabled={ideFontScale <= 0.8}
                aria-label="Decrease font size"
              >
                A−
              </button>
              <span className={styles.ideStatusFontValue}>
                {Math.round(ideFontScale * 100)}%
              </span>
              <button
                type="button"
                data-clickable="true"
                className={styles.ideStatusFontBtn}
                onClick={() => {
                  setIdeFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)));
                  setShowFontTooltip(false);
                }}
                disabled={ideFontScale >= 1.4}
                aria-label="Increase font size"
              >
                A+
              </button>
            </span>
          </div>
        </div>
        </div>

      </div>

      {/* Flow chart 인터랙티브 풀스크린 viewer — 휠 zoom, 드래그 pan, 컨트롤 버튼 */}
      {enlargedDiagram && (
        <DiagramFullscreenViewer
          diagram={enlargedDiagram}
          language={language}
          onClose={() => setEnlargedDiagram(null)}
        />
      )}

      {/* 공통 ImageViewer — zoom / pan / 멀티 image 네비 / 키보드 / 풀스크린 등 모두 지원 */}
      <ImageViewer
        images={viewerState?.images ?? []}
        index={viewerState?.index ?? 0}
        open={!!viewerState && viewerState.images.length > 0}
        onClose={() => setViewerState(null)}
        title={viewerState?.title}
      />
    </div>
  );
}

export default memo(TroubleshootingPanel);
