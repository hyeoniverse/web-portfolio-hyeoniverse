/**
 * 스타일 이행 감시 — docs/design-system.md 의 "목표(N)" 를 센다.
 *
 * 명세는 지켜야 할 규칙을 정하고, 아직 안 지키는 옛 코드의 수를 "목표(N)" 로 적는다. 이 파일이 그 N 을
 * 세는 **유일한 기준**이다. 테스트(src/__tests__/styleRatchet.test.ts)는 지금 센 수를 기준선
 * (scripts/style-ratchet.baseline.json)과 비교해
 *   - 늘었으면 실패한다 — 새 코드가 규칙을 어겼다는 뜻이다. 어느 파일에서 늘었는지 보여 준다.
 *   - 줄었으면 실패한다 — 옮긴 만큼 기준선을 내려 다시 늘지 못하게 잠근다(`npm run style:ratchet`).
 * 0 이 된 항목은 lint 규칙으로 바꾸고 여기서 지운다(명세 이행 16단계).
 *
 * 세는 법은 정규식이라 완벽하지 않다. 대신 같은 기준으로 계속 센다 — 늘었는지 줄었는지만 보면 된다.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/* ── 대상 파일 ─────────────────────────────────────────────────────────── */

type Kind = "componentCss" | "moduleCss" | "globalCss" | "code" | "tokenCss" | "semanticCss";

/** 토큰을 **정의하는** 파일 — 여기 쓰는 값·이름은 규칙 위반이 아니다 */
const TOKEN_FILES = /^src\/styles\/tokens\//;
const SEMANTIC_FILE = "src/styles/globals/_semantic.css";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

const stripCssComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

export interface Sources {
  /** 저장소 기준 상대 경로 → 내용(CSS 는 주석을 지운 것) */
  files: Map<string, { kind: Set<Kind>; text: string }>;
}

export function readSources(root: string): Sources {
  const files: Sources["files"] = new Map();
  for (const abs of walk(path.join(root, "src"))) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const kind = new Set<Kind>();
    if (rel.endsWith(".css")) {
      if (TOKEN_FILES.test(rel)) kind.add("tokenCss");
      else if (rel === SEMANTIC_FILE) kind.add("semanticCss");
      else {
        kind.add("componentCss");
        kind.add(rel.endsWith(".module.css") ? "moduleCss" : "globalCss");
      }
      files.set(rel, { kind, text: stripCssComments(fs.readFileSync(abs, "utf8")) });
    } else if (/\.(tsx?|mjs)$/.test(rel)) {
      kind.add("code");
      files.set(rel, { kind, text: fs.readFileSync(abs, "utf8") });
    }
  }
  return { files };
}

/* ── 세는 법 ───────────────────────────────────────────────────────────── */

export type Counts = Record<string, number>; // 파일 → 개수(0 은 적지 않는다)

export interface Metric {
  /** 기준선 키 — 바꾸면 기준선도 다시 만든다 */
  id: string;
  /** 명세 규칙 번호 */
  rule: string;
  /** 무엇을 세는지 — 실패 메시지와 명세에 그대로 쓴다 */
  what: string;
  count(src: Sources): Counts;
}

/** kinds 에 해당하는 파일마다 정규식이 몇 번 맞는지 */
function regex(kinds: Kind[], re: RegExp): Metric["count"] {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return (src) => {
    const out: Counts = {};
    for (const [file, { kind, text }] of src.files) {
      if (!kinds.some((k) => kind.has(k))) continue;
      const n = text.match(g)?.length ?? 0;
      if (n) out[file] = n;
    }
    return out;
  };
}

/** 선택자에 `disabled` 가 들어간 규칙 안의 opacity 선언 */
function disabledOpacity(src: Sources): Counts {
  const out: Counts = {};
  for (const [file, { kind, text }] of src.files) {
    if (!kind.has("componentCss")) continue;
    let n = 0;
    for (const m of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (m[1].includes("disabled")) n += m[2].match(/(?<![-\w])opacity\s*:/g)?.length ?? 0;
    }
    if (n) out[file] = n;
  }
  return out;
}

/** 다크 테마 블록 안에서 값을 다시 정의하는 원시 토큰(2-5-1) */
function darkPrimitives(prefix: RegExp): Metric["count"] {
  return (src) => {
    const out: Counts = {};
    for (const [file, { kind, text }] of src.files) {
      if (!kind.has("tokenCss")) continue;
      let n = 0;
      for (const m of text.matchAll(/\[data-theme=["']?dark["']?\][^{]*\{([^}]*)\}/g)) {
        n += [...m[1].matchAll(/(--[\w-]+)\s*:/g)].filter((d) => prefix.test(d[1])).length;
      }
      if (n) out[file] = n;
    }
    return out;
  };
}

/** 눈금 단계 — 쓰는 곳이 없어도 남긴다(2-4). 이 이름이 아닌 토큰은 안 쓰면 지운다 */
const SCALE = /^--(?:spacing|size|radius|font-size|fluid-font-size|line-height|font-weight|blur|border-width)-|^--color-[a-z]+-\d+$/;

/** 정의됐는데 아무도 부르지 않는 토큰 중 눈금 단계가 아닌 것(2-4) — 정의한 파일별로 */
function unusedTokens(src: Sources): Counts {
  const defs = new Map<string, string>(); // 토큰 → 정의한 파일
  for (const [file, { kind, text }] of src.files) {
    if (!kind.has("tokenCss") && !kind.has("semanticCss")) continue;
    for (const m of text.matchAll(/(?<![\w-])(--(?!_)[\w-]+)\s*:/g)) if (!defs.has(m[1])) defs.set(m[1], file);
  }
  /* 쓰임 = 정의가 아닌 자리에 이름이 나오는 것. 정의(`--x:`)를 지운 뒤 찾는다 */
  const usage = [...src.files.values()].map((f) => f.text.replace(/(?<![\w-])--(?!_)[\w-]+\s*:/g, "")).join("\n");
  const used = new Set([...usage.matchAll(/--(?!_)[\w-]+/g)].map((m) => m[0]));
  const out: Counts = {};
  for (const [name, file] of defs) {
    if (SCALE.test(name) || used.has(name)) continue;
    out[file] = (out[file] ?? 0) + 1;
  }
  return out;
}

/** 파일 단위로 센다 — 그 파일에 한 번이라도 나오면 1 */
function filesContaining(kinds: Kind[], re: RegExp): Metric["count"] {
  return (src) => {
    const out: Counts = {};
    for (const [file, { kind, text }] of src.files) {
      if (kinds.some((k) => kind.has(k)) && re.test(text)) out[file] = 1;
    }
    return out;
  };
}

/** JSX `<button>` 요소 — 문자열 속 HTML(`"<button …"`)은 세지 않으려고 파서로 센다 */
function rawButtons(src: Sources): Counts {
  const out: Counts = {};
  const own = new Set(["src/components/ui/Button.tsx", "src/components/ui/Pressable.tsx"]);
  for (const [file, { text }] of src.files) {
    if (!file.endsWith(".tsx") || own.has(file) || !text.includes("<button")) continue;
    let n = 0;
    const visit = (node: ts.Node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === "button") n++;
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
    if (n) out[file] = n;
  }
  return out;
}

const CSS: Kind[] = ["componentCss"];
const MODULE: Kind[] = ["moduleCss"];
const CSS_AND_CODE: Kind[] = ["componentCss", "code"];

/** 명세 순서대로 */
export const METRICS: Metric[] = [
  /* 2-3 이름 */
  { id: "name-spacing", rule: "2-3", what: "간격 토큰을 크기 이름으로 부른 곳(`--spacing-md` 등 → `--spacing-16`)", count: regex(CSS_AND_CODE, /var\(--spacing-(?:zero|[2-4]xs|xs|sm|md|lg|xl|[2-6]xl|[245]xl-plus)\)/) },
  { id: "name-radius", rule: "2-3 · 3.5-1", what: "모서리 눈금 이름(`--radius-xs … 2xl` · `-circle` · `-capsule`)", count: regex(CSS_AND_CODE, /var\(--radius-(?:2xs|xs|sm|md|lg|xl|2xl|circle|capsule)\)/) },
  { id: "name-control-h", rule: "2-3", what: "`--control-h-*`(→ `--control-height-*`)", count: regex(CSS_AND_CODE, /var\(--control-h-[\w]+\)/) },
  { id: "name-padding-abbr", rule: "2-3", what: "`-p` 로 줄인 여백 토큰(`--button-p-*` · `--input-p` 등)", count: regex(CSS_AND_CODE, /var\(--(?:button|row|badge|modal|card|field|cell)-p(?:-[a-z]+)?\)|var\(--(?:input|textarea)-p\)/) },
  { id: "name-size", rule: "2-3", what: "크기 토큰을 크기 이름으로 부른 곳(`--size-xs` 등)", count: regex(CSS_AND_CODE, /var\(--size-(?:[2-6]xs|xs|sm|md|lg|xl|[2-6]xl)\)/) },
  { id: "name-font-size-scale", rule: "2-3 · 3.2-1", what: "글자 크기 눈금 이름(`--font-size-sm` · `-2xl` 등)", count: regex(CSS_AND_CODE, /var\(--font-size-(?:3xs|2xs|xs|sm|md|lg|xl|2xl|2xl-plus|3xl|4xl|5xl|6xl)\)/) },
  { id: "name-z", rule: "2-3", what: "`--z-*`(→ `--z-index-*`)", count: regex(CSS_AND_CODE, /var\(--z-[a-z]+\)/) },
  { id: "name-grid-cols", rule: "2-3", what: "`--grid-cols-*`(→ `--grid-columns-*`)", count: regex(CSS_AND_CODE, /var\(--grid-cols-\d+\)/) },
  /* 2-4 */
  { id: "unused-tokens", rule: "2-4", what: "정의만 있고 아무도 부르지 않는 토큰(눈금 단계 제외)", count: unusedTokens },
  /* 2-5 테마 */
  { id: "theme-dark-primitive-color", rule: "2-5-1", what: "다크 테마에서 값을 다시 정의하는 원시 색 토큰", count: darkPrimitives(/^--color-/) },
  { id: "theme-dark-primitive-shadow", rule: "2-5-1", what: "다크 테마에서 값을 다시 정의하는 원시 그림자 토큰", count: darkPrimitives(/^--shadow-/) },
  { id: "theme-branch-module", rule: "2-5-4", what: "CSS Module 의 `[data-theme]` 선택자", count: regex(MODULE, /\[data-theme/) },
  { id: "theme-branch-global", rule: "2-5-4", what: "전역 CSS 의 `[data-theme]` 선택자(토큰 파일 제외)", count: regex(["globalCss"], /\[data-theme/) },
  { id: "theme-prefers-color-scheme", rule: "2-5-4", what: "CSS Module 의 `prefers-color-scheme` 미디어 쿼리", count: regex(MODULE, /prefers-color-scheme/) },
  /* 3.1 색 */
  { id: "color-palette", rule: "2-2 · 3.1-2", what: "컴포넌트가 팔레트(`--color-*`)를 바로 부른 곳", count: regex(CSS_AND_CODE, /var\(--color-[\w-]+\)/) },
  { id: "color-hex", rule: "3.1-2", what: "컴포넌트 CSS 선언 값 안의 hex 색", count: regex(CSS, /:[^;{}]*?#[0-9a-fA-F]{3,8}\b/) },
  { id: "color-function", rule: "3.1-2", what: "컴포넌트 CSS 의 색 함수(`rgb()` · `hsl()` · `oklch()` 등)", count: regex(CSS, /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/) },
  { id: "color-local-var", rule: "3.1-2", what: "지역 변수(`--_x`)에 넣은 색 값", count: regex(CSS, /--_[\w-]+:\s*(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\()/) },
  { id: "color-alpha-token", rule: "3.1-3", what: "투명도 단계 토큰(`--color-*-alpha-*`)을 부른 곳", count: regex(CSS_AND_CODE, /var\(--color-[a-z-]+-alpha(?:-\d+)?\)/) },
  /* 3.2 글자 */
  { id: "type-font-size-decl", rule: "3.2-1", what: "컴포넌트 CSS 의 `font-size` 선언", count: regex(CSS, /(?<![-\w])font-size\s*:/) },
  { id: "type-line-height-decl", rule: "3.2-1", what: "컴포넌트 CSS 의 `line-height` 선언", count: regex(CSS, /(?<![-\w])line-height\s*:/) },
  { id: "type-font-weight-decl", rule: "3.2-1", what: "컴포넌트 CSS 의 `font-weight` 선언", count: regex(CSS, /(?<![-\w])font-weight\s*:/) },
  { id: "type-font-family-decl", rule: "3.2-1", what: "컴포넌트 CSS 의 `font-family` 선언", count: regex(CSS, /(?<![-\w])font-family\s*:/) },
  { id: "type-micro", rule: "3.2-2", what: "11px 토큰 `--font-size-micro`", count: regex(CSS_AND_CODE, /var\(--font-size-micro\)/) },
  { id: "type-font-size-number", rule: "3.2-3", what: "글자 크기를 px · rem 숫자로 쓴 선언", count: regex(CSS, /(?<![-\w])font-size:\s*[\d.]+(?:px|rem)\b/) },
  { id: "type-fluid-token", rule: "3.2-4", what: "가운데 값이 화면 단위뿐인 글자 크기 토큰 정의", count: regex(["semanticCss", "tokenCss"], /--(?:font-size|fluid-font-size)-[\w-]+:\s*clamp\([^,]+,\s*(?:min\(|[\d.]+v[wh]\s*,)/) },
  { id: "type-fluid-direct", rule: "3.2-4", what: "가운데 값이 화면 단위뿐인 `font-size: clamp()`", count: regex(CSS, /font-size:\s*clamp\([^,]+,\s*(?:min\(|[\d.]+v[wh]\s*,)/) },
  { id: "type-root-px", rule: "3.2-5", what: "`html` 의 px 글자 크기", count: regex(["globalCss"], /(?:^|[\s,}])html\s*\{[^}]*font-size:\s*\d+px/) },
  { id: "type-line-height-px", rule: "3.2-6", what: "px 줄간격", count: regex(CSS, /line-height:\s*[\d.]+px/) },
  { id: "type-line-height-relaxed", rule: "3.2-7", what: "`--line-height-relaxed`", count: regex(CSS_AND_CODE, /var\(--line-height-relaxed\)/) },
  /* 3.3 간격 */
  { id: "space-mobile-only", rule: "3.3-3", what: "480px 이하에서만 정의되는 `--m-*`", count: regex(CSS_AND_CODE, /var\(--m-(?:sm|md|lg)\)/) },
  /* 3.4 크기 */
  { id: "control-vertical-padding", rule: "3.4-2", what: "세로 여백을 담은 컨트롤 여백 토큰(`--button-p-*` · `--input-p` · `--field-p-*`)", count: regex(CSS_AND_CODE, /var\(--(?:button-p-[a-z]+|input-p|field-p-[a-z]+)\)/) },
  { id: "control-20px", rule: "3.4-4", what: "20px 컨트롤 높이 `--control-h-2xs`", count: regex(CSS_AND_CODE, /var\(--control-h-2xs\)/) },
  /* 3.5 · 3.6 · 3.7 · 3.8 */
  { id: "radius-number", rule: "3.5-1", what: "모서리를 px · rem 숫자로 쓴 선언", count: regex(CSS, /border(?:-[a-z]+)*-radius:\s*[^;]*\b[1-9][\d.]*(?:px|rem)/) },
  { id: "border-width-number", rule: "3.6-1", what: "테두리 두께를 px 숫자로 쓴 선언", count: regex(CSS, /border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-width)?:\s*[\d.]+px/) },
  { id: "shadow-literal", rule: "3.7-1", what: "그림자 값을 직접 쓴 `box-shadow`", count: regex(CSS, /box-shadow:\s*(?!none|var|inherit|initial|unset)[^;]*\d+px/) },
  { id: "shadow-size-name", rule: "3.7-1", what: "그림자 크기 이름(`--shadow-xs … 2xl` 등)", count: regex(CSS_AND_CODE, /var\(--shadow-[\w-]+\)/) },
  { id: "opacity-disabled", rule: "3.8-1", what: "비활성 선택자 안의 `opacity` 숫자", count: disabledOpacity },
  /* 3.9 모션 */
  { id: "motion-duration-literal", rule: "3.9-1", what: "시간을 숫자로 쓴 `transition` · `animation` 선언", count: regex(CSS, /(?:transition|animation)(?:-duration|-delay)?:[^;]*\b\d*\.?\d+m?s\b/) },
  { id: "motion-cleanup", rule: "3.9-2", what: "없앨 모션 토큰(`moderate` · `slowest` · `delay-*` · `ease-in-out`)", count: regex(CSS_AND_CODE, /var\(--(?:duration-moderate|duration-slowest|delay-[a-z]+|ease-in-out)\)/) },
  { id: "motion-transition-all", rule: "3.9-5", what: "`transition: all`", count: regex(CSS, /transition\s*:\s*all\b/) },
  { id: "motion-transition-important", rule: "3.9-6", what: "`!important` 를 붙인 transition", count: regex(CSS, /transition[^;]*!important/) },
  /* 3.10 · 3.11 */
  { id: "layer-portal-files", rule: "3.10-1", what: "`createPortal` 을 쓰는 파일", count: filesContaining(["code"], /createPortal/) },
  { id: "layer-z-number", rule: "3.10-3", what: "4 이상 z-index 숫자", count: regex(CSS, /z-index:\s*(?:[4-9]|\d{2,})\b/) },
  { id: "responsive-max-width", rule: "3.11-1", what: "`max-width` 미디어 쿼리", count: regex(CSS, /@media[^{]*max-width/) },
  { id: "responsive-100vh", rule: "3.11-4", what: "`100vh`", count: regex(CSS, /\b100vh\b/) },
  /* 4 우선순위 */
  { id: "cascade-vendor-js-import", rule: "4-3", what: "JS 에서 바로 import 한 서드파티 CSS", count: regex(["code"], /^import\s+["'](?:katex|@xyflow|pretendard)[^"']*\.css["']/m) },
  { id: "cascade-important", rule: "4-4", what: "`!important`", count: regex(CSS, /!important/) },
  { id: "cascade-composes-other-file", rule: "4-5", what: "다른 파일에서 가져온 `composes`", count: regex(CSS, /composes:[^;]*\bfrom\b/) },
  /* 5 · 6 */
  { id: "component-raw-button", rule: "5-1", what: "`Button` · `Pressable` 밖의 JSX `<button>`", count: rawButtons },
  { id: "a11y-outline-none", rule: "6-1", what: "`outline: none/0`", count: regex(CSS, /outline\s*:\s*(?:none|0)\s*[;}]/) },
  { id: "a11y-focus-shadow-only", rule: "6-1", what: "포커스를 그림자로 그린 규칙", count: regex(CSS, /:focus(?:-visible)?[^{]*\{[^}]*box-shadow/) },
];

export type Baseline = Record<string, Counts>;

export function measure(root: string): Baseline {
  const src = readSources(root);
  const out: Baseline = {};
  for (const m of METRICS) {
    const counts = m.count(src);
    out[m.id] = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  }
  return out;
}

export const total = (c: Counts | undefined) => Object.values(c ?? {}).reduce((a, b) => a + b, 0);

export const BASELINE_PATH = "scripts/style-ratchet.baseline.json";

/**
 * 기준선과 비교 — 합계로 판정한다. 파일 사이에 코드를 옮기기만 한 것(합계 같음)은 통과다.
 * 늘었으면 어느 파일에서 늘었는지 함께 돌려준다.
 */
export function compare(baseline: Baseline, current: Baseline) {
  const grew: string[] = [];
  const shrank: string[] = [];
  for (const m of METRICS) {
    const before = baseline[m.id] ?? {};
    const now = current[m.id] ?? {};
    const head = `  [${m.rule}] ${m.what} (${m.id}): ${total(before)} → ${total(now)}`;
    if (total(now) > total(before)) {
      const files = new Set([...Object.keys(before), ...Object.keys(now)]);
      const up = [...files].filter((f) => (now[f] ?? 0) > (before[f] ?? 0)).map((f) => `      ${f}: ${before[f] ?? 0} → ${now[f]}`);
      grew.push([head, ...up].join("\n"));
    } else if (total(now) < total(before)) shrank.push(head);
  }
  return { grew, shrank };
}
