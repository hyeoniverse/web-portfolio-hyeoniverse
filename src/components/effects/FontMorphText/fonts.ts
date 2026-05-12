export interface FontConfig {
  name: string;
  family: string;
  weight?: number;
  style?: "normal" | "italic";
}

export const DEFAULT_FONTS: FontConfig[] = [
  { name: "Playfair", family: "var(--font-playfair)", weight: 400 },
  { name: "Bebas", family: "var(--font-bebas)", weight: 400 },
  { name: "Space Grotesk", family: "var(--font-space-grotesk)", weight: 500 },
  { name: "Cormorant", family: "var(--font-cormorant)", weight: 500 },
  { name: "Abril", family: "var(--font-abril)", weight: 400 },
  { name: "Instrument", family: "var(--font-instrument)", weight: 400 },
  { name: "Inter", family: "var(--font-inter)", weight: 700 },
  { name: "JetBrains", family: "var(--font-jetbrains)", weight: 500 },
];
