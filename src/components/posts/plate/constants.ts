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

export const TABLE_BG_PRESETS = [
  "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fee2e2", "#f3f4f6",
];

/** 줄무늬 기본색 = 헤더 배경색(--bg-tertiary) */
export const ZEBRA_COLOR_DEFAULT = "var(--bg-tertiary)";
export const ZEBRA_ALL = [ZEBRA_COLOR_DEFAULT];

export const TABLE_BORDER_STYLES = [
  { label: "실선", value: "solid" },
  { label: "점선", value: "dotted" },
  { label: "파선", value: "dashed" },
  { label: "이중선", value: "double" },
  { label: "선없음", value: "none" },
] as const;

export const TABLE_BORDER_WIDTHS = ["1px", "2px", "3px", "4px"] as const;

export const TABLE_BORDER_COLORS = [
  "var(--border-light-color)", "#000000", "#374151", "#6b7280",
  "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6",
];

export const IMG_ALIGNS = ["left", "center", "right"] as const;
export const IMG_ALIGN_ICONS: Record<string, string> = { left: "◧", center: "◻", right: "◨" };
export const IMG_FILTERS: { label: string; value: string }[] = [
  { label: "원본", value: "" },
  { label: "흑백", value: "grayscale(100%)" },
  { label: "세피아", value: "sepia(80%)" },
  { label: "밝게", value: "brightness(1.2)" },
  { label: "어둡게", value: "brightness(0.7)" },
  { label: "고대비", value: "contrast(1.4)" },
  { label: "저채도", value: "saturate(0.4)" },
  { label: "고채도", value: "saturate(1.8)" },
  { label: "반전", value: "invert(100%)" },
  { label: "블러", value: "blur(2px)" },
];

export const MATH_TOOLS: { category: string; items: { label: string; latex: string; tip?: string }[] }[] = [
  { category: "기본", items: [
    { label: "a/b", latex: "\\frac{a}{b}", tip: "분수" },
    { label: "√", latex: "\\sqrt{x}", tip: "제곱근" },
    { label: "ⁿ√", latex: "\\sqrt[n]{x}", tip: "n제곱근" },
    { label: "x²", latex: "x^{2}", tip: "거듭제곱" },
    { label: "xₙ", latex: "x_{n}", tip: "아래첨자" },
    { label: "±", latex: "\\pm ", tip: "플러스마이너스" },
    { label: "×", latex: "\\times ", tip: "곱셈" },
    { label: "÷", latex: "\\div ", tip: "나눗셈" },
    { label: "≠", latex: "\\neq ", tip: "같지 않음" },
    { label: "≈", latex: "\\approx ", tip: "약" },
    { label: "≤", latex: "\\leq ", tip: "이하" },
    { label: "≥", latex: "\\geq ", tip: "이상" },
    { label: "∞", latex: "\\infty ", tip: "무한" },
  ]},
  { category: "함수", items: [
    { label: "Σ", latex: "\\sum_{i=0}^{n} ", tip: "합" },
    { label: "∏", latex: "\\prod_{i=1}^{n} ", tip: "곱" },
    { label: "∫", latex: "\\int_{a}^{b} ", tip: "적분" },
    { label: "lim", latex: "\\lim_{x \\to \\infty} ", tip: "극한" },
    { label: "log", latex: "\\log ", tip: "로그" },
    { label: "ln", latex: "\\ln ", tip: "자연로그" },
    { label: "sin", latex: "\\sin ", tip: "사인" },
    { label: "cos", latex: "\\cos ", tip: "코사인" },
    { label: "tan", latex: "\\tan ", tip: "탄젠트" },
  ]},
  { category: "구조", items: [
    { label: "( )", latex: "\\left( \\right)", tip: "괄호" },
    { label: "[ ]", latex: "\\left[ \\right]", tip: "대괄호" },
    { label: "{ }", latex: "\\left\\{ \\right\\}", tip: "중괄호" },
    { label: "| |", latex: "\\left| \\right|", tip: "절댓값" },
    { label: "행렬", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", tip: "2×2 행렬" },
    { label: "케이스", latex: "\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}", tip: "조건 분기" },
  ]},
  { category: "그리스", items: [
    { label: "α", latex: "\\alpha " }, { label: "β", latex: "\\beta " },
    { label: "γ", latex: "\\gamma " }, { label: "δ", latex: "\\delta " },
    { label: "θ", latex: "\\theta " }, { label: "λ", latex: "\\lambda " },
    { label: "μ", latex: "\\mu " }, { label: "π", latex: "\\pi " },
    { label: "σ", latex: "\\sigma " }, { label: "φ", latex: "\\varphi " },
    { label: "ω", latex: "\\omega " },
  ]},
  { category: "화살표", items: [
    { label: "→", latex: "\\rightarrow " }, { label: "←", latex: "\\leftarrow " },
    { label: "⇒", latex: "\\Rightarrow " }, { label: "⇔", latex: "\\Leftrightarrow " },
    { label: "↦", latex: "\\mapsto " },
  ]},
  { category: "간격", items: [
    { label: "␣", latex: "\\,", tip: "좁은 간격" },
    { label: "␣␣", latex: "\\;", tip: "중간 간격" },
    { label: "quad", latex: "\\quad ", tip: "넓은 간격" },
    { label: "2quad", latex: "\\qquad ", tip: "아주 넓은 간격" },
    { label: "text", latex: "\\text{ }", tip: "텍스트 스페이스" },
  ]},
];
