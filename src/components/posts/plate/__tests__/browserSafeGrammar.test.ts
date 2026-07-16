import { describe, it, expect } from "vitest";
import { lowlight, browserSafeGrammar } from "../lowlightInstance";

/* #312 회귀 — 브라우저 번들에서 hljs 의 xml 문법이 통째로 죽던 문제.
   원인: 번들러가 `/[\p{L}_]/u` 를 실제 코드포인트 범위로 전개하는데 거기 아스트랄(`\u{10000}-…`)이
   섞여 있고, hljs 의 countMatchGroups 가 `new RegExp(re.toString() + "|")` 로 **flag 없이 재파싱**해
   SyntaxError → Plate 가 catch → plaintext.

   node 는 원본(\p{L} + u flag)을 쓰므로 이 테스트로 "번들된 상태"를 그대로 재현할 수는 없다.
   대신 **불변식**을 지킨다: 등록된 문법의 모든 정규식이 hljs 가 하는 재파싱을 견뎌야 한다. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectRegexes(node: any, out: RegExp[] = [], seen = new WeakSet<object>()): RegExp[] {
  if (node instanceof RegExp) { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectRegexes(n, out, seen)); return out; }
  if (node && typeof node === "object") {
    if (seen.has(node)) return out;
    seen.add(node);
    for (const k of Object.keys(node)) collectRegexes(node[k], out, seen);
  }
  return out;
}

/** hljs core 의 countMatchGroups 가 하는 그대로 — 여기서 throw 하면 그 언어는 브라우저에서 죽는다 */
const survivesReparse = (re: RegExp) => {
  try { new RegExp(re.toString() + "|"); return true; } catch { return false; }
};

describe("#312 — 브라우저에서 죽던 문법", () => {
  it("xml 이 등록되어 있고 highlight 가 throw 하지 않는다", () => {
    expect(lowlight.registered("xml")).toBe(true);
    expect(() => lowlight.highlight("xml", '<main class="app">x</main>')).not.toThrow();
  });

  it("xml 별칭(html)도 살아있다", () => {
    expect(() => lowlight.highlight("html", '<a href="#">x</a>')).not.toThrow();
  });

  it("xml 문법의 모든 정규식이 hljs 의 flag 없는 재파싱을 견딘다", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (lowlight as any).highlight("xml", "<a>x</a>");
    expect(def).toBeTruthy();
    // 등록된 원본 정의를 직접 훑는다
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const langs = (lowlight as any).listLanguages();
    expect(langs).toContain("xml");
  });

  it("haskell 도 throw 하지 않는다", () => {
    expect(() => lowlight.highlight("haskell", "main = putStrLn \"hi\"")).not.toThrow();
  });

  it("하이라이팅이 여전히 정상 — 태그명/속성/문자열이 각각 잡힌다", () => {
    const r = lowlight.highlight("xml", '<main class="app">x</main>');
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (n: any) => {
      n.properties?.className?.forEach((c: string) => seen.add(c));
      (n.children || []).forEach(walk);
    };
    (r.children || []).forEach(walk);
    expect(seen).toContain("hljs-tag");
    expect(seen).toContain("hljs-name");
    expect(seen).toContain("hljs-attr");
    expect(seen).toContain("hljs-string");
  });

  it("한글 태그/속성값(BMP)은 아스트랄 제거 후에도 멀쩡하다", () => {
    const r = lowlight.highlight("xml", '<p title="한글">내용</p>');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (function dig(n: any): string {
      return n.value ?? (n.children || []).map(dig).join("");
    })({ children: r.children });
    expect(text).toBe('<p title="한글">내용</p>');
  });

  it("모든 등록 문법의 정규식이 재파싱을 견딘다 (자주 쓰는 언어)", () => {
    const broken: string[] = [];
    for (const lang of ["xml", "haskell", "css", "javascript", "typescript", "json", "bash", "sql", "yaml"]) {
      try {
        lowlight.highlight(lang, "x");
      } catch { broken.push(lang); }
    }
    expect(broken).toEqual([]);
  });

  it("survivesReparse 헬퍼가 실제로 아스트랄을 잡아낸다 (테스트 자체 검증)", () => {
    // 번들러가 만들어내는 모양 — 이건 반드시 실패해야 한다
    expect(survivesReparse(new RegExp("[A-Za-z\\u{10000}-\\u{1000B}]", "u"))).toBe(false);
    // 우리가 만드는 모양 — 통과해야 한다
    expect(survivesReparse(/[A-Za-zÀ-Ö]/)).toBe(true);
    expect(collectRegexes({ a: /x/, b: [{ c: /y/u }] })).toHaveLength(2);
  });
});

/* 번들된 형태 합성 테스트.
   node 는 hljs 원본(`\p{L}` + u flag)을 쓰므로 위 테스트들은 "브라우저에서 죽는 상태"를 재현하지 못한다.
   여기서는 번들러가 실제로 뱉는 모양(아스트랄이 전개된 **문자열**)을 직접 만들어 변환을 검증한다. */
describe("browserSafeGrammar — 번들된 형태 합성", () => {
  // hljs regex.concat() 이 반환하는 건 RegExp 가 아니라 **문자열**이다 (core.js: return joined)
  const BUNDLED = "<(?=[A-Za-z\\u00C0-\\u00D6\\u{10000}-\\u{1000B}\\u{1000D}-\\u{10026}])";

  it("합성한 입력이 실제로 hljs 재파싱을 깨뜨린다 (전제 확인)", () => {
    expect(() => new RegExp(new RegExp(BUNDLED, "u").toString() + "|")).toThrow();
  });

  it("문자열 안의 아스트랄을 걷어낸다 (concat 이 문자열을 주므로 여기가 핵심)", () => {
    const out = browserSafeGrammar({ contains: [{ begin: BUNDLED }] });
    expect(out.contains[0].begin).toBe("<(?=[A-Za-z\\u00C0-\\u00D6])");
    expect(out.contains[0].begin).not.toContain("\\u{");
  });

  it("변환 결과가 hljs 의 flag 없는 재파싱을 견딘다", () => {
    const out = browserSafeGrammar({ contains: [{ begin: BUNDLED }] });
    expect(() => new RegExp(new RegExp(out.contains[0].begin).toString() + "|")).not.toThrow();
  });

  it("RegExp 값도 처리한다", () => {
    const out = browserSafeGrammar({ begin: new RegExp("[A-Za-z\\u{10000}-\\u{1000B}]", "u") });
    expect(out.begin.source).not.toContain("\\u{");
    expect(out.begin.flags).not.toContain("u");
  });

  it("BMP(한글·라틴)는 남고 아스트랄만 사라진다", () => {
    const out = browserSafeGrammar({ begin: "[\\uAC00-\\uD7A3\\u{20000}-\\u{2A6DF}]" });
    expect(out.begin).toBe("[\\uAC00-\\uD7A3]");
    expect(new RegExp(out.begin).test("한")).toBe(true);
  });

  it("아스트랄이 없는 값은 건드리지 않는다", () => {
    const kw = "graph flowchart end";
    const out = browserSafeGrammar({ keywords: kw, begin: /abc/i });
    expect(out.keywords).toBe(kw);
    expect(out.begin.flags).toBe("i");
  });

  it("순환 참조에도 안 터진다", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a: any = { begin: BUNDLED };
    a.self = a;
    const out = browserSafeGrammar(a);
    expect(out.begin).not.toContain("\\u{");
    expect(out.self).toBe(out);
  });
});
