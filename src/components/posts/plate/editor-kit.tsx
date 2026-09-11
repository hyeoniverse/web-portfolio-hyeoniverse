"use client";

// ── Editor Kit ──
// 기능별 *-kit 모듈을 한 배열로 합친 Plate 플러그인 집합 (공식 Editor Kit 구조).
// usePlateEditor({ plugins: EditorKit }) 로 소비. 순서는 leaf/element 우선순위에 영향을 주므로
// 마크는 앞쪽, 폰트 스타일 마크는 마지막에 둔다(기존 동작 보존).

import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { EmojiShortcodeKit } from "./plugins/emoji-shortcode-kit";
import { NoCodeMarksKit } from "./plugins/no-code-marks-kit";
import { ColumnKit } from "./plugins/column-kit";
import { ColumnWidthFixKit } from "./plugins/column-width-fix-kit";
import { TableKit } from "./plugins/table-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";
import { MediaKit } from "./plugins/media-kit";
import { LinkKit } from "./plugins/link-kit";
import { ListKit } from "./plugins/list-kit";
import { MathKit } from "./plugins/math-kit";
import { FileKit } from "./plugins/file-kit";
import { ToggleKit } from "./plugins/toggle-kit";
import { CalloutKit } from "./plugins/callout-kit";
import { TabsKit } from "./plugins/tabs-kit";
import { PollKit } from "./plugins/poll-kit";
import { DateMentionKit } from "./plugins/date-mention-kit";
import { PostLinkKit } from "./plugins/post-link-kit";
import { CalendarKit } from "./plugins/calendar-kit";
import { DiagramKit } from "./plugins/diagram-kit";
import { PlaygroundKit } from "./plugins/playground-kit";
import { FootnoteKit } from "./plugins/footnote-kit";
import { GithubSyntaxKit } from "./plugins/github-syntax-kit";
import { TocKit } from "./plugins/toc-kit";
import { FontKit } from "./plugins/font-kit";
import { DndKit } from "./plugins/dnd-kit";
import { MarkdownKit } from "./plugins/markdown-kit";
import { AutoformatUndoKit } from "./plugins/autoformat-undo-kit";
// Slate 오류 메시지에 문서 전체를 넣지 않게 한다(편집기 여는 비용) — slateScrubber 참고
import "./slateScrubber";

export const EditorKit = [
  ...DndKit,          // NodeId + block drag&drop (공식 @platejs/dnd) — id 먼저 부여
  ...AutoformatUndoKit, // 자동변환 직후 Backspace/Esc → 리터럴 복원 (insertText override 우선)
  ...MarkdownKit,     // md 직렬화 API + 붙여넣기 파싱
  ...BasicBlocksKit,  // paragraph, heading, blockquote, hr
  ...BasicMarksKit,   // bold, italic, ... code, kbd
  ...EmojiShortcodeKit, // :name: → 이모지 즉시 변환 (GitHub 식)
  ...NoCodeMarksKit,  // 코드블록 안 mark 차단 (syntax leaf + mark leaf 섞임 → hook 순서 crash 방지)
  ...ColumnKit,
  ...ColumnWidthFixKit, // ColumnKit 뒤 — 열 너비를 항상 정수 합=100 으로 정규화(소수 재분배 무한루프 차단)
  ...TableKit,
  ...CodeBlockKit,
  ...MediaKit,        // image, media_embed
  ...LinkKit,
  ...ListKit,         // list, indent
  ...MathKit,         // equation, inline_equation
  ...FileKit,         // file_embed, audio_embed
  ...ToggleKit,
  ...CalloutKit,
  ...TabsKit,         // tabs(activeTab) > tab_panel(label) > 내용
  ...PollKit,         // poll(pollId, multiple, options[]) — void, 라벨은 React input
  ...DateMentionKit,  // date_mention(date, time?) — inline void, 노션식 @날짜 pill
  ...PostLinkKit,     // post_link(slug, title) — inline void, 노션식 [[게시물 링크
  ...CalendarKit,     // calendar(month, events[]) — void, 이벤트 달력
  ...DiagramKit,      // diagram(data: 위치보존 노드/엣지) — void, React Flow 캔버스
  ...PlaygroundKit,   // playground(data: html/css/js) — void, sandboxed iframe 라이브 실행
  ...FootnoteKit,     // footnote_ref, footnote_content
  ...GithubSyntaxKit, // [!NOTE] → 콜아웃(알림), [^1] → 각주 자동변환
  ...TocKit,          // 목차 블록
  ...FontKit,         // color/bg/family/size/line-height/text-align
];
