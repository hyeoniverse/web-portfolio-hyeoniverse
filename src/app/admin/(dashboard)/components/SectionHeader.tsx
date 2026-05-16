import { type ReactNode } from "react";
import styles from "./Panel.module.css";

type Props = {
  children: ReactNode;
};

/** Section 의 헤더 — uppercase sm 라벨 (예: "빠른 작업", "통계"). */
export default function SectionHeader({ children }: Props) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}
