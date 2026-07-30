/** favicon 폰트 크기 프리셋 (px). 이 목록에 없는 값이면 "직접 입력"(stepper) 모드 */
export const FAVICON_FONT_SIZE_PRESETS = ["14", "18", "20", "24", "28"];

/** favicon 그림자 프리셋 — 빠른 세팅용 칩. 이후 광원 드래그/blur 로 미세 조정 */
export interface FaviconShadowPreset {
  key: string;
  label: string;
  custom: string;
  angle: string;
  color: string;
  inset: boolean;
}
export const FAVICON_SHADOW_PRESETS = [
  { key: "soft", label: "소프트", custom: "2", angle: "135", color: "rgba(0,0,0,0.25)", inset: false },
  { key: "medium", label: "미디엄", custom: "4", angle: "135", color: "rgba(0,0,0,0.4)", inset: false },
  { key: "hard", label: "하드", custom: "7", angle: "135", color: "rgba(0,0,0,0.55)", inset: false },
  { key: "long", label: "롱", custom: "11", angle: "135", color: "rgba(0,0,0,0.3)", inset: false },
  { key: "inset", label: "인셋", custom: "4", angle: "135", color: "rgba(0,0,0,0.45)", inset: true },
] as const satisfies readonly FaviconShadowPreset[];

/** legacy size(sm/md/lg) → blur px fallback. 지금은 직접입력(custom) 이지만 하위호환용. */
export const FAVICON_SIZE_BLUR: Record<string, string> = { sm: "1", md: "2", lg: "3" };
