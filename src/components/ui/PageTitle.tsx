import type { ReactNode } from "react";
import styles from "./PageTitle.module.css";

interface Props {
  /** 왼쪽 아이콘 (lucide 등). 크기는 타이틀 font-size 에 em 비례로 자동 스케일. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** posts 계열 브라우즈 페이지 공통 대형 타이틀 — instrument italic + 아이콘. */
export default function PageTitle({ icon, children, className }: Props) {
  return (
    <h1 className={`${styles.title} ${className ?? ""}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </h1>
  );
}
