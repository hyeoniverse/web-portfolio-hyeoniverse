type FontEntry = { label: string; value: string; googleName?: string; /** 한글 지원 — 목록에 "가" 배지 */ korean?: boolean };
export type FontGroup = { group: string; fonts: FontEntry[] };

// 폰트 선택 카탈로그 — 단일 소스(single source of truth).
// 로고·에디터·about·타이포그래피·디자인시스템이 모두 이 목록을 참조한다.
// value 는 CSS font-family 문자열(로고/favicon 이 그대로 사용하고 역방향 조회 키로도 쓰인다).
// googleName 지정분은 FontPicker 가 hover/선택 시 자동 로드 — 자체 호스팅 폰트도 같은 규약으로 통일.
const gf = (label: string, fallback: string): FontEntry => ({ label, value: `'${label}', ${fallback}`, googleName: label });
const gfk = (label: string, fallback: string): FontEntry => ({ ...gf(label, fallback), korean: true });

export const FONT_GROUPS: FontGroup[] = [
  {
    group: "Korean (한글)",
    // Google Fonts 의 한글 subset 지원 전반 (사이트 라이브 메타데이터 기준)
    fonts: [
      gfk("Noto Sans KR", "sans-serif"), gfk("Nanum Gothic", "sans-serif"), gfk("Gothic A1", "sans-serif"),
      gfk("IBM Plex Sans KR", "sans-serif"), gfk("Gowun Dodum", "sans-serif"), gfk("Sunflower", "sans-serif"),
      gfk("Stylish", "sans-serif"), gfk("Asta Sans", "sans-serif"), gfk("Do Hyeon", "sans-serif"),
      gfk("Jua", "sans-serif"), gfk("Dongle", "sans-serif"),
      gfk("Noto Serif KR", "serif"), gfk("Nanum Myeongjo", "serif"), gfk("Gowun Batang", "serif"),
      gfk("Song Myung", "serif"), gfk("Hahmlet", "serif"), gfk("Diphylleia", "serif"),
      gfk("Grandiflora One", "serif"), gfk("Moirai One", "serif"),
      gfk("Black Han Sans", "sans-serif"), gfk("Gugi", "sans-serif"), gfk("Gasoek One", "sans-serif"),
      gfk("Bagel Fat One", "sans-serif"), gfk("Orbit", "sans-serif"), gfk("Black And White Picture", "sans-serif"),
      gfk("Cute Font", "sans-serif"), gfk("Nanum Gothic Coding", "monospace"),
      gfk("Nanum Pen Script", "cursive"), gfk("Nanum Brush Script", "cursive"), gfk("Gaegu", "cursive"),
      gfk("Hi Melody", "cursive"), gfk("Gamja Flower", "cursive"), gfk("Poor Story", "cursive"),
      gfk("Single Day", "cursive"), gfk("Dokdo", "cursive"), gfk("East Sea Dokdo", "cursive"),
      gfk("Kirang Haerang", "cursive"), gfk("Yeon Sung", "cursive"),
    ],
  },
  {
    group: "Sans",
    fonts: [
      gf("Space Grotesk", "sans-serif"),
      ...["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Work Sans", "Nunito", "Raleway", "DM Sans", "Manrope", "Rubik", "Mulish", "Josefin Sans", "Quicksand"].map((n) => gf(n, "sans-serif")),
    ],
  },
  {
    group: "Serif",
    fonts: [
      gf("Instrument Serif", "serif"),
      ...["Playfair Display", "Merriweather", "Lora", "PT Serif", "Cormorant", "EB Garamond", "Bitter", "Crimson Text", "Libre Baskerville", "Source Serif 4"].map((n) => gf(n, "serif")),
    ],
  },
  {
    group: "Display",
    fonts: ["Oswald", "Bebas Neue", "Abril Fatface", "Righteous", "Lobster", "Pacifico", "Comfortaa", "Fredoka", "Anton"].map((n) => gf(n, "sans-serif")),
  },
  {
    group: "Mono",
    fonts: [
      gf("JetBrains Mono", "monospace"),
      ...["Fira Code", "Source Code Pro", "IBM Plex Mono", "Space Mono"].map((n) => gf(n, "monospace")),
    ],
  },
  {
    group: "Handwriting",
    fonts: ["Caveat", "Dancing Script", "Shadows Into Light", "Satisfy"].map((n) => gf(n, "cursive")),
  },
];

export const FONT_FAMILIES_FLAT = FONT_GROUPS.flatMap((g) => g.fonts);
export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 72];
export const LINE_HEIGHT_PRESETS = ["1", "1.2", "1.4", "1.5", "1.6", "1.65", "1.8", "2", "2.5"];
export const LETTER_SPACING_PRESETS = ["-0.05em", "0em", "0.05em", "0.1em", "0.15em", "0.2em", "0.3em"];

/** 기본 색상 (검정/흰/회색) */
export const BASE_COLORS = ["#000000", "#374151", "#6b7280", "#d1d5db", "#ffffff"];

/** 비비드 프리셋 */
export const VIVID_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

/** 파스텔 프리셋 */
export const PASTEL_COLORS = ["#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fbcfe8"];

export const TABLE_BG_PRESETS = [
  "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fee2e2", "#f3f4f6",
];

/** 헤더 글자색 프리셋 */
export const TABLE_TEXT_PRESETS = [
  "#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
];

/** 줄무늬 기본색 = 헤더 배경색(--bg-tertiary) */
export const ZEBRA_COLOR_DEFAULT = "var(--bg-tertiary)";

export const TABLE_BORDER_STYLES = [
  { labelKey: "editor.borderSolid", value: "solid" },
  { labelKey: "editor.borderDotted", value: "dotted" },
  { labelKey: "editor.borderDashed", value: "dashed" },
  { labelKey: "editor.borderDouble", value: "double" },
] as const;

export const TABLE_BORDER_WIDTHS = ["1px", "2px", "3px", "4px"] as const;

export const TABLE_BORDER_COLORS = [
  "var(--border-color-light)", "#000000", "#374151", "#6b7280",
  "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6",
];

export const IMG_ALIGNS = ["left", "center", "right"] as const;
export const IMG_ALIGN_ICONS: Record<string, string> = { left: "◧", center: "◻", right: "◨" };
export const IMG_FILTERS: { labelKey: string; value: string }[] = [
  { labelKey: "editor.filterOriginal", value: "" },
  { labelKey: "editor.filterGrayscale", value: "grayscale(100%)" },
  { labelKey: "editor.filterSepia", value: "sepia(80%)" },
  { labelKey: "editor.filterBright", value: "brightness(1.2)" },
  { labelKey: "editor.filterDark", value: "brightness(0.7)" },
  { labelKey: "editor.filterContrast", value: "contrast(1.4)" },
  { labelKey: "editor.filterDesaturate", value: "saturate(0.4)" },
  { labelKey: "editor.filterSaturate", value: "saturate(1.8)" },
  { labelKey: "editor.filterInvert", value: "invert(100%)" },
  { labelKey: "editor.filterBlur", value: "blur(2px)" },
];

export const MATH_TOOLS: { categoryKey: string; items: { label: string; latex: string; tipKey?: string }[] }[] = [
  { categoryKey: "editor.mathBasic", items: [
    { label: "a/b", latex: "\\frac{a}{b}", tipKey: "editor.mathFraction" },
    { label: "√", latex: "\\sqrt{x}", tipKey: "editor.mathSqrt" },
    { label: "ⁿ√", latex: "\\sqrt[n]{x}", tipKey: "editor.mathNthRoot" },
    { label: "x²", latex: "x^{2}", tipKey: "editor.mathPower" },
    { label: "xₙ", latex: "x_{n}", tipKey: "editor.mathSubscript" },
    { label: "±", latex: "\\pm ", tipKey: "editor.mathPlusMinus" },
    { label: "×", latex: "\\times ", tipKey: "editor.mathMultiply" },
    { label: "÷", latex: "\\div ", tipKey: "editor.mathDivide" },
    { label: "≠", latex: "\\neq ", tipKey: "editor.mathNotEqual" },
    { label: "≈", latex: "\\approx ", tipKey: "editor.mathApprox" },
    { label: "≤", latex: "\\leq ", tipKey: "editor.mathLeq" },
    { label: "≥", latex: "\\geq ", tipKey: "editor.mathGeq" },
    { label: "∞", latex: "\\infty ", tipKey: "editor.mathInfinity" },
  ]},
  { categoryKey: "editor.mathFunction", items: [
    { label: "Σ", latex: "\\sum_{i=0}^{n} ", tipKey: "editor.mathSum" },
    { label: "∏", latex: "\\prod_{i=1}^{n} ", tipKey: "editor.mathProduct" },
    { label: "∫", latex: "\\int_{a}^{b} ", tipKey: "editor.mathIntegral" },
    { label: "lim", latex: "\\lim_{x \\to \\infty} ", tipKey: "editor.mathLimit" },
    { label: "log", latex: "\\log ", tipKey: "editor.mathLog" },
    { label: "ln", latex: "\\ln ", tipKey: "editor.mathLn" },
    { label: "sin", latex: "\\sin ", tipKey: "editor.mathSin" },
    { label: "cos", latex: "\\cos ", tipKey: "editor.mathCos" },
    { label: "tan", latex: "\\tan ", tipKey: "editor.mathTan" },
  ]},
  { categoryKey: "editor.mathStructure", items: [
    { label: "( )", latex: "\\left( \\right)", tipKey: "editor.mathParens" },
    { label: "[ ]", latex: "\\left[ \\right]", tipKey: "editor.mathBrackets" },
    { label: "{ }", latex: "\\left\\{ \\right\\}", tipKey: "editor.mathBraces" },
    { label: "| |", latex: "\\left| \\right|", tipKey: "editor.mathAbs" },
    { label: "‖ ‖", latex: "\\left\\| \\right\\|", tipKey: "editor.mathNorm" },
    { label: "⌊ ⌋", latex: "\\lfloor \\rfloor", tipKey: "editor.mathFloor" },
    { label: "⌈ ⌉", latex: "\\lceil \\rceil", tipKey: "editor.mathCeil" },
    { label: "C", latex: "\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}", tipKey: "editor.mathCases" },
  ]},
  { categoryKey: "editor.mathMatrix", items: [
    { label: "(M)", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", tipKey: "editor.mathMatrixParen" },
    { label: "[M]", latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", tipKey: "editor.mathMatrixBracket" },
    { label: "{M}", latex: "\\begin{Bmatrix} a & b \\\\ c & d \\end{Bmatrix}", tipKey: "editor.mathMatrixBrace" },
    { label: "|M|", latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", tipKey: "editor.mathMatrixDet" },
    { label: "‖M‖", latex: "\\begin{Vmatrix} a & b \\\\ c & d \\end{Vmatrix}", tipKey: "editor.mathMatrixNorm" },
    { label: "3×3", latex: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}", tipKey: "editor.mathMatrix3" },
    { label: "I", latex: "\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}", tipKey: "editor.mathMatrixIdentity" },
    { label: "⋯", latex: "\\begin{pmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{m1} & \\cdots & a_{mn} \\end{pmatrix}", tipKey: "editor.mathMatrixDots" },
  ]},
  { categoryKey: "editor.mathGreek", items: [
    { label: "α", latex: "\\alpha " }, { label: "β", latex: "\\beta " },
    { label: "γ", latex: "\\gamma " }, { label: "δ", latex: "\\delta " },
    { label: "θ", latex: "\\theta " }, { label: "λ", latex: "\\lambda " },
    { label: "μ", latex: "\\mu " }, { label: "π", latex: "\\pi " },
    { label: "σ", latex: "\\sigma " }, { label: "φ", latex: "\\varphi " },
    { label: "ω", latex: "\\omega " },
  ]},
  { categoryKey: "editor.mathArrow", items: [
    { label: "→", latex: "\\rightarrow " }, { label: "←", latex: "\\leftarrow " },
    { label: "⇒", latex: "\\Rightarrow " }, { label: "⇔", latex: "\\Leftrightarrow " },
    { label: "↦", latex: "\\mapsto " },
  ]},
  { categoryKey: "editor.mathSpacing", items: [
    { label: "␣", latex: "\\,", tipKey: "editor.mathThinSpace" },
    { label: "␣␣", latex: "\\;", tipKey: "editor.mathMedSpace" },
    { label: "quad", latex: "\\quad ", tipKey: "editor.mathQuad" },
    { label: "2quad", latex: "\\qquad ", tipKey: "editor.mathQquad" },
    { label: "text", latex: "\\text{ }", tipKey: "editor.mathTextSpace" },
  ]},
];

/** 캡션 편집 CustomEvent 이름 — 툴바(dispatch) ↔ 요소(listen) 계약. 오타 시 무음 파손 */
export const CAPTION_EDIT_EVENT = {
  image: "img-caption-edit",
  video: "video-caption-edit",
  table: "tbl-caption-edit",
} as const;

/** 정렬(align) → flexbox justify-content 매핑 — 직렬화·렌더 공용 */
export const ALIGN_TO_JUSTIFY: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};
