import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "../editor-kit";
import { slateToHtml, type SlateNode } from "../../plateSerializer";

/* 회귀 — 표의 행 높이가 저장 안 되던 문제.
   Plate 는 행 높이를 tr 노드의 `size` 에 저장하는데(setTableRowSize → setNodes({size})),
   plateSerializer 의 tr 케이스가 `<tr>${children}</tr>` 로 속성을 통째로 버리고 있었다.
   에디터는 HTML 로 저장하므로 다시 열면 높이가 사라진다. */

const table = (size?: number) =>
  [
    {
      type: "table",
      children: [
        {
          type: "tr",
          ...(size ? { size } : {}),
          children: [{ type: "td", children: [{ type: "p", children: [{ text: "셀" }] }] }],
        },
      ],
    },
  ] as unknown as SlateNode[];

describe("표 행 높이 저장", () => {
  it("size 가 HTML 에 실린다", () => {
    const html = slateToHtml(table(120));
    expect(html).toContain('data-row-size="120"');
    expect(html).toContain("height: 120px");
  });

  it("size 가 없으면 속성도 없다", () => {
    const html = slateToHtml(table());
    expect(html).not.toContain("data-row-size");
  });

  it("HTML → 에디터 왕복으로 size 가 복원된다", () => {
    const html = slateToHtml(table(120));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = createPlateEditor({ plugins: EditorKit as never[], value: [] } as any);
    const el = document.createElement("div");
    el.innerHTML = html;
    const nodes = editor.api.html.deserialize({ element: el });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findTr = (ns: any[]): any => {
      for (const n of ns) {
        if (n.type === "tr") return n;
        const hit = n.children ? findTr(n.children) : null;
        if (hit) return hit;
      }
      return null;
    };
    const tr = findTr(nodes as never[]);
    expect(tr).toBeTruthy();
    expect(tr.size).toBe(120);
  });

  it("style 만 있는 tr(외부 HTML 붙여넣기)도 높이를 읽는다", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = createPlateEditor({ plugins: EditorKit as never[], value: [] } as any);
    const el = document.createElement("div");
    el.innerHTML = '<table><tbody><tr style="height: 80px"><td>x</td></tr></tbody></table>';
    const nodes = editor.api.html.deserialize({ element: el });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findTr = (ns: any[]): any => {
      for (const n of ns) {
        if (n.type === "tr") return n;
        const hit = n.children ? findTr(n.children) : null;
        if (hit) return hit;
      }
      return null;
    };
    expect(findTr(nodes as never[])?.size).toBe(80);
  });
});
