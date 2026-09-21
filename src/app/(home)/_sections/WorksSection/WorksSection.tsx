"use client";

import { forwardRef, memo, useCallback, useState } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { motion, MotionValue } from "framer-motion";
import { WorkItem, coverFitStyle, type CoverFit } from "@/data/works";
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

/**
 * 원을 그릴 자리(5×5 격자의 칸 번호) — 작업물이 자리(11개)보다 적으면 아래 줄부터 채운다.
 *
 * 머리글("Selected Works")이 맨 아래 줄 가운데에 있다. 위부터 채우면 원이 위쪽에만 몰리고 머리글 둘레가
 * 비어, 머리글이 원들과 떨어진 채 혼자 남는다. 그래서 자리는 아래 줄부터(같은 줄에서는 왼쪽부터) 고른다.
 * 한가운데 칸(가운데 줄의 가운데)은 맨 나중이다 — 양옆이 먼저 차야 격자가 좌우로 고르게 보이고,
 * 가운데 하나만 먼저 서면 원들이 한가운데로 몰려 보인다.
 * 고른 자리에 작업물을 넣는 차례는 그대로 위에서 아래로다 — 자리가 다 차면 예전과 같은 배치가 된다.
 */
export function homeWorkSlots(count: number): Set<number> {
  const isCenter = (slot: number) => slot % 5 === 2;
  const order = IMAGE_POSITIONS.flatMap((cols, row) => cols.map((col) => row * 5 + col))
    .sort((a, b) => Number(isCenter(a)) - Number(isCenter(b)) || Math.floor(b / 5) - Math.floor(a / 5) || a - b);
  return new Set(order.slice(0, Math.max(0, count)));
}

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

/** 저장소 칸의 색 — 채움과 글자색을 CSS 변수로 넘긴다. 언어 색은 디자인 토큰이 아니라 값이 여기로 들어온다 */
const accentVars = (work: WorkItem): React.CSSProperties =>
  ({ "--repo-fill": work.accent, "--repo-ink": work.accentInk }) as React.CSSProperties;

/* 표지를 원 안에서 어디에 맞출지 — 설정에서 옮겨 둔 값이 없으면 가운데다.
   object-fit: cover 는 넘치는 쪽을 양끝에서 같이 깎으므로, 이 값이 무엇을 남길지 정한다 */
/* 설정에서 맞춰 둔 자리·배율을 그대로 적용한다 — 계산은 설정 화면의 미리보기와 같은 함수(coverFitStyle)가
   한다. 배율은 그림에만 걸리므로 올렸을 때의 확대 애니메이션(바깥 층)과는 곱해진다 */
const fitStyle = (fit?: CoverFit): React.CSSProperties | undefined =>
  fit ? { ...coverFitStyle(fit), transformOrigin: "center" } : undefined;

const coverStyle = (work: WorkItem) => fitStyle(work.mainFit);

/** 올렸을 때 드러나는 표지 — 다른 그림이면 맞출 자리도 배율도 다르다 */
const hoverCoverStyle = (work: WorkItem) => fitStyle(work.hoverFit);

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
            {/* 저장소 칸은 표지가 없다 — 주 언어 색으로 원을 채우고 이름을 얹는다.
                올려 두면 이름이 비키고, 아래의 글자층이 이름과 언어를 같이 보여준다 */}
            {work.main ? (
              <MediaThumb
                src={work.main}
                alt={`Work ${work.id}`}
                fill
                sizes="(max-width: 768px) 40vw, (max-width: 1024px) 30vw, 25vw"
                className={styles.image}
                style={coverStyle(work)}
              />
            ) : (
              <div className={styles.accentFill} style={accentVars(work)}>
                <motion.span
                  className={styles.accentLabel}
                  initial={false}
                  animate={{ opacity: isHovering ? 0 : 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {work.title.en}
                </motion.span>
              </div>
            )}
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
              {work.hover ? (
                <MediaThumb
                  src={work.hover}
                  alt={`Work ${work.id}`}
                  fill
                  sizes="(max-width: 768px) 40vw, (max-width: 1024px) 30vw, 25vw"
                  className={styles.image}
                  style={hoverCoverStyle(work)}
                />
              ) : (
                <div className={styles.accentFill} style={accentVars(work)} />
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 원을 덮는 링크(#933) — 그냥 누르면 원이 커지는 전환으로, 새 탭 클릭은 브라우저가 연다. 누르기·길게 누르기·
          오래 올려 두기는 바깥(motion.div)이 그대로 받는다. 길게 누르기와 겹치지 않게 링크 끌기·터치 길게 누르기 메뉴는 끈다.
          저장소 칸은 사이트 밖이라 전환 연출을 붙이지 않는다 — 커버가 커지고 나면 돌아올 화면이 없다 */}
      {work.kind === "repo" ? (
        <a
          href={work.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.circleLink}
          aria-label={pickLocalized(work.title, language)}
          draggable={false}
        />
      ) : (
        <TransitionLink
          href={work.href}
          className={styles.circleLink}
          aria-label={pickLocalized(work.title, language)}
          draggable={false}
          getRect={(link) => (link.parentElement ?? link).getBoundingClientRect()}
          navigate={onNavigate}
          onContextMenu={(e) => { if ((e.nativeEvent as PointerEvent).pointerType === "touch") e.preventDefault(); }}
        />
      )}

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

    // 그리드 아이템 생성 — 작업물이 적으면 아래 줄 자리부터 쓴다(homeWorkSlots)
    const items = [];
    let workIndex = 0;
    const slots = homeWorkSlots(works.length);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        if (row === 4 && col >= 1 && col <= 3) continue;

        const hasImage = slots.has(index);
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

    /* 글이 들어찬 자리에는 머리글도 글이라고 말한다 — 거기에 "Selected Works" 를 얹으면
       글자와 내용이 어긋난다. 저장소는 작업물이므로 Works 를 그대로 쓴다.
       두 줄인 것은 그대로 둔다(칸 크기가 두 줄에 맞춰져 있다) */
    const [titleTop, titleBottom] =
      works[0]?.kind === "post" ? ["Selected", "Writing"] : ["Selected", "Works"];

    items.push(
      <div key="title" className={styles.titleCell}>
        <h2 className={styles.titleText} aria-hidden="true">
          {titleTop}
          <br />
          {titleBottom}
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
