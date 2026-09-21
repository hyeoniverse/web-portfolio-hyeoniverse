import { addIdsToHtml } from "./headingUtils";
import { fixEmbedUrls } from "./htmlUtils";
import { migrateOfficeViewerUrls } from "@/lib/officeViewer";

/**
 * detail 페이지와 preview(미리보기)에서 공용으로 쓰는 richtext HTML 처리.
 * 동일한 출력이 나와야 미리보기가 게시 화면과 같아 보인다.
 *
 * 처리 순서:
 *  1. heading id 주입 (TOC 앵커)
 *  2. iframe embed URL 변환 (+ 예전 글에 굳어 있는 구글 문서 뷰어 주소를 지금 뷰어로 — lib/officeViewer)
 *  3. 코드 wrap 토글 버튼 라벨 삽입
 *  4. img 에 data-cursor="zoom" 힌트 주입
 *
 * ⚠️ 코드 신택스 하이라이팅은 여기서 하지 않는다 — Shiki 가 서버(detail)/클라(preview)에서
 *    `highlightRichtextCode` 로 별도 처리(코드블록 HTML 을 미리 칠해서 넘김).
 */
export function processRichtextHtml(
  raw: string,
  labels: { codeScroll: string; codeWrap: string },
): string {
  let html = migrateOfficeViewerUrls(fixEmbedUrls(addIdsToHtml(raw)));
  // 빈 wrap 버튼에 라벨 span 삽입 (있을 때만)
  const wrapLabel = `↔ ${labels.codeScroll}`;
  const hoverLabel = `↩ ${labels.codeWrap}`;
  html = html.replace(
    /<button[^>]*data-wrap-btn[^>]*><\/button>/g,
    `<button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${wrapLabel}</span><span class="code-wrap-label-hover">${hoverLabel}</span></button>`,
  );
  // img에 data-cursor="zoom" 주입 → CursorTrail 이미지 뷰어 힌트
  html = html.replace(/<img\s/g, '<img data-cursor="zoom" ');
  return html;
}
