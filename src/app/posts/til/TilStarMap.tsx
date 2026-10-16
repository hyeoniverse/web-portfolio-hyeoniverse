import { CONSTELLATIONS, litCount, starPath } from "./constellations";
import styles from "./Til.module.css";

/* 별자리 지도 — 잔디 대신 한 해를 성도로 본다. 열두 별자리가 황도처럼 두 줄 물결로 늘어서고,
   그달 TIL 로 켜진 별 · 선이 보인다. 다 켠 달은 빛나고, 누르면 아래 피드가 그달로 좁혀진다 */
const SCALE = 1.5;
const COL_W = 196;
const ROW_H = 240;

/** 판 크기 — 넓은 화면은 6열 × 2줄, 좁은 화면은 3열 × 4줄 */
const sizeOf = (cols: number) => ({ w: cols * COL_W + 24, h: (12 / cols) * ROW_H + 20 });

/** 별자리 자리 — 줄마다 살짝 물결치고, 홀수 줄은 반 칸 비켜 선다 */
function place(m: number, cols: number) {
  const row = Math.floor(m / cols);
  const col = m % cols;
  const x = 110 + col * COL_W + (row % 2 ? 20 : 0);
  const y = 120 + row * ROW_H + Math.sin(col * 1.1 + row) * 24;
  return { x, y, row };
}

export default function TilStarMap({
  year,
  byDay,
  month,
  onMonth,
  monthName,
  lang,
  cols = 6,
  className,
}: {
  year: number;
  byDay: Map<string, unknown[]>;
  month: number | null;
  onMonth: (m: number | null) => void;
  monthName: (m: number) => string;
  lang: "ko" | "en";
  cols?: number;
  className?: string;
}) {
  const centers = CONSTELLATIONS.map((_, m) => place(m, cols));
  const { w, h } = sizeOf(cols);
  return (
    <svg className={`${styles.map} ${className ?? ""}`} viewBox={`0 0 ${w} ${h}`} role="group" aria-label={`${year}`}>
      {/* 황도 — 줄마다 별자리를 잇는 옅은 길(줄 사이는 잇지 않는다) */}
      <path
        className={styles.mapPath}
        d={centers.map((c, i) => `${i && centers[i - 1].row === c.row ? "L" : "M"}${c.x} ${c.y}`).join("")}
      />
      {CONSTELLATIONS.map((c, m) => {
        const { x, y } = centers[m];
        const lit = litCount(byDay, year, m);
        const done = lit >= c.stars.length;
        const ox = x - 50 * SCALE;
        const oy = y - 30 * SCALE;
        const name = lang === "en" ? c.en : c.ko;
        const label = `${monthName(m)} · ${name} · ${lit}/${c.stars.length}`;
        return (
          <g
            key={m}
            role="button"
            tabIndex={0}
            aria-pressed={month === m}
            aria-label={label}
            className={`${styles.mapItem} ${done ? styles.skyDone : ""} ${month === m ? styles.mapItemOn : ""}`}
            onClick={() => onMonth(month === m ? null : m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMonth(month === m ? null : m);
              }
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <title>{label}</title>
            <rect className={styles.mapHit} x={ox - 10} y={oy - 10} width={100 * SCALE + 20} height={60 * SCALE + 62} rx="12" />
            <g transform={`translate(${ox} ${oy}) scale(${SCALE})`}>
              {c.lines.map(([a, b], i) => (
                <line
                  key={i}
                  className={a < lit && b < lit ? styles.skyLineOn : styles.skyLineOff}
                  x1={c.stars[a][0]}
                  y1={c.stars[a][1]}
                  x2={c.stars[b][0]}
                  y2={c.stars[b][1]}
                />
              ))}
              {c.stars.map(([sx, sy], i) => (
                <path
                  key={i}
                  className={i < lit ? styles.skyStarOn : i === lit && !done ? styles.skyStarNext : styles.skyStarOff}
                  d={starPath(sx, sy, i < lit ? 4 : 2.6)}
                />
              ))}
            </g>
            <text className={styles.mapName} x={x} y={oy + 60 * SCALE + 22} textAnchor="middle">
              {monthName(m)} · {name}
            </text>
            <text className={styles.mapCount} x={x} y={oy + 60 * SCALE + 38} textAnchor="middle">
              {done ? "✦ " : ""}
              {lit}/{c.stars.length}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
