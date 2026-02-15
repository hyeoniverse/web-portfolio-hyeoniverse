// 3D Torus 스크롤 경로 및 시각 설정

// Geometry (축소)
export const TORUS_GEOMETRY = {
  radius: 0.6,
  tube: 0.25,
  radialSegments: 48,
  tubularSegments: 96,
} as const;

// Scale: oval 느낌 (x축 확장)
export const TORUS_SCALE = {
  x: 1.3,
  y: 1.0,
  z: 1.0,
} as const;

// 누적 스크롤 기반 연속 경로 (리사주 곡선)
// X·Y 주파수가 다르면 화면 안에서 끝없이 이어지는 궤도를 그림
export const TORUS_PATH = {
  // X: 좌우 진동
  xAmplitude: 3.5,
  xFrequency: 0.7, // 페이지 1회 스크롤당 주기 수

  // Y: 상하 진동 (X와 다른 주파수 → 리사주 곡선)
  yAmplitude: 3.0,
  yFrequency: 1.1,

  // Z: 깊이 진동
  zAmplitude: 1.5,
  zFrequency: 0.4,
} as const;

// 회전 속도 (페이지 1회 스크롤당 라디안)
export const TORUS_ROTATION = {
  xSpeed: Math.PI * 3,
  ySpeed: Math.PI * 5,
  zSpeed: Math.PI * 1.5,
} as const;

// 테마별 머티리얼 (불투명 메탈릭)
export const TORUS_MATERIAL = {
  dark: {
    color: "#c0c8d8",
    emissive: "#2a4a8a",
    emissiveIntensity: 0.4,
    metalness: 1.0,
    roughness: 0.08,
    opacity: 1.0,
    envMapIntensity: 1.5,
  },
  light: {
    color: "#e8ecf2",
    emissive: "#3b6fc0",
    emissiveIntensity: 0.2,
    metalness: 1.0,
    roughness: 0.12,
    opacity: 1.0,
    envMapIntensity: 1.2,
  },
} as const;

// 커서 반발 효과
export const TORUS_REPULSION = {
  radius: 3.0, // 반발 활성 반경 (world units)
  strength: 1.8, // 최대 밀림 거리
  smoothing: 0.07, // lerp 보간 계수 (낮을수록 부드러움)
} as const;

// 모바일 설정
export const TORUS_MOBILE = {
  breakpoint: 768,
  scaleFactor: 0.65,
  xAmplitudeMultiplier: 0.6,
  radialSegments: 24,
  tubularSegments: 48,
} as const;
