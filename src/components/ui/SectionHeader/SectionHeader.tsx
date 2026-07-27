import type { ReactNode } from "react";
import styles from "./SectionHeader.module.css";

export interface SectionHeaderProps {
  /** 섹션 제목 (번역된 string 또는 JSX) */
  title: ReactNode;
  /** 제목 아래 부가설명 */
  sub?: ReactNode;
  /** 우측 액션 슬롯 (버튼·토글 등). 없으면 제목만. */
  actions?: ReactNode;
  /** 제목 태그 override — heading 레벨 선택 (기본 h2) */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** 추가 클래스 조합 */
  className?: string;
}

/**
 * 범용 섹션 헤더 — 제목 + (선택)부가설명 + (선택)우측 액션.
 *
 * admin 설정의 `SectionHeader`(config dirty 계산·저장/되돌리기 버튼 등 settings 결합)와 달리
 * 순수 프레젠테이션용. 여러 곳에 흩어진 `<h2>제목</h2> + <p>부가설명</p>` 인라인 패턴을 흡수한다.
 */
export default function SectionHeader({ title, sub, actions, as: Heading = "h2", className }: SectionHeaderProps) {
  return (
    <div className={className ? `${styles.header} ${className}` : styles.header}>
      <div className={styles.row}>
        <Heading className={styles.title}>{title}</Heading>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
      {sub != null && <p className={styles.sub}>{sub}</p>}
    </div>
  );
}
