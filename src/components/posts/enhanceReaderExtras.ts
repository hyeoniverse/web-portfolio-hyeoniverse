// ── 공개 페이지 richtext 부가 렌더 ──
// 에디터에서 저장된 마커를 리더에서 실제 렌더한다. dangerouslySetInnerHTML 로 그려진 DOM 을
// 후처리하므로 클라이언트에서만 호출한다.
//
// 마커마다 하는 일이 완전히 독립적이라 readerExtras/ 아래 기능별로 나눠 두고
// 여기서는 공통 컨텍스트를 만들어 차례로 넘긴다. 정리와 취소 판정만 공유한다.

import type { ReaderExtrasContext, ReaderExtrasLabels } from "./readerExtras/context";
import { renderToc } from "./readerExtras/toc";
import { renderMentions } from "./readerExtras/mentions";
import { renderIslands } from "./readerExtras/islands";
import { renderDiagram } from "./readerExtras/diagram";
import { renderTabs } from "./readerExtras/tabs";
import { renderPoll } from "./readerExtras/poll";
import { renderTables } from "./readerExtras/tables";

/** 컨테이너 내 마커(TOC · 멘션 · mermaid · 다이어그램 · 플레이그라운드 · 캘린더 · 탭 · 투표 · 표)를 렌더. cleanup 함수 반환. */
export function enhanceReaderExtras(
  el: HTMLElement,
  labels?: Partial<ReaderExtrasLabels>,
): () => void {
  let cancelled = false;
  const cleanups: Array<() => void> = [];

  const ctx: ReaderExtrasContext = {
    el,
    labels: {
      viewCode: labels?.viewCode ?? "코드 보기",
      hideCode: labels?.hideCode ?? "코드 숨기기",
      copyCode: labels?.copyCode ?? "코드 복사",
      copied: labels?.copied ?? "복사됨",
      diagram: labels?.diagram ?? "다이어그램",
      code: labels?.code ?? "코드",
      split: labels?.split ?? "스플릿",
    },
    cleanups,
    isCancelled: () => cancelled,
  };

  renderToc(ctx);
  renderMentions(ctx);
  renderIslands(ctx);
  renderDiagram(ctx);
  renderTabs(ctx);
  renderPoll(ctx);
  renderTables(ctx);

  return () => { cancelled = true; cleanups.forEach((fn) => fn()); };
}
