/* 로그 스킨의 머리말 그래픽 — 로고의 ✦ 별을 모티프로 한 '별 항해일지'. 장식이라 읽지 않는다.
   모양은 씨앗 문자열로 정해져 서버 · 브라우저가 같은 그림을 그린다(하이드레이션 어긋남 없음).
   variant — constellation: 별을 이어 별자리 / field: 반짝이는 별밭과 별똥별 / chart: 궤도 동심원 성도 */
import styles from "./StarLog.module.css";

export type StarLogVariant = "constellation" | "field" | "chart";

const W = 600;
const H = 220;

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 네 갈래 별(로고 모양) — 중심 (x, y), 반지름 r */
function star(x: number, y: number, r: number) {
  const k = r * 0.16;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

function Constellation({ r }: { r: () => number }) {
  // 왼쪽(오래된 기록)에서 오른쪽(최근)으로 이어지는 별 12개
  const pts = Array.from({ length: 12 }, (_, i) => [40 + i * 46 + (r() - 0.5) * 20, 40 + r() * (H - 80)] as const);
  return (
    <>
      <polyline className={styles.link} points={pts.map(([x, y]) => `${x},${y}`).join(" ")} />
      {pts.map(([x, y], i) => {
        const last = i === pts.length - 1;
        return (
          <g key={i} className={last ? styles.latest : styles.node} style={{ animationDelay: `${i * 0.08}s` }}>
            {last && <circle className={styles.halo} cx={x} cy={y} r="18" />}
            <path d={star(x, y, last ? 13 : 4 + r() * 5)} />
          </g>
        );
      })}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={`d${i}`} className={styles.dust} cx={r() * W} cy={r() * H} r={0.6 + r() * 0.9} />
      ))}
    </>
  );
}

function Field({ r }: { r: () => number }) {
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const x = r() * W;
        const y = r() * H;
        const big = r() < 0.12;
        return big ? (
          <path key={i} className={styles.twinkle} d={star(x, y, 5 + r() * 6)} style={{ animationDelay: `${r() * 3}s` }} />
        ) : (
          <circle key={i} className={styles.dust} cx={x} cy={y} r={0.6 + r() * 1.2} />
        );
      })}
      <g className={styles.shoot}>
        <line x1="0" y1="0" x2="90" y2="30" />
      </g>
      <path className={styles.latest} d={star(W - 70, 70, 16)} />
    </>
  );
}

function Chart({ r }: { r: () => number }) {
  const cx = W - 140;
  const cy = H / 2;
  const rings = [40, 80, 120, 170];
  return (
    <>
      <line className={styles.axis} x1={cx - 230} y1={cy} x2={W} y2={cy} />
      <line className={styles.axis} x1={cx} y1="0" x2={cx} y2={H} />
      {rings.map((rad) => <circle key={rad} className={styles.orbit} cx={cx} cy={cy} r={rad} />)}
      {rings.map((rad, i) => {
        const a = r() * Math.PI * 2;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        return (
          <g key={`p${rad}`} className={styles.node}>
            <path d={star(x, y, 5 + i)} />
            <text className={styles.coord} x={x + 10} y={y - 8}>{`${(a * 57.3).toFixed(0)}° · r${rad}`}</text>
          </g>
        );
      })}
      <path className={styles.latest} d={star(cx, cy, 14)} />
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={`d${i}`} className={styles.dust} cx={r() * W} cy={r() * H} r={0.6 + r() * 0.8} />
      ))}
    </>
  );
}

export default function StarLog({ seed, variant }: { seed: string; variant: StarLogVariant }) {
  const r = rng(seed);
  return (
    <svg className={styles.art} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMid meet" aria-hidden focusable="false">
      {variant === "constellation" && <Constellation r={r} />}
      {variant === "field" && <Field r={r} />}
      {variant === "chart" && <Chart r={r} />}
    </svg>
  );
}
