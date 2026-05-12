import * as THREE from "three";

/* ── Geometry profiles ── */

export const BODY_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.4 + 0.25 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const y = -0.55 * Math.cos(angle);
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
})();

export const EAR_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.22 - 0.04 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.45 * Math.cos(angle);
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

export const ARM_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.15 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.11 - 0.03 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.15 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

export const FOOT_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.18 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.19 - 0.06 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.18 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

const BODY_COLOR = "#f0e6dc";
const BODY_EMISSIVE = "#c8b8a8";
export const EYE_COLOR = "#1a1a2e";

export const MAT_PROPS = {
  color: BODY_COLOR,
  emissive: BODY_EMISSIVE,
  emissiveIntensity: 0.05,
  metalness: 0,
  roughness: 0.92,
} as const;
