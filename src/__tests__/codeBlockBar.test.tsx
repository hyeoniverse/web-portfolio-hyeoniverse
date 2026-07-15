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
});
