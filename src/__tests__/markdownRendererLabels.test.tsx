import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/providers/LanguageProvider";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

/* 코드블록의 복사 · 줄바꿈 단추는 attachCodeWrapToggle 이 블록 위 바에 런타임으로 단다.
   marked 렌더러가 pre 아래에 단추를 따로 심으면 블록 아래에 '↔ 스크롤' 이 하나 더 보였다.
   여기서 보는 건 effect 가 돌기 전 최초 HTML — 단추도, 예전 라벨 자리표시자도 없어야 한다. */
const SENTINELS = /[\uE000\uE001]/;

function markup(content: string) {
  return renderToStaticMarkup(
    <LanguageProvider>
      <MarkdownRenderer content={content} />
    </LanguageProvider>,
  );
}

describe("MarkdownRenderer 코드블록 토글 라벨", () => {
  const md = "```js\nconst a = 1;\n```\n";

  it("최초 HTML 에 자리표시자가 남지 않는다", () => {
    expect(markup(md)).not.toMatch(SENTINELS);
  });

  it("최초 HTML 에 블록 아래 줄바꿈 단추를 심지 않는다", () => {
    const html = markup(md);
    expect(html).toContain("code-block-wrap");
    expect(html).not.toContain("data-wrap-btn");
    for (const v of [ko.common.codeScroll, en.common.codeScroll]) expect(html).not.toContain(`↔ ${v}`);
  });

  it("본문에 코드블록이 없으면 토글 버튼도 없다", () => {
    expect(markup("그냥 문단입니다.\n")).not.toContain("data-wrap-btn");
  });
});
