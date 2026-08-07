"use client";

import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin,
  CodePlugin,
  KbdPlugin,
} from "@platejs/basic-nodes/react";
import {
  BoldRules,
  ItalicRules,
  UnderlineRules,
  StrikethroughRules,
  HighlightRules,
} from "@platejs/basic-nodes";
import { createPlatePlugin, PlateLeaf, type PlateLeafProps } from "platejs/react";
import { KEYS } from "platejs";
import { parseInlineColor } from "../../highlightCodeBlocks";

// 마크 규칙은 자기가 붙은 플러그인 key 를 마크 타입으로 쓰므로(config.mark ?? pluginKey)
// 반드시 owner 플러그인에 부착. super/sub( ^ / ~ )는 strikethrough(~~)·일반 입력과 충돌
// 소지가 있어 마크다운 입력 규칙은 생략(버튼/단축키로는 계속 사용 가능).

// 인라인 코드(`x`) 마크다운 변환 — 라이브러리 CodeRules.markdown() 대신 커스텀. 요구사항:
//  1) 닫는 백틱 입력 "즉시" 변환하지 않고, 그 뒤 스페이스를 눌러야 변환(사용자가 확정).
//  2) 여는 백틱 앞 글자가 공백이 아니어도(한글에 붙여 쓴 함수`foo()`를 같은 경우) 변환되게.
// 스페이스가 trigger — 커서 바로 앞의 `...` 를 찾아 내용에 code 마크를 씌우고 백틱을 지운다.
// 사용자가 누른 스페이스는 평문으로 유지(문장 중간 인라인 코드 뒤 띄어쓰기 자연스럽게).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const codeMarkdownRule: any = {
  target: "insertText",
  trigger: " ",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: ({ editor, text }: any) => {
    if (text !== " " || !editor.selection || !editor.api.isCollapsed()) return;
    const cursor = editor.selection.anchor;
    // 닫는 백틱을 커서 앞에서 찾는다. 백틱과 커서 사이는 없거나("`") 스페이스 하나("` ")만 허용 —
    // 후자는 IME/이벤트 순서로 트리거 스페이스가 먼저 삽입된 뒤 규칙이 도는 경우(스페이스 2번 방지).
    const beforeEnd = editor.api.before(cursor, { matchString: "`", skipInvalid: true });
    if (!beforeEnd) return;
    const gap = editor.api.string({ anchor: beforeEnd, focus: cursor });
    if (gap !== "`" && gap !== "` ") return;
    // 여는 백틱 (닫는 백틱 앞) — afterMatch 옵션은 이 경로에서 undefined 라 after() 로 경계를 잡는다
    const beforeStart = editor.api.before(beforeEnd, { matchString: "`", skipInvalid: true });
    if (!beforeStart) return;
    const afterStart = editor.api.after(beforeStart, { unit: "character" });
    if (!afterStart || editor.api.string({ anchor: beforeStart, focus: afterStart }) !== "`") return;
    const content = editor.api.string({ anchor: afterStart, focus: beforeEnd });
    // 빈 코드(``)·앞뒤 공백·내부 백틱 제외
    if (!content || content.trim() !== content || content.includes("`")) return;
    // afterClosing = 현재 커서(트리거 스페이스가 이미 들어갔다면 그것까지 포함해 지운다)
    return { beforeStart, afterClosing: cursor, content };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: ({ editor }: any, match: any) => {
    const type = editor.getType(KEYS.code);
    // `content`(+이미 삽입된 트리거 스페이스) 전체 삭제 → 커서는 시작점으로 collapse
    editor.tf.delete({ at: { anchor: match.beforeStart, focus: match.afterClosing } });
    // code 마크로 content 삽입 + 평문 스페이스(사용자가 누른 것) 유지
    editor.tf.addMark(type, true);
    editor.tf.insertText(match.content);
    editor.tf.removeMarks([type], { shouldChange: false });
    editor.tf.insertText(" ");
    return true;
  },
};

// 인라인 코드 뒤에서 Backspace → 안의 글자를 지우는 대신 코드 마크를 해제(= 백틱을 지운 것과 동등).
// 커서가 code 런의 "끝 경계"(직전 글자는 code, 직후 글자는 code 아님)일 때만 동작.
const CodeBackspaceUnwrapKit = createPlatePlugin({ key: "codeBackspaceUnwrap" }).overrideEditor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ editor, tf: { deleteBackward } }: any) => ({
    transforms: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deleteBackward(unit: any) {
        const sel = editor.selection;
        if (unit === "character" && sel && editor.api.isCollapsed()) {
          const type = editor.getType(KEYS.code);
          const beforePt = editor.api.before(sel.anchor, { unit: "character" });
          if (beforePt) {
            const prevNode = editor.api.node(beforePt.path)?.[0];
            const prevIsCode = !!(prevNode && prevNode[type]);
            let nextIsCode = false;
            const afterPt = editor.api.after(sel.anchor, { unit: "character" });
            if (afterPt) {
              const nextNode = editor.api.node(afterPt.path)?.[0];
              nextIsCode = !!(nextNode && nextNode[type]);
            }
            if (prevIsCode && !nextIsCode) {
              // code 런(그 leaf) 전체 선택 후 마크 제거 → 평문으로 해제
              editor.tf.select({ anchor: editor.api.start(beforePt.path), focus: editor.api.end(beforePt.path) });
              editor.tf.removeMarks([type]);
              editor.tf.collapse({ edge: "end" });
              return;
            }
          }
        }
        deleteBackward(unit);
      },
    },
  })
);

/** 인라인 코드 leaf — 내용이 색상값(#hex·rgb·hsl)이면 앞에 색 스와치(원)를 붙인다.
   리더(applyColorSwatches)와 동일한 전역 `.color-swatch` 룩 → 색상 칩이 에디터에서도 댓글/리더처럼 보임.
   contentEditable=false 로 장식만 하고 텍스트(props.children)는 그대로 렌더해 편집/선택에 영향 없음. */
function CodeLeaf(props: PlateLeafProps) {
  const color = parseInlineColor(props.leaf.text ?? "");
  return (
    <PlateLeaf {...props} as="code">
      {color && (
        <span className="color-swatch" contentEditable={false} aria-hidden style={{ background: color }} />
      )}
      {props.children}
    </PlateLeaf>
  );
}

/** 기본 인라인 마크 — bold / italic / underline / strike / super·subscript / highlight / code / kbd */
export const BasicMarksKit = [
  BoldPlugin.configure({ inputRules: [BoldRules.markdown()] }), // **굵게**
  ItalicPlugin.configure({ inputRules: [ItalicRules.markdown()] }), // *기울임*
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }), // __밑줄__
  StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()] }), // ~~취소~~
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin.configure({ inputRules: [HighlightRules.markdown()] }), // ==형광==
  CodePlugin.configure({ inputRules: [codeMarkdownRule], render: { node: CodeLeaf } }), // `코드` (스페이스로 확정 + 한글 인접 허용) + 색상값이면 스와치
  CodeBackspaceUnwrapKit, // 인라인 코드 뒤 Backspace → 코드 해제
  KbdPlugin,
];
