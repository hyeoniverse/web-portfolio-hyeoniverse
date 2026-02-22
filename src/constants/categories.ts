export const CATEGORIES = [
  "General",
  "Development",
  "Design",
  "Tutorial",
  "Thoughts",
  "Project",
] as const;

export type Category = (typeof CATEGORIES)[number];
