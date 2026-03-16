import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import markdown from "highlight.js/lib/languages/markdown";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("jsx", javascript);

export { hljs };

export interface WrapLabels {
  wrap: string;
  scroll: string;
  wrapTitle: string;
  scrollTitle: string;
}

export function highlightCodeBlocks(container: HTMLElement) {
  container.querySelectorAll("pre code").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.dataset.highlighted || htmlEl.classList.contains("hljs")) return;
    try {
      hljs.highlightElement(htmlEl);
    } catch {
      // ignore
    }
  });
}

/**
 * 코드블록 줄바꿈 토글 — 이벤트 위임 (컨테이너에 한 번만 등록)
 * HTML 내 `<button data-wrap-btn>` 클릭 시 동작
 */
export function attachCodeWrapToggle(
  container: HTMLElement,
  labels: WrapLabels,
) {
  // 초기 라벨 설정 (언어별) — 두 개의 span으로 hover 전환
  container.querySelectorAll<HTMLButtonElement>("button[data-wrap-btn]").forEach((btn) => {
    const wrap = btn.closest(".code-block-wrap");
    const pre = wrap?.querySelector("pre");
    const isWrapped = pre?.style.whiteSpace === "pre-wrap";
    btn.textContent = "";
    const spanDefault = document.createElement("span");
    spanDefault.className = "code-wrap-label-default";
    const spanHover = document.createElement("span");
    spanHover.className = "code-wrap-label-hover";
    if (isWrapped) {
      spanDefault.textContent = `↔ ${labels.scroll}`;
      spanHover.textContent = `↩ ${labels.wrap}`;
    } else {
      spanDefault.textContent = `↩ ${labels.wrap}`;
      spanHover.textContent = `↔ ${labels.scroll}`;
    }
    btn.appendChild(spanDefault);
    btn.appendChild(spanHover);
    btn.title = isWrapped ? labels.scrollTitle : labels.wrapTitle;
  });

  // 이벤트 위임
  if (container.dataset.wrapDelegated) return;
  container.dataset.wrapDelegated = "1";

  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-wrap-btn]");
    if (!btn) return;

    const wrap = btn.closest(".code-block-wrap");
    const pre = wrap?.querySelector("pre");
    if (!pre) return;

    const isWrapped = pre.style.whiteSpace === "pre-wrap";

    // FLIP: 변경 전 높이 측정
    const startH = pre.getBoundingClientRect().height;

    const spanDefault = btn.querySelector(".code-wrap-label-default");
    const spanHover = btn.querySelector(".code-wrap-label-hover");

    if (isWrapped) {
      pre.style.whiteSpace = "pre";
      pre.style.wordBreak = "";
      pre.style.overflowX = "auto";
      if (spanDefault) spanDefault.textContent = `↩ ${labels.wrap}`;
      if (spanHover) spanHover.textContent = `↔ ${labels.scroll}`;
      btn.title = labels.wrapTitle;
    } else {
      pre.style.whiteSpace = "pre-wrap";
      pre.style.wordBreak = "break-all";
      pre.style.overflowX = "visible";
      if (spanDefault) spanDefault.textContent = `↔ ${labels.scroll}`;
      if (spanHover) spanHover.textContent = `↩ ${labels.wrap}`;
      btn.title = labels.scrollTitle;
    }

    // FLIP: 변경 후 높이 측정 → clip 애니메이션
    const endH = pre.getBoundingClientRect().height;
    if (startH !== endH) {
      pre.style.overflow = "clip";
      pre.animate(
        [{ height: `${startH}px` }, { height: `${endH}px` }],
        { duration: 250, easing: "ease-out" },
      ).onfinish = () => {
        pre.style.overflow = "";
        pre.style.overflowX = isWrapped ? "auto" : "visible";
      };
    }
  });
}
