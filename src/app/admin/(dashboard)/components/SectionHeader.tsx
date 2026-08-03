import { type ReactNode } from "react";
import TitleLink from "./TitleLink";
import styles from "./Panel.module.css";

type Props = {
  children: ReactNode;
  /** 지정 시 타이틀 전체가 이 경로로 이동하는 링크가 되고 끝에 chevron 이 붙는다. */
  href?: string;
  /** href 가 외부/공개 라우트일 때 새 탭으로 연다. */
  external?: boolean;
};

/** Section 의 헤더 — uppercase sm 라벨 (예: "빠른 작업", "통계"). href 지정 시 통째로 이동 링크. */
export default function SectionHeader({ children, href, external }: Props) {
  return (
    <h2 className={styles.sectionTitle}>
      {href ? (
        <TitleLink href={href} external={external}>
          {children}
        </TitleLink>
      ) : (
        children
      )}
    </h2>
  );
}
