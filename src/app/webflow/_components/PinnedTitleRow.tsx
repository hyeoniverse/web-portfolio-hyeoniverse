import styles from "./WebFlowSection.module.css";

interface DotNavConfig {
  count: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
  /** 각 dot에 표시할 힌트 라벨 */
  labels?: string[];
  /** 추가 CSS 클래스 (dotNavMobile, dotNavMobileOnly 등) */
  className?: string;
}

interface PinnedTitleRowProps {
  number: string;
  title: string;
  /** panelTitleCompact 클래스 적용 여부 */
  compact?: boolean;
  /** animate 클래스 적용 여부 */
  animate?: boolean;
  /** 점 네비게이션 설정 (없으면 표시 안 함) */
  dotNav?: DotNavConfig;
}

/** 패널 상단 타이틀 행 — 번호 + 제목 + 선택적 점 네비게이션 */
export default function PinnedTitleRow({
  number,
  title,
  compact = false,
  animate = false,
  dotNav,
}: PinnedTitleRowProps) {
  const animateClass = animate ? ` ${styles.animate}` : "";
  const titleClasses = `${styles.panelTitle}${compact ? ` ${styles.panelTitleCompact}` : ""}${animateClass}`;

  return (
    <div className={styles.pinnedTitleRow}>
      <div>
        <span className={`${styles.panelNumber}${animateClass}`}>{number}</span>
        <h3 className={titleClasses}>{title}</h3>
      </div>
      {dotNav && (
        <div className={`${styles.dotNav}${dotNav.className ? ` ${dotNav.className}` : ""}${animateClass}`}>
          {Array.from({ length: dotNav.count }, (_, i) => (
            <button
              data-clickable="true"
              key={i}
              className={`${styles.dotItem} ${i === dotNav.activeIndex ? styles.dotItemActive : ""}`}
              onClick={() => dotNav.onDotClick(i)}
            >
              <span className={styles.dotCircle} />
              {dotNav.labels?.[i] && (
                <span className={styles.dotText}>{dotNav.labels[i]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
