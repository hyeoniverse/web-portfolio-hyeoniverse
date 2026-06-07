"use client";

// ── Editor Kit ──
// 기능별 *-kit 모듈을 한 배열로 합친 Plate 플러그인 집합 (공식 Editor Kit 구조).
// usePlateEditor({ plugins: EditorKit }) 로 소비. 순서는 leaf/element 우선순위에 영향을 주므로
// 마크는 앞쪽, 폰트 스타일 마크는 마지막에 둔다(기존 동작 보존).

import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { ColumnKit } from "./plugins/column-kit";
import { TableKit } from "./plugins/table-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";
import { MediaKit } from "./plugins/media-kit";
import { LinkKit } from "./plugins/link-kit";
import { ListKit } from "./plugins/list-kit";
import { MathKit } from "./plugins/math-kit";
import { FileKit } from "./plugins/file-kit";
import { ToggleKit } from "./plugins/toggle-kit";
import { CalloutKit } from "./plugins/callout-kit";
import { FootnoteKit } from "./plugins/footnote-kit";
import { FontKit } from "./plugins/font-kit";
import { DndKit } from "./plugins/dnd-kit";

export const EditorKit = [
  ...DndKit,          // NodeId + block drag&drop (공식 @platejs/dnd) — id 먼저 부여
  ...BasicBlocksKit,  // paragraph, heading, blockquote, hr
  ...BasicMarksKit,   // bold, italic, ... code, kbd
  ...ColumnKit,
  ...TableKit,
  ...CodeBlockKit,
  ...MediaKit,        // image, media_embed
  ...LinkKit,
  ...ListKit,         // list, indent
  ...MathKit,         // equation, inline_equation
  ...FileKit,         // file_embed, audio_embed
  ...ToggleKit,
  ...CalloutKit,
  ...FootnoteKit,     // footnote_ref, footnote_content
  ...FontKit,         // color/bg/family/size/line-height/text-align
];
