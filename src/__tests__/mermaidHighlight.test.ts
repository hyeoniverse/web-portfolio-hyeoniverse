import { describe, expect, it } from "vitest";
import { highlightCode } from "@/utils/prismHighlight";

/* 다이어그램 블록의 코드 보기 — mermaid 문법에 색이 붙는지 */
describe("mermaid 하이라이트", () => {
  it("종류 · 방향 · 문자열 · 라벨 · 화살표 · 주석에 토큰이 붙는다", () => {
    const { html, lang } = highlightCode('%% 메모\nflowchart LR\n  a["로그인"] -->|통과| b(["세션"])', "mermaid");
    expect(lang).toBe("mermaid");
    expect(html).toContain('<span class="token comment">%% 메모</span>');
    expect(html).toContain('<span class="token keyword">flowchart</span>');
    expect(html).toContain('<span class="token builtin">LR</span>');
    expect(html).toContain('<span class="token string">"로그인"</span>');
    expect(html).toContain('<span class="token attr-value">|통과|</span>');
    expect(html).toContain('<span class="token operator">--></span>');
  });
});
