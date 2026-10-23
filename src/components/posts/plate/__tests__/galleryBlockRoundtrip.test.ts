import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { slateToHtml, type SlateNode } from "@/components/posts/plateSerializer";
import { normalizeGallery } from "@/components/posts/plate/gallery/model";

/* 슬라이드 갤러리 블록 — 주소 목록과 장마다의 대본 · 음성이 data-gallery 에 담겨, 불러와 다시 저장해도 그대로여야 한다 */

function roundtrip(html: string): string {
  const editor = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "" }] }] as never });
  editor.tf.setValue(editor.api.html.deserialize({ element: html }) as never);
  editor.tf.normalize({ force: true });
  return slateToHtml(editor.children as SlateNode[]);
}

const data = {
  gallery: ["https://img.test/1.webp", "https://img.test/2.mp4"],
  notes: { "https://img.test/1.webp": { script: "첫 장 \"대본\" & <설명>", audio: "https://img.test/1.mp3", audioSource: "tts" } },
};

describe("갤러리 블록", () => {
  it("저장 → 불러오기 → 저장이 같은 HTML", () => {
    const html = slateToHtml([{ type: "p", children: [{ text: "앞" }] }, { type: "gallery", data, children: [{ text: "" }] }, { type: "p", children: [{ text: "뒤" }] }] as SlateNode[]);
    expect(html).toContain("data-gallery=");
    const second = roundtrip(html);
    expect(second).toBe(html);
    const raw = /data-gallery="([^"]*)"/.exec(second)?.[1] ?? "";
    const parsed = JSON.parse(raw.replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    expect(parsed).toEqual(data);
  });

  it("빈 갤러리는 저장하지 않는다", () => {
    expect(slateToHtml([{ type: "gallery", data: { gallery: [], notes: {} }, children: [{ text: "" }] }] as SlateNode[])).toBe("");
  });

  it("normalizeGallery — 문자열 주소만, 갤러리에 없는 장의 노트는 뺀다", () => {
    expect(normalizeGallery({ gallery: ["a", "", 3, "b"], notes: { a: { script: "x" }, z: { script: "y" } } })).toEqual({ gallery: ["a", "b"], notes: { a: { script: "x" } } });
    expect(normalizeGallery(null)).toEqual({ gallery: [], notes: {} });
  });
});
