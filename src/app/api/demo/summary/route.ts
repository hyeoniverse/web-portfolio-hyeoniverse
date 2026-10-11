import { handleDemoGet, handleDemoPost } from "@/lib/demo/handler";
import { parseSummary, runSummary, summaryUnavailable, summaryUsable } from "@/lib/demo/summary";

/**
 * /api/demo/summary — About 라이브 데모의 AI 요약(로그인 없음, 하루 상한 lib/demo/limits).
 *   GET   → { remaining, perIp, total, unavailable? }(지금 쓸 수 없으면 unavailable: true)
 *   POST  { text(1~4000자) } → { summary(summary_ko 와 같은 JSON 문자열), provider, remaining }
 * 흐름 · 오류 모양은 lib/demo/handler.
 */
/* 분당 한도에 걸리면 짧게 기다렸다 다시 부르고 다음 공급자로 넘어간다 */
export const maxDuration = 60;

export function GET(request: Request) {
  return handleDemoGet(request, "summary", summaryUsable);
}

export function POST(request: Request) {
  return handleDemoPost(request, "summary", { parse: parseSummary, unavailable: summaryUnavailable, run: runSummary });
}
