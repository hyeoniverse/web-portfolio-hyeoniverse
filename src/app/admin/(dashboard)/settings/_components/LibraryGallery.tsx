"use client";

/* 라이브러리 갤러리 — 업로드한 파일·커버 기록이 같이 쓴다.
   커버 고르기 창의 격자처럼 모서리·바탕·간격 없이 칸을 붙이고 칸 사이만 1px 실선으로 나눈다.
   칸 아래쪽 띠에 이름·정보, 오른쪽 위에 단추(올렸을 때, 터치는 늘). 미디어는 공용 MediaThumb 이 그린다
   (동영상은 올렸을 때만 받는다 — 목록에서 HD 동영상을 통째로 받지 않게). */
import type { CSSProperties, ReactNode } from "react";
import Checkbox from "@/components/ui/Checkbox";
import { notifyUnselectable, type useDragSelect } from "./LibrarySelection";

type PickHandlers = ReturnType<ReturnType<typeof useDragSelect>>;
import styles from "./LibraryGallery.module.css";

/* 칸 크기·비율은 업로드한 파일과 커버 기록이 같게 기본값(정사각, 최소 160px)을 쓴다 */
export function LibraryGallery({ aspect = "1 / 1", min = 160, selecting = false, children }: {
  aspect?: string;
  min?: number;
  /** 하나라도 골랐으면 — 모든 칸의 고르기 상자를 늘 보인다(올리지 않아도 이어 고를 수 있게) */
  selecting?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame} data-library-gallery="" data-selecting={selecting ? "" : undefined}>
      <div className={styles.grid} style={{ "--gallery-aspect": aspect, "--gallery-min": `${min}px` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

/** select — 여러 개 고르기(LibrarySelection). disabled 면 상자는 흐리게 보이고 눌러도 · 끌어도 안 골라진다(쓰는 곳이 있는 파일 등) */
export function GalleryItem({ media, title, meta, actions, select }: {
  media: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  select?: { checked: boolean; onChange: (checked: boolean) => void; label: string; pick: PickHandlers; disabled?: boolean; disabledReason?: string };
}) {
  return (
    /* 고를 수 있는 칸은 칸 어디를 눌러도 · 끌어도 고른다(칸 안의 단추 · 링크는 제 일) — 고르기 상자는 키보드 · 화면 읽기용 */
    <figure
      className={styles.item}
      data-selected={select?.checked ? "" : undefined}
      data-selectable={select && !select.disabled ? "" : undefined}
      data-unselectable={select?.disabled ? "" : undefined}
      data-cursor={select?.disabled ? "disabled" : undefined}
      data-clickable={select && !select.disabled ? "true" : undefined}
      {...(select && !select.disabled ? select.pick : undefined)}
      onClick={select?.disabled && select.disabledReason ? (e) => notifyUnselectable(e, select.disabledReason!) : select?.pick.onClick}
    >
      <div className={styles.media}>{media}</div>
      {select && (
        <span className={styles.select}>
          <Checkbox checked={select.checked} onChange={select.onChange} ariaLabel={select.label} disabled={select.disabled} />
        </span>
      )}
      {actions && <span className={styles.actions}>{actions}</span>}
      {title != null && (
        <figcaption className={styles.caption}>
          <span className={styles.title}>{title}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** 칸 위 동그란 단추(복사·열기·지우기) */
export const galleryActionClass = styles.action;
/** 이미지가 아닌 파일 — 가운데 종류 아이콘 + 확장자 */
export const galleryFileIconClass = styles.fileIcon;
export const galleryUsedClass = styles.used;
export const galleryUsedListClass = styles.usedList;
export const galleryUsedLinkClass = styles.usedLink;
