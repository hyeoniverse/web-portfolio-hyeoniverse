"use client";

import { useLayoutEffect } from "react";

import { Marked } from "marked";
import markedAlert from "marked-alert";
import markedFootnote from "marked-footnote";
import DOMPurify from "isomorphic-dompurify";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import { highlightCode } from "@/utils/prismHighlight";
import { attachCodeWrapToggle, applyColorSwatches, highlightInlineCode } from "@/components/posts/highlightCodeBlocks";
import { useLanguage } from "@/providers/LanguageProvider";
import { EMOJI_SHORTCODES } from "@/utils/emojiShortcodeMap";
import styles from "./CommentMarkdown.module.css";

/* 댓글 전용 경량 마크다운 렌더러.
   - 댓글은 비신뢰 입력 → marked 변환 후 DOMPurify 로 반드시 정화한다.
   - posts/MarkdownRenderer(신뢰 콘텐츠용, sanitize 없음)와 분리 유지. */

// 격리된 marked 인스턴스 — 전역 marked.use() 오염 방지. gfm(테이블·취소선·task list) + breaks.
const marked = new Marked({ gfm: true, breaks: true });

/* 코드블록 — Prism 하이라이팅 + 언어 라벨. 구현/함정은 utils/prismHighlight 주석 참고. */

marked.use({
  renderer: {
    code({ text, lang }) {
      const { html, lang: resolved } = highlightCode(text, lang);
      const attr = resolved ? ` data-lang="${resolved}"` : "";
      const cls = resolved ? ` class="language-${resolved}"` : "";
      return `<pre${attr}><code${cls}>${html}</code></pre>\n`;
    },
  },
});

/* GitHub 식 `:name:` shortcode → 유니코드 이모지. 인라인 확장이라 코드 스팬/블록 안은 안 건드린다.
   맵은 컴팩트(@emoji-mart/data 에서 추출) — 렌더된 이모지는 그냥 텍스트라 DOMPurify 도 통과. */
marked.use({
  extensions: [
    {
      name: "emoji",
      level: "inline",
      start(src: string) {
        const i = src.indexOf(":");
        return i < 0 ? undefined : i;
      },
      tokenizer(src: string) {
        const m = /^:([a-z0-9_+-]+):/i.exec(src);
        const native = m ? EMOJI_SHORTCODES[m[1].toLowerCase()] : undefined;
        if (m && native) return { type: "emoji", raw: m[0], native };
      },
      renderer(token) {
        return (token as { native?: string }).native ?? "";
      },
    },
  ],
});

// GitHub 알림(Alerts) — > [!NOTE/TIP/IMPORTANT/WARNING/CAUTION]. SVG octicon 대신 이모지 아이콘으로
// (댓글은 비신뢰 입력 → svg 태그 허용을 피한다). 박스 색/스타일은 CSS(.markdown-alert-*)가 담당.
marked.use(
  markedAlert({
    variants: [
      { type: "note", icon: "ℹ️ " },
      { type: "tip", icon: "💡 " },
      { type: "important", icon: "❗ " },
      { type: "warning", icon: "⚠️ " },
      { type: "caution", icon: "🛑 " },
    ],
  })
);
// GitHub 각주 — 본문 [^1] 참조 + 하단 [^1]: 내용. sup/anchor/section#footnotes 구조 (아래 DOMPurify 허용).
marked.use(markedFootnote());

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "del", "s", "code", "pre",
  "blockquote", "ul", "ol", "li", "a", "hr", "img", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "th", "td",
  // GitHub inline HTML 서식 — 위/아래첨자·밑줄·키보드·형광 (툴바 버튼이 이 태그를 삽입)
  "sub", "sup", "ins", "kbd", "mark",
  // GitHub 알림(div.markdown-alert)·각주(section.footnotes)
  "div", "section",
  // span — 지금은 marked 가 안 만들지만, 무해하고(style 속성은 계속 차단) 나중에
  // 하이라이터를 붙이면 토큰 span 이 필요해서 남겨둔다.
  "span",
];
// img(src/alt), task-list 체크박스(input type/checked/disabled), class(task-list 스타일)
// id·data-footnote-*·aria-* — 각주 앵커/역참조 구조(inert). div/section 은 알림·각주 컨테이너.
const ALLOWED_ATTR = ["href", "title", "src", "alt", "type", "checked", "disabled", "class", "align", "data-lang", "id", "data-footnote-ref", "data-footnotes", "data-footnote-backref", "aria-describedby", "aria-label"];
// href/src 프로토콜은 http/https/mailto + #(각주 fragment 앵커) + 루트 상대경로(/posts/... 게시물 링크).
// `/(?!/)` — 한 개의 `/` 로 시작하는 경로만 허용하고 `//evil.com`(프로토콜 상대 URL) 은 차단. data:·javascript: 등도 차단.
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|#|\/(?!\/))/i;

/* DOMPurify 는 "URI-safe 로 알려진 속성"이 아니면 그 값을 ALLOWED_URI_REGEXP 로 검사한다.
   기본 URI-safe 목록(alt·class·title·value 등)에 type/checked/disabled/align 은 없어서,
   ALLOWED_ATTR 에 넣어놔도 값이 "checkbox"/"left" 라 위 정규식에 걸려 조용히 제거됐다.
   그래서 체크박스는 <input type> 이 사라져 아래 훅이 "체크박스 아님"으로 지워버렸고
   (→ 불릿만 남음), 표의 정렬(align)도 통째로 무시됐다.
   전부 URL 이 아닌 inert 속성이라 URI 검사에서 빼주는 게 맞다. */
const URI_SAFE_ATTR = ["type", "checked", "disabled", "align", "data-lang", "id", "aria-describedby", "aria-label", "data-footnote-ref", "data-footnotes", "data-footnote-backref"];

// 안전 속성 강제 — 모듈 로드 시 1회만 등록
let hookRegistered = false;
function ensureHook() {
  if (hookRegistered) return;
  hookRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    } else if (node.nodeName === "IMG") {
      node.setAttribute("loading", "lazy");
    } else if (node.nodeName === "INPUT") {
      // task-list 체크박스만 — 그 외 input 제거, 항상 비활성(비인터랙티브)
      if (node.getAttribute("type") !== "checkbox") { node.remove(); return; }
      node.setAttribute("disabled", "");
    }
  });
}

/** 마크다운 → 정화된 HTML 문자열 */
function renderCommentMarkdown(content: string): string {
  ensureHook();
  const raw = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,
    // script/style/iframe/on*/style attr 전부 금지(화이트리스트 밖은 자동 제거)
  });
}

interface CommentMarkdownProps {
  content: string;
  className?: string;
}

export default function CommentMarkdown({ content, className }: CommentMarkdownProps) {
  const html = renderCommentMarkdown(content);
  /* 이미지 뷰어 — posts 본문과 같은 훅. 컨테이너 안 <img> 클릭을 위임으로 잡으므로
     dangerouslySetInnerHTML 로 들어온 마크다운 이미지에도 그대로 붙는다.
     범위가 이 컴포넌트 하나(= 댓글 하나 / 미리보기 하나)라 갤러리도 그 댓글의 이미지들로 묶인다. */
  const { containerRef, viewerState, closeViewer } = useProseImageViewer();
  const { t } = useLanguage();

  /* 코드블록 상단 바(언어 라벨 + 복사 + 줄바꿈 토글) — 게시물 본문과 같은 컴포넌트를 그대로 쓴다.
     라벨은 위 renderer 가 심은 `pre[data-lang]` 에서 읽는다.
     (mermaid 스킵·중복 주입 방지는 attachCodeWrapToggle 내부에 있음)

     useLayoutEffect + deps 없음: 펼치기·편집 등 상호작용으로 재렌더되면 dangerouslySetInnerHTML
     이 innerHTML 을 원본(감싸기 전)으로 되돌려 코드블록 프레임이 순간 풀린다. paint **전**에
     매 렌더마다 다시 씌워(layout effect) 풀린 프레임이 화면에 안 보이게 한다. attachCodeWrapToggle
     은 idempotent(이미 감싼 pre 는 건너뜀)라 반복 호출이 안전. (댓글은 클라 fetch 라 SSR 없음) */
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    attachCodeWrapToggle(root, {
      wrap: t("common.codeWrap"),
      scroll: t("common.codeScroll"),
      wrapTitle: t("common.codeWrapTitle"),
      scrollTitle: t("common.codeScrollTitle"),
      copy: t("common.codeCopy"),
      copied: t("common.codeCopied"),
    });
    // 인라인 코드 색상값(`#hex` 등) 앞에 색 스와치 — 색상 버튼으로 넣은 색이 원으로 보인다
    applyColorSwatches(root);
    // 인라인 코드도 syntax highlight (명확히 코드로 추론될 때만)
    highlightInlineCode(root);
  });

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.commentMarkdown} ${className ?? ""}`.trim()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ImageViewer
        images={viewerState.images}
        index={viewerState.index}
        open={viewerState.open}
        onClose={closeViewer}
      />
    </>
  );
}
