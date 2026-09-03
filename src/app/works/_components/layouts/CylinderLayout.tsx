"use client";

import { useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import { pickLocalized } from "@/types/common";
import Tooltip from "@/components/ui/Tooltip";
import IntroBunny from "./CylinderIntroBunny";
import type { WorksLayoutProps } from "./shared";
import VerticalCylinder, { TransparentBg, ResponsiveCamera } from "./cylinder/VerticalCylinder";
import { useCylinderStage } from "./cylinder/useCylinderStage";
import CylinderIntroPanel from "./cylinder/CylinderIntroPanel";
import CylinderCommentBubbles from "./cylinder/CylinderCommentBubbles";
import { useFloatingComments } from "./cylinder/useFloatingComments";
import { createIntroDataUrl, MIN_SEGMENT_ANGLE, GAP_RATIO } from "./cylinder/scene";
import styles from "./CylinderLayout.module.css";

/* ── 실린더 레이아웃 ──
   작품 이미지를 곡면 패널로 만들어 세로 원통에 두르고, 휠로 굴린다.
   3D 는 VerticalCylinder 가 그리고, 제목·메타 같은 텍스트는 DOM 오버레이로 띄운 뒤
   useCylinderStage 가 3D 투영 좌표를 받아 매 프레임 위치를 맞춘다. */
export default function CylinderLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();

  // allImages[0] = intro, allImages[1..N] = projects
  const isDark = theme === "dark";
  const introDataUrl = useMemo(() => createIntroDataUrl(isDark), [isDark]);
  const allImages = useMemo(
    () => [introDataUrl, ...projects.map((p) => p.image)],
    [projects, introDataUrl],
  );
  const slotCount = allImages.length;
  const projectImageMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.image])),
    [projects],
  );
  // 겹치지 않도록: max(고정 각도, 360°/슬롯수)
  const segAngle = Math.min(MIN_SEGMENT_ANGLE, (Math.PI * 2) / slotCount);
  const arc = segAngle * (1 - GAP_RATIO);

  const {
    scrollRef,
    mouseRef,
    actualRotRef,
    screenPosRef,
    slotRefs,
    overlayRefs,
    indicatorRef,
    wrapRef,
    floatingCommentsRef,
    slotBoundsRef,
    hoverDimRef,
  } = useCylinderStage({
    slotCount,
    segAngle,
    arc,
    indicatorDotActiveClassName: styles.indicatorDotActive,
  });

  const { recentComments, bubbleRefs } = useFloatingComments(slotBoundsRef);

  const handleClick = useCallback((projectIdx: number) => {
    const p = projects[projectIdx];
    const slotIdx = projectIdx + 1;
    const el = slotRefs.current.get(slotIdx);
    if (el) onProjectClick(p.id, el.getBoundingClientRect(), p.image);
    // slotRefs 는 훅이 돌려준 ref 객체라 참조가 고정 — deps 에 넣으면 컴파일러가 메모를 버린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, onProjectClick]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TransparentBg />
        <ResponsiveCamera />
        <VerticalCylinder
          allImages={allImages}
          segAngle={segAngle}
          arc={arc}
          scrollRef={scrollRef}
          mouseRef={mouseRef}
          actualRotRef={actualRotRef}
          screenPosRef={screenPosRef}
          dimRef={hoverDimRef}
          onMeshHover={(idx) => {
            slotRefs.current.get(idx)?.classList.add(styles.metaItemHovered);
            overlayRefs.current.get(idx)?.classList.add(styles.metaOverlayHovered);
          }}
          onMeshLeave={(idx) => {
            slotRefs.current.get(idx)?.classList.remove(styles.metaItemHovered);
            overlayRefs.current.get(idx)?.classList.remove(styles.metaOverlayHovered);
          }}
          onMeshClick={(idx) => {
            // idx 0 = intro slot (no click), 1+ = projects
            if (idx > 0) handleClick(idx - 1);
          }}
        />
        <IntroBunny screenPosRef={screenPosRef} arc={arc} actualRotRef={actualRotRef} />
      </Canvas>

      <CylinderIntroPanel slotRefs={slotRefs} />

      <CylinderCommentBubbles
        comments={recentComments}
        bubbleRefs={bubbleRefs}
        containerRef={floatingCommentsRef}
        projectImageMap={projectImageMap}
      />

      {/* Slot 1~N — 제목·카테고리만 difference. 클릭은 3D 이미지 panel 자체가 받음 (pointer-events: none) */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        return (
          <div
            key={proj.id}
            ref={(el) => { if (el) slotRefs.current.set(slotIndex, el); }}
            className={styles.metaItem}
            style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
          >
            <span className={styles.metaCategory}>
              <T ko={proj.category.ko} en={proj.category.en} />
            </span>
            <h2 className={styles.metaTitle}>
              {pickLocalized(proj.title, language).split(" ").map((word, wi) => (
                <span
                  key={wi}
                  className={styles.metaWord}
                  style={{ "--word-idx": wi } as React.CSSProperties}
                >
                  {word}
                </span>
              ))}
            </h2>
          </div>
        );
      })}

      {/* Slot 1~N — metaDetails + cta (difference 밖, 항상 흰색) */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        const descText = language === "en" && proj.description.en ? proj.description.en : proj.description.ko;
        const descAlt = language === "en" ? proj.description.ko : (proj.description.en || proj.description.ko);
        const words = descText.split(" ");
        const descEnd = words.length * 0.04 + 0.35;
        const detailsDelay = `${descEnd.toFixed(2)}s`;
        const ctaDelay = `${(descEnd + 0.2).toFixed(2)}s`;
        return (
          <div
            key={`ov-${proj.id}`}
            ref={(el) => { if (el) overlayRefs.current.set(slotIndex, el); }}
            className={styles.metaOverlay}
            style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
          >
            <Tooltip content={descAlt} delay={600} placement="bottom">
              <p className={styles.metaDesc}>
                {words.map((word, wi) => (
                  <span
                    key={wi}
                    className={styles.metaDescWord}
                    style={{ transitionDelay: `${wi * 0.04}s` }}
                  >
                    {word}&nbsp;
                  </span>
                ))}
              </p>
            </Tooltip>
            <div
              className={styles.metaDetails}
              style={{ transitionDelay: detailsDelay }}
            >
              <span className={styles.metaDetailsRow}>
                {proj.year} — <T ko={proj.category.ko} en={proj.category.en} /> — <T ko={proj.role.ko} en={proj.role.en} />
              </span>
              <span className={styles.metaDetailsMarquee}>
                <span className={styles.metaDetailsTrack}>
                  <span className={styles.metaDetailsContent}>{proj.tech.join(" · ")}</span>
                  <span className={styles.metaDetailsContent} aria-hidden="true">{proj.tech.join(" · ")}</span>
                </span>
              </span>
            </div>
            <div
              className={styles.ctaInline}
              style={{ transitionDelay: ctaDelay }}
              aria-hidden="true"
            >
              <span className={styles.ctaBg} />
              <span className={styles.ctaArrow}>→</span>
            </div>
          </div>
        );
      })}

      {/* Indicator */}
      <div ref={indicatorRef} className={styles.indicator}>
        {Array.from({ length: slotCount }, (_, i) => (
          <div key={i} className={`${styles.indicatorDot} ${i === 0 ? styles.indicatorDotActive : ""}`} />
        ))}
      </div>

      {/* 좌하단 */}
      <div className={styles.fixedInfo}>
        <span className={styles.fixedAvailable}>Available for work</span>
        <span className={styles.fixedDate}>
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })} ↗
        </span>
      </div>
    </div>
  );
}
