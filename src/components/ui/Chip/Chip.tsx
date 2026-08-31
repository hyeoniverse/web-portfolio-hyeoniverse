"use client";

import { type ReactNode, type HTMLAttributes } from "react";
import Link from "next/link";
import { GripVertical } from "@/components/icons";
import CloseButton from "../CloseButton";
import styles from "./Chip.module.css";
import Pressable from "@/components/ui/Pressable";

type Variant = "capsule" | "bare";

interface ChipProps {
  /** chip 본문 라벨 */
  children: ReactNode;
  /** 시각 variant — capsule(bg + border 캡슐) / bare(text-only) */
  variant?: Variant;
  /** 좌측 grip handle 표시 — 부모가 draggable wrapper 로 처리 (drag handlers 는 ...rest 로 spread) */
  showHandle?: boolean;
  /** label 우측 카운트 배지 */
  count?: number;
  /** × 버튼 — 제공 시 우측에 CloseButton 렌더. hover 시 chip 라벨에 line-through */
  onRemove?: () => void;
  /** label click 핸들러. href 와 동시 사용 가능. e.preventDefault() 로 Link 네비게이션 차단 가능 (sheet open 등). */
  onClick?: (e: React.MouseEvent) => void;
  /** Link wrap — 제공 시 label 이 Link 로 렌더 */
  href?: string;
  /** active 상태 (편집 drawer 열림 등) */
  active?: boolean;
  /** 좌측 leadingIcon — grip 옆 또는 label 좌측 (grip 없으면 label 옆) */
  leftIcon?: ReactNode;
  /** drag/drop 시각 변형 — useChipReorder / useTagDrag 등에서 전달 */
  dragging?: boolean;
  dropSide?: "left" | "right" | null;
  className?: string;
  /** drag event handlers (DOM 그대로 forwarding) — onDragStart, onDragOver, onDrop, onDragEnd 등 */
  dragHandlers?: Pick<
    HTMLAttributes<HTMLElement>,
    "onDragStart" | "onDragOver" | "onDrop" | "onDragEnd" | "onDragLeave"
  > & { draggable?: boolean };
  /** 핸들(grip)에 직접 spread 할 props — 핸들 기반 drag (dnd-kit listeners/attributes 등). showHandle 과 함께 사용 */
  handleProps?: HTMLAttributes<HTMLElement>;
  /** 한 줄 유지 + 공간 부족 시 … 로 자름 (줄바꿈 금지). 부모가 폭을 제한할 때 라벨 ellipsis */
  truncate?: boolean;
  /** 최대 글자수 — string children 이 넘으면 잘라 … 붙임 (title 로 전체 표시) */
  maxLength?: number;
}

/**
 * 공통 chip — DraggableTag / TagPill / TagNotesEditor chip 통합용.
 * - 핸들(showHandle) 있을 수도 없을 수도 / variant capsule|bare / × 호버 시 line-through 자동.
 * - drag/drop 은 dragHandlers prop 으로 wrapper 에 spread, dragging/dropSide 로 시각 표시.
 * - Link wrap (href) / Button (onClick) / 단순 텍스트 (둘 다 없음) 자동 분기.
 */
export default function Chip({
  children,
  variant = "capsule",
  showHandle = false,
  count,
  onRemove,
  onClick,
  href,
  active,
  leftIcon,
  dragging,
  dropSide,
  className,
  dragHandlers,
  handleProps,
  truncate = false,
  maxLength,
}: ChipProps) {
  const rootCls = [
    styles.chip,
    variant === "bare" ? styles.bare : styles.capsule,
    active ? styles.active : "",
    dragging ? styles.dragging : "",
    dropSide === "left" ? styles.dropBefore : "",
    dropSide === "right" ? styles.dropAfter : "",
    truncate ? styles.truncate : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  // 글자수 컷 (string children 만) + hover 시 전체 표시용 title
  const isStr = typeof children === "string";
  const fullText = isStr ? (children as string) : undefined;
  const shown = isStr && maxLength && (children as string).length > maxLength
    ? (children as string).slice(0, maxLength).replace(/\s+$/, "") + "…"
    : children;

  const innerContent = (
    <>
      {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
      <span className={`${styles.label}${truncate ? ` ${styles.labelTruncate}` : ""}`}>{shown}</span>
      {typeof count === "number" && <span className={styles.count}>{count}</span>}
    </>
  );

  /* 라벨 영역 — href/click/static 분기. drag/remove 와 별도 영역. */
  const renderLabelBlock = () => {
    if (href) {
      return (
        <Link href={href} className={styles.labelLink} onClick={onClick}>
          {innerContent}
        </Link>
      );
    }
    if (onClick) {
      return (
        <Pressable
          type="button"
          className={styles.labelBtn}
          /* drag wrapper (부모) 의 drag 시작을 막기 위해 mousedown / pointerdown 에서 propagation 차단.
             chip 자체가 draggable 컨테이너 안에 있을 때 라벨 클릭 → drag 시작되는 UX 방지. */
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClick(e); }}
        >
          {innerContent}
        </Pressable>
      );
    }
    return <span className={styles.labelStatic}>{innerContent}</span>;
  };

  return (
    <span className={rootCls} title={(truncate || maxLength) ? fullText : undefined} {...dragHandlers}>
      {showHandle && (
        <span className={styles.gripHandle} {...handleProps}>
          <GripVertical className={styles.grip} size={10} strokeWidth={2.5} aria-hidden />
        </span>
      )}
      {renderLabelBlock()}
      {onRemove && (
        <CloseButton
          size="xs"
          /* × 클릭이 부모(예: Popover trigger)로 전파돼 다른 동작을 트리거하지 않도록 차단 */
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          ariaLabel="Remove"
          className={styles.remove}
        />
      )}
    </span>
  );
}
