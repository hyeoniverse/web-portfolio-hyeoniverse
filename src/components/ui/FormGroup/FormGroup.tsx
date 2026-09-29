"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./FormGroup.module.css";

interface FormGroupProps {
  /** 묶음 제목 — 작게, 위에 가는 선. 비우면 선도 없이 칸만 묶는다 */
  title?: ReactNode;
  /** 제목 아래 한 줄 설명 */
  description?: ReactNode;
  /** 칸 배치 — 1열(기본) 또는 2열(좁은 화면에서는 1열로 접힌다) */
  cols?: 1 | 2;
  /** 이 묶음 안 Switch 라벨 칸의 폭(예: "10em") — 라벨 길이와 상관없이 스위치가 같은 자리에서 시작한다 */
  switchLabelWidth?: string;
  className?: string;
  children: ReactNode;
}

/**
 * 관련된 폼 칸을 한 묶음으로 — 제목 · 설명 · 1~2열 격자.
 *
 * `FieldRow`(라벨 + control 한 칸)를 모아 "저장소 / 식별자 / 표시 / 테마"처럼 뜻이 같은 것끼리 묶을 때 쓴다.
 * 전에는 섹션마다 flex·grid 를 손으로 짜 간격과 열 수가 제각각이었다.
 * 칸이 한 줄에 둘일 때 너비는 반씩(긴 값에 따라 늘지 않음), 묶음 사이 간격은 묶음 안보다 넓다.
 */
export default function FormGroup({ title, description, cols = 1, switchLabelWidth, className, children }: FormGroupProps) {
  return (
    <section className={cn(styles.group, className)} data-titled={title != null ? "" : undefined}>
      {title != null && <h3 className={styles.title}>{title}</h3>}
      {description != null && <p className={styles.description}>{description}</p>}
      <div
        className={styles.body}
        data-cols={cols}
        style={switchLabelWidth ? ({ "--switch-label-width": switchLabelWidth } as React.CSSProperties) : undefined}
      >
        {children}
      </div>
    </section>
  );
}
