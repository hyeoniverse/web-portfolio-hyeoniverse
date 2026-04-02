/* ── SVG Layout ── */
export const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  series: { x: 380, y: 30, w: 280 },
  works: { x: 30, y: 195, w: 280 },
  posts: { x: 380, y: 195, w: 280 },
  comments: { x: 730, y: 195, w: 280 },
  site_settings: { x: 30, y: 430, w: 280 },
  likes: { x: 380, y: 430, w: 280 },
};

/* Note overlay positions — percentages of SVG viewBox area */
export const NOTE_POSITIONS: ({ left: string; top: string } | null)[] = [
  { left: "60%", top: "69%" }, // likes (#1)
  { left: "60%", top: "69%" }, // likes (#2)
  { left: "29%", top: "69%" }, // site_settings (#3)
  { left: "60%", top: "31%" }, // posts (#4)
  { left: "66%", top: "58%" }, // comments (#5)
  { left: "66%", top: "58%" }, // comments (#6)
  null, // revisions (#7) — table not in SVG layout
  { left: "2%", top: "58%" }, // works (#8)
  { left: "60%", top: "5%" }, // series (#9)
];
