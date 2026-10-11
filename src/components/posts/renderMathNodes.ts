import katex from "katex";
import { fillLabel, type BodyLabels } from "@/lib/bodyLabels";

const ERROR_KO: [RegExp, string][] = [
  [/KaTeX parse error: (Expected .+?)(?:,| at)/i, "수식 오류: $1"],
  [/KaTeX parse error: (Undefined control sequence): (.+)/i, "수식 오류: 알 수 없는 명령어 $2"],
  [/KaTeX parse error: (.+)/i, "수식 오류: $1"],
];

/** 번역 라벨(다른 언어로 읽기)의 틀 — ERROR_KO 와 같은 갈래 */
function translatedErrors(lb: Pick<BodyLabels, "mathError" | "mathUnknownCommand">): [RegExp, (m: RegExpMatchArray) => string][] {
  return [
    [/KaTeX parse error: (Expected .+?)(?:,| at)/i, (m) => fillLabel(lb.mathError, { msg: m[1] })],
    [/KaTeX parse error: Undefined control sequence: (.+)/i, (m) => fillLabel(lb.mathUnknownCommand, { cmd: m[1] })],
    [/KaTeX parse error: (.+)/i, (m) => fillLabel(lb.mathError, { msg: m[1] })],
  ];
}

/** KaTeX 에러 메시지(title 속성)를 한글로 변환. 영어 화면이면 KaTeX 의 영어 메시지를 그대로 둔다.
 *  labels(번역 라벨)를 주면 화면 언어와 상관없이 그 틀로 바꾼다 */
export function localizeKatexErrors(container: HTMLElement, language = "ko", labels?: Pick<BodyLabels, "mathError" | "mathUnknownCommand">) {
  if (labels) {
    const rules = translatedErrors(labels);
    container.querySelectorAll<HTMLElement>(".katex-error").forEach((el) => {
      const title = el.getAttribute("title") ?? "";
      for (const [re, make] of rules) {
        const m = title.match(re);
        if (m) { el.setAttribute("title", make(m)); return; }
      }
    });
    return;
  }
  if (language !== "ko") return;
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
export function renderMathNodes(container: HTMLElement, language = "ko", labels?: Pick<BodyLabels, "mathError" | "mathUnknownCommand">) {
  container.querySelectorAll<HTMLElement>("[data-math-inline]").forEach((el) => {
    const latex = el.getAttribute("data-latex") ?? "";
    try { katex.render(latex, el, { throwOnError: false, displayMode: false }); } catch {}
  });
  container.querySelectorAll<HTMLElement>("[data-math-block]").forEach((el) => {
    const latex = el.getAttribute("data-latex") ?? "";
    try { katex.render(latex, el, { throwOnError: false, displayMode: true }); } catch {}
  });
  localizeKatexErrors(container, language, labels);
}
