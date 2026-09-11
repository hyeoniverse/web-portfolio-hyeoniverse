import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { getEquationHtml } from "@platejs/math";

/* KaTeX 는 한 벌만 싣는다. @platejs/math 는 katex 를 0.16.22 로 못 박아 두어, 이 저장소의 0.17 과 따로
   설치되면 글 편집기에 KaTeX 가 두 벌(원본 합계 520 KB 남짓) 들어갔다. package.json 의 overrides 로
   @platejs/math 도 루트 katex 를 쓰게 했다. overrides 가 빠지면 이 검사가 먼저 알린다. */

describe("KaTeX 한 벌", () => {
  it("@platejs/math 가 루트 katex 를 쓴다", () => {
    const req = createRequire(import.meta.url);
    const fromMath = createRequire(req.resolve("@platejs/math"));
    expect(fromMath.resolve("katex")).toBe(req.resolve("katex"));
  });

  it("@platejs/math 의 수식 렌더가 그 katex 로 그대로 돈다", () => {
    const html = getEquationHtml({
      element: { texExpression: "x^2 + y^2 = z^2" } as never,
      options: { displayMode: true, throwOnError: true },
    });
    expect(html).toContain("katex-display");
  });
});
