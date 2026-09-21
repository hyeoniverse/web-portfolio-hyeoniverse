import { describe, it, expect } from "vitest";
import { initialContentLang, isContentMissing, pickContent, textLang } from "@/lib/contentLang";

/* 작업물 상세의 언어 대체·번역 단추 — 어느 언어 칸에 실제 글이 있는지 */

const KO_README = "# 할 일 관리 웹 애플리케이션\n\nReact 와 TypeScript 로 만든 할 일 관리 서비스입니다.\n\n```bash\nnpm install && npm run dev\n```";
const EN_README = "# CHATBuddy\n\nA chat app that helps people with hearing loss talk with friends.";

describe("글이 쓰인 언어", () => {
  it("기술 이름·코드가 섞여도 한국어 글은 한국어로 본다", () => {
    expect(textLang(KO_README)).toBe("ko");
    expect(textLang(EN_README)).toBe("en");
  });
});

describe("그 언어 칸에 글이 없는지", () => {
  it("비었거나 빈 문단만 남았으면 없다 — 그림만 있는 칸은 있다", () => {
    expect(isContentMissing("", KO_README, "en")).toBe(true);
    expect(isContentMissing("<p></p>", KO_README, "en")).toBe(true);
    expect(isContentMissing('<p><img src="a.png"></p>', KO_README, "en")).toBe(false);
  });

  it("README 를 두 칸에 똑같이 복사했으면 글이 쓰인 언어 쪽만 있다", () => {
    expect(isContentMissing(KO_README, KO_README, "en")).toBe(true);
    expect(isContentMissing(KO_README, KO_README, "ko")).toBe(false);
    expect(isContentMissing(EN_README, EN_README, "ko")).toBe(true);
    expect(isContentMissing(EN_README, EN_README, "en")).toBe(false);
  });

  it("두 칸이 다르면 손으로 쓴 것으로 보고 그대로 둔다", () => {
    expect(isContentMissing(EN_README, KO_README, "en")).toBe(false);
    expect(isContentMissing(KO_README, EN_README, "ko")).toBe(false);
  });
});

describe("보여 줄 본문과 처음 언어", () => {
  it("보는 언어 칸에 글이 없으면 다른 언어 본문", () => {
    expect(pickContent({ ko: KO_README, en: "" }, "en")).toBe(KO_README);
    expect(pickContent({ ko: KO_README, en: "<p></p>" }, "en")).toBe(KO_README);
    expect(pickContent({ ko: KO_README, en: EN_README }, "en")).toBe(EN_README);
  });

  it("한쪽에만 글이 있으면 그 언어로 연다", () => {
    expect(initialContentLang({ ko: KO_README, en: KO_README }, "en")).toBe("ko");
    expect(initialContentLang({ ko: EN_README, en: EN_README }, "ko")).toBe("en");
    expect(initialContentLang({ ko: KO_README, en: EN_README }, "en")).toBe("en");
  });
});
