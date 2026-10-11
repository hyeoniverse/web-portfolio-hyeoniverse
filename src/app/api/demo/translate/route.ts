import { handleDemoGet, handleDemoPost } from "@/lib/demo/handler";
import { parseTranslate, runTranslate, translateUnavailable, translateUsable } from "@/lib/demo/translate";

/**
 * /api/demo/translate — About 라이브 데모의 번역(로그인 없음, 하루 상한 lib/demo/limits).
 *   GET   → { remaining, perIp, total, unavailable? }(지금 쓸 수 없으면 unavailable: true)
 *   POST  { text(1~1000자), target?: "en" | "ko" } → { text, provider, remaining }
 * 흐름 · 오류 모양은 lib/demo/handler.
 */

export function GET(request: Request) {
  return handleDemoGet(request, "translate", translateUsable);
}

export function POST(request: Request) {
  return handleDemoPost(request, "translate", { parse: parseTranslate, unavailable: translateUnavailable, run: runTranslate });
}
