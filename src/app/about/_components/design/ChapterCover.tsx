"use client";

/* 장 표지 프레임 — 디자인 · AI · 코드 장의 첫 프레임. 왼쪽 장 머리, 오른쪽 이 장에서 차례로 볼 것들의 목차.
   카메라가 이 프레임에 내려앉으면 목차가 한 줄씩 떠오른다(다음 프레임에서 하나씩 펼친다) */
import type { ReactNode } from "react";
import type { L10n } from "../../_data/showcase";
import { useFrame } from "../prezi/context";
import { ChapterHead, RowNum, useL } from "../features/shared";
import styles from "./ChapterCover.module.css";

export interface CoverItem {
  key: string;
  label: L10n | string;
  /** 아래 작은 줄 — 코드 장은 파일 경로(code 글꼴) */
  sub?: L10n | string;
  mono?: boolean;
}

export default function ChapterCover({
  id,
  eyebrow,
  title,
  note,
  items,
  foot,
}: {
  id: string;
  eyebrow: L10n;
  title: L10n;
  note?: L10n;
  items: CoverItem[];
  foot?: ReactNode;
}) {
  const L = useL();
  const { current } = useFrame();
  const t = (v: L10n | string) => (typeof v === "string" ? v : L(v));
  return (
    <section id={id} className={styles.cover} data-live={current || undefined}>
      <div className={styles.head}>
        <ChapterHead eyebrow={eyebrow} title={title} note={note} />
        {foot}
      </div>
      <ol className={styles.index}>
        {items.map((it, i) => (
          <li key={it.key} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
            <RowNum n={i + 1} />
            <span className={styles.label}>{t(it.label)}</span>
            {it.sub && <span className={styles.sub} data-mono={it.mono || undefined}>{t(it.sub)}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
