import { describe, expect, it } from "vitest";
import { classifyFailure, isDisabled, toProviderError } from "@/lib/ai/health";
import { failuresOf } from "@/lib/ai/notifyFailures";

/* 공급자마다 같은 원인을 다른 코드로 준다 — 본문 낱말을 먼저 보고, 없으면 상태 코드로 가른다 */
describe("classifyFailure", () => {
  it("Google 은 만료·잘못된 키를 400 으로 준다", () => {
    expect(classifyFailure(400, '{"error":{"message":"API key expired. Please renew the API key.","status":"INVALID_ARGUMENT"}}')).toBe("expired");
    expect(classifyFailure(400, '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}')).toBe("invalid_key");
  });

  it("권한 없음·무료 체험 종료(403 PERMISSION_DENIED)는 권한으로", () => {
    expect(classifyFailure(403, '{"error":{"status":"PERMISSION_DENIED","message":"Your project has been denied access"}}')).toBe("forbidden");
    expect(classifyFailure(403, "Cloud Text-to-Speech API has not been used in project 1 before or it is disabled")).toBe("forbidden");
  });

  it("DeepL 456 과 OpenAI insufficient_quota 는 한도", () => {
    expect(classifyFailure(456, "Quota exceeded")).toBe("quota");
    expect(classifyFailure(429, '{"error":{"code":"insufficient_quota"}}')).toBe("quota");
    expect(classifyFailure(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}')).toBe("quota");
  });

  it("그냥 429 는 요청 속도", () => {
    expect(classifyFailure(429, '{"type":"error","error":{"type":"rate_limit_error"}}')).toBe("rate_limit");
  });

  it("Anthropic 크레딧 부족·Fish 402 는 결제", () => {
    expect(classifyFailure(400, "Your credit balance is too low to access the Anthropic API")).toBe("billing");
    expect(classifyFailure(402, "")).toBe("billing");
  });

  it("상태 코드만 있을 때", () => {
    expect(classifyFailure(401, "")).toBe("invalid_key");
    expect(classifyFailure(403, "")).toBe("forbidden");
    expect(classifyFailure(503, "")).toBe("server");
    expect(classifyFailure(undefined, "")).toBe("network");
  });

  it("일반 Error 문장에서도 상태 코드를 꺼낸다", () => {
    const e = toProviderError("gemini", new Error("Gemini API error: 429"));
    expect(e.status).toBe(429);
    expect(e.kind).toBe("rate_limit");
  });

  it("기록에 남는 문장은 키를 가린다", () => {
    const e = toProviderError("gemini", new Error("400 bad key=AIzaSyA1234567890abcdefghijklmnop"));
    expect(e.message).not.toContain("AIzaSy");
  });
});

describe("isDisabled", () => {
  const at = "2026-09-10T00:00:00.000Z";
  it("키·권한 문제는 사람이 풀 때까지 꺼져 있다", () => {
    expect(isDisabled({ fails: 3, disabled: { kind: "expired", at } }, new Date("2027-01-01"))).toBe(true);
  });
  it("한도는 달이 바뀌면 다시 시도한다", () => {
    expect(isDisabled({ fails: 3, disabled: { kind: "quota", at } }, new Date("2026-09-30"))).toBe(true);
    expect(isDisabled({ fails: 3, disabled: { kind: "quota", at } }, new Date("2026-10-01T01:00:00Z"))).toBe(false);
  });
  it("요청 속도·서버 오류는 한 시간 뒤 다시 시도한다", () => {
    expect(isDisabled({ fails: 5, disabled: { kind: "rate_limit", at } }, new Date("2026-09-10T00:30:00Z"))).toBe(true);
    expect(isDisabled({ fails: 5, disabled: { kind: "rate_limit", at } }, new Date("2026-09-10T01:30:00Z"))).toBe(false);
  });
});

describe("failuresOf", () => {
  it("모르는 공급자·원인은 버린다", () => {
    expect(failuresOf({ failures: [{ provider: "gemini", kind: "quota" }, { provider: "x", kind: "quota" }, { provider: "deepl", kind: "?" }] }))
      .toEqual([{ provider: "gemini", kind: "quota" }]);
    expect(failuresOf(null)).toEqual([]);
  });
});
