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

/** grapheme cluster 배열. charAt/[i]·split("") 는 UTF-16 코드유닛 기준이라 이모지(surrogate pair·
 *  ZWJ·variation selector)를 반쪽으로 잘라 깨뜨린다 → Intl.Segmenter 로 사용자 인지 단위로 자른다. */
export function graphemes(str: string): string[] {
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(str), (g) => g.segment);
  } catch {
    return [...str];
  }
}

/** 첫 grapheme — 숏 로고/favicon 렌더용(한 글자만 표시). 빈 값 → "". */
export function firstGrapheme(str: string | null | undefined): string {
  const s = (str ?? "").trim();
  return s ? graphemes(s)[0] ?? "" : "";
}

/** 마지막 grapheme — 한 글자 입력 필드에서 새로 친 글자로 덮어쓰기(append=overwrite) UX. 빈 값 → "". */
export function lastGrapheme(str: string | null | undefined): string {
  const s = (str ?? "").trim();
  if (!s) return "";
  const g = graphemes(s);
  return g[g.length - 1] ?? "";
}

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

function faviconWeightToNumber(w: FaviconWeight): number {
  return w === "light" ? 300 : w === "regular" ? 500 : 700;
}

/** favicon 텍스트 폰트 크기 — 빈/invalid 면 20, 합리적 범위 8~30 clamp */
export function resolveFaviconFontSize(raw: string | undefined): number {
  const n = parseFloat(raw ?? "");
  if (!Number.isFinite(n)) return 20;
  return Math.min(30, Math.max(8, n));
}

/** 장평 — 빈/invalid 면 0.8 default */
function resolveFaviconStretch(raw: string | undefined): number {
  const n = parseFloat(raw ?? "");
  return Number.isFinite(n) && n > 0 ? n : 0.8;
}

/** viewBox 중심 (16,16) 기준 scaleX transform. stretch===1 이면 undefined */
function faviconStretchTransform(stretch: number): string | undefined {
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
      // 거리(offset)를 blur 에 비례시켜 번짐이 클수록 그림자가 더 뻗게 — 고정 2px 이면 밋밋
      offset = Math.min(blur * 0.7, 5);
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
  /** 배경 모서리 반경 override (0~16). 빈 값 = shape 기본값 */
  faviconRadius: string;
  /** 배경 종횡비 w/h (0.5~2). "1" = 정사각, >1 = 가로 길쭉(타원/직사각), <1 = 세로 길쭉 */
  faviconBgRatio: string;
  weight: FaviconWeight;
  logoText: string;
  logoFont: string;
  logoFontStretch: string;
  faviconBgLight: string;
  faviconBgDark: string;
  /** 배경 테두리 두께 px (0 = 없음) */
  faviconBorderWidth: string;
  /** 라이트/다크 variant 테두리색 (빈 값 = 없음) */
  faviconBorderColorLight: string;
  faviconBorderColorDark: string;
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
  /** 배경 rect 지오메트리 (viewBox 0~32) — 종횡비에 따라 캔버스 안에서 정사각/타원/직사각. 콘텐츠는 중심 고정.
   *  테두리가 있으면 stroke 가 캔버스 밖으로 잘리지 않도록 borderWidth/2 만큼 inset 됨 */
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
  /** 배경 테두리 두께(px) — 0 이면 없음 */
  borderWidth: number;
  /** 배경 테두리색 (variant 반영) — borderWidth>0 이고 색 있을 때만 */
  borderColor: string;
  /** 배경+테두리를 캔버스에 맞추는 배율 (테두리가 밖으로 안 잘리게). 1=축소 없음 */
  contentScale: number;
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
  const shapeRadius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;
  const radius = resolveFaviconRadius(input.faviconRadius, shapeRadius);
  // 종횡비(w/h) → 캔버스(32) 안에서 배경 rect 크기. 콘텐츠는 중심 고정, 배경만 정사각/타원/직사각으로.
  const ratio = resolveFaviconRatio(input.faviconBgRatio);
  const bgW = ratio >= 1 ? 32 : 32 * ratio;
  const bgH = ratio >= 1 ? 32 / ratio : 32;
  const bgX = (32 - bgW) / 2;
  const bgY = (32 - bgH) / 2;
  // 테두리 — stroke 는 배경 경로 중심에 그려진다(안·밖 절반씩). fill 을 안쪽으로 먹지 않도록
  // 배경+테두리 전체를 캔버스에 맞춰 축소(contentScale) → 테두리가 배경 "바깥을 감싸는" 모양.
  const borderRaw = Number((input.faviconBorderWidth ?? "").trim());
  const borderWidth = hasBg && Number.isFinite(borderRaw) ? Math.max(0, Math.min(8, borderRaw)) : 0;
  const contentScale = borderWidth > 0 ? 32 / (32 + borderWidth) : 1;
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
  // 테두리색 — 미지정이면 글자색으로 폴백(두께만 정해도 보이게). 두께 0 이면 빈 값.
  const borderColorSet = ((variant === "light" ? input.faviconBorderColorLight : input.faviconBorderColorDark) || "").trim();
  const borderColor = borderWidth > 0 ? (borderColorSet || fgColor) : "";
  const fontFamily = input.logoFont || "'Instrument Serif', Georgia, serif";
  const fontWeight = faviconWeightToNumber(input.weight ?? "light");
  const fontSize = resolveFaviconFontSize(input.faviconFontSize);
  const transform = faviconStretchTransform(resolveFaviconStretch(input.logoFontStretch));
  // 빈 값이면 "" (글리프 없음) — 하드코딩 "H" 폴백 제거. 이모지 보존(grapheme).
  const logoText = firstGrapheme(input.logoText);
  const textShadow = resolveFaviconShadow(input.faviconTextShadow);
  const bgShadow = hasBg ? resolveFaviconShadow(input.faviconBgShadow) : null;
  return { shape, hasBg, radius, bgX, bgY, bgW, bgH, borderWidth, borderColor, contentScale, bgColor, fgColor, fontFamily, fontWeight, fontSize, logoText, transform, textShadow, bgShadow };
}

/** 배경+테두리를 캔버스(0~32) 중심 기준 scale 배 축소하는 SVG group transform. scale≥1 이면 "". */
export function faviconContentTransform(scale: number): string {
  if (scale >= 1) return "";
  const t = (16 * (1 - scale)).toFixed(3);
  return `translate(${t} ${t}) scale(${scale.toFixed(4)})`;
}

/** 배경 반경 override 파싱 — 빈 값/비수치면 shape 기본값. 0~16 clamp. */
export function resolveFaviconRadius(raw: string | undefined, shapeDefault: number): number {
  const s = (raw ?? "").trim();
  if (s === "") return shapeDefault;
  const n = Number(s);
  if (!Number.isFinite(n)) return shapeDefault;
  return Math.max(0, Math.min(16, n));
}

/** 배경 종횡비(w/h) 파싱 — 빈 값/비수치면 1(정사각). 0.5(세로 2:1)~2(가로 2:1) clamp. */
export function resolveFaviconRatio(raw: string | undefined): number {
  const s = (raw ?? "").trim();
  if (s === "") return 1;
  const n = Number(s);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.5, Math.min(2, n));
}

/* ── 그림자 <filter> primitive — 단일 소스 (문자열/React 양쪽에서 소비) ── */

interface FilterPrimitive {
  tag: string;
  attrs: Record<string, string | number>;
  children?: FilterPrimitive[];
}

/**
 * outer = feDropShadow 단일 primitive.
 * inset = 표준 inner-shadow 체인 (alpha 반전 → blur → offset → flood+composite → shape clip → merge).
 */
function faviconFilterPrimitives(r: ResolvedShadow): FilterPrimitive[] {
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

function filterPrimitivesToString(prims: FilterPrimitive[]): string {
  return prims.map(primitiveToString).join("");
}

/** route.ts 용 — <filter> 문자열 전체. filter region 을 넉넉히(-150%~250%) 잡아
 *  작은 글리프에 큰 blur 그림자가 region 밖으로 잘리는 것 방지. */
export function faviconFilterString(r: ResolvedShadow, id: string): string {
  return `<filter id="${id}" x="-150%" y="-150%" width="400%" height="400%">${filterPrimitivesToString(faviconFilterPrimitives(r))}</filter>`;
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
    // 넉넉한 filter region (-150%~250%) — 작은 글리프에 큰 blur 그림자가 잘리지 않게
    { id, x: "-150%", y: "-150%", width: "400%", height: "400%" },
    renderPrimitives(faviconFilterPrimitives(resolved)),
  );
}

/** favicon 배지 SVG (배경 rect + 글리프) — route/미리보기와 동일 렌더. nav 로고 등에서 재사용.
 *  idPrefix 는 filter id 충돌 방지용 (한 문서에 배지 여러 개일 때 서로 다르게). */
export function FaviconBadge({
  input,
  variant,
  size = 32,
  idPrefix = "favbadge",
  className,
}: {
  input: FaviconRenderInput;
  variant: "light" | "dark";
  size?: number;
  idPrefix?: string;
  className?: string;
}): ReactNode {
  const render = resolveFavicon(input, variant);
  const textShadowId = `${idPrefix}-ts-${variant}`;
  const bgShadowId = `${idPrefix}-bs-${variant}`;
  const contentTransform = faviconContentTransform(render.contentScale) || undefined;
  return (
    // overflow visible — 그림자(outer drop-shadow)가 32×32 뷰포트 밖으로 나가도 안 잘리게
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} style={{ overflow: "visible" }} aria-hidden>
      {(render.textShadow || render.bgShadow) && (
        <defs>
          {render.bgShadow && <FaviconFilter resolved={render.bgShadow} id={bgShadowId} />}
          {render.textShadow && <FaviconFilter resolved={render.textShadow} id={textShadowId} />}
        </defs>
      )}
      <g transform={contentTransform}>
        {render.hasBg && (
          <rect
            x={render.bgX}
            y={render.bgY}
            width={render.bgW}
            height={render.bgH}
            rx={render.radius}
            ry={render.radius}
            fill={render.bgColor}
            stroke={render.borderWidth > 0 ? render.borderColor : undefined}
            strokeWidth={render.borderWidth > 0 ? render.borderWidth : undefined}
            filter={render.bgShadow ? `url(#${bgShadowId})` : undefined}
          />
        )}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={render.fontFamily}
          fontSize={render.fontSize}
          fontWeight={render.fontWeight}
          fill={render.fgColor}
          transform={render.transform}
          filter={render.textShadow ? `url(#${textShadowId})` : undefined}
        >
          {render.logoText}
        </text>
      </g>
    </svg>
  );
}
