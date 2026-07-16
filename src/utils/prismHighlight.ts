import { Prism } from "prism-react-renderer";
import { detectCodeLanguage } from "./detectCodeLanguage";

/* 코드블록 하이라이팅 — 댓글/마크다운 게시물 공용.

   ⚠ highlight.js 를 쓰면 안 된다. hljs 의 `countMatchGroups` 가
   `new RegExp(re.toString() + "|")` 로 정규식을 **flag 없이 재파싱**하는데, 번들러가
   node_modules ESM 을 낡은 타깃으로 트랜스파일하며 `/[\p{L}_]/u` 를 `\u{30000}-...`
   코드포인트 범위로 풀어놓기 때문에 `u` flag 없이는 그 클래스가 무효다
   → 언어 **컴파일 시점**(등록이 아니라 highlight 호출)에 throw → 페이지 전체가 죽는다.
   빌드는 통과하고 런타임에만 터져서 build 로는 못 잡는다. 조사 기록은 #312.

   Prism(prism-react-renderer 번들)은 유니코드 속성 이스케이프를 안 써서 이 함정이 없고,
   이미 의존성에 있어 추가 비용도 없다. 토큰 색은 globals/_prism.css. */

/* Prism 번들에 없는 문법 — bash 는 댓글/글에서 제일 흔한 코드(npm/git/curl)라 직접 정의한다.
   Prism 본체의 bash 정의는 크고 우리에게 과한 부분이 많아, 눈으로 읽히는 데 필요한 만큼만. */
if (!Prism.languages.bash) {
  Prism.languages.bash = {
    shebang: { pattern: /^#!\s*\/.*/, alias: "important" },
    comment: { pattern: /(^|[^"{\\$])#.*/, lookbehind: true },
    string: [
      { pattern: /"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/, greedy: true },
      { pattern: /'[^']*'/, greedy: true },
    ],
    variable: /\$(?:\w+|\{[^}]+\}|\([^)]+\))/,
    function: {
      pattern: /(^|[\s;|&])(?:npm|npx|yarn|pnpm|bun|git|curl|wget|cd|ls|cp|mv|rm|mkdir|touch|cat|echo|export|source|sudo|chmod|chown|docker|kubectl|make|python3?|node|pip3?|brew|apt|apt-get|ssh|scp|tar|unzip|grep|sed|awk|find|xargs)(?=[\s;|&]|$)/,
      lookbehind: true,
    },
    keyword: {
      pattern: /(^|[\s;|&])(?:if|then|else|elif|fi|for|while|in|do|done|case|esac|function|return|exit|local)(?=[\s;|&]|$)/,
      lookbehind: true,
    },
    // -f / --force 같은 플래그 — 셸 코드에서 눈에 잡혀야 읽힌다
    "attr-name": { pattern: /(^|\s)--?[\w-]+/, lookbehind: true },
    number: /\b\d+(?:\.\d+)?\b/,
    operator: /&&|\|\||[|&;<>]|[=+-]/,
    punctuation: /[{}()[\]]/,
  };
  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
  Prism.languages.zsh = Prism.languages.bash;
  Prism.languages.console = Prism.languages.bash;
}

/** 사용자 입력(``` 뒤 문자열)을 안전한 alias 로 — 속성 주입 방지 */
export const normalizeLangAlias = (raw: string | undefined): string =>
  (raw ?? "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9+#._-]/g, "")
    .slice(0, 20);

/* 추론기/사용자가 쓰는 이름 → Prism 문법 이름.
   Prism 번들에 없는 것은 가장 가까운 문법으로 흘려보낸다 (색이 아예 없는 것보다 낫다). */
const ALIAS: Record<string, string> = {
  scss: "css",
  sass: "css",
  less: "css",
  html: "markup",
  xml: "markup",
  vue: "markup",
  svelte: "markup",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  yml: "yaml",
  jsonc: "json",
  golang: "go",
  "c++": "cpp",
  "objective-c": "objectivec",
};

/** 이 alias 로 하이라이팅이 가능한가 */
export function resolveGrammar(alias: string) {
  const name = ALIAS[alias] ?? alias;
  const grammar = Prism.languages[name];
  return typeof grammar === "object" ? { name, grammar } : null;
}

export interface HighlightResult {
  /** 하이라이팅된 HTML (Prism 이 자체 이스케이프한다). 문법을 못 찾으면 이스케이프만 된 평문 */
  html: string;
  /** 라벨/클래스에 쓸 언어명 — 사용자가 적었으면 그대로, 추론했으면 추론값, 없으면 "" */
  lang: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 코드 → 하이라이팅된 HTML.
 *  언어를 안 적었으면 휴리스틱으로 추론한다 — hljs 의 highlightAuto 를 대신하는 자리다
 *  (Prism 엔 자동감지가 없어서, 안 하면 ``` 만 친 블록은 색이 하나도 안 붙는다). */
export function highlightCode(text: string, rawLang?: string): HighlightResult {
  const alias = normalizeLangAlias(rawLang);
  const resolved = alias ? resolveGrammar(alias) : null;
  if (resolved) {
    return { html: Prism.highlight(text, resolved.grammar, resolved.name), lang: alias };
  }

  // 언어 미지정 → 추론
  if (!alias) {
    const guess = detectCodeLanguage(text);
    const g = guess ? resolveGrammar(guess) : null;
    if (g && guess) {
      return { html: Prism.highlight(text, g.grammar, g.name), lang: guess };
    }
  }

  // 알 수 없는 언어 — 색 없이 평문. 사용자가 적은 라벨은 그대로 살린다.
  return { html: escapeHtml(text), lang: alias };
}
