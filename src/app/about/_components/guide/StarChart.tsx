"use client";

/* 실제 하늘 — 방문자 위치 · 그 시각에 떠 있는 별(맨눈 4.5 등급까지 약 900개) · IAU 88 별자리 선 · 달.
   남쪽(남반구면 북쪽) 하늘을 바라본 모습을 평사도법(stereographic)으로 편다 — 작은 영역의 모양이 그대로 남아서
   오리온 · 북두칠성 같은 별자리가 책에서 보던 모양으로 보인다.
   지평선 위에 뜬 것만 그린다. 이름은 큰 별자리(rank 1 · 2)와 밝은 별만 적어 어지럽지 않게 한다.
   달은 그 시각의 위치 · 위상대로, 밝은 쪽이 해를 향하게 그린다(lib/weather/moon).
   하루 내내 깔려 있고 하늘이 밝을수록 흐릿하게, 어두울수록 또렷하게 보인다(TimeSky.module.css --night).
   달은 낮에도 보이니 그 규칙에서 빼서 따로 한 장 더 겹친다. 화면 비율에 따라 가장자리가 잘려 나가므로(slice),
   달이 보이는 범위 밖에 있으면 가장자리 안쪽으로 끌어와 그린다 */
import { memo, useMemo, useSyncExternalStore } from "react";
import { altAz, localSiderealHours } from "@/lib/weather/stars";
import { moonLitPath, moonState } from "@/lib/weather/moon";
import { SKY_CONSTELLATIONS, SKY_STAR_NAMES, SKY_STARS } from "@/data/generated/skyCatalog";
import styles from "./TimeSky.module.css";

const W = 1600;
const H = 900;
const RAD = Math.PI / 180;
/** 바라보는 방향의 고도(도) — 지평선과 천정 사이 */
const VIEW_ALT = 25;
/** 화면 폭의 반이 덮는 각(도) — 좌우 합쳐 140° */
const HALF_FOV = 70;
/** 지평선(바라보는 방향 바로 아래)이 놓일 화면 높이 */
const HORIZON_Y = H * 0.86;
/** 달 반지름(화면 단위) — 실제(0.5°)보다 크게, 모양이 보이게 */
const MOON_R = 24;
/** 끌어온 달이 가장자리에서 떨어지는 거리(화면 단위) — 위는 메뉴 막대 · 캡션을 피해 더 넉넉히 */
const MOON_EDGE = MOON_R * 2;
const MOON_EDGE_TOP = 120;

/* 화면 가로 · 세로 비율 — 하늘은 화면에 고정된 층이라 창 크기가 곧 그림 크기다 */
const subscribeAspect = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getAspect = () => window.innerWidth / window.innerHeight;
const getServerAspect = () => W / H;

/** 적경(시) · 적위(도) → 단위 벡터 */
const vec = (ra: number, dec: number): [number, number, number] => {
  const a = ra * 15 * RAD, d = dec * RAD;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
};
const fromVec = ([x, y, z]: [number, number, number]) => {
  const n = Math.hypot(x, y, z);
  return { ra: ((((Math.atan2(y, x) / RAD) % 360) + 360) % 360) / 15, dec: Math.asin(z / n) / RAD };
};

function StarChart({ date, lat, lon, language }: { date: Date; lat: number; lon: number; language: "ko" | "en" }) {
  const sky = useMemo(() => {
    const lst = localSiderealHours(date, lon);
    /* 북반구는 남쪽을, 남반구는 북쪽을 보고 선다 */
    const az0 = lat >= 0 ? 180 : 0;
    const a0 = VIEW_ALT * RAD;
    /* 평사도법 — 바라보는 방향이 원점, 동쪽이 왼쪽 */
    const raw = (alt: number, az: number) => {
      const a = alt * RAD, d = (az - az0) * RAD;
      const cosc = Math.sin(a0) * Math.sin(a) + Math.cos(a0) * Math.cos(a) * Math.cos(d);
      const k = 2 / (1 + cosc);
      return { x: k * Math.cos(a) * Math.sin(d), y: k * (Math.cos(a0) * Math.sin(a) - Math.sin(a0) * Math.cos(a) * Math.cos(d)), cosc };
    };
    const scale = W / 2 / (2 * Math.tan((HALF_FOV * RAD) / 2));
    const cy = HORIZON_Y + raw(0, az0).y * scale;
    /** 적경 · 적위 → 화면 자리. up = 지평선 위이고 화면 근처 */
    const at = (ra: number, dec: number) => {
      const { alt, az } = altAz(ra, dec, lat, lst);
      const r = raw(alt, az);
      const x = W / 2 + r.x * scale, y = cy - r.y * scale;
      return { x, y, alt, up: alt > 0 && r.cosc > -0.2 && x > -W * 0.2 && x < W * 1.2 };
    };

    const stars: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < SKY_STARS.length; i += 3) {
      const p = at(SKY_STARS[i], SKY_STARS[i + 1]);
      /* 밝은 별일수록 크게 — 등급 -1.5 ~ 4.5 */
      if (p.up) stars.push({ x: p.x, y: p.y, r: Math.max(0.9, 3.6 - SKY_STARS[i + 2] * 0.62) });
    }

    /* 뱀자리는 두 조각이라 id 가 겹친다 — 그리는 열쇠는 순번으로 */
    const labelled = new Set<string>();
    const constellations = SKY_CONSTELLATIONS.map((c, ci) => {
      let d = "";
      for (const poly of c.lines) {
        let prev: ReturnType<typeof at> | null = null;
        for (let j = 0; j < poly.length; j += 2) {
          const p = at(poly[j], poly[j + 1]);
          /* 두 끝이 다 떠 있는 마디만 긋는다 */
          if (p.up && prev?.up) d += `M${prev.x.toFixed(1)} ${prev.y.toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          prev = p;
        }
      }
      /* 이름은 한 번만(뱀자리 두 조각) */
      const label = c.rank <= 2 && !labelled.has(c.id) ? at(c.label[0], c.label[1]) : null;
      labelled.add(c.id);
      return { key: `${c.id}-${ci}`, d, name: c[language], label: label?.up ? label : null };
    }).filter((c) => c.d || c.label);

    const names = SKY_STAR_NAMES.map((s) => ({ ...at(s.ra, s.dec), name: s[language] })).filter((s) => s.up);

    /* 달 — 자리와, 밝은 쪽(해 쪽) 방향. 해 쪽으로 2° 옮긴 점을 같은 식으로 펴서 화면 위 방향을 잰다.
       화면 밖이어도 지평선 위면 그린다 — 자리는 그릴 때 화면 안으로 끌어온다 */
    const m = moonState(date);
    const mp = at(m.ra, m.dec);
    let moon: { x: number; y: number; angle: number; illum: number } | null = null;
    if (mp.alt > 0) {
      const mv = vec(m.ra, m.dec), sv = vec(m.sunRa, m.sunDec);
      const dot = mv[0] * sv[0] + mv[1] * sv[1] + mv[2] * sv[2];
      const toward: [number, number, number] = [0, 1, 2].map((i) => mv[i] + 0.035 * (sv[i] - dot * mv[i])) as [number, number, number];
      const t = fromVec(toward);
      const tp = at(t.ra, t.dec);
      moon = { x: mp.x, y: mp.y, angle: (Math.atan2(tp.y - mp.y, tp.x - mp.x) * 180) / Math.PI, illum: m.illum };
    }
    return { stars, constellations, names, moon };
  }, [date, lat, lon, language]);

  return (
    <>
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        {sky.constellations.map((c) => (c.d ? <path key={c.key} className={styles.chartLine} d={c.d} /> : null))}
        {sky.stars.map((s, i) => (
          <circle key={i} className={styles.chartStar} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(2)} />
        ))}
        {sky.names.map((s) => (
          <text key={s.name} className={styles.chartStarName} x={(s.x + 8).toFixed(1)} y={(s.y + 4).toFixed(1)}>
            {s.name}
          </text>
        ))}
        {sky.constellations.map((c) =>
          c.label ? (
            <text key={`l-${c.key}`} className={styles.chartName} x={c.label.x.toFixed(1)} y={c.label.y.toFixed(1)} textAnchor="middle">
              {c.name}
            </text>
          ) : null,
        )}
      </svg>
      {sky.moon && <Moon {...sky.moon} />}
    </>
  );
}

/** 달 — 화면에 보이는 범위(slice 로 잘리고 남은 곳) 안으로 자리를 끌어와 그린다 */
function Moon({ x, y, angle, illum }: { x: number; y: number; angle: number; illum: number }) {
  const aspect = useSyncExternalStore(subscribeAspect, getAspect, getServerAspect);
  /* 보이는 범위의 반 너비 · 반 높이 — 화면이 그림보다 길쭉하면 좌우가, 납작하면 위아래가 잘린다 */
  const hw = Math.min(W, H * aspect) / 2;
  const hh = Math.min(H, W / aspect) / 2;
  const cx = Math.min(W / 2 + hw - MOON_EDGE, Math.max(W / 2 - hw + MOON_EDGE, x));
  const cy = Math.min(H / 2 + hh - MOON_EDGE, Math.max(H / 2 - hh + MOON_EDGE_TOP, y));
  return (
    <svg className={styles.moonLayer} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g className={styles.moon} transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        {/* 어두운 쪽 — 지구빛에 희미하게 비치는 원 */}
        <circle className={styles.moonDark} r={MOON_R} />
        {illum > 0.01 && <path className={styles.moonLit} d={moonLitPath(illum, MOON_R)} />}
      </g>
    </svg>
  );
}

export default memo(StarChart);
