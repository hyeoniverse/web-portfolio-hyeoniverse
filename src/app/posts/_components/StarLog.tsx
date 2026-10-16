/* 로그 스킨의 별밭 — 로고의 ✦ 별을 모티프로, 글 목록 페이지 바탕 전체에 옅은 별가루와 반짝이는 별 몇 개를 깐다.
   페이지와 함께 스크롤된다. 장식이라 읽지 않는다.
   별 자리는 씨앗 문자열로 정해져 서버 · 브라우저가 같은 그림을 그린다(하이드레이션 어긋남 없음) */
import styles from "./StarLog.module.css";

const W = 720;
const H = 640;

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
  const id = "starlog-tile";
  const items = Array.from({ length: 45 }, () => ({ x: r() * W, y: r() * H, size: r(), big: r() < 0.08, delay: r() * 5 }));
  return (
    <svg className={styles.field} aria-hidden focusable="false">
      <defs>
        {/* 별 한 판(W × H)을 이어 붙여 페이지 길이만큼 채운다 — 스크롤하면 함께 흘러간다 */}
        <pattern id={id} width={W} height={H} patternUnits="userSpaceOnUse">
          {items.map((s, i) =>
            s.big ? (
              <path key={i} className={styles.twinkle} d={star(s.x, s.y, 5 + s.size * 6)} style={{ animationDelay: `${s.delay}s` }} />
            ) : (
              <circle key={i} className={styles.dust} cx={s.x} cy={s.y} r={0.8 + s.size * 1.2} />
            ),
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {/* 맨 위 오른쪽에 한 번만 — 로고 별과 별똥별 */}
      <svg x="86%" y="110" overflow="visible">
        <path className={styles.brand} d={star(0, 0, 14)} />
      </svg>
      <svg x="55%" y="40" overflow="visible">
        <line className={styles.shoot} x1="0" y1="0" x2="110" y2="38" />
      </svg>
    </svg>
  );
}
