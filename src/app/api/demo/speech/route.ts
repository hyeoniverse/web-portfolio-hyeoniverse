import { handleDemoGet, handleDemoPost } from "@/lib/demo/handler";
import { parseSpeech, runSpeech, speechUnavailable, speechUsable } from "@/lib/demo/speech";

/**
 * /api/demo/speech — About 라이브 데모의 음성(로그인 없음, 하루 상한 lib/demo/limits).
 *   GET   → { remaining, perIp, total, unavailable? }(지금 쓸 수 없으면 unavailable: true)
 *   POST  { text(1~200자), voice?: "female" | "male" } → { audio(data:audio/mpeg), provider, remaining }
 * 흐름 · 오류 모양은 lib/demo/handler.
 */
/* 앞 제공자가 실패하면 다음을 이어서 부른다(works/tts 와 같다) */
export const maxDuration = 60;

export function GET(request: Request) {
  return handleDemoGet(request, "speech", speechUsable);
}

export function POST(request: Request) {
  return handleDemoPost(request, "speech", { parse: parseSpeech, unavailable: speechUnavailable, run: runSpeech });
}
