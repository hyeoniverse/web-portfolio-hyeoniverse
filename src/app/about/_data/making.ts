/* 만든 과정 장(작업 과정)과 설계 결정 · 보안 장이 함께 쓰는 문구. 본문은 content/about/**.md 에서 빌드 때 만든 data/generated/aboutContent.ts
   (기존 About 과 같은 원본)를 그대로 쓴다. 여기엔 장 머리와 화면 문구만 */
import type { L10n } from "./showcase";

export const makingChapter = {
  eyebrow: { ko: "08 — 만든 과정", en: "08 — Making of" } satisfies L10n,
  title: {
    /* {phases} 는 데이터에서 센 값으로 채운다 */
    ko: "{phases}단계 — 시기마다 무엇을 만들었나.",
    en: "{phases} phases — what got built, phase by phase.",
  } satisfies L10n,
  note: {
    ko: "단계마다의 기간은 git 기록에서 셌습니다.",
    en: "Dates per phase come from the git history.",
  } satisfies L10n,
};

export const processText = {
  label: { ko: "작업 과정", en: "Process" } satisfies L10n,
};

/** 만든 과정 그래프의 세로 눈금 — 제품의 층(아래에서 위로, 처음 손댄 순서). 단계마다 주로 다룬 층은 processLayerOf.
    단계 설명(content/about/process)에서 정했다: 05 편집기 개편은 다시 편집기 층으로 내려간다 */
export const processLayers: L10n[] = [
  { ko: "공개 화면", en: "Public site" },
  { ko: "관리자", en: "Admin" },
  { ko: "편집기", en: "Editor" },
  { ko: "배포 · 품질", en: "CI · release" },
  { ko: "구조 · 권한", en: "Structure" },
  { ko: "성능 · 접근성", en: "Perf · a11y" },
  { ko: "디자인 시스템 · 번역", en: "Design system · i18n" },
];
/** 단계 번호("01") → processLayers 의 자리 */
export const processLayerOf: Record<string, number> = { "01": 0, "02": 1, "03": 2, "04": 3, "05": 2, "06": 4, "07": 5, "08": 6 };

export const decisionsText = {
  label: { ko: "설계 결정", en: "Design decisions" } satisfies L10n,
  title: { ko: "고민이 컸던 결정 여섯", en: "Six decisions that took real thought" } satisfies L10n,
  difficulty: { ko: "난이도", en: "Difficulty" } satisfies L10n,
  problem: { ko: "질문", en: "Question" } satisfies L10n,
  choice: { ko: "고른 이유", en: "Why this one" } satisfies L10n,
  options: { ko: "검토한 선택지", en: "Options considered" } satisfies L10n,
  cost: { ko: "트레이드오프", en: "Trade-off" } satisfies L10n,
  /** 고민 과정 — 별이 갈래를 하나씩 검토할 때 질문 아래 한 줄 */
  weighing: { ko: "검토 중", en: "Weighing" } satisfies L10n,
  ruledOut: { ko: "탈락", en: "Ruled out" } satisfies L10n,
  picked: { ko: "선택", en: "Chosen" } satisfies L10n,
  code: { ko: "코드", en: "Code" } satisfies L10n,
};

export const securityText = {
  label: { ko: "보안", en: "Security" } satisfies L10n,
  title: { ko: "막는 곳은 하나로, 한 겹 더", en: "One place to guard — then one more layer" } satisfies L10n,
};
