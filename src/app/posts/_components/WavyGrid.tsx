import styles from "./WavyGrid.module.css";

/* 출렁이는 격자 — 몽이 스티커 뒤에 까는 장식. 세로줄 · 가로줄을 사인파로 휘게 그린다. 읽지 않는다 */
const W = 480;
const H = 300;
const STEP = 24;

function wave(i: number, t: number) {
  return Math.sin(i * 0.55 + t * 0.03) * 5 + Math.sin(t * 0.07 + i) * 2;
}

export default function WavyGrid({ className }: { className?: string }) {
  const lines: string[] = [];
  for (let i = 0; i <= W / STEP; i++) {
    let d = "";
    for (let y = 0; y <= H; y += 10) d += `${y ? "L" : "M"}${(i * STEP + wave(i, y)).toFixed(1)} ${y}`;
    lines.push(d);
  }
  for (let j = 0; j <= H / STEP; j++) {
    let d = "";
    for (let x = 0; x <= W; x += 10) d += `${x ? "L" : "M"}${x} ${(j * STEP + wave(j, x)).toFixed(1)}`;
    lines.push(d);
  }
  return (
    <svg className={`${styles.grid} ${className ?? ""}`} viewBox={`-8 -8 ${W + 16} ${H + 16}`} preserveAspectRatio="none" aria-hidden focusable="false">
      {lines.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
