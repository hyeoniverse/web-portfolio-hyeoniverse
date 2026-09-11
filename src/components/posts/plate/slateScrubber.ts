import { Scrubber } from "slate";

/* Slate 가 오류 메시지에 넣는 노드를 줄인다.
   Slate 는 없는 경로를 찾으면 "Cannot find a descendant at path … in node: …" 처럼 노드를 JSON 으로 통째로
   넣어 던진다(Scrubber.stringify). Plate 는 목록 정규화 같은 곳에서 "있는지 알아보려고" 이런 조회를 try/catch 로
   자주 하고 오류는 버리는데, 노드가 편집기 자체면 문서 전체와 Plate 플러그인 상태까지 문자열로 만든다.
   작업물 편집기를 열 때 이것만 130 ms 남짓 걸렸다. 메시지에는 자식 수만 남기고, 편집기는 문서 크기와 선택만 적는다.
   Scrubber 는 Slate 가 이런 용도로 열어 둔 설정이다(원래는 민감한 내용을 가리려는 것). */
Scrubber.setScrubber((key, value) => {
  if (key === "children" && Array.isArray(value)) return `[${value.length} children]`;
  if (key === "" && value && typeof value === "object" && Array.isArray((value as { children?: unknown }).children)
    && typeof (value as { apply?: unknown }).apply === "function") {
    const editor = value as { children: unknown[]; selection: unknown };
    return { editor: `[${editor.children.length} children]`, selection: editor.selection };
  }
  return value;
});
