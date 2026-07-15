import { createElement, type ReactNode, type SVGProps } from "react";

/* =============================================================================
 * Favicon SVG — 공유 렌더 로직
 * =============================================================================
 * /api/favicon/route.ts (SVG 문자열) 과 AppearanceTab 미리보기 (React SVG) 가
 * "동일 결과" 를 내도록 값 계산 · 그림자 filter 를 여기서 한 곳에 정의한다.
 *
 * - resolveFavicon: 색/크기/장평/그림자 등 렌더에 필요한 스칼라 값 계산
 * - faviconFilterPrimitives: 그림자 <filter> 내부 primitive 목록 (단일 소스)
 * - filterPrimitivesToString: primitive → SVG 문자열 (route.ts 용)
 * - FaviconFilter: primitive → React 요소 (미리보기 용)
 * =========================================================================== */

export type FaviconShape = "circle" | "square" | "none";
export type FaviconWeight = "light" | "regular" | "bold";
export type FaviconShadowSize = "sm" | "md" | "lg" | "custom";

export interface FaviconShadow {
  enabled: boolean;
  inset: boolean;
  /** "sm" | "md" | "lg" | "custom" — SiteConfigData 가 리터럴을 string 으로 widen 하므로 string 으로 받음 */
  size: string;
  /** custom size 일 때 blur px (숫자 문자열) */
  custom: string;
  /** 그림자색 — 빈 값이면 기본 rgba(0,0,0,0.4) */
  color: string;
  /** 그림자 방향 (도, 문자열 — widen 고려). 나침반식: 0=위, 시계방향. 기본 "135"=우하단(현재 동작) */
  angle: string;
}

/** enabled=false 인 기본 그림자 (legacy fallback 용) */
export const DEFAULT_FAVICON_TEXT_SHADOW: FaviconShadow = {
  enabled: false,
  inset: false,
  size: "md",
  custom: "",
  color: "",
  angle: "135",
};
/** 배경(rect) 은 32×32 라 outer 공간이 없어 inset 이 기본 */
export const DEFAULT_FAVICON_BG_SHADOW: FaviconShadow = {
  enabled: false,
  inset: true,
  size: "md",
  custom: "",
  color: "",
  angle: "135",
};

/** 그림자 방향 8방향 옵션 — 나침반식(0=위, 시계방향). dx=sin, dy=-cos 와 일치해 화살표와 시각 일치. */
export const FAVICON_SHADOW_DIRECTIONS: { value: string; arrow: string }[] = [
  { value: "0", arrow: "↑" },
  { value: "45", arrow: "↗" },
  { value: "90", arrow: "→" },
  { value: "135", arrow: "↘" },
  { value: "180", arrow: "↓" },
  { value: "225", arrow: "↙" },
  { value: "270", arrow: "←" },
  { value: "315", arrow: "↖" },
];

const DEFAULT_SHADOW_COLOR = "rgba(0,0,0,0.4)";

export interface ResolvedShadow {
  inset: boolean;
  dx: number;
  dy: number;
  blur: number;
  color: string;
}

export function faviconWeightToNumber(w: FaviconWeight): number {
  return w === "light" ? 300 : w === "regular" ? 500 : 700;
}

/** favicon 텍스트 폰트 크기 — 빈/invalid 면 20, 합리적 범위 8~30 clamp */
export function resolveFaviconFontSize(raw: string | undefined): number {
  const n = parseFloat(raw ?? "");
  if (!Number.isFinite(n)) return 20;
  return Math.min(30, Math.max(8, n));
}

/** 장평 — 빈/invalid 면 0.8 default */
export function resolveFaviconStretch(raw: string | undefined): number {
  const n = parseFloat(raw ?? "");
  return Number.isFinite(n) && n > 0 ? n : 0.8;
}

/** viewBox 중심 (16,16) 기준 scaleX transform. stretch===1 이면 undefined */
export function faviconStretchTransform(stretch: number): string | undefined {
  if (stretch === 1) return undefined;
  return `translate(${16 * (1 - stretch)} 0) scale(${stretch} 1)`;
}

/** shadow 설정 → blur/offset 프리셋 해석. disabled 면 null */
export function resolveFaviconShadow(shadow: FaviconShadow | undefined): ResolvedShadow | null {
  if (!shadow?.enabled) return null;
  let blur: number;
  let offset: number;
  switch (shadow.size) {
    case "sm":
      blur = 1;
      offset = 1;
      break;
    case "lg":
      blur = 3;
      offset = 2;
      break;
    case "custom": {
      const c = parseFloat(shadow.custom ?? "");
      blur = Number.isFinite(c) ? Math.min(12, Math.max(0, c)) : 2;
      offset = Math.min(blur, 2);
      break;
    }
    case "md":
    default:
      blur = 2;
      offset = 1.5;
      break;
  }
  // 방향 — 나침반식(0=위, 시계방향). 화면좌표(y 아래+): dx=sin, dy=-cos.
  // 예) 135 → dx=+0.71, dy=+0.71 (우하단, 기존 동작). inset/outer 둘 다 이 dx/dy 사용.
  const angleN = parseFloat(shadow.angle ?? "");
  const angle = Number.isFinite(angleN) ? angleN : 135;
  const rad = (angle * Math.PI) / 180;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    inset: !!shadow.inset,
    dx: round2(offset * Math.sin(rad)),
    dy: round2(offset * -Math.cos(rad)),
    blur,
    color: shadow.color || DEFAULT_SHADOW_COLOR,
  };
}

export interface FaviconRenderInput {
  shape: FaviconShape;
  weight: FaviconWeight;
  logoText: string;
  logoFont: string;
  logoFontStretch: string;
  faviconBgLight: string;
  faviconBgDark: string;
  faviconFontSize: string;
  /** 라이트 variant 글자색 override (빈 값 = preset 자동) */
  faviconColor: string;
  /** 다크 variant 글자색 override (빈 값 = preset 자동) */
  faviconColorDark: string;
  faviconTextShadow: FaviconShadow;
  faviconBgShadow: FaviconShadow;
  /** 호출부가 계산한 preset 색 (logoColor || fallback) */
  presetLight: string;
  presetDark: string;
}

export interface FaviconRender {
  shape: FaviconShape;
  hasBg: boolean;
  radius: number;
  bgColor: string;
  fgColor: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  logoText: string;
  transform?: string;
  textShadow: ResolvedShadow | null;
  bgShadow: ResolvedShadow | null;
}

/** favicon 한 variant 렌더에 필요한 모든 값 계산 (route.ts / 미리보기 공용) */
export function resolveFavicon(input: FaviconRenderInput, variant: "light" | "dark"): FaviconRender {
  const shape = input.shape ?? "circle";
  const hasBg = shape !== "none";
  const radius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;
  const { presetLight, presetDark } = input;
  const faviconBgLight = input.faviconBgLight || presetDark;
  const faviconBgDark = input.faviconBgDark || presetLight;
  const bgColor = variant === "light" ? faviconBgLight : faviconBgDark;
  // 기존 fg 계산 — shape=none 이면 반전, 아니면 preset 그대로
  const computedFg = shape === "none"
    ? (variant === "light" ? presetDark : presetLight)
    : (variant === "light" ? presetLight : presetDark);
  const override = variant === "light" ? input.faviconColor : input.faviconColorDark;
  const fgColor = override || computedFg;
  const fontFamily = input.logoFont || "'Instrument Serif', Georgia, serif";
  const fontWeight = faviconWeightToNumber(input.weight ?? "light");
  const fontSize = resolveFaviconFontSize(input.faviconFontSize);
  const transform = faviconStretchTransform(resolveFaviconStretch(input.logoFontStretch));
  const logoText = ((input.logoText || "H").trim() || "H").charAt(0);
  const textShadow = resolveFaviconShadow(input.faviconTextShadow);
  const bgShadow = hasBg ? resolveFaviconShadow(input.faviconBgShadow) : null;
  return { shape, hasBg, radius, bgColor, fgColor, fontFamily, fontWeight, fontSize, logoText, transform, textShadow, bgShadow };
}

/* ── 그림자 <filter> primitive — 단일 소스 (문자열/React 양쪽에서 소비) ── */

export interface FilterPrimitive {
  tag: string;
  attrs: Record<string, string | number>;
  children?: FilterPrimitive[];
}

/**
 * outer = feDropShadow 단일 primitive.
 * inset = 표준 inner-shadow 체인 (alpha 반전 → blur → offset → flood+composite → shape clip → merge).
 */
export function faviconFilterPrimitives(r: ResolvedShadow): FilterPrimitive[] {
  if (!r.inset) {
    return [
      {
        tag: "feDropShadow",
        attrs: { dx: r.dx, dy: r.dy, stdDeviation: r.blur, "flood-color": r.color },
      },
    ];
  }
  return [
    {
      tag: "feComponentTransfer",
      attrs: { in: "SourceAlpha" },
      children: [{ tag: "feFuncA", attrs: { type: "table", tableValues: "1 0" } }],
    },
    { tag: "feGaussianBlur", attrs: { stdDeviation: r.blur } },
    { tag: "feOffset", attrs: { dx: r.dx, dy: r.dy, result: "offsetblur" } },
    { tag: "feFlood", attrs: { "flood-color": r.color, result: "color" } },
    { tag: "feComposite", attrs: { in2: "offsetblur", operator: "in" } },
    { tag: "feComposite", attrs: { in2: "SourceAlpha", operator: "in", result: "shadow" } },
    {
      tag: "feMerge",
      attrs: {},
      children: [
        { tag: "feMergeNode", attrs: { in: "SourceGraphic" } },
        { tag: "feMergeNode", attrs: { in: "shadow" } },
      ],
    },
  ];
}

function escAttr(s: string): string {
  return s.replace(/[<>"'&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;", "&": "&amp;" }[c]!));
}

function primitiveToString(p: FilterPrimitive): string {
  const attrs = Object.entries(p.attrs)
    .map(([k, v]) => `${k}="${escAttr(String(v))}"`)
    .join(" ");
  const head = attrs ? `${p.tag} ${attrs}` : p.tag;
  if (!p.children || p.children.length === 0) return `<${head} />`;
  return `<${head}>${p.children.map(primitiveToString).join("")}</${p.tag}>`;
}

export function filterPrimitivesToString(prims: FilterPrimitive[]): string {
  return prims.map(primitiveToString).join("");
}

/** route.ts 용 — <filter> 문자열 전체 (넉넉한 filter region 으로 blur clip 방지) */
export function faviconFilterString(r: ResolvedShadow, id: string): string {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${filterPrimitivesToString(faviconFilterPrimitives(r))}</filter>`;
}

/* ── React 렌더 (미리보기 용) — 같은 primitive 목록을 요소로 변환 ── */

function renderPrimitives(prims: FilterPrimitive[]): ReactNode[] {
  return prims.map((p, i) => {
    const props: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(p.attrs)) {
      // kebab-case SVG attr → React camelCase (flood-color → floodColor 등)
      props[k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    }
    return createElement(
      p.tag,
      { key: i, ...props } as SVGProps<SVGElement>,
      p.children ? renderPrimitives(p.children) : null,
    );
  });
}

/** 미리보기 <defs> 안에 넣는 그림자 filter (route.ts faviconFilterString 와 동일 구조) */
export function FaviconFilter({ resolved, id }: { resolved: ResolvedShadow; id: string }): ReactNode {
  return createElement(
    "filter",
    { id, x: "-50%", y: "-50%", width: "200%", height: "200%" },
    renderPrimitives(faviconFilterPrimitives(resolved)),
  );
}
