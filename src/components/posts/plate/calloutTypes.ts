// 콜아웃(GitHub 알림) 타입 단일 출처 — 아이콘·배경색.
// 라이브 자동변환(github-syntax-kit)·템플릿/레거시 md 변환(postProcessMarkedHtml)·
// 삽입 메뉴(SlashMenu/MainToolbar)가 전부 여기를 참조해 타입별 색·아이콘을 일치시킨다.

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

export interface CalloutTypeDef {
  type: CalloutType;
  icon: string;
  bg: string;
}

export const CALLOUT_TYPES: CalloutTypeDef[] = [
  { type: "note", icon: "ℹ️", bg: "var(--color-info-soft)" },
  { type: "tip", icon: "💡", bg: "var(--color-success-soft)" },
  { type: "important", icon: "❗", bg: "color-mix(in srgb, var(--color-accent) 12%, transparent)" },
  { type: "warning", icon: "⚠️", bg: "var(--color-warning-soft)" },
  { type: "caution", icon: "🛑", bg: "var(--color-error-soft)" },
];

export const CALLOUT_BY_TYPE = Object.fromEntries(
  CALLOUT_TYPES.map((c) => [c.type, c]),
) as Record<CalloutType, CalloutTypeDef>;

/** 삽입 기본값(타입 미지정 콜아웃) — 가장 중립적인 note. */
export const DEFAULT_CALLOUT: CalloutTypeDef = CALLOUT_BY_TYPE.note;
