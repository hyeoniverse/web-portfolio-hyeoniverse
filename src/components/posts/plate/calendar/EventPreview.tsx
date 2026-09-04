"use client";

// ── 이벤트 hover 상세 미리보기 (portal 카드) ──
import React from "react";
import { createPortal } from "react-dom";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventTimeLabel, findLabel, statusOf, statusName, priorityOf, priorityName, stripHtml } from "./model";
import { formatDateValue } from "../dateUtils";
import styles from "./CalendarPreview.module.css";

export type HoverState = { ev: CalEvent; rect: DOMRect } | null;

/** desc(HTML) 안의 이미지 src 추출 (최대 4개) */
function extractImages(html?: string): string[] {
  if (!html) return [];
  const out: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 4) out.push(m[1]);
  return out;
}

export default function EventPreview({ hover, labels, language, timeFormat = "12h", onMouseEnter, onMouseLeave }: {
  hover: HoverState;
  labels: EventLabel[];
  language: string;
  timeFormat?: TimeFormat;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [zoom, setZoom] = React.useState<{ src: string; rect: DOMRect } | null>(null);
  // hover 대상이 바뀌면 확대 팝오버 초기화 (render 중 안전한 이전값 비교 패턴)
  const prevId = React.useRef(hover?.ev.id);
  if (hover?.ev.id !== prevId.current) { prevId.current = hover?.ev.id; if (zoom) setZoom(null); }
  if (!hover || typeof document === "undefined") return null;
  const { ev, rect } = hover;
  const label = findLabel(ev.labelId, labels);
  const images = extractImages(ev.desc);
  const descText = stripHtml(ev.desc);

  const W = 260;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = rect.left;
  if (left + W > vw - 8) left = vw - W - 8;
  left = Math.max(8, left);
  const below = rect.bottom + 8;
  const above = rect.top - 8;
  const placeBelow = below + 160 < vh || below < vh / 2;
  const style: React.CSSProperties = placeBelow
    ? { top: below, left, width: W }
    : { bottom: vh - above, left, width: W };

  // 확대 팝오버 위치 — 썸네일 오른쪽(공간 없으면 왼쪽), 세로 중앙 맞춤
  let zoomStyle: React.CSSProperties | null = null;
  if (zoom) {
    const zw = 320;
    const rightSpace = vw - zoom.rect.right;
    const zLeft = rightSpace > zw + 16 ? zoom.rect.right + 8 : Math.max(8, zoom.rect.left - zw - 8);
    let zTop = zoom.rect.top + zoom.rect.height / 2 - 160;
    zTop = Math.max(8, Math.min(zTop, vh - 328));
    zoomStyle = { top: zTop, left: zLeft };
  }

  return createPortal(
    <>
      <div className={styles.preview} style={style} onMouseEnter={onMouseEnter} onMouseLeave={() => { setZoom(null); onMouseLeave?.(); }}>
        <div className={styles.previewTop} style={{ ["--_c" as string]: eventColorVar(ev, labels) }}>
          <span className={styles.previewBar} />
          <span className={styles.previewTitle}>{ev.title || "(제목 없음)"}</span>
        </div>
        <div className={styles.previewDate}>{formatDateValue(ev.date, null, language)}{ev.time ? ` · ${eventTimeLabel(ev, timeFormat)}` : ""}{ev.endDate && ev.endDate > ev.date ? ` ~ ${formatDateValue(ev.endDate, null, language)}` : ""}</div>
        {(statusOf(ev.status) || priorityOf(ev.priority)) && (
          <div className={styles.previewStatusRow}>
            {statusOf(ev.status) && (
              <span className={styles.previewStatus} style={{ ["--_sc" as string]: statusOf(ev.status)!.color }}>
                <span className={styles.previewStatusDot} />{statusName(ev.status, language)}
              </span>
            )}
            {priorityOf(ev.priority) && (
              <span className={styles.previewStatus} style={{ ["--_sc" as string]: priorityOf(ev.priority)!.color }}>
                <span className={styles.previewStatusDot} />{priorityName(ev.priority, language)}
              </span>
            )}
          </div>
        )}
        {descText && <div className={styles.previewDesc}>{descText}</div>}
        {images.length > 0 && (
          <div className={styles.previewThumbs}>
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i} src={src} alt="" className={styles.previewThumb}
                onMouseEnter={(e) => setZoom({ src, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setZoom(null)}
              />
            ))}
          </div>
        )}
        {(label || ev.tags?.length) && (
          <div className={styles.previewMeta}>
            {label && <span className={styles.previewLabel} style={{ ["--_c" as string]: eventColorVar(ev, labels) }}><span className={styles.previewLabelDot} />{label.name}</span>}
            {ev.tags?.map((tg) => <span key={tg} className={styles.previewTag}>#{tg}</span>)}
          </div>
        )}
      </div>
      {zoom && zoomStyle && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={zoom.src} alt="" className={styles.previewZoom} style={zoomStyle} />
      )}
    </>,
    document.body,
  );
}
