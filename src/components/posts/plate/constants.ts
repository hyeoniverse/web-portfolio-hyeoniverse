type FontEntry = { label: string; value: string; googleName?: string };
type FontGroup = { group: string; fonts: FontEntry[] };

export const FONT_GROUPS: FontGroup[] = [
  {
    group: "Sans",
    fonts: [
      { label: "Inter", value: "'Inter', sans-serif", googleName: "Inter" },
      { label: "Space Grotesk", value: "'Space Grotesk', sans-serif", googleName: "Space Grotesk" },
      { label: "DM Sans", value: "'DM Sans', sans-serif", googleName: "DM Sans" },
      { label: "Poppins", value: "'Poppins', sans-serif", googleName: "Poppins" },
      { label: "Nunito", value: "'Nunito', sans-serif", googleName: "Nunito" },
    ],
  },
  {
    group: "Serif",
    fonts: [
      { label: "Instrument Serif", value: "'Instrument Serif', serif", googleName: "Instrument Serif" },
      { label: "Playfair Display", value: "'Playfair Display', serif", googleName: "Playfair Display" },
      { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif", googleName: "Cormorant Garamond" },
      { label: "Lora", value: "'Lora', serif", googleName: "Lora" },
      { label: "EB Garamond", value: "'EB Garamond', serif", googleName: "EB Garamond" },
      { label: "Merriweather", value: "'Merriweather', serif", googleName: "Merriweather" },
    ],
  },
  {
    group: "Mono",
    fonts: [
      { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", googleName: "JetBrains Mono" },
      { label: "Fira Code", value: "'Fira Code', monospace", googleName: "Fira Code" },
      { label: "Source Code Pro", value: "'Source Code Pro', monospace", googleName: "Source Code Pro" },
      { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", googleName: "IBM Plex Mono" },
      { label: "DM Mono", value: "'DM Mono', monospace", googleName: "DM Mono" },
    ],
  },
  {
    group: "Korean Serif",
    fonts: [
      { label: "Noto Serif KR", value: "'Noto Serif KR', serif", googleName: "Noto Serif KR" },
      { label: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif", googleName: "Nanum Myeongjo" },
      { label: "Gowun Batang", value: "'Gowun Batang', serif", googleName: "Gowun Batang" },
    ],
  },
  {
    group: "Korean Sans",
    fonts: [
      { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif", googleName: "Noto Sans KR" },
      { label: "Gothic A1", value: "'Gothic A1', sans-serif", googleName: "Gothic A1" },
      { label: "Nanum Gothic", value: "'Nanum Gothic', sans-serif", googleName: "Nanum Gothic" },
      { label: "Gowun Dodum", value: "'Gowun Dodum', sans-serif", googleName: "Gowun Dodum" },
    ],
  },
];

export const FONT_FAMILIES_FLAT = FONT_GROUPS.flatMap((g) => g.fonts);
export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 72];
export const LINE_HEIGHT_PRESETS = ["1", "1.2", "1.4", "1.5", "1.6", "1.65", "1.8", "2", "2.5"];
export const LETTER_SPACING_PRESETS = ["-0.05em", "0em", "0.05em", "0.1em", "0.15em", "0.2em", "0.3em"];

export const PRESET_COLORS = [
  "#000000", "#374151", "#6b7280", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

export const PRESET_BG_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e9d5ff",
  "#fecaca", "#fed7aa", "#d1d5db", "#ffffff", "transparent",
];

export const TABLE_BG_PRESETS = [
  "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fee2e2", "#f3f4f6",
];

/** 줄무늬 기본색 = 헤더 배경색(--bg-tertiary) */
export const ZEBRA_COLOR_DEFAULT = "var(--bg-tertiary)";
export const ZEBRA_ALL = [ZEBRA_COLOR_DEFAULT];

export const TABLE_BORDER_STYLES = [
  { labelKey: "editor.borderSolid", value: "solid" },
  { labelKey: "editor.borderDotted", value: "dotted" },
  { labelKey: "editor.borderDashed", value: "dashed" },
  { labelKey: "editor.borderDouble", value: "double" },
  { labelKey: "editor.borderNoneStyle", value: "none" },
] as const;

export const TABLE_BORDER_WIDTHS = ["1px", "2px", "3px", "4px"] as const;

export const TABLE_BORDER_COLORS = [
  "var(--border-light-color)", "#000000", "#374151", "#6b7280",
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
    { label: "M", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", tipKey: "editor.mathMatrix" },
    { label: "C", latex: "\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}", tipKey: "editor.mathCases" },
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
