"use client";

import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import styles from "./CommentMarkdown.module.css";

/* 댓글 전용 경량 마크다운 렌더러.
   - 댓글은 비신뢰 입력 → marked 변환 후 DOMPurify 로 반드시 정화한다.
   - posts/MarkdownRenderer(신뢰 콘텐츠용, sanitize 없음)와 분리 유지. */

// 격리된 marked 인스턴스 — 전역 marked.use() 오염 방지. gfm(테이블·취소선·task list) + breaks.
const marked = new Marked({ gfm: true, breaks: true });

/* 코드블록은 하이라이팅 없이 이스케이프만 — marked 기본 code renderer 와 동일하게 처리된다.

   ⚠ highlight.js 를 쓰면 안 된다. hljs 의 xml.js 가 `/[\p{L}_]/u` (유니코드 속성 이스케이프) 를 쓰는데,
   번들러가 이걸 구형 브라우저용으로 풀어쓰면서 범위가 깨진 문자 클래스를 만들어내고
   모듈 평가 시점에 `SyntaxError: Invalid regular expression: ... Range out of order in character class`
   로 터진다 → 그 청크를 로드한 페이지 전체가 크래시한다 (dev/prod 양쪽, 빌드는 통과).
   실제로 여기서 hljs 를 import 했다가 게시물 상세 페이지가 통째로 죽었다.
   posts/highlightCodeBlocks 를 쓰든 언어를 골라 등록한 자체 인스턴스를 쓰든 결과는 같다 —
   highlight.js 청크가 로드되는 순간 터진다.
   다시 붙이려면 richtext 가 쓰는 shiki 로 가거나 hljs 를 patch 해야 한다. */

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "del", "s", "code", "pre",
  "blockquote", "ul", "ol", "li", "a", "hr", "img", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "th", "td",
  // span — 지금은 marked 가 안 만들지만, 무해하고(style 속성은 계속 차단) 나중에
  // 하이라이터를 붙이면 토큰 span 이 필요해서 남겨둔다.
  "span",
];
// img(src/alt), task-list 체크박스(input type/checked/disabled), class(task-list 스타일)
const ALLOWED_ATTR = ["href", "title", "src", "alt", "type", "checked", "disabled", "class", "align"];
// href/src 프로토콜은 http/https/mailto 만 (data: 등 차단)
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;

/* DOMPurify 는 "URI-safe 로 알려진 속성"이 아니면 그 값을 ALLOWED_URI_REGEXP 로 검사한다.
   기본 URI-safe 목록(alt·class·title·value 등)에 type/checked/disabled/align 은 없어서,
   ALLOWED_ATTR 에 넣어놔도 값이 "checkbox"/"left" 라 위 정규식에 걸려 조용히 제거됐다.
   그래서 체크박스는 <input type> 이 사라져 아래 훅이 "체크박스 아님"으로 지워버렸고
   (→ 불릿만 남음), 표의 정렬(align)도 통째로 무시됐다.
   전부 URL 이 아닌 inert 속성이라 URI 검사에서 빼주는 게 맞다. */
const URI_SAFE_ATTR = ["type", "checked", "disabled", "align"];

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
export function renderCommentMarkdown(content: string): string {
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
