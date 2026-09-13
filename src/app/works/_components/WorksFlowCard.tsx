"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickLocalized } from "@/types/common";
import type { Project } from "@/data/projects";
import TransitionLink from "@/components/ui/TransitionLink";
import { workHref } from "./layouts/shared";
import styles from "./WorksFlowCard.module.css";

export const flowCardClassNames = {
  card: styles.card,
  cardActive: styles.cardActive,
  cardImage: styles.cardImage,
  cardImageWrap: styles.cardImageWrap,
  project: styles.project,
  metaCategory: styles.metaCategory,
  metaYear: styles.metaYear,
  metaTech: styles.metaTech,
  metaRole: styles.metaRole,
  metaDesc: styles.metaDesc,
};

/* flow 레이아웃의 프로젝트 한 칸 — 카드와 그 옆 메타 그룹.
   data-layout 1~6 이 메타 요소들의 코너/사이드 배치를 바꾼다(CSS 가 위치를 잡는다).
   메타 reveal 과 카드 변환은 수평 스크롤 엔진이 클래스로 찾아 직접 쓴다. */
export default function WorksFlowCard({
  project,
  index,
  layoutVariant,
  priority,
  slotClassName,
  registerCard,
  onClick,
  onPressStart,
  onPressEnd,
}: {
  project: Project;
  index: number;
  /** data-layout 1~6 — 메타 배치 변주 */
  layoutVariant: number;
  priority: boolean;
  slotClassName: string;
  registerCard: (index: number, el: HTMLElement | null) => void;
  onClick: (index: number, project: Project) => void;
  onPressStart: (index: number, project: Project) => void;
  onPressEnd: () => void;
}) {
  const { t, language } = useLanguage();
  const sizeClass = `size${project.size.charAt(0).toUpperCase()}${project.size.slice(1)}`;

  return (
    <div
      className={`${styles.project} ${styles[sizeClass]} ${slotClassName}`}
      data-layout={layoutVariant}
    >
      <Tooltip content={`${pickLocalized(project.title, language)} · ${t("tooltip.viewProject")}`}>
        {/* 카드 자체가 작업물 링크다(#933). 그냥 누르면 카드 전환으로, 새 탭 클릭은 브라우저가 연다. 길게 누르면 커지다
            넘어가는 동작은 그대로라, 링크 끌기와 터치 길게 누르기 메뉴는 끈다(연출과 겹친다) */}
        <TransitionLink
          href={workHref(project)}
          ref={(el: HTMLAnchorElement | null) => registerCard(index, el)}
          className={styles.card}
          data-more="true"
          data-clickable="true"
          draggable={false}
          navigate={() => onClick(index, project)}
          onMouseDown={(e) => { if (e.button === 0) onPressStart(index, project); }}
          onMouseUp={onPressEnd}
          onMouseLeave={onPressEnd}
          onTouchStart={() => onPressStart(index, project)}
          onTouchEnd={onPressEnd}
          onContextMenu={(e) => { if ((e.nativeEvent as PointerEvent).pointerType === "touch") e.preventDefault(); }}
        >
          <div className={styles.cardImageWrap}>
            <ProgressiveImage
              src={project.image}
              alt={pickLocalized(project.title, language)}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className={styles.cardImage}
              priority={priority}
            />
          </div>
          <div className={styles.cardBorder} />
          <span className={styles.metaNumber}>{project.number}</span>
          <div className={styles.cardOverlay}>
            <h2 className={styles.metaTitle}><T ko={project.title.ko} en={project.title.en} /></h2>
            <span className={styles.metaSubtitle}>
              <T ko={project.subtitle.ko} en={project.subtitle.en} />
            </span>
            <span className={styles.metaYear}>{project.year}</span>
          </div>
        </TransitionLink>
      </Tooltip>

      {/* 메타 그룹 — 카드 옆 세로 배치. 위치는 data-layout 변주가 잡는다 */}
      <div className={styles.metaGroup}>
        <span className={styles.metaCategory}><T ko={project.category.ko} en={project.category.en} /></span>
        <span className={`${styles.metaYear} ${styles.metaYearDesktop}`}>{project.year}</span>
        <div className={styles.metaTech}>
          {project.tech.slice(0, 2).map((tech: string, i: number) => (
            <span key={i}>#{tech}</span>
          ))}
        </div>
        <span className={styles.metaRole}><T ko={project.role.ko} en={project.role.en} /></span>
        <p className={styles.metaDesc}><T ko={project.description.ko} en={project.description.en} /></p>
      </div>
    </div>
  );
}
