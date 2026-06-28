import { createLowlight, all } from "lowlight";

// 에디터 코드블록 syntax highlighting + 붙여넣기 언어 자동감지에 공용으로 쓰는 lowlight 인스턴스.
// (code-block-kit 과 elements 가 둘 다 import → 순환 의존 방지 위해 별도 모듈)
export const lowlight = createLowlight(all);

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
