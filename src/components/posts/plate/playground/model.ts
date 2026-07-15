// ── 코드 플레이그라운드 블록 데이터 모델 (Sandpack) ──
// Sandpack(파일 맵 + 템플릿 + 의존성)으로 CodeSandbox 식 실행. el.data 에 저장.
// 이전 포맷(html/css/js)은 static 단일 index.html 로 마이그레이션해 보존.

export interface PlaygroundData {
  /** Sandpack 템플릿 — react-ts, react, vanilla, vanilla-ts, static, vue, svelte 등 */
  template: string;
  /** 파일 맵(경로 → 코드). 비어 있으면 템플릿 기본 파일 사용 */
  files: Record<string, string>;
  /** package.json 외 별도 의존성(선택). 보통은 package.json 파일로 관리 */
  dependencies?: Record<string, string>;
}

// HTML/CSS/JS 는 외부 번들러/서버 없이 로컬 srcdoc 러너("html")로 실행 → 항상 동작.
// React/TS 등은 Sandpack 유지(하이브리드).
export const DEFAULT_TEMPLATE = "html";
/** 이 템플릿들은 자체 srcdoc 러너로 실행 (나머지는 Sandpack) */
export const RUNNER_TEMPLATES = new Set(["html", "static"]);
export const EMPTY_PLAYGROUND: PlaygroundData = { template: DEFAULT_TEMPLATE, files: {} };

// 이미 저장된 baked HTML 이 옛 @babel/standalone 옵션(isTSX/allExtensions — 최신 버전에서 제거됨)을
// 품고 있으면 미리보기에서 에러를 뱉는다. 로드 시점에 최신 호환 형태로 치환해 self-heal.
function sanitizeLegacyBabel(code: string): string {
  if (!code.includes("allExtensions")) return code;
  return code
    .replace(/\['typescript',\s*\{\s*isTSX:\s*true\s*,\s*allExtensions:\s*true\s*\}\]/g, "'typescript'")
    .replace(/\{presets:\['react','typescript'\]\}/g, "{presets:['react','typescript'],filename:'index.tsx'}");
}

// legacy 마이그레이션 시 래퍼(doctype·head·meta·CDN script·<style> 여는 태그)가 한 줄로 이어붙어
// 뷰어에서 거대한 1줄로 보이고 줄단위 선택이 깨진다. 래퍼 태그 경계에만 개행을 넣어 가독성 복구.
// (사용자 CSS/JS/HTML 내용은 건드리지 않음 — 태그 사이 공백은 렌더에 영향 없음)
function formatLegacyWrapper(html: string): string {
  if (!html.includes("<!doctype html><html><head>")) return html;
  return html
    .replace("<!doctype html><html><head>", "<!doctype html>\n<html>\n<head>")
    .split("><meta ").join(">\n  <meta ")
    .split("><script ").join(">\n  <script ")
    .split("><style>").join(">\n  <style>")
    .replace("</style></head><body>", "</style>\n</head>\n<body>")
    .replace("</body></html>", "\n</body>\n</html>");
}

// JSX 문법이 있는지 대략 판별(태그 열기/닫기/self-closing). 없으면 Babel 불필요 → plain script.
const JSX_RE = /<[A-Za-z][\w.]*[\s/>]|<\/[A-Za-z]|\/>/;
/** JS 를 script 태그로 — JSX 있으면 text/babel, 없으면 동기 실행되는 plain script */
function jsToScript(js: string): string {
  const esc = js.replace(/<\/script/gi, "<\\/script");
  return JSX_RE.test(js)
    ? `<script type="text/babel" data-presets="react,typescript">${esc}</script>`
    : `<script>${esc}</script>`;
}

// 이미 저장된 baked HTML 의 "런타임 Babel.transform + <script> 주입" 패턴을 실행 가능한 script 로 변환
// (self-heal). 주입 방식/Babel 자동실행 타이밍 때문에 미리보기에서 안 돌던 문제 해결.
function convertLegacyBabelInject(html: string): string {
  const re = /<script>\(function\(\)\{try\{var out=Babel\.transform\(("(?:[^"\\]|\\.)*"),\{presets:\['react','typescript'\],filename:'index\.tsx'\}\)\.code;[\s\S]*?\}\)\(\);<\/script>/g;
  return html.replace(re, (m, jsonLit) => {
    let js: string;
    try { js = JSON.parse(jsonLit); } catch { return m; }
    return jsToScript(js);
  });
}

function cleanFiles(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = formatLegacyWrapper(convertLegacyBabelInject(sanitizeLegacyBabel(v)));
    }
  }
  return out;
}
function cleanDeps(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  return Object.keys(out).length ? out : undefined;
}

// ── 레거시(html/css/js) → 단일 HTML 문서 ── static 템플릿으로 보존
interface LegacyPlayground { html?: string; css?: string; js?: string; react?: boolean }
const REACT_CDN =
  "<script crossorigin src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>" +
  "<script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>" +
  "<script src=\"https://unpkg.com/@babel/standalone/babel.min.js\"></script>";
function legacyToHtml(d: LegacyPlayground): string {
  const js = d.js || "";
  // JSX 있는 react 레거시만 Babel(text/babel) 필요. 순수 JS 는 plain script 로 동기 실행.
  const needsBabel = !!d.react && JSX_RE.test(js);
  const scriptTag = jsToScript(js);
  return formatLegacyWrapper([
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    needsBabel ? REACT_CDN : "",
    `<style>${d.css || ""}</style>`,
    "</head><body>",
    d.html || "",
    scriptTag,
    "</body></html>",
  ].join(""));
}

/** 유효성 정규화 — 새 포맷(files) 우선, 없으면 레거시 마이그레이션, 그것도 없으면 빈 신규. */
export function normalizePlayground(raw: unknown): PlaygroundData {
  const d = (raw ?? {}) as Record<string, unknown>;
  const files = cleanFiles(d.files);
  if (Object.keys(files).length) {
    return { template: typeof d.template === "string" ? d.template : DEFAULT_TEMPLATE, files, dependencies: cleanDeps(d.dependencies) };
  }
  // 레거시 html/css/js → srcdoc 러너("html"). react(JSX)는 CDN+babel 완전문서(baked)로, 아니면 분리.
  if (typeof d.html === "string" || typeof d.css === "string" || typeof d.js === "string") {
    const L = d as LegacyPlayground;
    if (L.react) {
      return { template: "html", files: { "/index.html": legacyToHtml(L) } };
    }
    return { template: "html", files: { "/index.html": L.html ?? "", "/styles.css": L.css ?? "", "/script.js": L.js ?? "" } };
  }
  // 빈 신규 블록 — 템플릿 기본 파일 사용
  return { template: typeof d.template === "string" ? d.template : DEFAULT_TEMPLATE, files: {}, dependencies: cleanDeps(d.dependencies) };
}
