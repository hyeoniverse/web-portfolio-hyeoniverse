/* 코드 문자열에서 언어를 추론하는 순수 휴리스틱 — 의존성 없음.
   lowlightInstance 에서 분리했다: 거기 있으면 이 함수를 쓰려는 쪽이 lowlight(=highlight.js 전체)를
   같이 끌어오게 되고, 그러면 #312 의 정규식 지뢰가 딸려온다. */

/** 추론 결과 — hljs/Prism 공통으로 통하는 이름만 반환한다. 못 맞히면 null. */
export function detectCodeLanguage(code: string): string | null {
  const t = code.trim();
  if (t.length < 12) return null;
  const has = (re: RegExp) => re.test(t);

  // JSON
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t);
      return "json";
    } catch {
      /* not json */
    }
  }
  // Python (def/class:/elif/self/print/from-import) — JS 의 return/import 보다 먼저
  if (has(/\bdef\s+\w+\s*\([^)]*\)\s*:|\bclass\s+\w+[^{]*:\s*$|\belif\b|\bself\b|\bprint\s*\(|^\s*from\s+[\w.]+\s+import\s/m))
    return "python";
  // JS / TS / JSX
  const tsHints = has(/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|void|any|unknown|never|React\.\w+|\w+\[\])\b|\bas\s+(const|\w+)\b/);
  const jsHints = has(/\b(const|let|var|function|=>|export\s|import\s.*from|require\(|console\.)/);
  const jsxHints = has(/<[A-Za-z][\w.]*(\s+[\w-]+[=\s/>]|\s*\/?>)/) && has(/[{}]/);
  if (jsHints || jsxHints) return tsHints ? "typescript" : "javascript";
  // CSS / SCSS
  if (has(/[.#&]?[\w-]+\s*\{[\s\S]*?[\w-]+\s*:\s*[^;{}]+;/))
    return has(/[$@][\w-]+|@mixin|@include|&[\s.:#]/) ? "scss" : "css";
  // HTML / XML
  if (has(/<\/?[a-zA-Z][\s\S]*?>/)) return "xml";
  // Shell
  if (has(/(^|\n)\s*#!.*\b(ba)?sh\b|(^|\n)\s*(echo|cd|export|sudo|npm|yarn|pnpm|git|mkdir|curl)\s/)) return "bash";
  // SQL
  if (has(/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|JOIN)\b/i)) return "sql";

  return null;
}
