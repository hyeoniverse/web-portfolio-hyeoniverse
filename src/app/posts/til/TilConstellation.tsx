"use client";

import Pressable from "@/components/ui/Pressable";
import { CONSTELLATIONS, type Constellation } from "./constellations";
import styles from "./TilConstellation.module.css";

/** 네 갈래 별(로고 모양) — 중심 (x, y), 반지름 r */
function star(x: number, y: number, r: number) {
  const k = r * 0.18;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

/** 그달 TIL 을 쓴 날들(오름차순) — 별 하나 = 하루 */
export function monthDays(byDay: Map<string, unknown[]>, year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  return [...byDay.keys()].filter((k) => k.startsWith(prefix)).sort();
}

export function isComplete(c: Constellation, days: string[]) {
  return days.length >= c.stars.length;
}

/** 별자리 판 하나 — 켜진 별(그날 TIL) · 이어진 선 · 다음에 켜질 별. big 이면 별을 눌러 그날을 고를 수 있다 */
export function ConstellationArt({
  c,
  days,
  big = false,
  selected,
  onPick,
  labelOf,
}: {
  c: Constellation;
  days: string[];
  big?: boolean;
  selected?: string | null;
  onPick?: (day: string) => void;
  labelOf?: (day: string) => string;
}) {
  const lit = Math.min(days.length, c.stars.length);
  const done = lit >= c.stars.length;
  return (
    <svg className={`${styles.art} ${done ? styles.done : ""}`} viewBox="0 0 100 60" aria-hidden={!big}>
      {c.lines.map(([a, b], i) => {
        const on = a < lit && b < lit;
        const [x1, y1] = c.stars[a];
        const [x2, y2] = c.stars[b];
        return <line key={i} className={on ? styles.lineOn : styles.lineOff} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {c.stars.map(([x, y], i) => {
        const on = i < lit;
        const next = i === lit && !done;
        const day = days[i];
        const r = big ? (on ? 2.6 : 1.6) : on ? 3.4 : 2;
        const shape = <path className={on ? styles.starOn : next ? styles.starNext : styles.starOff} d={star(x, y, r)} />;
        if (!big || !on || !onPick) return <g key={i}>{shape}</g>;
        return (
          <g
            key={i}
            role="button"
            tabIndex={0}
            className={`${styles.hit} ${day === selected ? styles.hitSelected : ""}`}
            aria-label={labelOf?.(day) ?? day}
            onClick={() => onPick(day)}
            // 마우스로 누를 땐 초점을 주지 않는다 — 전역 초점 테두리가 별 위에 네모로 남지 않게(키보드 초점은 그대로)
            onMouseDown={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(day); } }}
          >
            <title>{labelOf?.(day) ?? day}</title>
            <circle cx={x} cy={y} r="5" className={styles.hitArea} />
            {shape}
          </g>
        );
      })}
    </svg>
  );
}

/** 1년 열두 별자리 — 달마다 작은 판. 누르면 그달을 크게 본다 */
export function ConstellationStrip({
  year,
  byDay,
  month,
  onMonth,
  monthLabel,
}: {
  year: number;
  byDay: Map<string, unknown[]>;
  month: number;
  onMonth: (m: number) => void;
  monthLabel: (m: number) => string;
}) {
  return (
    <ol className={styles.strip}>
      {CONSTELLATIONS.map((c, m) => {
        const days = monthDays(byDay, year, m);
        const done = isComplete(c, days);
        return (
          <li key={m}>
            <Pressable
              noTapScale
              className={`${styles.cell} ${m === month ? styles.cellActive : ""} ${done ? styles.cellDone : ""}`}
              aria-pressed={m === month}
              onClick={() => onMonth(m)}
            >
              <ConstellationArt c={c} days={days} />
              <span className={styles.cellLabel}>
                <span>{monthLabel(m)}</span>
                <span className={styles.cellCount}>
                  {Math.min(days.length, c.stars.length)}/{c.stars.length}
                </span>
              </span>
            </Pressable>
          </li>
        );
      })}
    </ol>
  );
}
