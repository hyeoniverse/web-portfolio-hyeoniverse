"use client";

import { forwardRef, useCallback, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionValue } from "framer-motion";
import { worksData, WorkItem } from "@/data/works";
import {
  MagneticOffset,
  ExpandingWork,
  PressingWork,
  HoveringWork,
} from "@/types";
import styles from "./WorksSection.module.css";

// Track hover direction for each work item
interface HoverDirection {
  id: string;
  x: number; // -1 (left), 0, 1 (right)
  y: number; // -1 (top), 0, 1 (bottom)
}

interface WorksSectionProps {
  smoothWorkImageY: MotionValue<number>;
  magneticOffsets: { [key: string]: MagneticOffset };
  setWorkCircleRef: (id: string, el: HTMLDivElement | null) => void;
  expandingWork: ExpandingWork | null;
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
      magneticOffsets,
      setWorkCircleRef,
      expandingWork,
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

    // Calculate entry direction based on mouse position relative to element center
    const getHoverDirection = useCallback(
      (e: React.MouseEvent<HTMLDivElement>, workId: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // Determine primary direction (horizontal or vertical)
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

      const imagePositions = [
        [0, 4], // row 0
        [1, 3], // row 1
        [0, 2, 4], // row 2
        [1, 3], // row 3
        [0, 4], // row 4
      ];

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const index = row * 5 + col;

          // Skip text area (row 4, cols 1-3)
          if (row === 4 && col >= 1 && col <= 3) continue;

          const hasImage = imagePositions[row].includes(col);
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

          const magnetic = work
            ? magneticOffsets[work.id] || { x: 0, y: 0, rotation: 0 }
            : { x: 0, y: 0, rotation: 0 };

          items.push(
            <motion.div
              key={index}
              ref={work ? (el) => setWorkCircleRef(work.id, el) : undefined}
              className={styles.gridItem}
              animate={{
                x: magnetic.x,
                y: magnetic.y,
                rotateZ: magnetic.rotation,
              }}
              transition={{
                x: { type: "spring", stiffness: 150, damping: 15 },
                y: { type: "spring", stiffness: 150, damping: 15 },
                rotateZ: { type: "spring", stiffness: 150, damping: 15 },
              }}
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
                      {/* Main Image */}
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
                          alt={work.title || ""}
                          fill
                          sizes="120px"
                          className={styles.image}
                        />
                      </motion.div>

                      {/* Hover Image with direction-aware animation */}
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
                          style={{ width: "100%", height: "100%" }}
                        >
                          <Image
                            src={work.hover}
                            alt={work.title || ""}
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
            </motion.div>
          );
        }
      }

      // Add title at bottom center (row 4, cols 1-3)
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
      magneticOffsets,
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

        {/* Expanding Work Overlay */}
        <AnimatePresence>
          {expandingWork && (
            <motion.div
              className={styles.expandOverlay}
              initial={{
                position: "fixed",
                top: expandingWork.rect.top,
                left: expandingWork.rect.left,
                width: expandingWork.rect.width,
                height: expandingWork.rect.height,
                borderRadius: "50%",
                zIndex: 9999,
                rotate: 0,
              }}
              animate={{
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                borderRadius: "0%",
                rotate: [0, -3, 2, 0],
              }}
              transition={{
                duration: 0.8,
                ease: [0.76, 0, 0.24, 1],
                rotate: {
                  duration: 0.6,
                  times: [0, 0.3, 0.6, 1],
                  ease: "easeOut",
                },
              }}
            >
              <motion.img
                src={expandingWork.image}
                alt=""
                className={styles.expandImage}
                initial={{ scale: 1.5, filter: "brightness(1.2)" }}
                animate={{ scale: 1.1, filter: "brightness(1)" }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              />
              <motion.div
                className={styles.expandFlash}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

WorksSection.displayName = "WorksSection";

export default WorksSection;
