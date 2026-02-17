"use client";

import { forwardRef, useCallback, useState } from "react";
import Image from "next/image";
import { motion, MotionValue } from "framer-motion";
import { worksData, WorkItem } from "@/data/works";
import {
  PressingWork,
  HoveringWork,
} from "@/types";
import styles from "./WorksSection.module.css";

/** 그리드 내 이미지가 배치될 열 인덱스 (행별) */
const IMAGE_POSITIONS = [
  [0, 4],       // row 0
  [1, 3],       // row 1
  [0, 2, 4],    // row 2
  [1, 3],       // row 3
  [0, 4],       // row 4
];

// 각 작업 항목의 호버 방향 추적
interface HoverDirection {
  id: string;
  x: number; // -1 (left), 0, 1 (right)
  y: number; // -1 (top), 0, 1 (bottom)
}

interface WorksSectionProps {
  smoothWorkImageY: MotionValue<number>;
  setWorkCircleRef: (id: string, el: HTMLDivElement | null) => void;
  pressingWork: PressingWork | null;
  hoveringWork: HoveringWork | null;
  handlePressStart: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    work: WorkItem
  ) => void;
  handlePressEnd: () => void;
  handleWorkClick: (work: WorkItem, e: React.MouseEvent) => void;
  handleHoverStart: (e: React.MouseEvent<HTMLDivElement>, work: WorkItem) => void;
  handleHoverEnd: () => void;
}

const WorksSection = forwardRef<HTMLElement, WorksSectionProps>(
  (
    {
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
    const [hoverDirections, setHoverDirections] = useState<{ [key: string]: HoverDirection }>({});

    // 요소 중심 기준 마우스 위치에 따른 진입 방향 계산
    const getHoverDirection = useCallback(
      (e: React.MouseEvent<HTMLDivElement>, workId: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // 주요 방향 결정 (수평 또는 수직)
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        let x = 0;
        let y = 0;

        if (absX > absY) {
          x = deltaX > 0 ? 1 : -1;
        } else {
          y = deltaY > 0 ? 1 : -1;
        }

        setHoverDirections((prev) => ({
          ...prev,
          [workId]: { id: workId, x, y },
        }));
      },
      []
    );

    const renderWorkItems = useCallback(() => {
      const items = [];
      let workIndex = 0;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const index = row * 5 + col;

          // 텍스트 영역 건너뛰기 (4행, 1-3열)
          if (row === 4 && col >= 1 && col <= 3) continue;

          const hasImage = IMAGE_POSITIONS[row].includes(col);
          const work =
            hasImage && workIndex < worksData.length
              ? worksData[workIndex++]
              : null;

          const isPressing = pressingWork?.id === work?.id;
          const pressScale = isPressing && pressingWork ? pressingWork.scale : 1;
          const isHovering = hoveringWork?.id === work?.id && !isPressing;
          const hoverScale = isHovering && hoveringWork ? hoveringWork.scale : 1;
          const currentScale = isPressing
            ? pressScale
            : isHovering
              ? hoverScale
              : 1;

          items.push(
            <div
              key={index}
              ref={work ? (el) => setWorkCircleRef(work.id, el as HTMLDivElement) : undefined}
              className={styles.gridItem}
            >
              {work && (
                <motion.div
                  className={`${styles.circle} work-circle`}
                  onClick={(e) => handleWorkClick(work, e)}
                  onMouseDown={(e) => handlePressStart(e, work)}
                  onMouseUp={handlePressEnd}
                  onMouseEnter={(e) => {
                    getHoverDirection(e, work.id);
                    handleHoverStart(e, work);
                  }}
                  onMouseLeave={() => {
                    handlePressEnd();
                    handleHoverEnd();
                  }}
                  onTouchStart={(e) => handlePressStart(e, work)}
                  onTouchEnd={handlePressEnd}
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
                      {/* 메인 이미지 */}
                      <motion.div
                        className={styles.mainImageContainer}
                        animate={{
                          scale: isHovering ? 1.08 : 1,
                          filter: isHovering
                            ? "brightness(0.7) saturate(0.6)"
                            : "brightness(1) saturate(1)",
                        }}
                        transition={{
                          duration: 1.2,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      >
                        <Image
                          src={work.main}
                          alt={`Work ${work.id}`}
                          fill
                          sizes="120px"
                          className={styles.image}
                        />
                      </motion.div>

                      {/* 방향 인식 애니메이션이 적용된 호버 이미지 */}
                      <motion.div
                        className={styles.hoverImageContainer}
                        initial={false}
                        animate={{
                          clipPath: isHovering
                            ? "circle(80% at 50% 50%)"
                            : `circle(0% at ${50 + (hoverDirections[work.id]?.x || 0) * 25}% ${50 + (hoverDirections[work.id]?.y || 0) * 25}%)`,
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
                            x: isHovering
                              ? 0
                              : (hoverDirections[work.id]?.x || 0) * -15,
                            y: isHovering
                              ? 0
                              : (hoverDirections[work.id]?.y || 0) * -15,
                          }}
                          transition={{
                            duration: 1.4,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                          style={{ width: "100%", height: "100%", position: "relative" }}
                        >
                          <Image
                            src={work.hover}
                            alt={`Work ${work.id}`}
                            fill
                            sizes="120px"
                            className={styles.image}
                          />
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          );
        }
      }

      // 하단 중앙에 타이틀 추가 (4행, 1-3열)
      items.push(
        <div key="title" className={styles.titleCell}>
          <h2 className={styles.titleText}>
            Selected
            <br />
            Works
          </h2>
        </div>
      );

      return items;
    }, [
      pressingWork,
      hoveringWork,
      setWorkCircleRef,
      smoothWorkImageY,
      handlePressStart,
      handlePressEnd,
      handleWorkClick,
      handleHoverStart,
      handleHoverEnd,
      getHoverDirection,
      hoverDirections,
    ]);

    return (
      <>
        <section className={styles.works} ref={ref}>
          <div className={styles.container}>
            <div className={styles.grid}>{renderWorkItems()}</div>
          </div>
        </section>

        {/* 페이지 전환은 PageTransitionOverlay에서 전역으로 처리 */}
      </>
    );
  }
);

WorksSection.displayName = "WorksSection";

export default WorksSection;
