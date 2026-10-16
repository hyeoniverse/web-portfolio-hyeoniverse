import { CONSTELLATIONS, litCount, starPath as star } from "./constellations";
import styles from "./Til.module.css";

/* 잔디 위 하늘 — 달마다 그달 칸 위에 별자리 하나(1월 염소자리 … 12월 궁수자리).
   그달 TIL 을 쓴 날마다 별이 순서대로 켜지고 양끝이 켜진 선이 이어진다. 별을 다 켜면 별자리가 빛나며 완성.
   잔디 격자(.grass)의 첫 줄로 들어가 달 칸 너비에 맞춰 선다 */
export default function TilSky({
  year,
  weeks,
  byDay,
  monthName,
}: {
  year: number;
  weeks: (string | null)[][];
  byDay: Map<string, unknown[]>;
  monthName: (m: number) => string;
}) {
  // 달이 시작하는 주(열) — 다음 달 시작 전까지가 그달 하늘
  const starts = CONSTELLATIONS.map((_, m) => {
    const first = `${year}-${String(m + 1).padStart(2, "0")}-01`;
    return Math.max(0, weeks.findIndex((w) => w.includes(first)));
  });
  return (
    <>
      <span className={styles.skyCorner} aria-hidden />
      {CONSTELLATIONS.map((c, m) => {
        const lit = litCount(byDay, year, m);
        const done = lit >= c.stars.length;
        const end = m === 11 ? weeks.length : starts[m + 1];
        const label = `${monthName(m)} · ${c.ko} ${c.en} · ${lit}/${c.stars.length}`;
        return (
          <div
            key={m}
            className={`${styles.skyBand} ${done ? styles.skyDone : ""}`}
            style={{ gridColumn: `${starts[m] + 2} / ${end + 2}` }}
            title={label}
            aria-label={label}
            role="img"
          >
            <svg viewBox="0 0 100 60" className={styles.skyArt} aria-hidden>
              {c.lines.map(([a, b], i) => {
                const on = a < lit && b < lit;
                return (
                  <line
                    key={i}
                    className={on ? styles.skyLineOn : styles.skyLineOff}
                    x1={c.stars[a][0]}
                    y1={c.stars[a][1]}
                    x2={c.stars[b][0]}
                    y2={c.stars[b][1]}
                  />
                );
              })}
              {c.stars.map(([x, y], i) => (
                <path
                  key={i}
                  className={i < lit ? styles.skyStarOn : i === lit && !done ? styles.skyStarNext : styles.skyStarOff}
                  d={star(x, y, i < lit ? 5 : 3.2)}
                />
              ))}
            </svg>
          </div>
        );
      })}
    </>
  );
}
