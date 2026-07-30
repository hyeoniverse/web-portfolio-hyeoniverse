type FontEntry = { label: string; value: string; googleName?: string };
type FontGroup = { group: string; fonts: FontEntry[] };

export const FONT_GROUPS: FontGroup[] = [
  {
    group: "기본",
    fonts: [
      { label: "Space Grotesk", value: "'Space Grotesk', sans-serif", googleName: "Space Grotesk" },
      { label: "Instrument Serif", value: "'Instrument Serif', serif", googleName: "Instrument Serif" },
      { label: "Inter", value: "'Inter', sans-serif", googleName: "Inter" },
      { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif", googleName: "Noto Sans KR" },
      { label: "Noto Serif KR", value: "'Noto Serif KR', serif", googleName: "Noto Serif KR" },
      { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", googleName: "JetBrains Mono" },
    ],
  },
  {
    group: "Sans (한글)",
    fonts: [
      { label: "Gothic A1", value: "'Gothic A1', sans-serif", googleName: "Gothic A1" },
      { label: "Nanum Gothic", value: "'Nanum Gothic', sans-serif", googleName: "Nanum Gothic" },
      { label: "Gowun Dodum", value: "'Gowun Dodum', sans-serif", googleName: "Gowun Dodum" },
      { label: "IBM Plex Sans KR", value: "'IBM Plex Sans KR', sans-serif", googleName: "IBM Plex Sans KR" },
      { label: "Pretendard", value: "'Pretendard Variable', sans-serif", googleName: "Pretendard Variable" },
      { label: "Spoqa Han Sans Neo", value: "'Spoqa Han Sans Neo', sans-serif" },
    ],
  },
  {
    group: "Serif (한글)",
    fonts: [
      { label: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif", googleName: "Nanum Myeongjo" },
      { label: "Gowun Batang", value: "'Gowun Batang', serif", googleName: "Gowun Batang" },
      { label: "KoPub Batang", value: "'KoPubWorldBatang', serif" },
    ],
  },
  {
    group: "Display (한글)",
    fonts: [
      { label: "Black Han Sans", value: "'Black Han Sans', sans-serif", googleName: "Black Han Sans" },
      { label: "Jua", value: "'Jua', sans-serif", googleName: "Jua" },
      { label: "Do Hyeon", value: "'Do Hyeon', sans-serif", googleName: "Do Hyeon" },
      { label: "Gaegu", value: "'Gaegu', cursive", googleName: "Gaegu" },
      { label: "Hi Melody", value: "'Hi Melody', cursive", googleName: "Hi Melody" },
      { label: "Sunflower", value: "'Sunflower', sans-serif", googleName: "Sunflower" },
      { label: "Dokdo", value: "'Dokdo', cursive", googleName: "Dokdo" },
    ],
  },
  {
    group: "Sans (영문)",
    fonts: [
      { label: "Roboto", value: "'Roboto', sans-serif", googleName: "Roboto" },
      { label: "Open Sans", value: "'Open Sans', sans-serif", googleName: "Open Sans" },
    ],
  },
  {
    group: "Serif (영문)",
    fonts: [
      { label: "Playfair Display", value: "'Playfair Display', serif", googleName: "Playfair Display" },
      { label: "Lora", value: "'Lora', serif", googleName: "Lora" },
      { label: "Merriweather", value: "'Merriweather', serif", googleName: "Merriweather" },
    ],
  },
  {
    group: "Mono",
    fonts: [
      { label: "Fira Code", value: "'Fira Code', monospace", googleName: "Fira Code" },
      { label: "Source Code Pro", value: "'Source Code Pro', monospace", googleName: "Source Code Pro" },
      { label: "D2Coding", value: "'D2Coding', monospace", googleName: "D2Coding" },
    ],
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
  "var(--border-light-color)", "#000000", "#374151", "#6b7280",
  "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6",
];

export const IMG_ALIGNS = ["left", "center", "right"] as const;
export const IMG_ALIGN_ICONS: Record<string, string> = { left: "◧", center: "◻", right: "◨" };
export const IMG_LAYOUTS = ["inline", "block", "float-left", "float-right"] as const;
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
