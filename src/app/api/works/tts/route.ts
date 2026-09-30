import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { synthesize, TtsError } from "@/lib/tts";
import { LEXICON_ROW, displayScript, sanitizeLexicon, spokenScript } from "@/lib/ttsLexicon";
import { speechLangOf } from "@/lib/speech";
import { TTS_PROVIDERS, TTS_VOICES, isTtsVoice, type TtsProvider, type TtsVoice } from "@/lib/ttsVoices";

/**
 * POST /api/works/tts — 슬라이드 대본을 음성 파일로 만든다(작업물 갤러리의 슬라이드 음성).
 *
 * 고른 목소리(voice — lib/ttsVoices)로 만들고, 그 제공자가 실패하면 다른 제공자의 같은 성별로 넘어간다(lib/tts).
 * provider 를 보내면 그 제공자만 쓴다 — 긴 대본의 뒤 조각이 첫 조각과 같은 목소리·형식이 되게 편집 화면이
 * 첫 조각의 제공자를 넘긴다. skip 의 제공자는 건너뛴다 — 뒤 조각이 실패해 한 장을 다른 제공자로 다시 만들 때.
 * 응답의 voice 는 실제로 쓴 목소리다(고른 것과 다르면 넘어간 것).
 *
 * 전에는 Gemini TTS 하나였는데, 키가 든 Google Cloud 프로젝트의 무료 체험이 끝나자 403(PERMISSION_DENIED)으로
 * 막혔고 이 라우트가 그 이유를 버리고 502 만 돌려줘 원인이 화면에 드러나지 않았다(2026-09-29).
 * 그래서 실패하면 제공자마다의 원인을 reason 으로 함께 돌려준다.
 *
 * 보내기 전에 대본의 [표기|읽을 말] 자리 지정과 읽기 사전(lib/ttsLexicon)으로 읽을 말을 정한다 — 자막은 표기 그대로다.
 *
 * 만든 음성은 MP3 로 공개 버킷에 올리고 주소와 제공자를 돌려준다. 받는 쪽이 그 장의 audio 로 저장한다.
 */

/* 음성 한 조각을 만드는 데 드는 시간 — 앞 제공자가 실패하면 다음을 이어서 부르므로 넉넉히 */
export const maxDuration = 60;

/** 한 번 요청의 상한 — 긴 대본은 편집 화면이 600자 조각으로 나눠 보내고 /api/works/tts/merge 가 잇는다(ttsChunks) */
const MAX_CHARS = 1500;

export async function POST(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voice: TtsVoice = isTtsVoice(body?.voice) ? body.voice : TTS_VOICES[0];
  const pick = (v: unknown) => ((TTS_PROVIDERS as readonly string[]).includes(v as string) ? (v as TtsProvider) : undefined);
  const only = pick(body?.provider);
  const skip = Array.isArray(body?.skip) ? body.skip.map(pick).filter((p: TtsProvider | undefined): p is TtsProvider => !!p) : [];
  if (!text) return jsonError("Script is empty", 400, { code: "TTS_EMPTY" });
  if (text.length > MAX_CHARS) {
    return jsonError("Script is too long", 400, { code: "TTS_TOO_LONG", params: { max: MAX_CHARS } });
  }

  /* 설정 › 서비스 › 슬라이드 음성 — 꺼 두면 만들지 않고, fallback 순서는 거기서 정한다(꺼 두면 고른 제공자만) */
  const tts = (await getSiteConfig())?.tts;
  if (tts?.enabled === false) return jsonError("TTS is turned off", 503, { code: "TTS_DISABLED" });
  const fallback: TtsProvider[] = tts?.fallback?.enabled === false ? []
    : tts?.fallback?.priority?.length
      ? (tts.fallback.priority as TtsProvider[]).filter((p) => !(tts.fallback?.excluded ?? []).includes(p))
      : [...TTS_PROVIDERS];

  const admin = createAdminClient();
  const { data: lexRow } = await admin.from("site_settings").select("config").eq("id", LEXICON_ROW).maybeSingle();
  /* 대본의 [표기|읽을 말] 자리 지정이 먼저, 나머지는 사전으로 */
  const spoken = spokenScript(text, sanitizeLexicon((lexRow?.config as { entries?: unknown } | null)?.entries));
  /* 언어는 표기로 정한다 — 읽을 말에 한글이 들어가도 영어 대본이 한국어 목소리로 넘어가지 않게 */
  const lang = speechLangOf(displayScript(text));

  let result: Awaited<ReturnType<typeof synthesize>>;
  try {
    result = await synthesize(spoken, voice, { only, skip, fallback, lang });
  } catch (err) {
    const reason = err instanceof TtsError ? err.message : String(err);
    console.error("[POST /api/works/tts] synthesis failed:", reason);
    return jsonError(`TTS failed: ${reason}`, 502, { code: "TTS_FAILED", params: { reason } });
  }

  const filePath = `posts/narration-${crypto.randomUUID()}.mp3`;
  const { error } = await admin.storage.from("posts").upload(filePath, result.audio, { contentType: "audio/mpeg", upsert: false });
  if (error) return jsonServerError(error, "POST /api/works/tts");
  const { data: { publicUrl } } = admin.storage.from("posts").getPublicUrl(filePath);

  return NextResponse.json({
    url: publicUrl,
    voice: result.voice,
    provider: result.provider,
    ...(result.skipped ? { skipped: result.skipped } : {}),
  });
}
