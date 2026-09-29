import { describe, expect, it } from "vitest";
import { applyLexicon, sanitizeLexicon } from "@/lib/ttsLexicon";

describe("applyLexicon", () => {
  it("표기를 읽을 말로 바꾼다", () => {
    expect(applyLexicon("목록 API 의 ?all=true 에", [{ from: "?all=true", to: "올 트루 조건" }])).toBe("목록 API 의 올 트루 조건 에");
  });

  it("긴 표기를 먼저 바꾸고, 바꾼 말을 다시 바꾸지 않는다", () => {
    const entries = [{ from: "all", to: "올" }, { from: "?all=true", to: "all 트루" }];
    expect(applyLexicon("?all=true 와 all", entries)).toBe("all 트루 와 올");
  });

  it("여러 번 나오면 모두 바꾼다", () => {
    expect(applyLexicon("RLS 와 RLS", [{ from: "RLS", to: "알엘에스" }])).toBe("알엘에스 와 알엘에스");
  });
});

describe("sanitizeLexicon", () => {
  it("공백을 지우고 빈 표기·중복을 버린다", () => {
    expect(sanitizeLexicon([{ from: " RLS ", to: " 알엘에스 " }, { from: "", to: "x" }, { from: "RLS", to: "중복" }, "bad"])).toEqual([{ from: "RLS", to: "알엘에스" }]);
  });
});

describe("parseLexiconLines / mergeLexicon", () => {
  it("탭·화살표·빈칸 있는 = 로 나누고, 표기 안의 = 는 그대로 둔다", async () => {
    const { parseLexiconLines } = await import("@/lib/ttsLexicon");
    expect(parseLexiconLines("?all=true = 올 트루 조건\nRLS\t알엘에스\nJWT → 제이더블유티\n구분 없음\n")).toEqual([
      { from: "?all=true", to: "올 트루 조건" },
      { from: "RLS", to: "알엘에스" },
      { from: "JWT", to: "제이더블유티" },
    ]);
  });

  it("같은 표기는 새 값으로, 새 표기는 뒤에", async () => {
    const { mergeLexicon } = await import("@/lib/ttsLexicon");
    expect(mergeLexicon([{ from: "RLS", to: "알엘에스" }], [{ from: "RLS", to: "알 엘 에스" }, { from: "API", to: "에이피아이" }])).toEqual([
      { from: "RLS", to: "알 엘 에스" },
      { from: "API", to: "에이피아이" },
    ]);
  });
});

describe("displayScript / spokenScript", () => {
  it("[표기|읽을 말] — 화면에는 표기, 음성에는 읽을 말", async () => {
    const { displayScript, spokenScript } = await import("@/lib/ttsLexicon");
    const src = "응답은 20[ms|밀리세컨드], 회사는 [MS|마이크로소프트]";
    expect(displayScript(src)).toBe("응답은 20ms, 회사는 MS");
    expect(spokenScript(src)).toBe("응답은 20밀리세컨드, 회사는 마이크로소프트");
  });

  it("자리 지정이 사전보다 먼저이고, 나머지는 사전을 따른다", async () => {
    const { spokenScript } = await import("@/lib/ttsLexicon");
    const entries = [{ from: "ms", to: "엠에스" }];
    expect(spokenScript("[ms|밀리세컨드] 와 ms", entries)).toBe("밀리세컨드 와 엠에스");
  });
});
