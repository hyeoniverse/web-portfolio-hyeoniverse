/** 라이브 데모 — 상한 읽기 · 입력 검사 · IP 키 · 공급자 이름 찾기 · 라우트 흐름(429 · 503 · 502 환불) */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DEMO_LIMITS, demoLimits } from "@/lib/demo/limits";
import { DemoInputError, demoChoice, demoText } from "@/lib/demo/input";
import { hashDemoIp } from "@/lib/demo/ip";
import { isMissingQuota } from "@/lib/demo/quota";

const quota = vi.hoisted(() => ({
  take: vi.fn<() => Promise<number>>(),
  refund: vi.fn<() => Promise<number | undefined>>(),
  remaining: vi.fn<() => Promise<number>>(),
}));

vi.mock("@/lib/demo/quota", async (orig) => {
  const real = await orig<typeof import("@/lib/demo/quota")>();
  return { ...real, takeDemoQuota: quota.take, refundDemoQuota: quota.refund, readDemoRemaining: quota.remaining };
});

const { allUnavailable, handleDemoGet, handleDemoPost, succeededProvider } = await import("@/lib/demo/handler");
const { DemoQuotaUnavailable } = await import("@/lib/demo/quota");
const { parseCover } = await import("@/lib/demo/cover");
const { parseTranslate } = await import("@/lib/demo/translate");

describe("demoLimits", () => {
  it("env 가 없으면 기본값", () => {
    expect(demoLimits("cover", {})).toEqual(DEFAULT_DEMO_LIMITS.cover);
    expect(DEFAULT_DEMO_LIMITS.translate).toEqual({ perIp: 3, total: 50 });
  });
  it("env 로 바꾸고, 0 은 끄기로 받는다", () => {
    expect(demoLimits("speech", { DEMO_SPEECH_PER_IP: "10", DEMO_SPEECH_TOTAL: "0" })).toEqual({ perIp: 10, total: 0 });
  });
  it("숫자가 아니거나 음수 · 소수면 기본값", () => {
    expect(demoLimits("summary", { DEMO_SUMMARY_PER_IP: "abc", DEMO_SUMMARY_TOTAL: "-1" })).toEqual(DEFAULT_DEMO_LIMITS.summary);
    expect(demoLimits("summary", { DEMO_SUMMARY_PER_IP: "1.5" }).perIp).toBe(3);
  });
});

describe("demoText", () => {
  const rule = { max: 10, empty: "비었습니다.", refused: "거절합니다." };
  it("공백을 줄이고 다듬는다", () => {
    expect(demoText("  안녕   \n 하세요 ", rule)).toBe("안녕 하세요");
    expect(demoText("a\r\n\n\n\nb", { ...rule, lines: true })).toBe("a\n\nb");
  });
  it("비었거나 길면 이유를 던진다", () => {
    expect(() => demoText("   ", rule)).toThrow("비었습니다.");
    expect(() => demoText(42, rule)).toThrow(DemoInputError);
    expect(() => demoText("가".repeat(11), rule)).toThrow("10자까지만 받습니다.");
  });
  it("이모지는 한 글자로 센다", () => {
    expect(demoText("😀".repeat(10), rule)).toBe("😀".repeat(10));
  });
  it("제어 문자 · 주소 · 욕설은 받지 않는다", () => {
    expect(() => demoText("a\u0007b", rule)).toThrow("읽을 수 없는 글자가 있습니다.");
    expect(() => demoText("see https://x", { ...rule, max: 100 })).toThrow("거절합니다.");
    expect(() => demoText("fuck", rule)).toThrow("거절합니다.");
  });
  it("allowLinks 면 주소는 통과, 욕설은 그대로 거절", () => {
    expect(demoText("https://a.b", { ...rule, max: 100, allowLinks: true })).toBe("https://a.b");
    expect(() => demoText("shit https://a.b", { ...rule, max: 100, allowLinks: true })).toThrow("거절합니다.");
  });
});

describe("demoChoice", () => {
  it("비면 기본값, 아는 값은 그대로, 모르는 값은 400", () => {
    expect(demoChoice(undefined, ["en", "ko"] as const, "en", "x")).toBe("en");
    expect(demoChoice("ko", ["en", "ko"] as const, "en", "x")).toBe("ko");
    expect(() => demoChoice("ja", ["en", "ko"] as const, "en", "언어가 틀렸습니다.")).toThrow("언어가 틀렸습니다.");
  });
});

describe("parseCover", () => {
  it("스타일이 없으면 abstract, 모르는 스타일 · 프로토타입 키는 400", () => {
    expect(parseCover({ prompt: "바다" })).toEqual({ prompt: "바다", style: "abstract" });
    expect(parseCover({ prompt: "바다", style: "watercolor" }).style).toBe("watercolor");
    expect(() => parseCover({ prompt: "바다", style: "toString" })).toThrow(DemoInputError);
  });
});

describe("hashDemoIp", () => {
  it("같은 IP 는 같은 키, 다른 IP · 다른 비밀값은 다른 키, 원문은 남지 않는다", () => {
    const a = hashDemoIp("1.2.3.4", "s");
    expect(a).toBe(hashDemoIp("1.2.3.4", "s"));
    expect(a).not.toBe(hashDemoIp("1.2.3.5", "s"));
    expect(a).not.toBe(hashDemoIp("1.2.3.4", "t"));
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("1.2.3.4");
  });
});

describe("isMissingQuota", () => {
  it("함수 · 테이블 없음만 준비 전으로 본다", () => {
    expect(isMissingQuota({ code: "PGRST202" })).toBe(true);
    expect(isMissingQuota({ code: "42P01" })).toBe(true);
    expect(isMissingQuota({ code: "42883" })).toBe(true);
    expect(isMissingQuota({ code: "23505" })).toBe(false);
    expect(isMissingQuota(null)).toBe(false);
  });
});

describe("succeededProvider · allUnavailable", () => {
  it("실패로 남지 않은 첫 공급자", () => {
    expect(succeededProvider(["deepl", "gemini"], [{ provider: "deepl", kind: "quota" }], (p) => p)).toBe("gemini");
    expect(succeededProvider(["google", "deepl"], [], (p) => (p === "google" ? "google_translate" : p))).toBe("google_translate");
    expect(succeededProvider(["deepl"], [{ provider: "deepl", kind: "invalid_key" }], (p) => p)).toBeNull();
  });
  it("키 없음 · 꺼짐뿐이면 준비 안 됨(503), 하나라도 진짜 실패면 아님", () => {
    expect(allUnavailable([{ provider: "deepl", kind: "no_key" }, { provider: "gemini", kind: "quota", disabled: true, skipped: true }])).toBe(true);
    expect(allUnavailable([{ provider: "deepl", kind: "no_key" }, { provider: "gemini", kind: "server" }])).toBe(false);
    expect(allUnavailable([])).toBe(false);
  });
});

describe("라우트 흐름", () => {
  const post = (body: unknown) =>
    new Request("http://localhost/api/demo/translate", { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const parse = (b: Record<string, unknown>) => ({ text: demoText(b.text, { max: 10, empty: "비었습니다.", refused: "거절합니다." }) });
  const ok = vi.fn(async (i: { text: string }) => ({ ok: true as const, data: { text: i.text.toUpperCase(), provider: "DeepL" } }));

  beforeEach(() => {
    quota.take.mockReset();
    quota.refund.mockReset();
    quota.remaining.mockReset();
    ok.mockClear();
  });

  it("GET 은 남은 횟수와 상한", async () => {
    quota.remaining.mockResolvedValue(2);
    const res = await handleDemoGet(new Request("http://localhost/api/demo/translate"), "translate");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ remaining: 2, perIp: 3, total: 50 });
  });

  it("마이그레이션 전이면 503 과 한국어 문장", async () => {
    quota.remaining.mockRejectedValue(new DemoQuotaUnavailable("missing", true));
    const res = await handleDemoGet(new Request("http://localhost/api/demo/translate"), "translate");
    expect(res.status).toBe(503);
    expect((await res.json()).message).toContain("준비하고 있습니다.");
  });

  it("성공하면 결과와 남은 횟수", async () => {
    quota.take.mockResolvedValue(1);
    const res = await handleDemoPost(post({ text: "hi" }), "translate", { parse, run: ok });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "HI", provider: "DeepL", remaining: 1 });
  });

  it("잘못된 입력은 400 — 횟수를 쓰지 않는다", async () => {
    const res = await handleDemoPost(post({ text: "" }), "translate", { parse, run: ok });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "비었습니다." });
    const broken = await handleDemoPost(post("{oops"), "translate", { parse, run: ok });
    expect(broken.status).toBe(400);
    expect(quota.take).not.toHaveBeenCalled();
  });

  it("기능을 꺼 두었으면 503 — 횟수를 쓰지 않는다", async () => {
    const res = await handleDemoPost(post({ text: "hi" }), "translate", { parse, unavailable: async () => "지금은 쓸 수 없습니다.", run: ok });
    expect(res.status).toBe(503);
    expect(quota.take).not.toHaveBeenCalled();
  });

  it("상한에 닿으면 429 와 remaining 0, 공급자를 부르지 않는다", async () => {
    quota.take.mockResolvedValue(-1);
    const res = await handleDemoPost(post({ text: "hi" }), "translate", { parse, run: ok });
    expect(res.status).toBe(429);
    expect((await res.json()).remaining).toBe(0);
    expect(ok).not.toHaveBeenCalled();
  });

  it("공급자가 모두 실패하면 돌려주고 502", async () => {
    quota.take.mockResolvedValue(0);
    quota.refund.mockResolvedValue(1);
    const res = await handleDemoPost(post({ text: "hi" }), "translate", { parse, run: async () => ({ ok: false, status: 502, message: "번역하지 못했습니다." }) });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "번역하지 못했습니다.", remaining: 1 });
    expect(quota.refund).toHaveBeenCalledTimes(1);
  });

  it("예상하지 못한 오류도 돌려주고 502 — 원문은 싣지 않는다", async () => {
    quota.take.mockResolvedValue(0);
    quota.refund.mockResolvedValue(1);
    const res = await handleDemoPost(post({ text: "hi" }), "translate", { parse, run: async () => { throw new Error("secret sk_live_xxx"); } });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("sk_live");
    expect(quota.refund).toHaveBeenCalledTimes(1);
  });
});

describe("번역 데모 입력 — 원문 · 번역할 언어", () => {
  it("원문 언어를 고르지 않으면 예전처럼 ko ↔ en 반대쪽으로 본다", () => {
    expect(parseTranslate({ text: "hello", target: "ko" })).toMatchObject({ source: "en", target: "ko" });
    expect(parseTranslate({ text: "안녕" })).toMatchObject({ source: "ko", target: "en" });
  });

  it("자동 감지와 다른 언어를 받는다", () => {
    expect(parseTranslate({ text: "안녕", source: "auto", target: "ja" })).toMatchObject({ source: "auto", target: "ja" });
    expect(parseTranslate({ text: "hola", source: "es", target: "de" })).toMatchObject({ source: "es", target: "de" });
  });

  it("목록에 없는 언어 · 원문과 같은 언어는 거절한다", () => {
    expect(() => parseTranslate({ text: "hi", target: "xx" })).toThrow(DemoInputError);
    expect(() => parseTranslate({ text: "hi", source: "xx", target: "en" })).toThrow(DemoInputError);
    expect(() => parseTranslate({ text: "hi", source: "en", target: "en" })).toThrow(DemoInputError);
  });
});
