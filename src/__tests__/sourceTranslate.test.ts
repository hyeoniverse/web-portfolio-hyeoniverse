import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { collectKoTexts } from "@/lib/api/sourceTranslate";
import { sourceTargetOf } from "@/lib/siteLanguage";

describe("원문 칸 번역(#1425)", () => {
  it("설정에서 원문 칸(ko) 글의 자리를 모은다", () => {
    const config = {
      hero: { headline: ["Hi"], headline_ko: ["안녕", ""], subtext_ko: "소개" },
      categories: [{ ko: "개발", en: "Dev" }],
      metadata: { defaultLanguage: "ja", title: "Site" },
    };
    expect(collectKoTexts(config)).toEqual([
      [["hero", "headline_ko", 0], "안녕"],
      [["hero", "subtext_ko"], "소개"],
      [["categories", 0, "ko"], "개발"],
    ]);
  });

  it("원문 칸을 쓸 언어 — en 이면 원문은 en 칸이라 없다", () => {
    expect(sourceTargetOf("ko")).toBe("ko");
    expect(sourceTargetOf("ja")).toBe("ja");
    expect(sourceTargetOf("en")).toBeNull();
  });
});
