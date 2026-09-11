import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BoldMarks from "@/components/ui/BoldMarks";

/* 번역 문구의 <b>…</b> 만 굵게 그리고, 나머지는 글자 그대로 둔다. */

describe("BoldMarks", () => {
  it("<b> 로 표시한 자리마다 굵게 그린다", () => {
    const html = renderToStaticMarkup(<BoldMarks text="태그 <b>3개</b>가 게시물 <b>12건</b>에서 사용 중입니다." />);
    expect(html).toBe("태그 <strong>3개</strong>가 게시물 <strong>12건</strong>에서 사용 중입니다.");
  });

  it("다른 태그는 HTML 로 해석하지 않고 글자로 둔다", () => {
    const html = renderToStaticMarkup(<BoldMarks text={'<b><img src=x></b> <i>y</i>'} />);
    expect(html).toBe("<strong>&lt;img src=x&gt;</strong> &lt;i&gt;y&lt;/i&gt;");
  });
});
