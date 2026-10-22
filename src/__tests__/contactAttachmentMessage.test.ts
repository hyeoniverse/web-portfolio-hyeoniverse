import { describe, expect, it } from "vitest";
import { contactMessageWithAttachment } from "@/lib/contact/attachmentMessage";

/* 문의 메일 본문 — 첨부는 공급자에 싣지 않고 비공개 버킷의 내려받기 링크로 본문 아래에 붙인다 */
describe("contactMessageWithAttachment", () => {
  it("첨부가 없으면 본문 그대로", () => {
    expect(contactMessageWithAttachment("안녕하세요", null)).toBe("안녕하세요");
  });

  it("첨부가 있으면 구분선 · 파일 이름 · 링크 · 닫히는 날(한국 시간, 7일 뒤)을 붙인다", () => {
    const now = new Date("2026-10-22T03:00:00Z"); // 한국 12:00
    const out = contactMessageWithAttachment("안녕하세요", { name: "제안서.pdf", url: "https://x.supabase.co/sign/a" }, now);
    const lines = out.split("\n");
    expect(lines[0]).toBe("안녕하세요");
    expect(lines).toContain("첨부 파일: 제안서.pdf");
    expect(lines).toContain("내려받기: https://x.supabase.co/sign/a");
    expect(out).toMatch(/2026\. 10\. 29\..*12:00까지\(7일\)/);
  });

  it("파일 이름이 비면 file", () => {
    expect(contactMessageWithAttachment("m", { name: "", url: "u" })).toContain("첨부 파일: file");
  });
});
