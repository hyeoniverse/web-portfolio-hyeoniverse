import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { slateToHtml, type SlateNode } from "@/components/posts/plateSerializer";
import { isolateFloatImageBlocks, restoreBlockIndent } from "@/components/posts/plate/editorHtmlOps";

/* 그림이 든 문단은 불러와 다시 저장해도 같은 HTML 이어야 한다(#839).
   예전에는 그림 문단을 <p><figure/></p> 로 저장했다. <figure> 는 <p> 안에 둘 수 없어 HTML 파서가 <p> 를 닫고
   남은 </p> 로 빈 문단을 만들어, 편집 화면을 열고 저장할 때마다 그림 앞뒤로 빈 문단이 하나씩 늘었다.
   불러오기는 편집기(PlateEditor)가 하는 순서 그대로다: 역직렬화 → 들여쓰기 복원 → 그림 문단 분리 → 정규화. */

function roundtrip(html: string): string {
  const editor = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "" }] }] as never });
  const nodes = restoreBlockIndent(html, editor.api.html.deserialize({ element: html }) as Array<Record<string, unknown>>);
  editor.tf.setValue(isolateFloatImageBlocks(nodes) as never);
  editor.tf.normalize({ force: true });
  return slateToHtml(editor.children as SlateNode[]);
}

const figure = (layout: string) =>
  `<figure style="display:block;margin:1em 0"><img src="https://img.test/a.png" style="width:268px;max-width:100%" data-width="268"${layout === "inline" ? "" : ` data-layout="${layout}"`} /></figure>`;
const emptyParagraphs = (html: string) => (html.match(/<p>[​]*<\/p>/g) ?? []).length;

describe("그림 문단 왕복", () => {
  for (const layout of ["float-left", "float-right", "block", "inline"]) {
    it(`${layout} 그림: 두 번째부터는 불러와 저장해도 그대로다`, () => {
      const first = roundtrip(`<p>앞 문단</p><p>​${figure(layout)}​뒤 글자</p><p>끝</p>`);
      expect(first, "그림을 문단 안에 두지 않는다").not.toMatch(/<p[^>]*>[^<]*<figure/);
      const second = roundtrip(first);
      expect(second).toBe(first);
      expect(roundtrip(second)).toBe(first);
    });
  }

  it("그림 앞뒤의 글자는 각자 문단으로 남는다", () => {
    const out = roundtrip(`<p>그림 앞 글자${figure("inline")}그림 뒤 글자</p>`);
    expect(out).toContain("<p>그림 앞 글자</p>");
    expect(out).toContain("그림 뒤 글자</p>");
    expect(out).toContain("<figure");
  });

  it("이미 늘어난 빈 문단은 그대로 두되 더 늘지 않는다", () => {
    const damaged = `<p></p>${"<p>​</p>".repeat(7)}<p>​${figure("float-left")}</p><p>본문</p>`;
    const first = roundtrip(damaged);
    const again = roundtrip(roundtrip(first));
    expect(emptyParagraphs(again)).toBe(emptyParagraphs(first));
    expect(again).toBe(first);
  });
});
