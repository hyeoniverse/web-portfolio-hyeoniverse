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
import plaintext from "highlight.js/lib/languages/plaintext";

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
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("text", plaintext);
hljs.registerLanguage("plain", plaintext);

export { hljs };

export interface WrapLabels {
  wrap: string;
  scroll: string;
  wrapTitle: string;
  scrollTitle: string;
  copy: string;
  copied: string;
}

export function highlightCodeBlocks(container: HTMLElement) {
  // hljs 하이라이팅만 담당 (markdown 콘텐츠용). wrap/컨트롤 버튼 주입은 attachCodeWrapToggle 이 처리.
  // 이미 Shiki(.shiki)로 칠해진 건 건드리지 않음 — 서버에서 처리됨.
  container.querySelectorAll("pre code").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.classList.contains("language-mermaid")) return; // mermaid 는 SVG 로 렌더
    if (htmlEl.dataset.highlighted || htmlEl.classList.contains("hljs") || htmlEl.closest(".shiki")) return;
    // 미등록 언어 class(language-auto 등)를 제거해서 hljs가 auto-detect 하도록
    const langMatch = htmlEl.className.match(/language-(\S+)/);
    if (langMatch && !hljs.getLanguage(langMatch[1])) {
      htmlEl.classList.remove(langMatch[0]);
    }
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
  // 0. 각 코드블록에 컨트롤(복사 + 줄바꿈) 버튼 주입 — 블록당 1회.
  //    serializer/Shiki 출력엔 버튼이 없으므로 reader(상세/미리보기)에서 런타임 주입한다.
  container.querySelectorAll("pre").forEach((pre) => {
    // mermaid 코드블록은 enhanceReaderExtras 가 그래프+메뉴로 따로 처리 → 코드 컨트롤 주입 안 함
    if (pre.querySelector("code.language-mermaid")) return;
    let wrap = pre.closest<HTMLElement>(".code-block-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "code-block-wrap";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);
    }
    if (wrap.querySelector(".code-block-controls")) return; // 이미 주입됨

    // 현재 언어 라벨 — Shiki 는 pre[data-lang], hljs/원본은 code.language-X 에서 읽음.
    const codeEl = pre.querySelector("code");
    const langVal = (
      pre.getAttribute("data-lang") ||
      codeEl?.className.match(/language-([\w-]+)/)?.[1] ||
      ""
    ).toLowerCase();
    const showLang = langVal && !["plaintext", "text", "plain"].includes(langVal);

    const controls = document.createElement("div");
    controls.className = "code-block-controls";
    controls.contentEditable = "false";
    if (showLang) {
      const langLabel = document.createElement("span");
      langLabel.className = "code-lang-label";
      langLabel.textContent = langVal;
      controls.appendChild(langLabel);
    }
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-copy-btn";
    copyBtn.setAttribute("data-copy-btn", "");
    const wrapBtn = document.createElement("button");
    wrapBtn.type = "button";
    wrapBtn.className = "code-wrap-toggle";
    wrapBtn.setAttribute("data-wrap-btn", "");
    controls.append(copyBtn, wrapBtn);
    wrap.appendChild(controls);
  });

  // 복사 버튼 라벨 (언어별, 매 호출 갱신 — 클릭 핸들러는 dataset 에서 최신값 읽음)
  container.querySelectorAll<HTMLButtonElement>("button[data-copy-btn]").forEach((btn) => {
    btn.dataset.copyLabel = labels.copy;
    btn.dataset.copiedLabel = labels.copied;
    btn.title = labels.copy;
    if (!btn.classList.contains("copied")) btn.textContent = labels.copy;
  });

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
      spanDefault.textContent = `↩ ${labels.wrap}`;
      spanHover.textContent = `↔ ${labels.scroll}`;
    } else {
      spanDefault.textContent = `↔ ${labels.scroll}`;
      spanHover.textContent = `↩ ${labels.wrap}`;
    }
    btn.appendChild(spanDefault);
    btn.appendChild(spanHover);
    btn.title = isWrapped ? labels.wrapTitle : labels.scrollTitle;
  });

  // 이벤트 위임
  if (container.dataset.wrapDelegated) return;
  container.dataset.wrapDelegated = "1";

  container.addEventListener("click", (e) => {
    // 복사 버튼
    const copyBtn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy-btn]");
    if (copyBtn) {
      const cw = copyBtn.closest(".code-block-wrap");
      const text = (cw?.querySelector("pre code") ?? cw?.querySelector("pre"))?.textContent ?? "";
      navigator.clipboard?.writeText(text);
      copyBtn.classList.add("copied");
      copyBtn.textContent = copyBtn.dataset.copiedLabel || "Copied";
      window.setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.textContent = copyBtn.dataset.copyLabel || "Copy";
      }, 1500);
      return;
    }

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
    } else {
      pre.style.whiteSpace = "pre-wrap";
      pre.style.wordBreak = "break-all";
      pre.style.overflowX = "visible";
    }

    // 클릭 직후: 텍스트 안 바꾸고 just-clicked만 추가
    // → hover 중이던 라벨(= 전환된 새 상태)이 그대로 유지
    btn.classList.add("just-clicked");
    const onLeave = () => {
      // mouseleave 시 라벨을 새 상태로 업데이트
      const nowWrapped = pre.style.whiteSpace === "pre-wrap";
      if (spanDefault) spanDefault.textContent = nowWrapped ? `↩ ${labels.wrap}` : `↔ ${labels.scroll}`;
      if (spanHover) spanHover.textContent = nowWrapped ? `↔ ${labels.scroll}` : `↩ ${labels.wrap}`;
      btn.title = nowWrapped ? labels.wrapTitle : labels.scrollTitle;
      requestAnimationFrame(() => btn.classList.remove("just-clicked"));
      btn.removeEventListener("mouseleave", onLeave);
    };
    btn.addEventListener("mouseleave", onLeave);

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
