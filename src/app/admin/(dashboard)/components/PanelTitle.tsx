import { type ReactNode } from "react";
import styles from "./PanelTitle.module.css";

type Props = {
  children: ReactNode;
};

/** Panel sub-header — uppercase xs 라벨 (예: "최근 게시물", "인기 태그"). sectionTitle 보다 한 단계 작고 약함. */
export default function PanelTitle({ children }: Props) {
  return <h2 className={styles.title}>{children}</h2>;
}
