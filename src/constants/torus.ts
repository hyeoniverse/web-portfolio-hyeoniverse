// 3D Torus 스크롤 경로 및 시각 설정

// Geometry
export const TORUS_GEOMETRY = {
  radius: 1.2,
  tube: 0.45,
  radialSegments: 48,
  tubularSegments: 96,
} as const;

// Scale: oval 느낌 (x축 확장)
export const TORUS_SCALE = {
  x: 1.3,
  y: 1.0,
  z: 1.0,
} as const;

// 스크롤 진행도(0~1) → 뷰포트 내 위치 매핑
export const TORUS_PATH = {
  xAmplitude: 4.5,
  xFrequency: 2.5,
  xPhase: 0,

  yStart: 3.5,
  yEnd: -3.5,
  yWaveAmplitude: 1.0,
  yWaveFrequency: 3,

  zAmplitude: 1.5,
  zFrequency: 1.5,
} as const;

// 회전 속도 (전체 스크롤 대비 라디안)
export const TORUS_ROTATION = {
  xSpeed: Math.PI * 4,
  ySpeed: Math.PI * 6,
  zSpeed: Math.PI * 2,
} as const;

// 테마별 머티리얼
export const TORUS_MATERIAL = {
  dark: {
    color: "#4d8dff",
    emissive: "#1a3a7a",
    emissiveIntensity: 0.3,
    metalness: 0.7,
    roughness: 0.2,
    opacity: 0.15,
    wireframeOpacity: 0.25,
  },
  light: {
    color: "#3b82f6",
    emissive: "#1e40af",
    emissiveIntensity: 0.15,
    metalness: 0.5,
    roughness: 0.3,
    opacity: 0.1,
    wireframeOpacity: 0.18,
  },
} as const;

// 모바일 설정
export const TORUS_MOBILE = {
  breakpoint: 768,
  scaleFactor: 0.65,
  xAmplitudeMultiplier: 0.6,
  radialSegments: 24,
  tubularSegments: 48,
} as const;
