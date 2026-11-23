import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderMarkdown } from "@/components/posts/renderMarkdown";
import { renderCaption, splitImageFloat } from "@/components/posts/markdownExtensions";
import { extractHeadings } from "@/utils/headingUtils";

/* MacFolio 블로그 글의 표기를 이 저장소의 마크다운 렌더러(renderMarkdown)가 읽는지 본다.
   표기마다 한 묶음, 끝에 실제 글 발췌(fixtures/macfolio)를 통째로 그려 깨진 표기가 남지 않는지 본다. */

const render = (md: string) => renderMarkdown(md);
/** 코드 · 수식 밖의 글자만 — 남은 표기를 찾을 때 */
const visibleText = (html: string) => {
  let text = html
    .replace(/<pre[\s\S]*?<\/pre>/g, "")
    .replace(/<code[\s\S]*?<\/code>/g, "")
    .replace(/<span class="katex[\s\S]*?<\/annotation>/g, "");
  // 태그를 지운 자리에 새 태그가 생기지 않을 때까지 되풀이한다 (한 번만 지우면 `<scr<x>ipt>` 같은 조각이 남는다)
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, "");
  } while (text !== previous);
  return text.replace(/[<>]/g, "");
};

describe("형광펜 ==글자==", () => {
  it("<mark> 로 그린다", () => {
    expect(render("앞 ==강조== 뒤")).toContain("앞 <mark>강조</mark> 뒤");
  });

  it("안의 다른 서식도 그린다", () => {
    expect(render("==**굵게**와 `코드`==")).toContain("<mark><strong>굵게</strong>와 <code>코드</code></mark>");
  });

  it("코드로 시작해도 짝을 찾는다", () => {
    expect(render("==`strcat`은 확인하지 않고== 넘친다")).toContain("<mark><code>strcat</code>은 확인하지 않고</mark> 넘친다");
  });

  it("코드 안의 == 는 글자 그대로", () => {
    const html = render("`a == b` 와 `x==y==z`");
    expect(html).not.toContain("<mark>");
    expect(html).toContain("<code>x==y==z</code>");
  });

  it("코드 블록 안의 == 도 그대로", () => {
    expect(render("```js\nif (a == b) {}\n```")).not.toContain("<mark>");
  });

  it("공백을 사이에 둔 == 는 형광펜이 아니다", () => {
    expect(render("a == b 이고 c == d")).not.toContain("<mark>");
    expect(render("### == 와 equals")).not.toContain("<mark>");
  });

  it("짝이 없으면 글자로 남는다", () => {
    expect(render("==열기만")).toContain("==열기만");
  });
});

describe("콜아웃 사용자 제목 > [!NOTE] 제목", () => {
  const titleOf = (html: string) => /<p class="markdown-alert-title"[^>]*>(?:<svg[\s\S]*?<\/svg>)([\s\S]*?)<\/p>/.exec(html)?.[1];

  it("같은 줄 글자를 제목으로, 본문은 그 아래", () => {
    const html = render("> [!NOTE] Heath의 정리\n> 본문 첫 줄\n> 둘째 줄");
    expect(html).toContain('class="markdown-alert markdown-alert-note"');
    expect(titleOf(html)).toBe("Heath의 정리");
    expect(html).toContain("data-custom-title");
    expect(html).toContain("<p>본문 첫 줄<br>둘째 줄</p>");
    expect(html).not.toContain("[!NOTE]");
  });

  it("다섯 종류 모두", () => {
    for (const kind of ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]) {
      const html = render(`> [!${kind}] 제목 ${kind}\n> 본문`);
      expect(html).toContain(`markdown-alert-${kind.toLowerCase()}`);
      expect(titleOf(html)).toBe(`제목 ${kind}`);
    }
  });

  it("제목만 있고 본문이 다음 문단이어도", () => {
    const html = render("> [!TIP] 팁 제목\n>\n> 다음 문단");
    expect(titleOf(html)).toBe("팁 제목");
    expect(html).toContain("<p>다음 문단</p>");
    expect(html).not.toMatch(/<p>\s*<\/p>/);
  });

  it("제목만 있는 콜아웃", () => {
    const html = render("> [!IMPORTANT] 제목뿐");
    expect(titleOf(html)).toBe("제목뿐");
  });

  it("제목 안의 인라인 서식을 그린다", () => {
    const html = render("> [!NOTE] 편집기와 `tsc`의 TypeScript 버전\n> 본문");
    expect(titleOf(html)).toBe("편집기와 <code>tsc</code>의 TypeScript 버전");
    expect(html).toContain("<p>본문</p>");
  });

  it("제목의 HTML 특수문자는 이스케이프된다", () => {
    const html = render("> [!NOTE] a < b & c\n> 본문");
    expect(titleOf(html)).toBe("a &lt; b &amp; c");
  });

  it("제목이 없으면 기본 제목 그대로(기존 글)", () => {
    const html = render("> [!WARNING]\n> 본문");
    expect(titleOf(html)).toBe("Warning");
    expect(html).not.toContain("data-custom-title");
    expect(html).toContain("<p>본문</p>");
  });

  it("표시가 없는 인용은 그대로", () => {
    expect(render("> 그냥 인용")).toContain("<blockquote>\n<p>그냥 인용</p>\n</blockquote>");
  });
});

describe("인라인 코드 언어 꼬리표 `코드{:언어}`", () => {
  it("꼬리표를 떼고 그 언어로 하이라이트한다", () => {
    const html = render("`SELECT * FROM t{:sql}`");
    expect(html).toContain('<code class="language-sql" data-inline-hl="1">');
    expect(html).toContain('<span class="token keyword">SELECT</span>');
    expect(html).not.toContain("{:sql}");
  });

  it("c · bash · python", () => {
    expect(render("`int x = 1;{:c}`")).toContain('class="language-c"');
    expect(render("`npm install{:bash}`")).toContain('class="language-bash"');
    expect(render("`print(1){:python}`")).toContain('class="language-python"');
  });

  it("코드 속 HTML 특수문자는 이스케이프된다", () => {
    const html = render("`a < b && c{:c}`");
    expect(html).not.toContain("a < b");
    expect(html).toContain("&lt;");
  });

  it("모르는 언어면 꼬리표까지 글자 그대로", () => {
    expect(render("`foo{:nolang}`")).toContain("<code>foo{:nolang}</code>");
  });

  it("꼬리표가 없으면 예전과 같다", () => {
    expect(render("`plain`")).toContain("<code>plain</code>");
  });

  it("목차 글자 · id 에서도 꼬리표를 뗀다", () => {
    const [h] = extractHeadings("## `SELECT{:sql}` 문", true);
    expect(h.text).toBe("`SELECT` 문");
    expect(render("## `SELECT{:sql}` 문")).toContain(`id="${h.id}"`);
  });
});

describe("수식", () => {
  it("`식{:math}` 은 KaTeX 인라인", () => {
    const html = render("값 `x^2{:math}` 끝");
    expect(html).toContain('<span class="katex">');
    expect(html).not.toContain("katex-display");
    expect(html).not.toContain("{:math}");
  });

  it("```math 는 KaTeX 블록", () => {
    const html = render("```math\n\\sigma_{A}(R)\n```");
    expect(html).toContain("katex-display");
    expect(html).not.toContain("code-block-wrap");
  });

  it("잘못된 식은 페이지를 깨지 않고 오류 표시", () => {
    expect(render("`\\frac{{:math}`")).toContain("katex-error");
  });

  it("$ 수식(기존 표기)은 그대로", () => {
    expect(render("수식 $x^2$ 끝")).toContain('<span class="katex">');
  });

  it("일반 $ 글자는 수식이 되지 않는다", () => {
    for (const md of ["가격은 $5 이고 $10 이다", "변수 $HOME 과 $PATH", "A-Z, 0-9, _, $, # 만 쓴다", "야 ㅂ##$#$!$!!##$ㅅ아"]) {
      expect(render(md)).not.toContain("katex");
    }
  });

  it("조사가 붙은 $p$ 뒤를 한 수식으로 묶지 않는다(오류 대신 뒤의 온전한 식만)", () => {
    const html = render("프리픽스가 $p$이면 블록 크기는 $2^{32-p}$, 끝");
    expect(html).not.toContain("katex-error");
    expect(html).toContain("$p$이면");
    expect(html).toContain('<span class="katex">');
  });
});

describe("한국어 사이 굵게 · 기울임", () => {
  it("닫는 ** 앞이 문장부호이고 뒤가 한글이어도 굵게", () => {
    expect(render("**취소(cancelled)**가 된다")).toContain("<strong>취소(cancelled)</strong>가 된다");
  });

  it("여는 ** 앞이 한글이고 뒤가 문장부호여도 굵게", () => {
    expect(render("이것은**(중요)**하다")).toContain("이것은<strong>(중요)</strong>하다");
  });

  it("기울임도", () => {
    expect(render("*취소(cancelled)*가")).toContain("<em>취소(cancelled)</em>가");
  });

  it("표준 규칙으로 되는 경우는 예전과 같다", () => {
    expect(render("**굵게** 그리고 *기울임*")).toContain("<strong>굵게</strong> 그리고 <em>기울임</em>");
    expect(render("**한글**조사")).toContain("<strong>한글</strong>조사");
  });

  it("영어 사이의 같은 모양은 바꾸지 않는다(CommonMark 그대로)", () => {
    expect(render("**foo(bar)**baz")).toBe(renderMarkdown("**foo(bar)**baz"));
    expect(render("**foo(bar)**baz")).not.toContain("<strong>");
  });

  it("코드 안의 ** 는 건너뛴다", () => {
    expect(render("**`a**b`(x)**가")).toContain("<strong><code>a**b</code>(x)</strong>가");
  });
});

describe("물결", () => {
  it("물결 하나는 취소선이 아니다", () => {
    const html = render("/25~/30 이고 220~440px, 380~640px");
    expect(html).not.toContain("<del>");
    expect(html).toContain("/25~/30");
  });

  it("~~ 두 개는 취소선", () => {
    expect(render("~~지움~~ 남김")).toContain("<del>지움</del> 남김");
  });
});

describe("그림 캡션 링크 · 좌우 배치", () => {
  it("캡션 안 [글자](https://…) 를 링크로", () => {
    const html = render("![사진](/a.jpg '사진: [Unsplash](https://unsplash.com/p/1)의 작가')");
    expect(html).toContain(
      '<figcaption>사진: <a href="https://unsplash.com/p/1" target="_blank" rel="noopener noreferrer">Unsplash</a>의 작가</figcaption>',
    );
  });

  it("http(s) 가 아닌 링크는 글자로 둔다", () => {
    expect(renderCaption("[x](javascript:alert(1))")).toBe("[x](javascript:alert(1))");
  });

  it("캡션 · alt 의 HTML 은 이스케이프된다", () => {
    expect(renderCaption('<img src=x onerror="alert(1)">')).not.toContain("<img");
    const html = render('![a" onerror="alert(1)](/a.jpg)');
    expect(html).not.toContain('onerror="alert(1)"');
  });

  it("#float-right · #float-left 조각을 떼고 배치로", () => {
    const html = render("![사람](./images/a.jpg#float-right '캡션')");
    expect(html).toContain('<figure data-float="right">');
    expect(html).toContain('src="/./images/a.jpg"');
    expect(html).not.toContain("#float-right");
    expect(render("![사람](/b.png#float-left)")).toContain('data-float="left"');
    expect(splitImageFloat("/c.png#top")).toEqual({ src: "/c.png#top", float: null });
  });
});

describe("<details><summary>", () => {
  it("접기 블록과 안의 마크다운을 그린다", () => {
    const html = render("<details>\n<summary>풀이 보기</summary>\n\n안의 **굵게**\n\n</details>");
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>풀이 보기</summary>");
    expect(html).toContain("<strong>굵게</strong>");
    expect(html).toContain("</details>");
  });
});

describe("기존 글 렌더링 유지", () => {
  it("기본 설정(breaks · 각주 · 표 · 코드 블록 · 제목 id)", () => {
    const html = render("# 제목 하나\n\n첫 줄\n둘째 줄[^1]\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n[^1]: 각주");
    expect(html).toContain('<h1 id="제목-하나">제목 하나</h1>');
    expect(html).toContain("첫 줄<br>둘째 줄");
    expect(html).toContain("<table>");
    expect(html).toContain('<div class="code-block-wrap"><pre><code class="language-js">');
    expect(html).toContain('data-label="1"');
  });

  it("그림 · 캡션 · 상대 경로 · 커서 힌트", () => {
    expect(render("![image](a.png)")).toContain('<img data-cursor="zoom" src="/a.png" alt="image" />');
    expect(render("![설명](/b.png \"캡션\")")).toContain(
      '<figure><img data-cursor="zoom" src="/b.png" alt="설명" /><figcaption>캡션</figcaption></figure>',
    );
  });

  it("첨부 카드", () => {
    expect(render("[📎 file.pdf](https://x.com/file.pdf)")).toContain('download="file.pdf"');
  });
});

describe("MacFolio 글 발췌(fixtures/macfolio)", () => {
  const dir = join(__dirname, "fixtures/macfolio");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it.each(files)("%s — 깨진 표기가 남지 않는다", (file) => {
    const src = readFileSync(join(dir, file), "utf8");
    const html = render(src);
    const text = visibleText(html);
    expect(text).not.toMatch(/\{:\w+\}/); // 인라인 코드 꼬리표
    expect(text).not.toMatch(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/); // 콜아웃 표시
    expect(text).not.toContain("**"); // 굵게
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain("<del>"); // 물결 하나가 취소선이 되지 않는다
    // ==형광펜== 은 공백을 둔 비교 연산자(a == b)만 글자로 남는다
    expect(text.replace(/\s==\s/g, " ")).not.toContain("==");
    // 원문의 표기가 실제로 그려졌는지
    if (src.includes("{:math}") || src.includes("```math")) expect(html).toContain('class="katex"');
    if (/^> \[!\w+\] \S/m.test(src)) expect(html).toContain("data-custom-title");
    if (/==\S/.test(src)) expect(html).toContain("<mark>");
  });
});
