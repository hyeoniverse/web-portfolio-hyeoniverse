"use client";

import styles from "../Dashboard.module.css";
/** SVG sparkline — 일별 조회수 추세. 14개 값(최근 14일) 받아서 폭에 맞춰 그림. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0)
    return <div className={styles.sparkline} aria-hidden />;
  const max = Math.max(...values, 1);
  const w = 100; // viewBox 기준 비율
  const h = 28;
  const stepX = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * h * 0.9 - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const areaPath = `M0,${h} L${points.join(" L")} L${w},${h} Z`;
  const linePath = `M${points.join(" L")}`;
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} className={styles.sparkArea} />
      <path d={linePath} className={styles.sparkLine} fill="none" />
    </svg>
  );
}

export default Sparkline;
