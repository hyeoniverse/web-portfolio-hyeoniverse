"use client";

/* 장 별자리 지도 — 장마다 별 하나, 목차 순서대로 선이 이어진다. 두 곳에서 쓴다.
   - 첫 화면(목차 대신): 별을 누르면 카메라가 그 별로 확대해 날아 들어가고(0.8초), 그 장의 첫머리로 옮겨 간다
   - 장 사이 관문(ChapterGate): 스크롤하는 만큼 카메라가 다음 장의 별로 다가가고, 별이 화면을 채우면 그 장이 시작된다
   카메라는 지도 판 전체에 거는 transform 하나(확대 기준점 = 그 별) */
import { forwardRef, type CSSProperties } from "react";
import { STAR_PATH, useL } from "../features/shared";
import { toc } from "../../_data/showcase";
import { MAP_WIDE, type MapGeo } from "../../_data/map";
import styles from "./ChapterMap.module.css";

/** 목차 순서대로 별 — 배치(geo)의 자리 · 크기에 목차 이름 · 번호를 붙인다 */
const starsOf = (geo: MapGeo) =>
  toc
    .filter((t) => t.href && geo.stars[t.href])
    .map((t, i) => ({ href: t.href!, label: t.label, n: i + 1, ...geo.stars[t.href!] }));

interface Props {
  /** 지금 다가가는(또는 고른) 별 — 밝게 */
  focus?: string | null;
  /** 지나온 장 — 선이 켜진다 */
  reached?: number;
  onPick?: (href: string) => void;
  /** 고른 별로 날아 들어가는 중(첫 화면) */
  flying?: boolean;
  className?: string;
  style?: CSSProperties;
  /** 별 배치 — 기본은 넓은 화면용 */
  geo?: MapGeo;
}

const ChapterMap = forwardRef<HTMLDivElement, Props>(function ChapterMap({ focus, reached = 0, onPick, flying, className, style, geo = MAP_WIDE }, ref) {
  const L = useL();
  const mapStars = starsOf(geo);
  const { w: MAP_W, h: MAP_H } = geo;
  return (
    <div
      ref={ref}
      className={`${styles.map} ${className ?? ""}`}
      style={{ aspectRatio: `${MAP_W} / ${MAP_H}`, ...style }}
      data-flying={flying || undefined}
      data-tall={geo.tall || undefined}
    >
      <svg className={styles.svg} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden>
        {mapStars.slice(1).map((s, i) => {
          const a = mapStars[i];
          return <line key={s.href} className={styles.line} data-on={i + 1 < reached || undefined} x1={a.x} y1={a.y} x2={s.x} y2={s.y} />;
        })}
        {mapStars.map((s) => (
          <g key={s.href} className={styles.star} data-focus={focus === s.href || undefined} transform={`translate(${s.x} ${s.y})`}>
            <circle className={styles.halo} r={s.r * 2.6} />
            <path d={STAR_PATH} transform={`translate(${-s.r} ${-s.r}) scale(${(s.r * 2) / 100})`} />
          </g>
        ))}
      </svg>
      {/* 이름 · 누르는 자리 — 글은 HTML 로(읽기 · 키보드). 누르는 자리는 이름뿐 아니라 그 위 별까지 덮는다 */}
      <ol className={styles.labels}>
        {mapStars.map((s) => (
          /* --hit — 별(빛무리까지)을 덮는 누르는 자리의 지름. 지도 폭 기준(cqw)이라 지도 크기를 따라간다 */
          <li
            key={s.href}
            style={{ left: `${(s.x / MAP_W) * 100}%`, top: `${(s.y / MAP_H) * 100}%`, "--hit": `${((s.r * 2.6) / MAP_W) * 100}cqw` } as CSSProperties}
          >
            <a
              href={s.href}
              className={styles.label}
              data-focus={focus === s.href || undefined}
              onClick={(e) => {
                if (!onPick) return;
                e.preventDefault();
                onPick(s.href);
              }}
            >
              <span className={styles.labelText}>
                <span className={styles.no}>{String(s.n).padStart(2, "0")}</span>
                {L(s.label)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
});

export default ChapterMap;
