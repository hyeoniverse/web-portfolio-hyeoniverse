import katex from "katex";

const ERROR_KO: [RegExp, string][] = [
  [/KaTeX parse error: (Expected .+?)(?:,| at)/i, "수식 오류: $1"],
  [/KaTeX parse error: (Undefined control sequence): (.+)/i, "수식 오류: 알 수 없는 명령어 $2"],
  [/KaTeX parse error: (.+)/i, "수식 오류: $1"],
];

/** KaTeX 에러 메시지(title 속성)를 한글로 변환 */
export function localizeKatexErrors(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>(".katex-error").forEach((el) => {
    const title = el.getAttribute("title") ?? "";
    if (!title) return;
    for (const [re, tmpl] of ERROR_KO) {
      const m = title.match(re);
      if (m) {
        const ko = tmpl.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? "");
        el.setAttribute("title", ko);
        return;
      }
    }
  });
}

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
  localizeKatexErrors(container);
}
