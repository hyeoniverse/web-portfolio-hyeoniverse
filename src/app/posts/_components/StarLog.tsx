/* 로그 스킨의 별밭 — 로고의 ✦ 별을 모티프로, 글 목록 페이지 바탕 전체에 옅은 별가루와 반짝이는 별 몇 개를 깐다.
   화면에 고정돼 스크롤해도 하늘처럼 제자리에 있다. 장식이라 읽지 않는다.
   별 자리는 씨앗 문자열로 정해져 서버 · 브라우저가 같은 그림을 그린다(하이드레이션 어긋남 없음) */
import styles from "./StarLog.module.css";

const W = 1600;
const H = 1000;

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

export default function StarLog({ seed }: { seed: string }) {
  const r = rng(seed);
  const items = Array.from({ length: 160 }, () => ({ x: r() * W, y: r() * H, size: r(), big: r() < 0.07, delay: r() * 5 }));
  return (
    <svg className={styles.field} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {items.map((s, i) =>
        s.big ? (
          <path key={i} className={styles.twinkle} d={star(s.x, s.y, 5 + s.size * 6)} style={{ animationDelay: `${s.delay}s` }} />
        ) : (
          <circle key={i} className={styles.dust} cx={s.x} cy={s.y} r={0.8 + s.size * 1.2} />
        ),
      )}
      <path className={styles.brand} d={star(W * 0.86, H * 0.14, 14)} />
      <line className={styles.shoot} x1="0" y1="0" x2="110" y2="38" />
    </svg>
  );
}
