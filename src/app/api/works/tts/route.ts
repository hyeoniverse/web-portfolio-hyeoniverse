import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { createAdminClient } from "@/lib/supabase/admin";
import { pcmRateFromMime, pcmToWav } from "@/lib/wav";
import { TTS_VOICES } from "@/lib/ttsVoices";

/**
 * POST /api/works/tts — 슬라이드 대본을 음성 파일로 만든다(작업물 갤러리의 슬라이드 음성).
 *
 * Gemini TTS(gemini-2.5-flash-preview-tts)를 쓴다. 사이트 비밀 키 설정의 GEMINI_API_KEY 로 부르고,
 * 무료 등급 키면 비용이 들지 않는 대신 하루 요청 수 제한이 있다(넘으면 TTS_RATE_LIMITED —
 * 그 장은 음성 파일 없이 두면 읽는 화면에서 브라우저가 대본을 읽는다).
 *
 * 만든 음성은 WAV 로 공개 버킷에 올리고 주소를 돌려준다. 받는 쪽이 그 장의 audio 로 저장한다.
 * 말투 지시("차분하고 또렷한 발표자 목소리로")는 읽지 않는다 — 넣고 빼도 길이가 같았다(5.53초).
 */

/* 음성 한 조각을 만드는 데 드는 시간 — 모델이 붐비면 수십 초가 걸린다 */
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash-preview-tts";
/** 한 번 요청의 상한 — 긴 대본은 편집 화면이 600자 조각으로 나눠 보내고 /api/works/tts/merge 가 잇는다(ttsChunks).
    한 번에 길게 보내면 느리고 잘 실패한다 */
const MAX_CHARS = 1500;
const STYLE = "Read aloud in a calm, clear presenter voice:";

export async function POST(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voice = (TTS_VOICES as readonly string[]).includes(body?.voice) ? body.voice as string : TTS_VOICES[0];
  if (!text) return jsonError("Script is empty", 400, { code: "TTS_EMPTY" });
  if (text.length > MAX_CHARS) {
    return jsonError("Script is too long", 400, { code: "TTS_TOO_LONG", params: { max: MAX_CHARS } });
  }

  const key = await getSecret("GEMINI_API_KEY").catch(() => null);
  if (!key) return jsonError("GEMINI_API_KEY is not configured", 400, { code: "TTS_NO_KEY" });

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE}\n${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
  } catch {
    return jsonError("TTS request failed", 502, { code: "TTS_FAILED" });
  }
  if (res.status === 429) return jsonError("TTS quota exceeded", 429, { code: "TTS_RATE_LIMITED" });
  const json = await res.json().catch(() => null);
  const inline = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData)
    .find((d: { data?: string } | undefined) => d?.data);
  if (!res.ok || !inline?.data) return jsonError("TTS failed", 502, { code: "TTS_FAILED" });

  const pcm = Buffer.from(inline.data, "base64");
  const wav = pcmToWav(pcm, pcmRateFromMime(inline.mimeType));

  const admin = createAdminClient();
  const filePath = `posts/narration-${crypto.randomUUID()}.wav`;
  const { error } = await admin.storage.from("posts").upload(filePath, wav, { contentType: "audio/wav", upsert: false });
  if (error) return jsonServerError(error, "POST /api/works/tts");
  const { data: { publicUrl } } = admin.storage.from("posts").getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl, voice, seconds: Math.round(pcm.length / 2 / pcmRateFromMime(inline.mimeType)) });
}
