"use client";

import styles from "./VisitsTrend.module.css";
import Tooltip from "@/components/ui/Tooltip";

/* ── 일별 방문 추이(#1161) — 유니크 방문자(ip·일) 곡선. 일별 조회수 차트와 같은
   monotone hermite 곡선 + 그라데이션 채움이지만, 선택·달력 없이 보기 전용으로 단순하다. */

const W = 800;
const H = 200;
const PAD_X = 16;
const PAD_T = 24;
const PAD_B = 8;

/** monotone cubic hermite — 점을 정확히 지나면서 출렁이지 않는 곡선 */
function buildPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const n = pts.length;
  const dx = pts[1].x - pts[0].x;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) slopes.push((pts[i + 1].y - pts[i].y) / dx);
  const m: number[] = [slopes[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) m.push(0);
    else m.push((slopes[i - 1] + slopes[i]) / 2);
  }
  m.push(slopes[n - 2]);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const cx1 = pts[i].x + dx / 3;
    const cy1 = pts[i].y + (m[i] * dx) / 3;
    const cx2 = pts[i + 1].x - dx / 3;
    const cy2 = pts[i + 1].y - (m[i + 1] * dx) / 3;
    d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

function VisitsTrend({
  data,
  language,
}: {
  data: Array<{ day: string; count: number }>;
  language: "ko" | "en";
}) {
  if (data.length < 2) return null;

  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = (W - PAD_X * 2) / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_T + (1 - d.count / max) * (H - PAD_T - PAD_B),
  }));
  const linePath = buildPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  /* 라벨 솎기 — 길어도 8개 안팎만. 마지막 날짜는 항상 표시 */
  const labelStep = Math.max(1, Math.ceil(data.length / 8));
  const showLabel = (i: number) =>
    i === data.length - 1 || (i % labelStep === 0 && data.length - 1 - i > labelStep / 2);

  const md = (day: string) => {
    const d = new Date(day);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className={styles.trend}>
      <div className={styles.trendArea}>
        <svg
          className={styles.trendSvg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="visitsTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#visitsTrendGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* hover hit 컬럼 — Tooltip 래퍼가 hover 대상이라 래퍼 자체를 컬럼으로 배치한다 */}
        {data.map((d, i) => (
          <Tooltip
            key={d.day}
            content={`${md(d.day)} · ${d.count.toLocaleString()}`}
            placement="top"
            wrapperStyle={{
              position: "absolute",
              top: 0,
              height: "100%",
              left: `${(pts[i].x / W) * 100}%`,
              width: `${(stepX / W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <span
              className={styles.trendDot}
              style={{ top: `${(pts[i].y / H) * 100}%` }}
            />
          </Tooltip>
        ))}
      </div>
      <div className={styles.trendDays} aria-hidden>
        {data.map((d, i) =>
          showLabel(i) ? (
            <span
              key={d.day}
              className={styles.trendDay}
              style={{ left: `${(pts[i].x / W) * 100}%` }}
            >
              {md(d.day)}
            </span>
          ) : null,
        )}
      </div>
      <span className={styles.trendCaption}>
        {language === "ko" ? "유니크 방문자 · 일별" : "Unique visitors · daily"}
      </span>
    </div>
  );
}

export default VisitsTrend;
