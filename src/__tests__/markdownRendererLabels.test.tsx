import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/providers/LanguageProvider";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

/* 코드블록 토글 라벨은 marked 렌더러(모듈 스코프)가 만들고 번역값은 컴포넌트 안에만 있다.
   예전엔 모듈 변수를 parse 직전에 덮어썼는데, 서버에서 모듈 상태가 요청 사이에 공유돼
   다른 언어 요청의 라벨이 섞일 수 있었다. 지금은 자리표시자를 parse 뒤에 치환한다.
   여기서 보는 건 effect 가 돌기 전 최초 HTML — attachCodeWrapToggle 이 라벨을 다시 그리므로
   클라이언트 DOM 만 보면 치환이 빠져도 티가 안 난다. */
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

  it("라벨이 번역값으로 채워진다", () => {
    const html = markup(md);
    const scroll = [ko.common.codeScroll, en.common.codeScroll];
    const wrap = [ko.common.codeWrap, en.common.codeWrap];
    expect(scroll.some((v) => html.includes(`↔ ${v}`))).toBe(true);
    expect(wrap.some((v) => html.includes(`↩ ${v}`))).toBe(true);
  });

  it("본문에 코드블록이 없으면 토글 버튼도 없다", () => {
    expect(markup("그냥 문단입니다.\n")).not.toContain("data-wrap-btn");
  });
});
