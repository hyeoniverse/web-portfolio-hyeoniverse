import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { PostArticleBody, type PostArticleData } from "@/components/posts/PostArticleView";
import { highlightRichtextCode } from "@/utils/highlightRichtext";
import { slateToHtml } from "@/components/posts/plateSerializer";
import { attachCodeWrapToggle } from "@/components/posts/highlightCodeBlocks";

function makeData(content: string, contentType: "markdown" | "richtext"): PostArticleData {
  return {
    displayTitle: "t",
    displayContent: content,
    displayExcerpt: "",
    contentType,
    tags: [],
    viewCount: 0,
    createdAt: new Date().toISOString(),
  };
}

const labels = { wrap: "Wrap", scroll: "Scroll", wrapTitle: "wt", scrollTitle: "st", copy: "Copy", copied: "Copied" };

describe("code block copy bar", () => {
  it("richtext: every code block (lang + no-lang) gets a copy button", async () => {
    const doc = [
      { type: "code_block", lang: "js", children: [{ type: "code_line", children: [{ text: "const a=1;" }] }] },
      { type: "p", children: [{ text: "x" }] },
      { type: "code_block", children: [{ type: "code_line", children: [{ text: "no lang" }] }] },
    ];
    const highlighted = await highlightRichtextCode(slateToHtml(doc as never));
    const { container } = render(
      <LanguageProvider><PostArticleBody data={makeData(highlighted, "richtext")} /></LanguageProvider>
    );
    await waitFor(() => {
      expect(container.querySelectorAll("pre").length).toBe(2);
      expect(container.querySelectorAll("[data-copy-btn]").length).toBe(2);
    }, { timeout: 3000 });
  });

  // 회귀: 미리보기/works 처럼 부모가 proseViewerRef 를 안 넘겨도 markdown 코드블록이 복사 버튼을 받아야 한다.
  it("markdown WITHOUT proseViewerRef: still gets copy buttons (lang + no-lang)", async () => {
    const md = "```js\nconst a=1;\n```\n\ntext\n\n```\nno lang line\n```\n";
    const { container } = render(
      <LanguageProvider><PostArticleBody data={makeData(md, "markdown")} /></LanguageProvider>
    );
    await waitFor(() => {
      expect(container.querySelectorAll("pre").length).toBe(2);
      expect(container.querySelectorAll("[data-copy-btn]").length).toBe(2);
    }, { timeout: 3000 });
  });

  it("attachCodeWrapToggle: multiple <pre> in one wrap each get a bar; mermaid skipped; idempotent", () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="code-block-wrap"><pre><code>a</code></pre><pre><code>b</code></pre></div>
        <div class="code-block-wrap"><pre><code class="language-mermaid">graph TD;A--&gt;B</code></pre></div>
      </div>`;
    const root = document.getElementById("root")!;
    attachCodeWrapToggle(root, labels);
    attachCodeWrapToggle(root, labels); // 재실행해도 중복 주입 없어야 함

    // 두 개의 일반 pre 각각 바 1개 → 총 2, mermaid 는 0
    expect(root.querySelectorAll(".code-block-bar").length).toBe(2);
    expect(root.querySelectorAll("[data-copy-btn]").length).toBe(2);
    // mermaid wrap 에는 바가 없어야 함
    const mermaidWrap = root.querySelectorAll(".code-block-wrap")[1];
    expect(mermaidWrap.querySelector(".code-block-bar")).toBeNull();
  });

  // 터미널풍 바 — 신호등(::before)은 CSS 라 DOM 엔 안 나오지만, margin-right:auto 로 컨트롤을
  // 오른쪽 끝에 미는 "첫 요소"(라벨 또는 빈 스페이서)가 라벨 유무와 무관하게 항상 존재해야 한다.
  it("바의 첫 요소가 라벨 유무와 무관하게 존재한다 (컨트롤 우측 정렬 보장)", () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="code-block-wrap"><pre><code class="language-js">x</code></pre></div>
        <div class="code-block-wrap"><pre><code>plain</code></pre></div>
      </div>`;
    const root = document.getElementById("root")!;
    attachCodeWrapToggle(root, labels);

    const bars = root.querySelectorAll(".code-block-bar");
    expect(bars.length).toBe(2);
    for (const bar of bars) {
      // 바의 첫 자식 = 신호등 다음 첫 요소(::before 는 DOM 자식이 아니므로 firstElementChild).
      // 라벨(js) 또는 빈 스페이서 — 둘 중 하나는 반드시 있어야 controls 가 우측으로 밀린다.
      const first = bar.firstElementChild;
      expect(first).not.toBeNull();
      const controls = bar.querySelector(".code-block-controls");
      expect(controls).not.toBeNull();
      // 첫 요소는 controls 가 아니어야 한다 (controls 앞에 스페이서가 있어야 함)
      expect(first).not.toBe(controls);
    }
    // 라벨 있는 첫 블록은 code-lang-label, 없는 둘째는 빈 span
    expect(bars[0].querySelector(".code-lang-label")?.textContent).toBe("js");
    expect(bars[1].querySelector(".code-lang-label")).toBeNull();
  });
});
