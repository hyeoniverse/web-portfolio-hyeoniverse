/** about 페이지 패널 정의 — 편집기 사이드바 순서/표시 */
export interface AboutPanelDef {
  key: string;
  label: string;
  editable?: boolean;
}

export const ABOUT_PANELS: AboutPanelDef[] = [
  { key: "hero", label: "Intro", editable: true },
  { key: "overview", label: "Overview", editable: true },
  { key: "architecture", label: "Architecture", editable: true },
  { key: "userflow", label: "User Flow", editable: true },
  { key: "features", label: "Features", editable: true },
  { key: "designSystem", label: "Design System", editable: true },
  { key: "process", label: "Process", editable: true },
  { key: "visualBreak", label: "Break Image", editable: true },
  { key: "techStack", label: "Tech Stack", editable: true },
  { key: "backend", editable: true, label: "Backend" },
  { key: "erd", label: "ERD", editable: true },
  { key: "codeHighlights", label: "Code Highlights", editable: true },
  { key: "troubleshooting", label: "Troubleshooting", editable: true },
  { key: "security", label: "Security", editable: true },
  { key: "credits", label: "Credits", editable: true },
];
