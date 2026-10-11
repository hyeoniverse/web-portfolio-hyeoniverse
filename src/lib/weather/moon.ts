/**
 * 달 — 그 순간 달의 하늘 위치(적경 · 적위)와 위상. About 하늘 배경에 방문자 위치에서 보이는 실제 달을 그린다.
 *
 * 저정밀 식(Meeus 「Astronomical Algorithms」의 주요 항만 남긴 것)으로 위치 오차는 0.3° 안팎이다. 화면에서 달 크기를
 * 키워 그리므로 이 정도면 충분하다. 시차(지구 반지름만큼 어긋나는 1° 남짓)도 같은 이유로 넣지 않는다.
 * 위상은 해와 달의 황경 차(이각)로 구한다 — 밝은 쪽은 늘 해를 향한다.
 */

const RAD = Math.PI / 180;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

export interface MoonState {
  /** 달 적경(시) · 적위(도) */
  ra: number;
  dec: number;
  /** 해 적경(시) · 적위(도) — 밝은 쪽 방향을 정할 때 */
  sunRa: number;
  sunDec: number;
  /** 빛나는 몫 0(삭) ~ 1(망) */
  illum: number;
  /** 차오르는 중(삭 → 망)인지 */
  waxing: boolean;
  /** 위상 0 ~ 1 (0 삭 · 0.25 상현 · 0.5 망 · 0.75 하현) */
  phase: number;
}

function toEquatorial(lambda: number, beta: number, eps: number) {
  const l = lambda * RAD, b = beta * RAD, e = eps * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  return { ra: norm(ra / RAD) / 15, dec: dec / RAD };
}

export function moonState(date: Date): MoonState {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  /* 달 — 평균 황경 · 근점 이각 · 승교점 이각 · 해와의 평균 이각 */
  const L = norm(218.316 + 13.176396 * d);
  const M = norm(134.963 + 13.064993 * d) * RAD;
  const F = norm(93.272 + 13.22935 * d) * RAD;
  const D = norm(297.85 + 12.190749 * d) * RAD;
  /* 해 — 평균 근점 이각 · 황경 */
  const Ms = norm(357.529 + 0.98560028 * d) * RAD;
  const sunLambda = norm(280.46 + 0.9856474 * d + 1.915 * Math.sin(Ms) + 0.02 * Math.sin(2 * Ms));
  const lambda = norm(
    L +
      6.289 * Math.sin(M) +
      1.274 * Math.sin(2 * D - M) +
      0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * M) -
      0.186 * Math.sin(Ms) -
      0.114 * Math.sin(2 * F),
  );
  const beta = 5.128 * Math.sin(F) + 0.281 * Math.sin(M + F) + 0.278 * Math.sin(M - F) + 0.173 * Math.sin(2 * D - F);
  const eps = 23.439 - 0.0000004 * d;
  const moon = toEquatorial(lambda, beta, eps);
  const sun = toEquatorial(sunLambda, 0, eps);
  /* 이각 — 해에서 달까지 황도를 따라 잰 각 */
  const elong = norm(lambda - sunLambda);
  const psi = Math.acos(Math.cos(beta * RAD) * Math.cos(elong * RAD));
  return {
    ra: moon.ra,
    dec: moon.dec,
    sunRa: sun.ra,
    sunDec: sun.dec,
    illum: (1 - Math.cos(psi)) / 2,
    waxing: elong < 180,
    phase: elong / 360,
  };
}

/** 위상 이름 — 0 삭 ~ 0.5 망 ~ 1 */
export function moonPhaseName(phase: number): { ko: string; en: string } {
  const p = norm(phase * 360) / 360;
  if (p < 0.03 || p > 0.97) return { ko: "삭", en: "New moon" };
  if (p < 0.22) return { ko: "초승달", en: "Waxing crescent" };
  if (p < 0.28) return { ko: "상현달", en: "First quarter" };
  if (p < 0.47) return { ko: "차오르는 달", en: "Waxing gibbous" };
  if (p < 0.53) return { ko: "보름달", en: "Full moon" };
  if (p < 0.72) return { ko: "기우는 달", en: "Waning gibbous" };
  if (p < 0.78) return { ko: "하현달", en: "Last quarter" };
  return { ko: "그믐달", en: "Waning crescent" };
}

/** 달 모양 — 오른쪽(+x)이 밝은 쪽인 원점 중심 패스. 빛나는 몫 k 에 따라 밝은 반원 + 명암 경계(타원).
    위 → 오른쪽 → 아래(밝은 반원), 아래 → 위로 경계를 따라 — 초승(k < 0.5)은 경계가 밝은 쪽으로, 차오른(k > 0.5)은 반대쪽으로 부푼다 */
export function moonLitPath(k: number, r: number): string {
  const rx = Math.abs(1 - 2 * k) * r;
  return `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx.toFixed(2)} ${r} 0 0 ${k < 0.5 ? 0 : 1} 0 ${-r}Z`;
}
