import { describe, it, expect } from "vitest";
import { readmeToMarkdown } from "@/lib/readmeMarkdown";

/* README 는 조직 저장소처럼 남이 쓴 글일 수 있고, 본문 렌더러는 결과를 innerHTML 로 넣는다.
   그래서 HTML 이 한 조각도 남지 않아야 하고, 수상한 주소는 죽어 있어야 한다(#1062). */

const src = { owner: "me", name: "alpha", branch: "main" };
const run = (md: string) => readmeToMarkdown(md, src);

describe("readmeToMarkdown", () => {
  it("글이 아닌 태그는 내용까지 지운다", () => {
    const out = run("# 제목\n\n<script>alert(1)</script>\n<style>body{display:none}</style>\n본문");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("display:none");
    expect(out).toContain("# 제목");
    expect(out).toContain("본문");
  });

  it("남은 태그는 모두 지운다 — HTML 이 없으면 새는 구멍도 없다", () => {
    const out = run('<div align="center"><b>굵게</b></div>\n<img src="x.png" onerror="alert(1)">');
    expect(out).not.toMatch(/<[^>]+>/);
    expect(out).not.toContain("onerror");
  });

  it("가운데 정렬한 img 머리글은 마크다운 그림으로 옮긴다", () => {
    const out = run('<div align="center">\n<img src="docs/logo.png" alt="로고" width="200">\n</div>');
    expect(out).toContain("![로고](https://raw.githubusercontent.com/me/alpha/main/docs/logo.png)");
  });

  it("a 태그는 링크로, 주소가 수상하면 글자만 남긴다", () => {
    expect(run('<a href="https://example.com">사이트</a>')).toContain("[사이트](https://example.com)");
    expect(run('<a href="javascript:alert(1)">눌러</a>')).toBe("눌러");
  });

  it("상대경로 그림은 저장소의 raw 주소로 펴 준다", () => {
    expect(run("![그림](./assets/a.png)")).toContain("https://raw.githubusercontent.com/me/alpha/main/assets/a.png");
    // 절대주소는 그대로
    expect(run("![그림](https://img.shields.io/badge.svg)")).toContain("https://img.shields.io/badge.svg");
  });

  it("마크다운 문법으로 들어온 수상한 주소도 막는다", () => {
    expect(run("[눌러](javascript:alert(1))")).not.toContain("javascript:");
    expect(run("![x](javascript:alert(1))")).not.toContain("javascript:");
  });

  it("alt 에 넣은 따옴표·대괄호는 없애 속성을 벗어나지 못하게 한다", () => {
    const out = run('<img src="a.png" alt=\'" onerror="alert(1)\'>');
    expect(out).not.toContain("onerror=\"");
    expect(out).not.toContain('"');
  });

  it("코드블록과 목록은 그대로 둔다", () => {
    const md = "## 설치\n\n```bash\nnpm i\n```\n\n- 하나\n- 둘";
    const out = run(md);
    expect(out).toContain("```bash");
    expect(out).toContain("npm i");
    expect(out).toContain("- 하나");
  });
});
