import { describe, it, expect } from "vitest";
import { localizeKatexErrors } from "@/components/posts/renderMathNodes";

/* 수식 오류 안내(title)를 한국어로 바꾸는 것은 한국어 화면에서만 — 영어 화면이면 KaTeX 의 영어 문구를 둔다 */

const errorBox = () => {
  const root = document.createElement("div");
  const el = document.createElement("span");
  el.className = "katex-error";
  el.setAttribute("title", "KaTeX parse error: Undefined control sequence: \\foo at position 1");
  root.appendChild(el);
  return { root, el };
};

describe("localizeKatexErrors", () => {
  it("한국어 화면이면 한국어로 바꾼다", () => {
    const { root, el } = errorBox();
    localizeKatexErrors(root, "ko");
    expect(el.getAttribute("title")).toBe("수식 오류: 알 수 없는 명령어 \\foo at position 1");
  });

  it("영어 화면이면 그대로 둔다", () => {
    const { root, el } = errorBox();
    localizeKatexErrors(root, "en");
    expect(el.getAttribute("title")).toBe("KaTeX parse error: Undefined control sequence: \\foo at position 1");
  });
});
