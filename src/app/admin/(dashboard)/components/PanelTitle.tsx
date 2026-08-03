import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import TitleLink from "./TitleLink";
import styles from "./PanelTitle.module.css";

type Props = {
  children: ReactNode;
  /** "default": panel 직접 child, padding-top spacing-sm 으로 위 spacing 자체 책임
   *  "inset": panelHeader 같은 wrapper 안에 들어갈 때 — padding-top 0 (wrapper 가 spacing)
   *  "framed": 아래 padding + border-bottom 으로 self-contained header */
  variant?: "default" | "inset" | "framed";
  className?: string;
  style?: CSSProperties;
  /** 지정 시 타이틀 전체가 이 경로로 이동하는 링크가 되고 끝에 chevron 이 붙는다. */
  href?: string;
  /** href 가 외부/공개 라우트일 때 새 탭으로 연다. */
  external?: boolean;
};

export default function PanelTitle({ children, variant = "default", className, style, href, external }: Props) {
  return (
    <h2
      className={cn(
        styles.title,
        variant === "inset" && styles.inset,
        variant === "framed" && styles.framed,
        className,
      )}
      style={style}
    >
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
