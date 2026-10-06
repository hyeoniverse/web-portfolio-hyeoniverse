/** 분당 한도 처리 — 429 는 결제가 아니라 rate_limit, "Xs 뒤 다시" 읽기, Groq 모델 고르기 */
import { describe, expect, it } from "vitest";
import { classifyFailure } from "@/lib/ai/health";
import { retryAfterSeconds } from "@/lib/api/aiSummaryProviders";
import { pickGroqLatest } from "@/lib/ai/models";

const groq429 = '{"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 4575, Requested 4854. Please try again in 10.7175s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}';

describe("rate limit", () => {
  it("본문에 billing 주소가 있어도 429 의 분당 한도는 rate_limit", () => {
    expect(classifyFailure(429, groq429)).toBe("rate_limit");
  });
  it("진짜 결제 문제는 그대로 billing", () => {
    expect(classifyFailure(402, "Your credit balance is too low")).toBe("billing");
  });
  it("기다릴 초를 읽는다", () => {
    expect(retryAfterSeconds(groq429)).toBeCloseTo(10.7175);
    expect(retryAfterSeconds("retry after 500ms")).toBe(0.5);
    expect(retryAfterSeconds("no hint")).toBeNull();
  });
});

describe("pickGroqLatest", () => {
  it("qwen 은 크기와 상관없이 gpt-oss 보다 먼저", () => {
    expect(pickGroqLatest(["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"])).toBe("qwen/qwen3.8-27b");
    expect(pickGroqLatest(["openai/gpt-oss-120b", "openai/gpt-oss-20b"])).toBe("openai/gpt-oss-20b");
  });
});

import { outputTokenCap } from "@/lib/api/aiSummaryProviders";
describe("outputTokenCap", () => {
  it("분당 출력 한도 초과 거절에서 다시 보낼 상한", () => {
    expect(outputTokenCap('{"error":{"message":"Request too large for model `qwen/qwen3.8-27b` in organization `x` service tier `on_demand` on output tokens per minute (OTPM): Limit 1000, Requested 1024."}}')).toBe(900);
    expect(outputTokenCap("tokens per minute (TPM): Limit 8000, Used 4575, Requested 4854")).toBeNull();
  });
});
