import { handleDemoGet, handleDemoPost } from "@/lib/demo/handler";
import { parseCover, runCover, coverUnavailable, coverUsable } from "@/lib/demo/cover";

/**
 * /api/demo/cover — About 라이브 데모의 AI 커버(로그인 없음, 하루 상한 lib/demo/limits).
 *   GET   → { remaining, perIp, total, unavailable? }(지금 쓸 수 없으면 unavailable: true)
 *   POST  { prompt(1~300자), style? } → { image(data URL), provider, remaining }
 * 흐름 · 오류 모양은 lib/demo/handler.
 */
/* NanoBanana 는 결과를 최대 120초 폴링하고, 실패하면 Hugging Face 로 넘어간다 */
export const maxDuration = 300;

export function GET(request: Request) {
  return handleDemoGet(request, "cover", coverUsable);
}

export function POST(request: Request) {
  return handleDemoPost(request, "cover", { parse: parseCover, unavailable: coverUnavailable, run: runCover });
}
