/** AI 커버 생성 스타일 옵션 */
export interface CoverStyleOption {
  key: string;
  label: string;
}

export const COVER_STYLE_OPTIONS = [
  { key: "abstract", label: "Abstract" },
  { key: "minimal", label: "Minimal" },
  { key: "geometric", label: "Geometric" },
  { key: "photographic", label: "Photographic" },
  { key: "illustration", label: "Illustration" },
  { key: "watercolor", label: "Watercolor" },
  { key: "cyberpunk", label: "Cyberpunk" },
  { key: "vintage", label: "Vintage" },
  { key: "3d-render", label: "3D Render" },
  { key: "flat-design", label: "Flat Design" },
] as const satisfies readonly CoverStyleOption[];

export type CoverStyleKey = (typeof COVER_STYLE_OPTIONS)[number]["key"];

/** postContext 없을 때 프롬프트 후보 fallback */
export const FALLBACK_COVER_PROMPTS = [
  "serene mountain landscape at golden hour",
  "futuristic neon cityscape",
  "calm ocean waves at sunset",
  "colorful abstract fluid art",
];
