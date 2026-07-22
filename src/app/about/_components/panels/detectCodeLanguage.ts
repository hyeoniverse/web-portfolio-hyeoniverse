/* 코드 블록 하이라이팅 언어 판별.
 *
 * 이 값은 독자에게 노출되지 않고 prism 이 토큰을 나누는 기준으로만 쓰인다.
 * 보이지도 않는 값을 admin 이 매번 고르게 할 이유가 없어서 코드에서 추론한다.
 * 틀려도 색만 어긋나므로 신호가 확실한 것부터 위에서 걸러내고, 마지막은 JS 계열로 떨어뜨린다.
 * (typescript 문법은 plain JS 의 상위집합이라 JS 코드도 정상 토큰화된다) */

const JSX_TAG = /<[A-Za-z][\w.]*[\s/>]|<\/[A-Za-z]/;
const SQL_HEAD = /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|POLICY)|ALTER\s+TABLE)\b/im;
const CSS_RULE = /^\s*(@media|@keyframes|@import|[.#][\w-]+\s*(,|\{)|:root\s*\{)/m;
const SHELL_HEAD = /^\s*(#!\/|\$\s|npm |npx |yarn |pnpm |git |docker |supabase )/m;

export function detectCodeLanguage(code: string): string {
  if (!code.trim()) return "tsx";
  if (JSX_TAG.test(code)) return "tsx";
  if (SQL_HEAD.test(code)) return "sql";
  if (SHELL_HEAD.test(code)) return "bash";
  /* CSS 판별은 JS 오탐이 나기 쉬워서, JS 키워드가 하나도 없을 때만 인정 */
  if (CSS_RULE.test(code) && !/\b(const|let|var|function|return|import|export)\b/.test(code)) {
    return "css";
  }
  return "typescript";
}
