import * as THREE from "three";

export const BUNNY = {
  speed: 0.15,
  z: -2,
  hitRadius: 0.7,
  impulse: 4.0,
  wallRestitution: 0.8,
  friction: 0.996,
  margin: 1.0,
  baseRotation: { x: 0.06, y: 0.12, z: 0.03 },
  bob: { amp: 0.06, freq: 0.4 },
} as const;

/* Egg-shaped body profile (wider at bottom, rounded poles) */
export const BODY_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI; // 0 (bottom) → π (top)
    // R varies: 0.65 at bottom → 0.15 at top → extra chubby hip
    const R = 0.4 + 0.25 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const y = -0.55 * Math.cos(angle);
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
})();

/* Ear profile — thin base, thick rounded tip */
export const EAR_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.22 - 0.04 * Math.cos(angle); // 0.18 base → 0.26 tip
    const r = R * Math.sin(angle);
    const normalY = -0.45 * Math.cos(angle);
    // Tip end (t > 0.6): smooth dome
    if (t <= 0.6) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const flatY = -0.45 * Math.cos(0.6 * Math.PI);
      const b = (t - 0.6) / 0.4;
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

/* Arm profile — hand end has smooth dome (봉긋) */
export const ARM_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.15 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.11 - 0.03 * Math.cos(angle); // 0.08 shoulder → 0.14 hand
    const r = R * Math.sin(angle);
    const normalY = -0.15 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      // retain 80% → 손바닥 쪽 도톰하게 튀어나옴
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

/* Teardrop foot profile — toe end has smooth dome (봉긋) */
export const FOOT_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.18 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.19 - 0.06 * Math.cos(angle); // 0.13 ankle → 0.25 toe
    const r = R * Math.sin(angle);
    const normalY = -0.18 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      // retain 80% of curvature at tip → 도톰하게 튀어나옴
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

/* Soft plush colors — no metal */
export const BODY_COLOR = "#f0e6dc";
export const BODY_EMISSIVE = "#c8b8a8";
export const EYE_COLOR = "#1a1a2e";

/* ── 눈자리 ────────────────────────────────────────────────
   머리 도형 좌표다. profile 의 떠다니는 몽이와 works 의 원통 인트로 몽이가 같은 머리·같은
   눈 위치를 쓰므로 값도 한 곳에서 본다. 따로 두면 한쪽만 고쳐져 털이 눈을 덮는다. */
export const EYE_LOCAL = [0.174, 0.04, 0.442] as const;
/**
 * 눈가에서 털을 눕히는 자리. 안쪽 반지름 · 바깥 반지름 · 세로 눌림.
 *
 * 눈은 세로로 길어서 원이 아니라 타원이어야 한다(`yw` 가 1 보다 작으면 세로로 늘어난 타원).
 * 안쪽은 눈에 가려지는 크기라, 거기서 털이 납작해도 맨살이 드러나지 않는다.
 */
/* rOut 을 눈 실루엣에 바짝 붙인다 — 넓게 잡으면 눈 둘레로 털이 납작해진 넓은 민살 고리가 생겨
   '눈가가 비어 보이는' 원인이 된다. 좁히면 털이 눈 바로 앞까지 빼곡히 차되 눈은 안 묻힌다.
   민살 고리를 사실상 없애려고 rOut 을 0.2→0.15 로 조이고, 세로 눌림(yw)도 0.62→0.72 로 높여
   눈 위아래로 부풀던 여백을 줄였다(세로 full-fur 도달 = rOut/yw: 0.32→0.21). 남는 얇은 램프
   고리는 눈을 살짝 키워(0.12→0.13) 검은 눈 원반이 덮게 했다 — FloatingScene·CylinderIntroBunny 둘 다. */
export const BARE_RIN = 0.08;
export const BARE_ROUT = 0.15;
export const BARE_YW = 0.72;

/* ── 털을 쌓을 부위의 도형 ────────────────────────────────────
   셸 렌더링은 같은 도형을 여러 겹 겹쳐 그린다. JSX 안에서 매번 만들면 겹마다 사본이
   생기고, 무엇보다 머리는 매 프레임 꼭짓점을 밀어 변형하므로 **같은 것**을 봐야 한다 —
   그래야 털이 눌린 살을 따라간다. */
export const BODY_GEO = new THREE.LatheGeometry(BODY_PROFILE, 24);
export const HEAD_GEO = new THREE.SphereGeometry(0.48, 40, 28);
export const EAR_GEO = new THREE.LatheGeometry(EAR_PROFILE, 16);
export const ARM_GEO = new THREE.LatheGeometry(ARM_PROFILE, 16);
export const FOOT_GEO = new THREE.LatheGeometry(FOOT_PROFILE, 16);
export const TAIL_GEO = new THREE.SphereGeometry(0.14, 16, 12);
