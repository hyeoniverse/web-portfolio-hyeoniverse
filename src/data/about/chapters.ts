import type { Language } from "@/providers/LanguageProvider";

/**
 * About 가로 스크롤의 챕터. 챕터가 시작하는 자리(묶인 패널 중 화면에 처음 나오는 것 앞)에
 * 화면을 꽉 채우는 챕터 장면이 들어간다. 패널 key 는 `ABOUT_PANELS` 의 key 와 같다.
 * 모바일 탭 네 개(`useMobileTabNavigation` 의 MOBILE_TABS)와 같은 묶음이다.
 */
export interface AboutChapter {
  key: string;
  title: string;
  summary: Record<Language, string>;
  panels: string[];
}

export const ABOUT_CHAPTERS: AboutChapter[] = [
  {
    key: "product",
    title: "The Product",
    summary: { ko: "무엇을 만들었는지", en: "What was built" },
    panels: ["overview", "architecture", "userflow", "features"],
  },
  {
    key: "design",
    title: "Design",
    summary: { ko: "어떻게 보이게 했는지", en: "How it looks" },
    panels: ["designSystem"],
  },
  {
    key: "engineering",
    title: "Engineering",
    summary: { ko: "어떻게 동작하게 했는지", en: "How it works" },
    panels: ["process", "techStack", "backend", "erd", "codeHighlights"],
  },
  {
    key: "decisions",
    title: "Decisions",
    summary: { ko: "왜 그렇게 정했는지", en: "Why it was decided" },
    panels: ["troubleshooting", "security"],
  },
];

const CHAPTER_OF_PANEL: Record<string, number> = Object.fromEntries(
  ABOUT_CHAPTERS.flatMap((c, i) => c.panels.map((key) => [key, i])),
);

/** 패널 key 가 속한 챕터 번호. 챕터에 없는 패널(hero, credits, visualBreak)은 undefined */
export function chapterIndexOf(key: string): number | undefined {
  return CHAPTER_OF_PANEL[key];
}
