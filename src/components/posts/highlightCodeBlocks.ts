import { highlightCode, resolveGrammar, normalizeLangAlias } from "@/utils/prismHighlight";
import { showToast } from "@/stores/toastStore";

/* 하이라이터는 Prism — highlight.js 를 쓰면 안 된다.
   hljs 는 언어 **컴파일 시점**(highlight 호출)에 번들러가 깨뜨린 유니코드 정규식 때문에 throw 하고,
   그러면 그 청크를 로드한 페이지 전체가 죽는다. 빌드는 통과하고 런타임에만 터진다. 조사 기록은 #312.
   함정과 대안 근거는 utils/prismHighlight 주석 참고. */

export interface WrapLabels {
  wrap: string;
  scroll: string;
  wrapTitle: string;
  scrollTitle: string;
  copy: string;
  copied: string;
}

export function highlightCodeBlocks(container: HTMLElement) {
  // markdown 콘텐츠용 DOM 하이라이팅. wrap/컨트롤 버튼 주입은 attachCodeWrapToggle 이 처리.
  // 이미 Shiki(.shiki)로 칠해진 건 건드리지 않음 — 서버에서 처리됨.
  container.querySelectorAll("pre code").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.classList.contains("language-mermaid")) return; // mermaid 는 SVG 로 렌더
    if (htmlEl.dataset.highlighted || htmlEl.querySelector(".token") || htmlEl.closest(".shiki")) return;

    const langMatch = htmlEl.className.match(/language-(\S+)/);
    const alias = langMatch ? normalizeLangAlias(langMatch[1]) : "";
    // Prism 이 모르는 언어 class(language-auto 등)는 떼서, 아래 highlightCode 가 추론하게 둔다
    if (langMatch && alias && !resolveGrammar(alias)) htmlEl.classList.remove(langMatch[0]);

    const { html, lang } = highlightCode(htmlEl.textContent ?? "", alias || undefined);
    htmlEl.innerHTML = html;
    htmlEl.dataset.highlighted = "true";
    if (lang && !htmlEl.className.includes("language-")) htmlEl.classList.add(`language-${lang}`);
  });
}

/* ── 인라인 코드 색상 스와치 (GitHub 스타일) ──
   `#hex` / `rgb(...)` / `hsl(...)` 만 담긴 인라인 코드 앞에 실제 색 원을 붙인다.
   포맷 게이트는 정규식 — 이름색(red)·currentColor 등은 제외(GitHub 도 안 붙임).
   채널 범위까진 안 따지고(브라우저가 clamp) 형식만 확인 → 색은 검증된 문자열이라 style 주입 안전. */
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*[\d.]+%?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:(?:,|\/)\s*[\d.]+%?\s*)?\)$/i;
const HSL_RE = /^hsla?\(\s*[\d.]+(?:deg)?\s*(?:,\s*|\s+)[\d.]+%\s*(?:,\s*|\s+)[\d.]+%\s*(?:(?:,|\/)\s*[\d.]+%?\s*)?\)$/i;

export function parseInlineColor(text: string): string | null {
  const t = text.trim();
  if (t.length > 40) return null; // 방어 — 색 문자열이 이보다 길 일은 없다
  return HEX_RE.test(t) || RGB_RE.test(t) || HSL_RE.test(t) ? t : null;
}

/** 컨테이너 안 인라인 `<code>` 중 내용이 색상값인 것 앞에 색 스와치(원)를 삽입. 멱등. */
export function applyColorSwatches(container: HTMLElement) {
  container.querySelectorAll("code").forEach((code) => {
    if (code.closest("pre")) return; // 블록 코드(pre) 제외 — 인라인만
    if (code.querySelector(":scope > .color-swatch")) return; // 이미 처리
    const color = parseInlineColor(code.textContent ?? "");
    if (!color) return;
    const dot = document.createElement("span");
    dot.className = "color-swatch";
    dot.setAttribute("aria-hidden", "true");
    dot.style.background = color; // parseInlineColor 로 검증된 색만
    code.insertBefore(dot, code.firstChild);
  });
}

/** 인라인 `<code>` 도 syntax highlight — 언어를 안 적으므로 detectCodeLanguage 로 추론하고,
 *  추론에 성공(=명확한 코드)했을 때만 토큰을 입힌다. 짧은 것(<12자)·색상값·비코드는 자동으로 평문 유지. */
export function highlightInlineCode(container: HTMLElement) {
  container.querySelectorAll("code").forEach((code) => {
    const el = code as HTMLElement;
    if (el.closest("pre")) return; // 블록 코드는 highlightCodeBlocks 담당
    if (el.dataset.inlineHl || el.querySelector(".token")) return; // 이미 처리
    const text = el.textContent ?? "";
    if (parseInlineColor(text)) return; // 색상값은 스와치가 담당 → highlight 안 함
    el.dataset.inlineHl = "1"; // 시도했음을 표시(멱등) — 추론 실패해도 재시도 안 함
    const { html, lang } = highlightCode(text); // 언어 미지정 → 휴리스틱 추론
    if (lang) el.innerHTML = html; // 명확히 코드로 추론됐을 때만 토큰 적용
  });
}

/* 코드블록 wheel 축(axis) 라우팅 — Lenis(스무스 스크롤) 환경에서:
   - 가로 의도(shift+wheel or |dx|>|dy|) → 블록이 가로로 넘치면 블록을 가로 스크롤(끝이면 멈춤)
   - 세로 의도 → 블록이 세로로 스크롤 가능하고 끝이 아니면 블록을, 아니면 fall-through → Lenis 가 페이지 스크롤
   Lenis 는 window(bubble)에서 wheel 을 듣고 composedPath 로 처리하므로, 여기서 stopPropagation 하면
   Lenis 가 그 이벤트를 건너뛴다. 반대로 아무것도 안 하면(fall-through) Lenis 가 페이지를 부드럽게 굴린다.
   data-lenis-prevent 로 통째로 막던 방식은 세로로 굴릴 때 페이지가 안 움직이는 문제가 있었다. */
function attachWheelRouting(pre: HTMLElement) {
  if (pre.dataset.wheelRouted) return; // 재렌더로 여러 번 호출돼도 리스너는 pre 당 1회
  pre.dataset.wheelRouted = "1";
  pre.addEventListener(
    "wheel",
    (e) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const horizontalIntent = e.shiftKey || absX > absY;
      if (horizontalIntent) {
        const max = pre.scrollWidth - pre.clientWidth;
        if (max > 0) {
          const delta = absX > absY ? e.deltaX : e.deltaY; // shift+wheel 은 deltaY 로 온다
          const next = Math.max(0, Math.min(max, pre.scrollLeft + delta));
          if (next !== pre.scrollLeft) {
            pre.scrollLeft = next;
            e.preventDefault();
            e.stopPropagation(); // Lenis(window) 로 안 흘러가게 → 페이지 세로 스크롤 방지
          }
        }
        return; // 가로 제스처는 페이지 세로 스크롤로 넘기지 않는다
      }
      // 세로 의도 — 블록이 세로로 스크롤 가능하고 그 방향 끝이 아니면 블록 내부를
      const max = pre.scrollHeight - pre.clientHeight;
      if (max > 0) {
        const next = Math.max(0, Math.min(max, pre.scrollTop + e.deltaY));
        if (next !== pre.scrollTop) {
          pre.scrollTop = next;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      // 짧은 블록/경계 → fall-through: stopPropagation 안 하므로 Lenis 가 페이지를 스크롤
    },
    { passive: false },
  );
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
    // 터치는 네이티브 스크롤에 맡긴다(Lenis 비관여) — 모바일 코드블록 스크롤.
    // wheel 은 통째로 막지 않고 축(axis) 기준으로 라우팅한다(attachWheelRouting) — 세로로 굴렸는데
    // 블록이 세로로 못 움직이면 페이지가 스크롤되도록.
    pre.setAttribute("data-lenis-prevent-touch", "");
    /* 예전에 저장한 HTML 은 pre 에 data-lenis-prevent 를 달고 있다 — 그러면 Lenis 가 이 위의 휠을 통째로
       무시해 아래 라우팅이 끝에서 넘겨줘도 페이지가 움직이지 않는다. 화면에서 떼어 낸다 */
    pre.removeAttribute("data-lenis-prevent");
    // 가로로 넘치는 코드는 마우스 없이도 훑을 수 있어야 한다 — 키보드 초점을 받게 한다.
    if (!pre.hasAttribute("tabindex")) pre.setAttribute("tabindex", "0");
    attachWheelRouting(pre);
    // 중복 주입 방지는 pre 단위로 판정 — 한 wrap 에 pre 가 여러 개여도 각 pre 가 바를 받도록.
    //   (wrap.querySelector 로 판정하면 첫 pre 의 바를 보고 이후 pre 를 건너뛰는 오탐이 생김)
    if (pre.previousElementSibling?.classList.contains("code-block-bar")) return;
    let wrap = pre.closest<HTMLElement>(".code-block-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "code-block-wrap";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);
    }

    // 바깥 컨테이너 — resize 오버레이가 wrap 의 형제가 되도록 wrap 을 감싼다(댓글창 Textarea 구조).
    // 오버레이가 wrap 의 자식이면 UA resizer 가 그 위에 그려져 시스템 커서가 샌다.
    let outer = wrap.parentElement;
    if (!outer?.classList.contains("code-block-outer")) {
      outer = document.createElement("div");
      outer.className = "code-block-outer";
      wrap.parentNode?.insertBefore(outer, wrap);
      outer.appendChild(wrap);
    }

    // 현재 언어 라벨 — Shiki 는 pre[data-lang], hljs/원본은 code.language-X 에서 읽음.
    const codeEl = pre.querySelector("code");
    const langVal = (
      pre.getAttribute("data-lang") ||
      codeEl?.className.match(/language-([\w-]+)/)?.[1] ||
      ""
    ).toLowerCase();
    const showLang = langVal && !["plaintext", "text", "plain"].includes(langVal);

    // pre 위(밖)에 별도 바 — mermaid 리더뷰와 동일하게 언어 라벨(좌) + 컨트롤(우)을 프레임 밖으로.
    wrap.classList.add("has-code-bar");
    // 리사이즈 — 우하단 overlay 가 pointer 를 받아(=CursorTrail 이 data-cursor="resizeV" 감지)
    // wrap 높이를 드래그로 조절한다. pointer-events:none 으로 두면 CursorTrail 의 elementsFromPoint
    // 가 overlay 를 건너뛰어 커서가 안 바뀐다 → auto + 자체 drag(Textarea 와 같은 패턴, 아래 위임).
    if (!outer.querySelector(":scope > .code-resize-cursor")) {
      const rc = document.createElement("div");
      rc.className = "code-resize-cursor";
      rc.setAttribute("data-cursor", "resizeV");
      rc.setAttribute("aria-hidden", "true");
      outer.appendChild(rc);
    }
    const bar = document.createElement("div");
    bar.className = "code-block-bar";
    bar.contentEditable = "false";
    if (showLang) {
      const langLabel = document.createElement("span");
      langLabel.className = "code-lang-label";
      langLabel.textContent = langVal;
      bar.appendChild(langLabel);
    } else {
      bar.appendChild(document.createElement("span")); // 좌측 스페이서(컨트롤 우측 정렬 유지)
    }
    const controls = document.createElement("div");
    controls.className = "code-block-controls";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-copy-btn";
    copyBtn.setAttribute("data-copy-btn", "");
    /* 아이콘 + 라벨. copy/copied 두 라벨을 겹쳐 넓은 쪽이 폭을 잡아 상태 전환에도 너비 불변. */
    copyBtn.innerHTML =
      '<svg class="code-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span class="code-copy-labels"><span class="code-copy-default"></span><span class="code-copy-done"></span></span>';
    const wrapBtn = document.createElement("button");
    wrapBtn.type = "button";
    wrapBtn.className = "code-wrap-toggle";
    wrapBtn.setAttribute("data-wrap-btn", "");
    controls.append(copyBtn, wrapBtn);
    bar.appendChild(controls);
    pre.parentElement?.insertBefore(bar, pre); // pre 바로 위(밖)에 배치 (pre 가 wrap 직계가 아니어도 안전)
  });

  // 복사 버튼 라벨 (언어별, 매 호출 갱신 — 클릭 핸들러는 dataset 에서 최신값 읽음)
  container.querySelectorAll<HTMLButtonElement>("button[data-copy-btn]").forEach((btn) => {
    btn.dataset.copiedLabel = labels.copied;
    btn.title = labels.copy;
    const def = btn.querySelector<HTMLElement>(".code-copy-default");
    const done = btn.querySelector<HTMLElement>(".code-copy-done");
    if (def) def.textContent = labels.copy;
    if (done) done.textContent = labels.copied;
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

  // 리사이즈 드래그 위임 — overlay pointerdown → wrap 높이 조절 (native resize 대신 JS,
  // overlay 가 pointer 를 받아야 CursorTrail 이 커스텀 커서를 띄우므로).
  // resize 는 wrap 이 가진다(자기 radius 는 자기 그립을 안 자름). overlay 는 wrap 의 형제(.code-block-outer 안).
  if (!container.dataset.resizeDelegated) {
    container.dataset.resizeDelegated = "1";
    container.addEventListener("pointerdown", (e) => {
      const grip = (e.target as HTMLElement).closest<HTMLElement>(".code-resize-cursor");
      if (!grip) return;
      const wrap = grip.closest<HTMLElement>(".code-block-outer")?.querySelector<HTMLElement>(".code-block-wrap");
      if (!wrap) return;
      e.preventDefault();
      const startY = e.clientY;
      const startH = wrap.offsetHeight;
      const onMove = (ev: PointerEvent) => {
        const next = Math.max(128, Math.min(window.innerHeight * 0.8, startH + (ev.clientY - startY)));
        wrap.style.height = `${next}px`;
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

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
      showToast(copyBtn.dataset.copiedLabel || "Copied", "success");
      window.setTimeout(() => copyBtn.classList.remove("copied"), 1500);
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
