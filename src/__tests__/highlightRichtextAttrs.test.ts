import { describe, it, expect } from "vitest";
import { highlightRichtextCode } from "@/utils/highlightRichtext";

/* 서버 Shiki 는 pre 에 속성이 붙은 블록도 칠해야 한다. 예전 식은 속성 없는 <pre> 만 잡아서, 줄바꿈 상태가 붙은 블록과
   data-lenis-prevent 가 붙은 블록(그 시절 저장 HTML)이 색 없이 나갔다. data-lenis-prevent 는 리더에서 떼어 낸다 —
   달려 있으면 Lenis 가 코드블록 위의 휠을 통째로 무시해 블록 끝에서 페이지가 이어서 내려가지 않는다. */

describe("highlightRichtextCode — pre 속성", () => {
  it("data-lenis-prevent 가 붙은 블록도 칠하고, 그 속성은 뗀다", async () => {
    const out = await highlightRichtextCode(`<div class="code-block-wrap"><pre data-lenis-prevent><code class="language-ts">const a = 1;</code></pre></div>`);
    expect(out).toContain('class="shiki');
    expect(out).toContain('data-lang="ts"');
    expect(out).not.toContain("data-lenis-prevent");
  });

  it("줄바꿈 상태(data-wrap + white-space)는 Shiki 의 pre 로 옮긴다", async () => {
    const out = await highlightRichtextCode(
      `<pre data-lenis-prevent data-wrap="true" style="white-space:pre-wrap;word-break:break-all"><code class="language-js">let x = 1;</code></pre>`,
    );
    const pre = /^<pre[^>]*>/.exec(out)?.[0] ?? "";
    expect(pre).toContain('data-wrap="true"');
    expect(pre).toMatch(/style="[^"]*white-space:pre-wrap;word-break:break-all"/);
    expect(pre.match(/style="/g)?.length, "style 속성은 하나로 합친다").toBe(1);
  });

  it("mermaid 는 칠하지 않고 원본을 두되 data-lenis-prevent 는 뗀다", async () => {
    const out = await highlightRichtextCode(`<pre data-lenis-prevent data-graph-view="split"><code class="language-mermaid">graph TD;A--&gt;B</code></pre>`);
    expect(out).toBe(`<pre data-graph-view="split"><code class="language-mermaid">graph TD;A--&gt;B</code></pre>`);
  });

  it("속성 없는 블록은 예전과 같이 칠한다", async () => {
    const out = await highlightRichtextCode(`<pre><code class="language-css">a { color: red; }</code></pre>`);
    expect(out).toContain('class="shiki');
    expect(out).toContain('data-lang="css"');
  });
});
