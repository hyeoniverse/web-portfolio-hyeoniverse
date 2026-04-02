import type { useSiteConfig } from "@/providers/SiteConfigProvider";

export interface WindowDef {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  aspect: string;
}

export const WINS: WindowDef[] = [
  { id: "a", title: "kim_jeonghyeon.webp", x: 4, y: 6, w: 28, aspect: "4/3" },
  { id: "b", title: "kim_jeonghyeon.webp", x: 34, y: 4, w: 18, aspect: "3/4" },
  { id: "c", title: "kim_jeonghyeon.webp", x: 12, y: 52, w: 20, aspect: "1/1" },
];

export interface TextBlock {
  key: string;
  x: number;
  y: number;
  w: number;
  aspect?: string;
  lines: { label: string; value: string }[];
}

export const getTextPositions = (siteConfig: ReturnType<typeof useSiteConfig>): TextBlock[] => [
  /* ── Window-aligned blocks ── */
  {
    key: "a",
    x: 4,
    y: 6,
    w: 28,
    aspect: "4/3",
    lines: [
      { label: "Name", value: siteConfig.personal.name },
      { label: "Role", value: siteConfig.personal.role },
      { label: "Location", value: siteConfig.personal.location },
      { label: "Email", value: siteConfig.contact.email },
      { label: "Status", value: siteConfig.personal.status },
    ],
  },
  {
    key: "c",
    x: 12,
    y: 52,
    w: 20,
    aspect: "1/1",
    lines: [
      { label: "School", value: "Seoul Women's University" },
      { label: "GPA", value: "3.9 / 4.5" },
      { label: "MBTI", value: "ISTP" },
      { label: "Likes", value: "Coffee, Clean Code, Music" },
      { label: "Dislikes", value: "Bugs, Slow Internet" },
      { label: "Hobby", value: "Coding, Gaming, Film" },
      { label: "Specialty", value: "Frontend, UI/UX" },
    ],
  },
  /* ── Easter eggs ── */
  {
    key: "e1",
    x: 62,
    y: 6,
    w: 24,
    lines: [
      { label: ">_", value: "console.log('Hello World')" },
      { label: "Mood", value: "if (coffee) code() : sleep()" },
      { label: "Bug", value: "99 little bugs in the code..." },
    ],
  },
  {
    key: "e2",
    x: 56,
    y: 50,
    w: 26,
    lines: [
      { label: "Stack", value: "React + Next.js + TypeScript" },
      { label: "Editor", value: "VS Code + Vim Motions" },
      { label: "OS", value: "macOS" },
      { label: "Font", value: "JetBrains Mono" },
    ],
  },
  {
    key: "e3",
    x: 36,
    y: 72,
    w: 22,
    lines: [
      { label: "Coffee", value: "2,847 cups and counting" },
      { label: "Commits", value: "git push --force (just kidding)" },
    ],
  },
  {
    key: "e4",
    x: 70,
    y: 78,
    w: 22,
    lines: [
      { label: "Secret", value: "You found me!" },
      { label: "Motto", value: "Ship it, then fix it" },
    ],
  },
];
