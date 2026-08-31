/**
 * 어느 About 패널이 markdown 을 원본으로 삼을 수 있는지, 그 파일이 어디 있는지.
 *
 * 동기화 스크립트(`scripts/sync-about.ts`)와 설정 화면(AboutStudio)이 같은 표를 본다.
 *
 * 원본을 사람이 고르지는 않는다. 화면 편집과 md 가 같은 자리에 쓰되, 동기화가 **더 최근에
 * 손댄 쪽**을 남긴다 — 파일 수정 시각이 그 패널의 마지막 화면 편집보다 나중일 때만 쓴다.
 * posts·works 동기화가 mtime 과 updated_at 을 비교하는 것과 같은 규칙이다.
 *
 * 여기 없는 패널(ERD · User Flow · Architecture 다이어그램 · Hero)은 그래프·좌표
 * 데이터라 md 로 표현하면 지금 편집기보다 나빠진다. UI 전용으로 둔다.
 */

export interface MarkdownPanelDef {
  /** content/about/ 아래 폴더 이름, 또는 파일 하나짜리면 파일 이름(확장자 제외). */
  dir: string;
  /** 로그·화면에 쓰는 이름. */
  label: string;
  /** 항목이 하나뿐이라 폴더 없이 파일 두 개(ko/en)로 끝나는 패널. */
  single?: boolean;
}

export const MARKDOWN_PANELS: Record<string, MarkdownPanelDef> = {
  troubleshooting: { dir: "decisions", label: "Design Decisions" },
  security: { dir: "security", label: "Security" },
  features: { dir: "features", label: "Features" },
  process: { dir: "process", label: "Process" },
  overview: { dir: "overview", label: "Overview", single: true },
  credits: { dir: "credits", label: "Credits", single: true },
};

/** 이 패널을 md 로 관리할 수 있는가. */
export function canUseMarkdown(panelKey: string): boolean {
  return panelKey in MARKDOWN_PANELS;
}

/** 사람에게 보여줄 파일 위치 — 폴더면 끝에 `/`, 파일 하나면 `.md`. */
export function contentPathOf(panelKey: string): string {
  const def = MARKDOWN_PANELS[panelKey];
  if (!def) return "";
  return def.single ? `content/about/${def.dir}.md` : `content/about/${def.dir}/`;
}
