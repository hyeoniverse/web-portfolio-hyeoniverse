"use client";

import type { TroubleshootingDifficulty } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import type { LocalizedText } from "@/types/common";
import local from "../TroubleshootingPanel.module.css";

/** 난이도별 라벨 + 색상 톤 + 한 줄 설명. tooltip 은 hover 한 등급 하나만 표시 */
export const DIFFICULTY_META: Record<
  TroubleshootingDifficulty,
  {
    label: LocalizedText;
    tone: "easy" | "medium" | "hard";
    desc: LocalizedText;
  }
> = {
  1: {
    label: { ko: "쉬움", en: "Easy" },
    tone: "easy",
    desc: {
      ko: "문서나 빠른 검색으로 해결되는 표면적인 문제",
      en: "Surface-level issue resolved by docs or a quick search",
    },
  },
  2: {
    label: { ko: "보통", en: "Medium" },
    tone: "medium",
    desc: {
      ko: "동작 원리 이해와 어느 정도의 디버깅이 필요한 문제",
      en: "Needs understanding of how it works plus some debugging",
    },
  },
  3: {
    label: { ko: "어려움", en: "Hard" },
    tone: "hard",
    desc: {
      ko: "브라우저 또는 프레임워크 내부 동작에 대한 깊은 이해와 추적이 필요한 근본적인 문제",
      en: "Root-level issue that requires deep dives into browser or framework internals",
    },
  },
};

/** 난이도 뱃지 — "쉬움 / 보통 / 어려움" 라벨 + 색상 톤. 자체 tooltip 없음 — 부모 file row tooltip 에 통합됨. */
export function DifficultyBadge({
  level,
  language,
  large,
}: {
  level: TroubleshootingDifficulty;
  language: Language;
  large?: boolean;
}) {
  const meta = DIFFICULTY_META[level];
  const className = [
    large ? local.difficultyBadgeLarge : local.difficultyBadge,
    local[`difficultyTone_${meta.tone}`],
  ].join(" ");
  return (
    <span className={className} aria-label={`${meta.label[language]} (${level}/3)`}>
      {meta.label[language]}
    </span>
  );
}
