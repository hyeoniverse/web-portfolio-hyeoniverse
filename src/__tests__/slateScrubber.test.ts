import { describe, it, expect } from "vitest";
import { createEditor, Node, type Descendant } from "slate";
import "@/components/posts/plate/slateScrubber";

/* Slate 는 없는 경로를 찾으면 오류 메시지에 노드를 JSON 으로 통째로 넣는다. Plate 는 목록 정규화 같은 곳에서
   이런 조회를 try/catch 로 자주 하고 오류를 버리는데, 노드가 편집기면 문서 전체와 플러그인 상태까지 문자열로
   만들어 작업물 편집기를 열 때만 130 ms 남짓 걸렸다(#838). 메시지에는 자식 수만 남아야 한다. */

const paragraph = (text: string): Descendant => ({ type: "p", children: [{ text }] } as unknown as Descendant);

describe("Slate 오류 메시지", () => {
  it("편집기에서 없는 경로를 찾으면 문서 대신 자식 수만 적는다", () => {
    const editor = createEditor();
    editor.children = Array.from({ length: 200 }, (_, i) => paragraph(`문단 ${i} `.repeat(20)));
    let message = "";
    try { Node.get(editor, [999]); } catch (e) { message = (e as Error).message; }
    expect(message).toContain("[200 children]");
    expect(message).not.toContain("문단 0");
    expect(message.length).toBeLessThan(300);
  });

  it("요소의 자식도 수만 적는다", () => {
    const node = paragraph("본문 텍스트");
    let message = "";
    try { Node.child(node as never, 5); } catch (e) { message = (e as Error).message; }
    expect(message).toContain("[1 children]");
    expect(message).not.toContain("본문 텍스트");
  });
});
