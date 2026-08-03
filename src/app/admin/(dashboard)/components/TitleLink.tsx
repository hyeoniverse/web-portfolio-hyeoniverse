import { type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import styles from "./TitleLink.module.css";

type Props = {
  href: string;
  /** 외부/공개 라우트 — 새 탭으로 연다 (admin 컨텍스트 유지). */
  external?: boolean;
  children: ReactNode;
};

/**
 * 섹션/패널 타이틀을 통째로 이동 링크로 만든다 — 끝에 chevron, hover 시 우측 슬라이드 + accent.
 * SectionHeader/PanelTitle 의 `href` prop 에서 공용으로 사용해, "타이틀 = 진입점" 패턴을 통일한다.
 */
export default function TitleLink({ href, external, children }: Props) {
  const ext = external ? { target: "_blank", rel: "noopener noreferrer" as const } : {};
  return (
    <Link href={href} className={styles.link} {...ext}>
      {children}
      <ChevronRight className={styles.chevron} size={14} strokeWidth={2.2} aria-hidden />
    </Link>
  );
}
