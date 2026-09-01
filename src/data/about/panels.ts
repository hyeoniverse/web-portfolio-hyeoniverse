/**
 * About 패널의 정체 — 키와 표시 제목을 한 곳에 모은다.
 *
 * 전에는 같은 패널의 이름이 네 군데에 따로 있었다. 로케일(`aboutPage.panels.*`),
 * 패널 컴포넌트의 하드코딩 기본값, 관리자 사이드바 목록, 마크다운 동기화 레지스트리다.
 * 그래서 Troubleshooting 을 Design Decisions 로 바꿨을 때 로케일만 바뀌고 나머지는
 * 옛 이름으로 남아, 공개 페이지와 관리자 화면이 같은 패널을 다르게 불렀다.
 *
 * 제목은 언어에 따라 달라지지 않는다 — 로케일 파일의 ko/en 값이 원래부터 같았다.
 * 다국어가 필요해지면 `title` 을 `{ ko, en }` 으로 넓히고 이 파일만 고치면 된다.
 *
 * 관리자에서 지정한 제목(`about.panelTitles[key]`)이 있으면 그쪽이 먼저다.
 * 이 값은 그것이 없을 때 쓰는 기본값이다.
 */

export interface AboutPanelDef {
  /** 설정·순서·표시여부가 이 키로 이어진다. 바꾸면 기존 설정이 끊긴다. */
  key: string;
  /** 화면에 찍히는 기본 제목. 마침표까지가 이 사이트의 제목 표기다. */
  title: string;
  /** 관리자 About Studio 에서 편집할 수 있는가. */
  editable?: boolean;
}

export const ABOUT_PANELS: AboutPanelDef[] = [
  { key: "hero", title: "Intro", editable: true },
  { key: "overview", title: "Overview.", editable: true },
  { key: "architecture", title: "Architecture.", editable: true },
  { key: "userflow", title: "User Flow.", editable: true },
  { key: "features", title: "Key Features.", editable: true },
  { key: "designSystem", title: "Design System.", editable: true },
  { key: "process", title: "Design Process.", editable: true },
  { key: "visualBreak", title: "Break Image", editable: true },
  { key: "techStack", title: "Tech Stack.", editable: true },
  { key: "backend", title: "Backend.", editable: true },
  { key: "erd", title: "Database Design.", editable: true },
  { key: "codeHighlights", title: "Code Highlights.", editable: true },
  { key: "troubleshooting", title: "Design Decisions.", editable: true },
  { key: "security", title: "Security.", editable: true },
  { key: "credits", title: "Credits", editable: true },
];

const BY_KEY = new Map(ABOUT_PANELS.map((p) => [p.key, p]));

/* 이미 문장부호로 끝나면 마침표를 덧붙이지 않는다 — "왜?" 가 "왜?." 가 되면 안 된다. */
const ENDS_SENTENCE = /[.!?…]$/;

/**
 * 화면에 찍을 패널 제목. `override` 는 관리자가 지정한 제목(`about.panelTitles[key][lang]`).
 * 모르는 키는 키를 그대로 돌려준다 — 화면이 비는 것보다 낫다.
 *
 * override 에는 이 사이트의 제목 표기를 입혀서 돌려준다. 관리자 화면은 마침표를 뗀
 * 이름(`aboutPanelLabel`)을 칩에 보여 주고 거기서 고치게 하므로, 저장된 값을 날것으로
 * 쓰면 이름을 바꾼 패널만 마침표 없이 나온다.
 * 마침표를 붙일지는 패널마다 다르다 — 큰 제목으로 찍히는 패널만 기본 제목이 마침표로
 * 끝난다(Overview. / Design Decisions.). Intro·Break Image·Credits 는 아니라서,
 * 기본 제목이 어떻게 끝나는지를 그대로 따라간다.
 */
export function aboutPanelTitle(key: string, override?: string): string {
  const base = BY_KEY.get(key)?.title ?? key;
  const custom = override?.trim();
  if (!custom) return base;
  if (!base.endsWith(".") || ENDS_SENTENCE.test(custom)) return custom;
  return `${custom}.`;
}

/**
 * 관리자 목록·마크다운 로그처럼 마침표가 어색한 자리에서 쓰는 이름.
 * 제목 표기의 마침표만 뗀다.
 */
export function aboutPanelLabel(key: string, override?: string): string {
  return aboutPanelTitle(key, override).replace(/\.$/, "");
}
