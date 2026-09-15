"use client";

import { forwardRef, memo, useCallback, useState } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { motion, MotionValue } from "framer-motion";
import { WorkItem } from "@/data/works";
import { pickLocalized } from "@/types/common";
import T from "@/components/ui/T";
import type { Language } from "@/providers/LanguageProvider";
import {
  PressingWork,
  HoveringWork,
} from "@/types";
import Tooltip from "@/components/ui/Tooltip";
import TransitionLink from "@/components/ui/TransitionLink";
import { useLanguage } from "@/providers/LanguageProvider";
import { getHoverDirection } from "@/utils/gestureUtils";
import styles from "./WorksSection.module.css";

/** 그리드 내 이미지가 배치될 열 인덱스 (행별) */
const IMAGE_POSITIONS = [
  [0, 4],       // row 0
  [1, 3],       // row 1
  [0, 2, 4],    // row 2
  [1, 3],       // row 3
  [0, 4],       // row 4
];

// ─── 개별 워크 아이템 (memo) ───────────────────────────────────────────

interface WorkCircleProps {
  work: WorkItem;
  language: Language;
  tooltipContent: string;
  smoothWorkImageY: MotionValue<number>;
  isPressing: boolean;
  isHovering: boolean;
  currentScale: number;
  hoverDirX: number;
  hoverDirY: number;
  onCircleRef: (el: HTMLDivElement | null) => void;
  onPressStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  onPressEnd: () => void;
  /** 그냥 누른 클릭 — rect 는 원의 영역 */
  onNavigate: (rect: DOMRect) => void;
  onHoverStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onHoverEnd: () => void;
}

const TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" };

const WorkCircle = memo(function WorkCircle({
  work,
  language,
  tooltipContent,
  smoothWorkImageY,
  isPressing,
  isHovering,
  currentScale,
  hoverDirX,
  hoverDirY,
  onCircleRef,
  onPressStart,
  onPressEnd,
  onNavigate,
  onHoverStart,
  onHoverEnd,
}: WorkCircleProps) {
  return (
    <Tooltip content={tooltipContent} placement="top" wrapperStyle={TOOLTIP_WRAPPER_STYLE}>
    <motion.div
      className={`${styles.circle} work-circle`}
      onMouseDown={(e) => { if (e.button === 0) onPressStart(e); }}
      onMouseUp={onPressEnd}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      ref={onCircleRef}
      animate={{ scale: currentScale }}
      whileHover={{
        scale: isPressing || isHovering ? currentScale : 1.05,
      }}
      transition={{
        scale: { duration: 0.1, ease: "easeOut" },
      }}
    >
      <div className={styles.imageWrapper}>
        <motion.div
          className={styles.imageInner}
          style={{ y: smoothWorkImageY }}
        >
          <motion.div
            className={styles.mainImageContainer}
            animate={{
              scale: isHovering ? 1.08 : 1,
              filter: isHovering
                ? "brightness(0.4) saturate(0.5)"
                : "brightness(1) saturate(1)",
            }}
            transition={{
              duration: 1.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <MediaThumb
              src={work.main}
              alt={`Work ${work.id}`}
              fill
              sizes="(max-width: 768px) 40vw, (max-width: 1024px) 30vw, 25vw"
              className={styles.image}
            />
          </motion.div>

          <motion.div
            className={styles.hoverImageContainer}
            initial={false}
            animate={{
              clipPath: isHovering
                ? "circle(80% at 50% 50%)"
                : `circle(0% at ${50 + hoverDirX * 25}% ${50 + hoverDirY * 25}%)`,
              scale: isHovering ? 1 : 0.9,
            }}
            transition={{
              clipPath: {
                duration: 1.4,
                ease: [0.25, 0.1, 0.25, 1],
              },
              scale: {
                duration: 1.2,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
          >
            <motion.div
              animate={{
                scale: isHovering ? 1 : 1.1,
                x: isHovering ? 0 : hoverDirX * -15,
                y: isHovering ? 0 : hoverDirY * -15,
              }}
              transition={{
                duration: 1.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              style={{ width: "100%", height: "100%", position: "relative" }}
            >
              <MediaThumb
                src={work.hover}
                alt={`Work ${work.id}`}
                fill
                sizes="(max-width: 768px) 40vw, (max-width: 1024px) 30vw, 25vw"
                className={styles.image}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 원을 덮는 작업물 링크(#933) — 그냥 누르면 원이 커지는 전환으로, 새 탭 클릭은 브라우저가 연다. 누르기·길게 누르기·
          오래 올려 두기는 바깥(motion.div)이 그대로 받는다. 길게 누르기와 겹치지 않게 링크 끌기·터치 길게 누르기 메뉴는 끈다 */}
      <TransitionLink
        href={`/works/${work.projectSlug || work.projectId}`}
        className={styles.circleLink}
        aria-label={pickLocalized(work.title, language)}
        draggable={false}
        getRect={(link) => (link.parentElement ?? link).getBoundingClientRect()}
        navigate={onNavigate}
        onContextMenu={(e) => { if ((e.nativeEvent as PointerEvent).pointerType === "touch") e.preventDefault(); }}
      />

      {/* Text overlay */}
      <motion.div
        className={styles.textOverlay}
        initial={false}
        animate={{ opacity: isHovering ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <span className={styles.overlayTitle}><T ko={work.title.ko} en={work.title.en} /></span>
        <span className={styles.overlayCategory}>{work.category[language]}</span>
      </motion.div>
    </motion.div>
    </Tooltip>
  );
});

// ─── WorksSection ──────────────────────────────────────────────────────

interface WorksSectionProps {
  /** 홈 Selected Works 항목 — 핀 → 인기순 → 최신순으로 랭킹된 11개 슬롯 (server: getHomeWorks) */
  works: WorkItem[];
  smoothWorkImageY: MotionValue<number>;
  setWorkCircleRef: (id: string, el: HTMLDivElement | null) => void;
  pressingWork: PressingWork | null;
  hoveringWork: HoveringWork | null;
  handlePressStart: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    work: WorkItem
  ) => void;
  handlePressEnd: () => void;
  handleWorkClick: (work: WorkItem, rect: DOMRect) => void;
  handleHoverStart: (e: React.MouseEvent<HTMLDivElement>, work: WorkItem) => void;
  handleHoverEnd: () => void;
}

const WorksSection = forwardRef<HTMLElement, WorksSectionProps>(
  (
    {
      works,
      smoothWorkImageY,
      setWorkCircleRef,
      pressingWork,
      hoveringWork,
      handlePressStart,
      handlePressEnd,
      handleWorkClick,
      handleHoverStart,
      handleHoverEnd,
    },
    ref
  ) => {
    const { t, language } = useLanguage();
    const [hoverDirections, setHoverDirections] = useState<{ [key: string]: { x: number; y: number } }>({});

    const updateHoverDirection = useCallback(
      (e: React.MouseEvent<HTMLDivElement>, workId: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const dir = getHoverDirection(rect, e.clientX, e.clientY);
        setHoverDirections((prev) => ({
          ...prev,
          [workId]: dir,
        }));
      },
      []
    );

    // 그리드 아이템 생성
    const items = [];
    let workIndex = 0;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        if (row === 4 && col >= 1 && col <= 3) continue;

        const hasImage = IMAGE_POSITIONS[row].includes(col);
        const work =
          hasImage && workIndex < works.length
            ? works[workIndex++]
            : null;

        if (!work) {
          items.push(<div key={index} className={styles.gridItem} />);
          continue;
        }

        const isPressing = pressingWork?.id === work.id;
        const pressScale = isPressing && pressingWork ? pressingWork.scale : 1;
        const isHovering = hoveringWork?.id === work.id && !isPressing;
        const hoverScale = isHovering && hoveringWork ? hoveringWork.scale : 1;
        const currentScale = isPressing ? pressScale : isHovering ? hoverScale : 1;
        const dir = hoverDirections[work.id];

        items.push(
          <div
            key={index}
            className={styles.gridItem}
            ref={(el) => setWorkCircleRef(work.id, el as HTMLDivElement)}
          >
            <WorkCircle
              work={work}
              language={language}
              tooltipContent={`${pickLocalized(work.title, language)}\n${t("tooltip.longHoverNavigate")}`}
              smoothWorkImageY={smoothWorkImageY}
              isPressing={isPressing}
              isHovering={isHovering}
              currentScale={currentScale}
              hoverDirX={dir?.x ?? 0}
              hoverDirY={dir?.y ?? 0}
              onCircleRef={() => {}} // ref는 부모 div에서 처리
              onPressStart={(e) => handlePressStart(e, work)}
              onPressEnd={handlePressEnd}
              onNavigate={(rect) => handleWorkClick(work, rect)}
              onHoverStart={(e) => {
                updateHoverDirection(e, work.id);
                handleHoverStart(e, work);
              }}
              onHoverEnd={() => {
                handlePressEnd();
                handleHoverEnd();
              }}
            />
          </div>
        );
      }
    }

    items.push(
      <div key="title" className={styles.titleCell}>
        <h2 className={styles.titleText} aria-hidden="true">
          Selected
          <br />
          Works
        </h2>
      </div>
    );

    return (
      <section className={styles.works} ref={ref}>
        <div className={styles.container}>
          <div className={styles.grid}>{items}</div>
        </div>
      </section>
    );
  }
);

WorksSection.displayName = "WorksSection";

export default WorksSection;
