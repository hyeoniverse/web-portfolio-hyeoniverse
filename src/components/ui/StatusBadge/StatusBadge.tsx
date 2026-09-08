import type { ReactNode, MouseEvent } from "react";
import styles from "./StatusBadge.module.css";
import Pressable from "@/components/ui/Pressable";

type StatusVariant = "published" | "draft" | "scheduled";

interface StatusBadgeProps {
  variant: StatusVariant;
  /** 배지 안 텍스트(발행 / 미발행 / 예약 등, 로컬라이즈된 라벨을 넘김) */
  children: ReactNode;
  /** 지정 시 클릭 가능한 button 으로 렌더(발행 상태 토글 등). 없으면 정적 span. */
  onClick?: (e: MouseEvent) => void;
  title?: string;
  className?: string;
}

/**
 * 발행/미발행/예약 상태 배지 — admin 목록·에디터·시리즈 어디서든 같은 규격으로 쓰는 공통 컴포넌트.
 * onClick 을 주면 클릭 토글용 button, 없으면 정적 span 으로 렌더된다.
 */
export default function StatusBadge({ variant, children, onClick, title, className }: StatusBadgeProps) {
  const cls = `${styles.badge} ${styles[variant]}${onClick ? ` ${styles.btn}` : ""}${className ? ` ${className}` : ""}`;
  if (onClick) {
    return (
      <Pressable className={cls} onClick={onClick} title={title}>
        {children}
      </Pressable>
    );
  }
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
