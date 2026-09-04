import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { slateToHtml, type SlateNode } from "@/components/posts/plateSerializer";

/**
 * 에디터 모델 테스트 — Phase 4-5(컴포넌트 슬라이스) 의 안전망.
 *
 * 편집 화면은 렌더해서 확인하기 어렵고 IME 같은 경로는 e2e 로만 볼 수 있다. 대신 문서 모델은
 * headless 로 다룰 수 있으므로, 실제 플러그인 구성(EditorKit)으로 에디터를 만들어
 * "연산을 넣으면 문서가 이렇게 된다" 를 고정한다.
 *
 * 분해가 깨뜨리는 것 대부분이 이 층에서 잡힌다 — 플러그인 등록 누락, 요소 타입 오타,
 * 정규화 규칙 유실. 내부 API(pluginList 등)에 기대지 않고 공개 동작만 본다.
 */

const p = (text = "") => ({ type: "p", children: [{ text }] });

function makeEditor(value: SlateNode[] = [p("")]) {
  return createPlateEditor({ plugins: EditorKit, value: value as never });
}

describe("에디터 인스턴스", () => {
  it("실제 플러그인 구성으로 만들어진다", () => {
    const editor = makeEditor([p("안녕")]);
    expect(editor.children as unknown[]).toHaveLength(1);
    expect(JSON.stringify(editor.children)).toContain("안녕");
  });

  it("빈 문서로 시작해도 문단 하나는 있다", () => {
    expect((makeEditor().children as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("텍스트 입력", () => {
  it("커서 위치에 글자가 들어간다", () => {
    const editor = makeEditor([p("")]);
    editor.tf.select({ path: [0, 0], offset: 0 });
    editor.tf.insertText("한글");
    expect(JSON.stringify(editor.children)).toContain("한글");
  });

  it("이어서 넣으면 뒤에 붙는다", () => {
    const editor = makeEditor([p("")]);
    editor.tf.select({ path: [0, 0], offset: 0 });
    editor.tf.insertText("가");
    editor.tf.insertText("나");
    const first = editor.children[0] as { children: { text: string }[] };
    expect(first.children[0].text).toBe("가나");
  });
});

describe("직렬화 — 저장 형식이 바뀌면 기존 글이 깨진다", () => {
  /* 앱이 실제로 쓰는 블록 타입들. 요소를 파일로 옮기다 타입 문자열이 어긋나면
     여기서 HTML 이 달라진다. */
  const cases: [string, SlateNode[]][] = [
    ["문단", [p("본문")]],
    ["제목", [{ type: "h2", children: [{ text: "소제목" }] } as SlateNode]],
    ["인용", [{ type: "blockquote", children: [{ text: "인용문" }] } as SlateNode]],
    ["구분선", [{ type: "hr", children: [{ text: "" }] } as SlateNode]],
    ["코드블록", [{
      type: "code_block", lang: "ts",
      children: [{ type: "code_line", children: [{ text: "const a = 1;" }] }],
    } as unknown as SlateNode]],
    ["열 그룹", [{
      type: "column_group",
      children: [
        { type: "column", width: "50%", children: [p("왼쪽")] },
        { type: "column", width: "50%", children: [p("오른쪽")] },
      ],
    } as unknown as SlateNode]],
    ["콜아웃", [{ type: "callout", children: [p("주의")] } as unknown as SlateNode]],
    ["토글", [{ type: "toggle", children: [p("접힌 내용")] } as unknown as SlateNode]],
    ["볼드·이탤릭", [{ type: "p", children: [
      { text: "굵게", bold: true }, { text: " " }, { text: "기울임", italic: true },
    ] } as unknown as SlateNode]],
  ];

  for (const [name, value] of cases) {
    it(`${name} 이 같은 HTML 로 나온다`, () => {
      expect(slateToHtml(value)).toMatchSnapshot();
    });
  }

  it("빈 문서도 예외 없이 처리된다", () => {
    expect(() => slateToHtml([p("")])).not.toThrow();
  });
});
