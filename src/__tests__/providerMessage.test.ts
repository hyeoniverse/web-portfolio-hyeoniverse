// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseProviderMessage } from "@/lib/ai/providerMessage";

/* 서비스 탭의 최근 오류 — 공급자 원문에서 상태 코드·읽을 문장·펼칠 JSON 을 나눈다 */

describe("parseProviderMessage", () => {
  it("Anthropic — 상태 코드 + error.message", () => {
    const r = parseProviderMessage('400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low."},"request_id":"x"}');
    expect(r.status).toBe("400");
    expect(r.summary).toBe("Your credit balance is too low.");
    expect(r.pretty).toContain('\n  "error": {');
  });

  it("OpenAI·Google 식 error.message, 배열 errors[0].message", () => {
    expect(parseProviderMessage('429 {"error":{"message":"Quota exceeded","code":429}}').summary).toBe("Quota exceeded");
    expect(parseProviderMessage('{"errors":[{"message":"Bad key"}]}').summary).toBe("Bad key");
  });

  it("문자열 error·detail", () => {
    expect(parseProviderMessage('403 {"error":"forbidden"}').summary).toBe("forbidden");
    expect(parseProviderMessage('{"detail":"Not found"}').summary).toBe("Not found");
  });

  it("JSON 이 아니면 원문 그대로, 펼칠 것 없음", () => {
    expect(parseProviderMessage("fetch failed")).toEqual({ status: "", summary: "fetch failed", pretty: null });
    expect(parseProviderMessage("500 Internal Server Error")).toEqual({ status: "", summary: "500 Internal Server Error", pretty: null });
  });

  it("문장을 못 찾으면 JSON 본문을 문장으로", () => {
    const r = parseProviderMessage('502 {"ok":false}');
    expect(r.summary).toBe('{"ok":false}');
    expect(r.pretty).not.toBeNull();
  });
});
