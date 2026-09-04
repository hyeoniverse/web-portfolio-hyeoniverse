"use client";

import React, { useCallback, useRef, useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Maximize2, ImageIcon } from "@/components/icons";
import type { Language } from "@/providers/LanguageProvider";
import { aboutDecisions } from "@/data/generated/aboutContent";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { TroubleshootingDiagram, TroubleshootingImage, TroubleShootingItem } from "@/data/about/types";
import { renderHighlight } from "../renderHighlight";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import FlowDiagram from "../FlowDiagram";
import T from "@/components/ui/T";
import { ImageViewer } from "@/components/ui/ImageViewer";
import shared from "../AboutSection.module.css";
import local from "./TroubleshootingPanel.module.css";
import Pressable from "@/components/ui/Pressable";
import DiagramFullscreenViewer from "./troubleshooting/DiagramFullscreenViewer";
import CanonicalCodeBlock from "./troubleshooting/CanonicalCodeBlock";
import { makeVizFeeder, displayTitle } from "./troubleshooting/itemHelpers";
import { DIFFICULTY_META } from "./troubleshooting/difficulty";
import TroubleExplorer from "./troubleshooting/TroubleExplorer";
import TroubleStatusBar from "./troubleshooting/TroubleStatusBar";
import TroubleTabBar from "./troubleshooting/TroubleTabBar";
const styles = { ...shared, ...local };


interface TroubleshootingPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}


function TroubleshootingPanel({
  language,
  scrollBy,
}: TroubleshootingPanelProps) {
  /* admin(about.troubleshooting) override — 비어있으면 정적 데이터 */
  const cfg = useSiteConfig();
  const cfgItems = cfg.about.troubleshooting;
  const items = cfgItems && cfgItems.length > 0 ? cfgItems : aboutDecisions;
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
  // 필터는 사이드바(TroubleExplorer)가 들고 있고, 결과 목록만 받아 온다 —
  // 탭 바와 스크롤 전환이 사이드바와 같은 목록을 봐야 한다.
  const [visibleItems, setVisibleItems] = useState<{ item: TroubleShootingItem; idx: number }[]>(
    () => items.map((item, idx) => ({ item, idx })),
  );
  // 공통 ImageViewer — 클릭한 이미지가 viewer 의 시작 index, 같은 item 의 src 있는 이미지들이 list 가 됨
  const [viewerState, setViewerState] = useState<{ images: string[]; index: number; title?: string } | null>(null);
  const openImageViewer = useCallback((item: TroubleShootingItem, clickedImg: TroubleshootingImage) => {
    const srcs = (item.images ?? []).filter((i): i is TroubleshootingImage & { src: string } => !!i.src).map((i) => i.src);
    const idx = clickedImg.src ? srcs.indexOf(clickedImg.src) : 0;
    setViewerState({ images: srcs, index: Math.max(0, idx), title: displayTitle(item)[language] });
  }, [language]);

  /** \n\n 로 구분된 문단을 각각 별도 ideLine 으로 렌더 + 사이에 빈 줄. ``` 펜스는 코드블록으로.
   *  인라인 `code`·**bold**·*italic*·용어 툴팁은 renderHighlight 가 처리. */
  const renderParagraphs = useCallback(
    (
      text: string,
      opts?: { insightStyle?: boolean; takeViz?: () => React.ReactNode | null },
    ) => {
      // 펜스 코드블록(``` … ```)을 먼저 통째로 분리 — 블록 내부에 빈 줄(\n\n)이 있어도
      // \n\n 문단 분리에 두 동강 나지 않게 한다.
      type Block =
        | { type: "code"; code: string; lang: string }
        | { type: "prose"; text: string }
        | { type: "viz" };
      const blocks: Block[] = [];
      const pushProse = (chunk: string) => {
        for (const p of chunk.split(/\n\n+/)) {
          const t = p.replace(/^\n+|\n+$/g, "");
          if (!t.trim()) continue;
          /* `[[viz]]` 한 줄은 그 자리에 도형을 넣으라는 표시다. 도형을 섹션 끝에 몰지 않고
             설명이 필요한 문단 사이에 끼우기 위한 마커. */
          if (t.trim() === "[[viz]]") blocks.push({ type: "viz" });
          else blocks.push({ type: "prose", text: t });
        }
      };
      const fenceRe = /```[^\n]*\n[\s\S]*?```/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = fenceRe.exec(text)) !== null) {
        if (m.index > last) pushProse(text.slice(last, m.index));
        const fence = m[0];
        const lang = fence.match(/^```([^\n]*)/)?.[1]?.trim() ?? "";
        const code = fence.replace(/^```[^\n]*\n?/, "").replace(/\n?```\s*$/, "");
        blocks.push({ type: "code", code, lang });
        last = m.index + fence.length;
      }
      if (last < text.length) pushProse(text.slice(last));

      return blocks.map((blk, bi) => {
        const gap =
          bi > 0 ? (
            <div className={`${styles.ideLine} ${styles.ideLineEmpty}`}>
              <span className={styles.ideLineNum} />
              <span className={styles.ideLineText} />
            </div>
          ) : null;

        /* 본문 안의 `### 소제목` — 긴 항목에서 검토 대상을 나눠 준다.
           섹션 제목(##)은 패널이 그리고, 이건 섹션 안쪽 단계 구분용이다. */
        if (blk.type === "prose" && /^###\s+/.test(blk.text)) {
          return (
            <React.Fragment key={bi}>
              {gap}
              <div className={styles.ideLine}>
                <span className={styles.ideLineNum} />
                <span className={styles.ideLineText}>
                  <span className={styles.ideHashH2}>###</span>{" "}
                  <span className={styles.ideHeading}>
                    {blk.text.replace(/^###\s+/, "")}
                  </span>
                </span>
              </div>
            </React.Fragment>
          );
        }

        if (blk.type === "viz") {
          const node = opts?.takeViz?.() ?? null;
          if (!node) return null;
          return (
            <React.Fragment key={bi}>
              {gap}
              {node}
            </React.Fragment>
          );
        }

        if (blk.type === "code") {
          return (
            <React.Fragment key={bi}>
              {gap}
              <div className={styles.ideIndent}>
                <CanonicalCodeBlock code={blk.code} lang={blk.lang} />
              </div>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={bi}>
            {gap}
            <div className={styles.ideLine}>
              <span className={styles.ideLineNum} />
              <span className={`${styles.ideLineText} ${opts?.insightStyle ? styles.ideInsight : ""}`}>
                {renderHighlight(blk.text, language)}
              </span>
            </div>
          </React.Fragment>
        );
      });
    },
    [language],
  );

  /** 특정 position 의 이미지들만 골라서 렌더 — content 흐름 안에 자연스럽게 끼워 넣기 위함 */
  const renderImagesAt = useCallback(
    (item: TroubleShootingItem, position: "definition" | "cause" | "solution" | "insight") => {
      const images = item.images;
      if (!images || images.length === 0) return null;
      const filtered = images.filter((img) => img.src && (img.position ?? "solution") === position);
      if (filtered.length === 0) return null;
      return (
        <div className={styles.ideIndent}>
          <div className={styles.troubleImages}>
            {filtered.map((img, ii) =>
              img.src ? (
                <figure key={ii} className={styles.troubleImage}>
                  {/* wrap (relative) > 이미지 button (clip + radius) + hint button (overflow 밖, 잘림 없음) */}
                  <div className={styles.troubleImageWrap}>
                    <Pressable noTapScale
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
                    </Pressable>
                    <Pressable noTapScale
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
                    </Pressable>
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
  const prevIdxRef = useRef(0);

  const handleMobileIndexChange = useCallback((idx: number) => {
    prevIdxRef.current = idx;
    setMobileActiveIdx(idx);
  }, []);

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
    const PUSH_THRESHOLD = 520; // edge 위 active 누적 = 손 안 떼고 "명백하게" 계속 세게 push 의 신호
    const COOLDOWN_MS = 250; // 전환 직후 잠금
    const EDGE_GRACE_MS = 420; // edge 도달 직후 이 시간 동안은 전환 X (fling 흡수)
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

  /* 열려 있는 항목을 markdown 으로 — 화면이 항목을 `01.md` 로 보여 주면서 정작 파일을
     꺼내 갈 방법이 없었다. 소제목 라벨은 화면과 같은 번역을 그대로 쓴다. */


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
    // 콘텐츠 끝에서 "명백하게 다음으로 넘어가려는" 세고 연속된 스크롤일 때만 전환.
    // 값이 낮으면 본문 끝에 닿자마자 살짝만 굴려도 넘어가 읽기를 방해한다.
    const ITEM_THRESHOLD = 450; // 누적 delta px — 1 항목 advance 트리거
    const PANEL_THRESHOLD = 500;
    const EDGE_TOLERANCE = 5;
    const COOLDOWN_MS = 400; // advance 후 이 시간 동안은 추가 advance 차단
    const EDGE_GRACE_MS = 400; // 본문 끝에 막 닿은 직후 이 시간 동안은 전환 X (fling 흡수)

    // 본문 끝(edge)에 진입한 시각. 0 = 아직 edge 아님. "멈췄다 다시 스크롤" 판정용.
    let atEdgeSince = 0;

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

      // 본문(editor content)이 스크롤 방향으로 더 갈 수 있으면 — 본문을 직접 스크롤(Lenis 가로 이동 차단).
      const content = editor?.querySelector(`.${styles.ideEditorContent}`) as HTMLElement | null;
      if (content && content.scrollHeight > content.clientHeight + EDGE_TOLERANCE) {
        const atTop = content.scrollTop <= EDGE_TOLERANCE;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - EDGE_TOLERANCE;
        const goingDown = e.deltaY > 0;
        if ((goingDown && !atBottom) || (!goingDown && !atTop)) {
          e.stopPropagation();
          e.preventDefault();
          content.scrollBy({ top: e.deltaY });
          scrollAccumRef.current = 0;
          atEdgeSince = 0;
          return;
        }
      }

      // 여기부터는 본문 끝(또는 스크롤 불가 항목). Lenis 가로 이동을 막고, "명백한 재스크롤" 일 때만 전환.
      e.stopPropagation();
      e.preventDefault();

      const now = performance.now();

      // momentum tail(약한 delta) — 무시. lastActive 를 갱신하지 않아 "손 뗌(release)" 을 감지할 수 있게 둔다.
      if (Math.abs(e.deltaY) < ACTIVE_DELTA) return;
      // 전환 직후 잠금
      if (now - lastAdvanceRef.current < COOLDOWN_MS) return;

      if (atEdgeSince === 0) atEdgeSince = now;
      const wasQuiet = now - lastActiveTimeRef.current > QUIET_MS;
      lastActiveTimeRef.current = now;

      // 끝에 막 닿은 직후 — 강한 fling 잔여 스크롤을 흡수(전환 X)
      if (now - atEdgeSince < EDGE_GRACE_MS) {
        scrollAccumRef.current = 0;
        return;
      }

      const cur = detailIndexRef.current;
      const curVisIdx = visibleItems.findIndex((v) => v.idx === cur);
      const dir = e.deltaY > 0 ? 1 : -1;
      const nextVisIdx = dir > 0
        ? Math.min(visibleItems.length - 1, curVisIdx + 1)
        : Math.max(0, curVisIdx - 1);
      const nextOriginalIdx = visibleItems[nextVisIdx]?.idx ?? cur;
      const atBoundary = nextOriginalIdx === cur;

      const doAdvance = () => {
        if (atBoundary) {
          // 마지막 항목 + 아래 방향일 때만 다음 패널로
          if (dir > 0 && scrollBy) {
            lastAdvanceRef.current = now;
            atEdgeSince = 0;
            scrollAccumRef.current = 0;
            scrollBy(window.innerWidth);
          }
          return;
        }
        setDetailIndex(nextOriginalIdx);
        lastAdvanceRef.current = now;
        atEdgeSince = 0;
        scrollAccumRef.current = 0;
      };

      // (a) 끝에서 멈췄다(quiet) 다시 스크롤 = 명백한 의도 → 즉시 전환
      if (wasQuiet) {
        doAdvance();
        return;
      }

      // (b) 손 안 떼고 계속 세게 밀 때만 — 높은 누적 임계 넘으면 전환
      scrollAccumRef.current += e.deltaY;
      if (Math.abs(scrollAccumRef.current) >= (atBoundary ? PANEL_THRESHOLD : ITEM_THRESHOLD)) {
        doAdvance();
      }
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
          panelKey="troubleshooting"
          className={`${styles.titleRowCompact} ${local.troublePinTitleRow}`}
          compact
          animate
        />

        {/* IDE wrapper — sidebar (PC) + main pane (breadcrumb + editor + status bar). Mobile 은 sidebar 숨김 + tab bar 노출 */}
        <div className={`${styles.ideWrap} ${styles.animate}`}>
          {/* sidebar — IDE 탐색기 (Explorer) 스타일. PC 만 노출 (mobile 은 tab bar 가 대신) */}
          <TroubleExplorer
            items={items}
            language={language}
            activeIndex={displayIndex}
            onItemClick={handleItemClick}
            listRef={listRef}
            onVisibleItemsChange={setVisibleItems}
          />

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

          <TroubleTabBar
            items={items}
            displayIndex={displayIndex}
            mobileActiveIdx={mobileActiveIdx}
            isMobile={isMobile}
            language={language}
            onSelect={handleItemClick}
          />

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
                          {displayTitle(item)[language]}
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
                    <div className={styles.ideDivider} aria-hidden />

                    {/* Symptom (definition) — 무슨 일이 있었나. 증상→원인→해결→교훈 4단의 첫 단 */}
                    {item.definition && (
                      <>
                        <div className={styles.ideLine}>
                          <span className={styles.ideLineNum} />
                          <span className={styles.ideLineText}>
                            <span className={styles.ideHashH2}>##</span>{" "}
                            <span className={styles.ideHeading}>
                              <T k="aboutPage.troubleshooting.definition" />
                            </span>
                          </span>
                        </div>
                        {(() => { const f = makeVizFeeder(item.vizKey, "definition", language); return (<>{renderParagraphs(item.definition![language], { takeViz: f.take })}{renderImagesAt(item, "definition")}{f.rest()}</>); })()}

                        <div className={styles.ideDivider} aria-hidden />
                      </>
                    )}

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
                    {(() => { const f = makeVizFeeder(item.vizKey, "cause", language); return (<>{renderParagraphs(item.cause[language], { takeViz: f.take })}{renderImagesAt(item, "cause")}{f.rest()}</>); })()}

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
                    {(() => { const f = makeVizFeeder(item.vizKey, "solution", language); return (<>{renderParagraphs(item.solution[language], { takeViz: f.take })}{renderImagesAt(item, "solution")}{f.rest()}</>); })()}

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
                                <Pressable noTapScale
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
                                </Pressable>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Key insight — 나머지 섹션과 동일한 ## 헤딩 */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={styles.ideHeading}>
                          <T k="aboutPage.troubleshooting.keyInsight" />
                        </span>
                      </span>
                    </div>
                    {(() => { const f = makeVizFeeder(item.vizKey, "insight", language); return (<>{renderParagraphs(item.keyInsight[language], { insightStyle: true, takeViz: f.take })}{renderImagesAt(item, "insight")}{f.rest()}</>); })()}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Status bar — 우측에 내보내기 + 폰트 크기 조절 버튼.
              좁은 화면에서는 바가 가로로 밀려 우측 버튼이 화면 밖으로 나간다. 그래서
              breadcrumb 에 이미 있는 정보(섹션 · 파일 형식)는 모바일에서 접는다. */}
          <TroubleStatusBar
            items={items}
            displayIndex={displayIndex}
            language={language}
            isMobile={isMobile}
            contentRef={contentRef}
            fontScale={ideFontScale}
            onFontScaleChange={setIdeFontScale}
          />
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
