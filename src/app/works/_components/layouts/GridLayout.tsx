"use client";

import { useRef, useCallback, useMemo } from "react";
import DynamicFrameLayout, {
  type Frame,
} from "@/components/common/DynamicFrame/DynamicFrameLayout";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import TransitionLink from "@/components/ui/TransitionLink";
import { workHref, type WorksLayoutProps } from "./shared";
import styles from "./GridLayout.module.css";

/** Bento layout — intro + projects 가 항상 12×12 (3×3) 그리드를 빈 공간 없이 채움.
 *  projects 개수에 따라 intro 크기 + project 배치 adaptive. 12-grid 좌표 (x: 0/4/8, y: 0/4/8). */
function buildPositions(count: number): { x: number; y: number; w: number; h: number }[] {
  // count = projects 수. intro 가 index 0, 나머지가 projects
  if (count >= 6) {
    // intro 12×4 + 6 projects (2 rows × 3 cols)
    return [
      { x: 0, y: 0, w: 12, h: 4 },
      { x: 0, y: 4, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }, { x: 8, y: 4, w: 4, h: 4 },
      { x: 0, y: 8, w: 4, h: 4 }, { x: 4, y: 8, w: 4, h: 4 }, { x: 8, y: 8, w: 4, h: 4 },
    ];
  }
  if (count === 5) {
    // intro 12×4 + row2 (4+4+4) + row3 (8+4)
    return [
      { x: 0, y: 0, w: 12, h: 4 },
      { x: 0, y: 4, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }, { x: 8, y: 4, w: 4, h: 4 },
      { x: 0, y: 8, w: 8, h: 4 }, { x: 8, y: 8, w: 4, h: 4 },
    ];
  }
  if (count === 4) {
    // intro 12×4 + row2 (8+4) + row3 (4+8)
    return [
      { x: 0, y: 0, w: 12, h: 4 },
      { x: 0, y: 4, w: 8, h: 4 }, { x: 8, y: 4, w: 4, h: 4 },
      { x: 0, y: 8, w: 4, h: 4 }, { x: 4, y: 8, w: 8, h: 4 },
    ];
  }
  if (count === 3) {
    // intro 12×8 + row3 (4+4+4)
    return [
      { x: 0, y: 0, w: 12, h: 8 },
      { x: 0, y: 8, w: 4, h: 4 }, { x: 4, y: 8, w: 4, h: 4 }, { x: 8, y: 8, w: 4, h: 4 },
    ];
  }
  if (count === 2) {
    // intro 12×8 + row3 (8+4)
    return [
      { x: 0, y: 0, w: 12, h: 8 },
      { x: 0, y: 8, w: 8, h: 4 }, { x: 8, y: 8, w: 4, h: 4 },
    ];
  }
  if (count === 1) {
    // intro 12×8 + 1 project 12×4
    return [
      { x: 0, y: 0, w: 12, h: 8 },
      { x: 0, y: 8, w: 12, h: 4 },
    ];
  }
  // 0 projects — intro 가 전체
  return [{ x: 0, y: 0, w: 12, h: 12 }];
}

function buildFrames(projectCount: number): Frame[] {
  const projectShown = Math.min(6, projectCount);
  return buildPositions(projectShown).map((pos, i) => ({
    id: i + 1,
    defaultPos: pos,
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 0,
    autoplayMode: "hover" as const,
    isHovered: false,
  }));
}

export default function GridLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const cellRefs = useRef<(HTMLElement | null)[]>([]);
  const frames = useMemo(() => buildFrames(projects.length), [projects.length]);
  const siteConfig = useSiteConfig();
  const w = siteConfig.works;
  const introVideoSrc = w.introVideoUrl || "/cover/videos/bg-1.mp4";

  /** index 0 = intro (텍스트만), 1+ = 프로젝트 (이미지 bg + meta overlay). renderCell 로 전체 cell 직접 그림 */
  const renderCell = useCallback(
    ({ frame, index, isHovered }: { frame: Frame; index: number; isHovered: boolean }) => {
      // intro cell — video bg + overlay tint + 텍스트 panel
      if (index === 0) {
        return (
          <div
            ref={(el) => { cellRefs.current[index] = el; }}
            className={styles.introCell}
            data-clickable="true"
          >
            <video
              className={styles.introVideo}
              src={introVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
            <div className={styles.introOverlay} aria-hidden="true" />
            <div className={styles.introInner}>
              <span className={styles.introLabel}>
                <T ko={w.introLabel_ko} en={w.introLabel} />
              </span>
              <h2 className={styles.introTitle}>
                <T ko={w.introTitle_ko} en={w.introTitle} />
              </h2>
              <p className={styles.introTagline}>
                <T ko={w.introTagline_ko} en={w.introTagline} />
              </p>
            </div>
            <div className={styles.introMeta}>
              <span>{String(projects.length).padStart(2, "0")} projects</span>
              <span>scroll · click</span>
            </div>
          </div>
        );
      }
      // project cell — projects index = frame index - 1
      const p = projects[index - 1];
      if (!p) return null;
      return (
        <TransitionLink
          href={workHref(p)}
          ref={(el: HTMLAnchorElement | null) => { cellRefs.current[index] = el; }}
          className={styles.projectCell}
          data-clickable="true"
          navigate={(rect) => onProjectClick(p, rect)}
        >
          <div
            className={styles.projectImage}
            style={{ backgroundImage: `url(${p.image})` }}
          />
          <div className={styles.projectGradient} />
          <span className={styles.projectYear}>{p.year}</span>
          <div className={styles.projectMeta}>
            {/* hover-only: project number — title 위로 slide-in */}
            <div className={`${styles.projectNumber} ${isHovered ? styles.projectExtraOn : ""}`}>
              PROJECT {p.number}
            </div>
            {/* 항상 표시: title + subtitle */}
            <h3 className={styles.projectTitle}><T ko={p.title.ko} en={p.title.en} /></h3>
            <p className={styles.projectSub}>
              <T ko={p.subtitle.ko} en={p.subtitle.en} />
            </p>
            {/* hover-only: description */}
            <p className={`${styles.projectDesc} ${isHovered ? styles.projectExtraOn : ""}`}>
              <T ko={p.description.ko} en={p.description.en} />
            </p>
            {/* hover-only: tech */}
            <div className={`${styles.projectTech} ${isHovered ? styles.projectExtraOn : ""}`}>
              {p.tech.slice(0, 3).map((tech, j) => (
                <span key={j}>{tech}</span>
              ))}
            </div>
          </div>
        </TransitionLink>
      );
      // suppress unused warning
      void frame;
    },
    [projects, onProjectClick, introVideoSrc, w.introLabel, w.introLabel_ko, w.introTitle, w.introTitle_ko, w.introTagline, w.introTagline_ko],
  );

  return (
    <div className={styles.wrap}>
      <DynamicFrameLayout
        initialFrames={frames}
        initialGapSize={0}
        initialHoverSize={6}
        initialAutoplayMode="hover"
        renderCell={renderCell}
      />
    </div>
  );
}
