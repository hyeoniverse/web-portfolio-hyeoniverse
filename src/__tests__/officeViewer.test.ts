import { describe, it, expect } from "vitest";
import { officeViewerUrl, migrateOfficeViewerUrls, isOfficeDocUrl, officeDocKind } from "@/lib/officeViewer";

/* 오피스 문서 미리보기는 마이크로소프트 뷰어로 연다 — 구글 뷰어는 iframe 요청의 40% 가량에 빈 응답(204)을 줘서
   틀이 비고 크롬이 "gview 다운로드 실패" 를 띄웠다. 예전 글에 굳어 있는 구글 뷰어 주소도 그릴 때 바꾼다. */

const FILE = "https://x.supabase.co/storage/v1/object/public/posts/posts/a b.pptx";

describe("officeViewer", () => {
  it("마이크로소프트 뷰어 주소를 만든다", () => {
    expect(officeViewerUrl(FILE)).toBe(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(FILE)}`);
  });

  it("저장된 본문의 구글 뷰어 주소를 바꾼다 — & 와 &amp; 둘 다", () => {
    const g = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(FILE)}`;
    const html = `<iframe src="${g}"></iframe><iframe src="${g.replace("&url", "&amp;url")}"></iframe>`;
    const out = migrateOfficeViewerUrls(html);
    expect(out).not.toContain("docs.google.com");
    expect(out.match(/view\.officeapps\.live\.com\/op\/embed\.aspx\?src=/g)).toHaveLength(2);
    expect(out).toContain(encodeURIComponent(FILE));
  });

  it("다른 iframe·링크는 건드리지 않는다", () => {
    const html = `<iframe src="https://www.youtube.com/embed/x"></iframe><a href="https://docs.google.com/document/d/1">문서</a>`;
    expect(migrateOfficeViewerUrls(html)).toBe(html);
  });

  it("문서 칸을 알아보고 형식 이름을 붙인다", () => {
    expect(isOfficeDocUrl("https://a/b.ppt")).toBe(true);
    expect(isOfficeDocUrl("https://a/b.PPTX?x=1")).toBe(true);
    expect(isOfficeDocUrl("https://a/b.png")).toBe(false);
    expect(officeDocKind("https://a/b.ppt")).toBe("PPT");
  });
});
