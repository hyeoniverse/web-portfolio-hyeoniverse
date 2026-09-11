import { createLowlight, common } from "lowlight";
import hljsXml from "highlight.js/lib/languages/xml";
import hljsHaskell from "highlight.js/lib/languages/haskell";
import hljsScala from "highlight.js/lib/languages/scala";
import hljsDart from "highlight.js/lib/languages/dart";
import hljsPowershell from "highlight.js/lib/languages/powershell";
import hljsDockerfile from "highlight.js/lib/languages/dockerfile";
import hljsElixir from "highlight.js/lib/languages/elixir";

// 에디터 코드블록 syntax highlighting + 붙여넣기 언어 자동감지에 공용으로 쓰는 lowlight 인스턴스.
// (code-block-kit 과 elements 가 둘 다 import → 순환 의존 방지 위해 별도 모듈)
/* 처음에는 흔한 언어(common, 37개)와 아래 자동감지 후보만 싣는다. highlight.js 전체(all, 190개)를
   처음부터 실으면 글 편집기의 가장 큰 청크에서 972 KB(원본)를 차지했다. 나머지 문법은 그 언어를 쓰는
   코드 블록이 생기면 loadAllGrammars 로 한 번에 받는다(→ useLazyGrammars). */
export const lowlight = createLowlight(common);
/* 자동감지 후보(DETECT_SUBSET) 중 common 에 없는 것 — 붙여넣기 감지는 동기라 기다릴 수 없다 */
lowlight.register({ scala: hljsScala, dart: hljsDart, powershell: hljsPowershell, dockerfile: hljsDockerfile, elixir: hljsElixir });

let loadedAll = false;
let loadingAll: Promise<void> | null = null;

/** 이 언어를 하이라이트하려면 나머지 문법을 받아야 하는지. 별칭(py·sh 등)도 등록된 것으로 본다.
 *  auto 는 전체 문법 중에서 맞혀야 한다. 다 받은 뒤에는 hljs 에 없는 언어라도 더 받을 것이 없다. */
export function needsMoreGrammars(lang: string | null | undefined): boolean {
  if (loadedAll || !lang || lang === "plaintext") return false;
  return lang === "auto" || !lowlight.registered(lang);
}

/** highlight.js 전체 문법을 받아 아직 없는 것만 등록한다. 한 번만 받고, 실패하면 다음에 다시 받는다.
 *  이미 등록한 xml·haskell(브라우저용으로 고친 것)·mermaid·자동감지 후보는 덮어쓰지 않는다. */
export function loadAllGrammars(): Promise<void> {
  loadingAll ??= import("lowlight")
    .then(({ all }) => {
      lowlight.register(Object.fromEntries(Object.entries(all).filter(([name]) => !lowlight.registered(name))));
      loadedAll = true;
    })
    .catch((e) => {
      loadingAll = null;
      throw e;
    });
  return loadingAll;
}

/* ── #312: 브라우저에서 xml/haskell 문법이 통째로 죽는 문제 우회 ──
   hljs 의 xml.js·haskell.js 는 `/[\p{L}_]/u` 같은 유니코드 속성 이스케이프를 쓴다.
   번들러가 이걸 낡은 타깃으로 트랜스파일하며 실제 코드포인트 범위로 **전개**하는데,
   그 안엔 아스트랄 영역(`\u{10000}-…`)이 들어있다 — 중괄호 형태라 `u` flag 없이는 파싱 불가.
   그런데 hljs 의 countMatchGroups 는 `new RegExp(re.toString() + "|")` 로 **flag 없이 재파싱**한다:
     → SyntaxError: Invalid regular expression … at countMatchGroups (core.js:456)
     → Plate 가 이걸 catch 해서 plaintext 로 떨군다 = "HTML 하이라이팅이 안 됨"
   빌드는 통과하고 **브라우저에서만** 터진다. node 는 원본(\p{L} + u)을 쓰므로 재현되지 않는다.
   (Plate 도 같은 이유로 python 에 ensureStablePythonGrammar 를 넣어 두었다 — 그건 python 전용)

   해결: 문법 객체를 훑어 `u` flag 가 붙은 정규식에서 아스트랄 이스케이프를 걷어내고 flag 를 뗀다.
   아스트랄 영역의 "문자"는 태그명/식별자에 실질적으로 안 쓰이고, BMP(한글·CJK·라틴 확장)는 그대로 남는다. */
/** 정규식 소스 문자열에서 아스트랄(`\u{…}`) 이스케이프만 걷어낸다. BMP 범위는 그대로 둔다. */
function stripAstral(src: string): string {
  return src
    .replace(/\\u\{[0-9A-Fa-f]+\}-\\u\{[0-9A-Fa-f]+\}/g, "") // 범위
    .replace(/\\u\{[0-9A-Fa-f]+\}/g, "");                       // 단일
}

function toBrowserSafeRegex(re: RegExp): RegExp {
  if (!re.source.includes("\\u{")) return re;
  try {
    const out = new RegExp(stripAstral(re.source), re.flags.replace("u", ""));
    new RegExp(out.toString() + "|"); // countMatchGroups 가 하는 짓을 미리 해본다 — 통과해야 한다
    return out;
  } catch { return re; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function browserSafeGrammar(node: any, seen = new WeakMap<object, any>()): any {
  /* **문자열도 반드시 처리해야 한다.** hljs 의 regex.concat() 은 RegExp 가 아니라 소스를 이어붙인
     **문자열**을 돌려주고(core.js: `return joined`), xml.js 의 TAG_NAME_RE 가 바로 그 문자열이다.
     즉 아스트랄 이스케이프는 RegExp 객체가 아니라 문자열 안에 들어있다 — 여기를 빼먹으면
     아무것도 안 고쳐진다(실제로 그래서 한 번 헛수고했다). */
  if (typeof node === "string") return node.includes("\\u{") ? stripAstral(node) : node;
  if (node instanceof RegExp) return toBrowserSafeRegex(node);
  if (Array.isArray(node)) return node.map((n) => browserSafeGrammar(n, seen));
  if (node && typeof node === "object") {
    const hit = seen.get(node);
    if (hit) return hit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {};
    seen.set(node, out);
    for (const k of Object.keys(node)) out[k] = browserSafeGrammar(node[k], seen);
    return out;
  }
  return node;
}

// 재등록 — 별칭(html/svg/xhtml 등)은 문법의 aliases 를 통해 hljs 가 같이 잡아준다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lowlight.register("xml", (hljs: any) => browserSafeGrammar(hljsXml(hljs)));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lowlight.register("haskell", (hljs: any) => browserSafeGrammar(hljsHaskell(hljs)));

/* ── mermaid 문법 (직접 정의) ──
   hljs 에는 mermaid 가 없다 — `lowlight.registered("mermaid")` 는 false 이고
   `highlight("mermaid", …)` 는 곧장 throw 한다. Plate 는 그 throw 를 catch 해서 plaintext 로
   떨구므로, 다이어그램 블록의 코드 창이 통째로 무채색이었다.
   (Prism 쪽에서 bash 를 같은 이유로 직접 정의한 것과 같은 패턴 — 읽히는 데 필요한 만큼만.)

   ⚠ 중첩 className 모드를 만들지 말 것. Plate 의 parseNodes 는 부모 클래스를 자식에 누적해
   flat 하게 만들어서(→ globals/_hljs.css 의 "컨테이너 먼저" 주석 참고) 중첩하면 팔레트 순서에
   휘둘린다. 여기 모드는 전부 형제 관계로 유지한다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lowlight.register("mermaid", (hljs: any) => ({
  name: "Mermaid",
  keywords: {
    // 다이어그램 종류 + 구조 키워드
    keyword:
      "graph flowchart sequenceDiagram classDiagram stateDiagram stateDiagram-v2 erDiagram "
      + "journey gantt pie gitGraph mindmap timeline quadrantChart requirementDiagram C4Context "
      + "subgraph end direction participant actor note over loop alt else opt par and rect "
      + "activate deactivate title section dateFormat axisFormat click callback link "
      + "class classDef style linkStyle accTitle accDescr",
    // 방향 지시자 — graph TD / flowchart LR
    literal: "TB TD BT RL LR",
  },
  contains: [
    hljs.COMMENT("%%", "$"),
    { className: "string", begin: /"/, end: /"/ },
    // 노드 라벨 — A[Start] · B(Round) · C{Diamond}. 라벨은 "글"이라 문자열로 취급.
    { className: "string", begin: /\[/, end: /\]/ },
    { className: "string", begin: /\(/, end: /\)/ },
    { className: "string", begin: /\{/, end: /\}/ },
    // 화살표/링크 — -->  ---  -.->  ==>  --x  --o  ->>  및 erDiagram 의 ||--o{ 류
    { className: "operator", begin: /(?:-{2,}|={2,}|-\.+-|\.{2,})[->ox|]*|<?\|{1,2}(?:--|\.\.)[o|{}]*|->{1,2}|:::/ },
    { className: "number", begin: /\b\d+(?:\.\d+)?\b/ },
  ],
}));

// 자동감지 후보 — 전체(all)로 highlightAuto 하면 'properties' 등 greedy 문법이 뭐든 오탐하므로
// 흔한 언어로 subset 제한. (hljs highlightAuto 의 알려진 한계)
// toml/ini/makefile/nginx/diff/properties 는 'key = value' 류 greedy 문법이라 JS 등을 오탐 → 제외.
const DETECT_SUBSET = [
  "javascript", "typescript", "python", "java", "c", "cpp", "csharp", "go", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "dart", "objectivec", "perl", "lua", "r",
  "css", "scss", "less", "xml", "html", "json", "yaml", "bash", "powershell",
  "sql", "graphql", "markdown", "dockerfile", "haskell", "elixir",
];

// 붙여넣기 시 언어 1회 자동감지.
// hljs(lowlight) auto-detect 는 이 환경(브라우저/Turbopack)에서 일부 문법이 유니코드 정규식 컴파일에
// 실패해 throw 되거나(→ js/ts/xml 등 중요한 언어가 누락) 오탐이 잦다. 그래서 흔한 언어는 패턴 기반
// 휴리스틱으로 우선 판별하고, 나머지만 hljs 로 fallback(throw 나는 문법은 건너뜀).
export function detectCodeLanguage(code: string): string | null {
  const t = code.trim();
  if (t.length < 12) return null;
  const has = (re: RegExp) => re.test(t);

  /* Mermaid — 반드시 먼저. hljs 는 mermaid 문법이 없고(등록조차 안 됨), 아래 fallback 에 맡기면
     `A[Start] --> B[End]` 를 css/less 로 오탐한다(relevance 5 로 1등). 에디터에선 mermaid 가
     다이어그램 블록을 켜는 정식 언어라 오탐이 그냥 색 문제로 안 끝난다. */
  if (/^\s*(?:graph|flowchart)\s+(?:TB|TD|BT|RL|LR)\b/m.test(t)
    || /^\s*(?:sequenceDiagram|classDiagram(?:-v2)?|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie\b|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|sankey-beta|xychart-beta|block-beta)/m.test(t)) return "mermaid";
  // JSON
  if (/^[[{]/.test(t)) {
    try { JSON.parse(t); return "json"; } catch { /* not json */ }
  }
  // Python (def/class:/elif/self/print/from-import) — JS 의 return/import 보다 먼저
  if (has(/\bdef\s+\w+\s*\([^)]*\)\s*:|\bclass\s+\w+[^{]*:\s*$|\belif\b|\bself\b|\bprint\s*\(|^\s*from\s+[\w.]+\s+import\s/m)) return "python";
  // JS / TS / JSX — hljs 가 브라우저에서 throw 하거나 xml/css 로 오탐하므로 우선 처리
  const tsHints = has(/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|void|any|unknown|never|React\.\w+|\w+\[\])\b|\bas\s+(const|\w+)\b/);
  const jsHints = has(/\b(const|let|var|function|=>|export\s|import\s.*from|require\(|console\.)/);
  const jsxHints = has(/<[A-Za-z][\w.]*(\s+[\w-]+[=\s/>]|\s*\/?>)/) && has(/[{}]/);
  if (jsHints || jsxHints) return tsHints ? "typescript" : "javascript";
  // CSS / SCSS
  if (has(/[.#&]?[\w-]+\s*\{[\s\S]*?[\w-]+\s*:\s*[^;{}]+;/)) return has(/[$@][\w-]+|@mixin|@include|&[\s.:#]/) ? "scss" : "css";
  // HTML / XML
  if (has(/<\/?[a-zA-Z][\s\S]*?>/)) return "xml";
  // Shell
  if (has(/(^|\n)\s*#!.*\b(ba)?sh\b|(^|\n)\s*(echo|cd|export|sudo|npm|yarn|pnpm|git|mkdir|curl)\s/)) return "bash";
  // SQL
  if (has(/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|JOIN)\b/i)) return "sql";

  // 그 외 — hljs 로 시도(throw 나는 문법은 건너뜀), 최고 relevance 채택
  let best: { lang: string; relevance: number } | null = null;
  for (const lang of DETECT_SUBSET) {
    try {
      const r = lowlight.highlight(lang, t);
      const rel = (r.data as { relevance?: number } | undefined)?.relevance ?? 0;
      if (!best || rel > best.relevance) best = { lang, relevance: rel };
    } catch { /* 컴파일 실패 문법 건너뜀 */ }
  }
  return best && best.relevance >= 2 ? best.lang : null;
}
