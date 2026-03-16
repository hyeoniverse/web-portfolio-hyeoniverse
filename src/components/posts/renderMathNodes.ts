import katex from "katex";

/** HTML 컨테이너 안의 math-inline / math-block 노드를 KaTeX로 렌더링합니다. */
export function renderMathNodes(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>("[data-math-inline]").forEach((el) => {
    const latex = el.getAttribute("data-latex") ?? "";
    try { katex.render(latex, el, { throwOnError: false, displayMode: false }); } catch {}
  });
  container.querySelectorAll<HTMLElement>("[data-math-block]").forEach((el) => {
    const latex = el.getAttribute("data-latex") ?? "";
    try { katex.render(latex, el, { throwOnError: false, displayMode: true }); } catch {}
  });
}
