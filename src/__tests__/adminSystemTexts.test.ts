import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetAdminTextsForTest, lookupAdminText, requestAdminTexts } from "@/lib/adminTexts";
import { localizeReportReason } from "@/lib/reportReasons";
import { adminTextSourceLang } from "@/lib/adminTextsShared";

beforeEach(() => {
  localStorage.clear();
  __resetAdminTextsForTest();
});

describe("관리자 시스템 글 번역(lib/adminTexts)", () => {
  it("보이는 글을 모아 한 번에 묻고, 받은 것을 저장한다 — 다시 묻지 않는다", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ translations: { "새 댓글": "Neuer Kommentar" } }))));
    requestAdminTexts("de", ["새 댓글", "실패할 글"], fetcher as unknown as typeof fetch);
    requestAdminTexts("de", ["새 댓글"], fetcher as unknown as typeof fetch);
    await vi.waitFor(() => expect(lookupAdminText("de", "새 댓글")).toBe("Neuer Kommentar"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(lookupAdminText("de", "실패할 글")).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("adminTexts:de")!)).toEqual({ "새 댓글": "Neuer Kommentar" });

    requestAdminTexts("de", ["새 댓글", "실패할 글"], fetcher as unknown as typeof fetch);
    await new Promise((r) => setTimeout(r, 0));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("원문 언어 판정 — 한글이 있으면 ko", () => {
    expect(adminTextSourceLang("AI 요약 실패")).toBe("ko");
    expect(adminTextSourceLang("AI failure")).toBe("en");
  });
});

describe("신고 사유(localizeReportReason)", () => {
  const dict: Record<string, Record<string, string>> = {
    ko: { "comments.reportReasonSpam": "스팸/광고" },
    en: { "comments.reportReasonSpam": "Spam/Ads" },
  };
  const tLang = (k: string, l: "ko" | "en") => dict[l][k] ?? k;
  const t = (k: string) => (k === "comments.reportReasonSpam" ? "Spam/Werbung" : k);

  it("프리셋 라벨만 지금 언어로, 상세는 원문", () => {
    expect(localizeReportReason("스팸/광고", t, tLang)).toBe("Spam/Werbung");
    expect(localizeReportReason("Spam/Ads · 링크 도배", t, tLang)).toBe("Spam/Werbung · 링크 도배");
    expect(localizeReportReason("직접 쓴 사유", t, tLang)).toBe("직접 쓴 사유");
  });
});
