import { Marked } from "marked";
import markedAlert from "marked-alert";
import markedFootnote from "marked-footnote";
import markedKatex from "marked-katex-extension";
import { postProcessMarkedHtml } from "./postProcessMarkedHtml";

/**
 * 레거시 마크다운 본문·템플릿 → richtext(HTML) 1회 변환.
 *
 * 확장(알림·각주·수식)이 붙은 **격리 marked 인스턴스**를 쓴다.
 * 전에는 전역 `marked` 싱글턴을 그대로 썼는데, 그 확장은 MarkdownRenderer 모듈이
 * 로드될 때 `marked.use()` 부수효과로만 붙는다 → 에디터 페이지엔 그게 안 실려
 * `> [!NOTE]` 가 콜아웃 대신 blockquote + `[!NOTE]` 리터럴로 남던 버그가 있었다.
 * breaks:true 는 리더(MarkdownRenderer)와 렌더 결과를 맞추기 위함.
 */
const md = new Marked({ gfm: true, breaks: true });
md.use(markedFootnote(), markedAlert(), markedKatex({ throwOnError: false }));

export function mdToRichHtml(mdText: string): string {
  if (!mdText) return mdText;
  try {
    return postProcessMarkedHtml(md.parse(mdText, { async: false }) as string);
  } catch {
    return mdText;
  }
}
