import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getSecret } from "@/lib/getSecret";
import { createAdminClient } from "@/lib/supabase/admin";
import { speechLangOf } from "@/lib/speech";
import { isDisabled, missingKey, providerErrorFrom, readHealth, readUsage, recordFailure, recordOk, toProviderError, ProviderError } from "@/lib/ai/health";
import type { AiProvider } from "@/lib/ai/providers";
import { TTS_PROVIDERS, edgeVoiceName, googleVoiceName, parseVoice, voiceOf, type ParsedVoice, type TtsProvider, type TtsVoice } from "@/lib/ttsVoices";

/**
 * 슬라이드 음성 합성 — 고른 목소리의 제공자로 만들고, 실패하면 Fish Audio → Google Cloud TTS → Edge TTS 가운데
 * 남은 제공자의 같은 성별로 넘어간다(서버 전용).
 *
 * - Fish Audio(s2.1-pro-free): 가장 자연스럽지만 기한 있는 무료(2026-11-30 까지)이고 SLA 가 없다. 키가 없거나
 *   유료로 바뀌면(402) 다음으로 넘어간다.
 * - Google Cloud TTS(Neural2): 공식 API. 달마다 새로 채워지는 무료 한도가 있지만 넘으면 청구된다. Google 은
 *   청구액으로 사용을 멈추는 설정이 없어서(예산은 알림뿐) 여기서 달마다 보낸 바이트를 세고 상한 전에 멈춘다.
 * - Edge TTS(msedge-tts): 키와 한도가 없지만 비공식이라 언제 막힐지 모른다. 마지막 대체.
 *
 * 모두 MP3 를 돌려준다. 긴 대본은 조각마다 이 함수를 부르고 /api/works/tts/merge 가 이어 붙이는데,
 * 형식이 다른 MP3 는 이어 붙일 수 없어 한 장의 조각은 같은 제공자로 만든다(편집 화면이 첫 조각의 제공자를 넘긴다).
 */

/**
 * Google 무료 한도 안에서 멈출 달마다의 상한(UTF-8 바이트).
 * Neural2 는 바이트로 매기고 한글은 한 글자가 3바이트다. 무료 한도(가격 페이지 기준 한 달 100만)보다
 * 넉넉히 낮게 잡는다 — 한도가 바뀌면 이 값을 고친다.
 */
const GOOGLE_MONTHLY_BYTES = 800_000;
/** 예전 집계 자리 — 이제 사용량은 ai_usage(lib/ai/health)에 모인다. 옮겨 온 달에는 두 쪽 가운데 큰 값을 쓴다 */
const LEGACY_USAGE_ROW = "tts_usage";

export class TtsError extends Error {}

const monthKey = () => new Date().toISOString().slice(0, 7);

async function readGoogleUsage(): Promise<number> {
  const [usage, legacy] = await Promise.all([
    readUsage(),
    createAdminClient().from("site_settings").select("config").eq("id", LEGACY_USAGE_ROW).maybeSingle(),
  ]);
  const cfg = (legacy.data?.config ?? {}) as { month?: string; googleBytes?: number };
  const old = cfg.month === monthKey() ? cfg.googleBytes ?? 0 : 0;
  return Math.max(usage.providers.google_tts?.units ?? 0, old);
}

async function fishTts(text: string, { fishId }: ParsedVoice): Promise<Buffer> {
  const key = await getSecret("FISH_AUDIO_API_KEY");
  if (!key) throw missingKey("fish", "FISH_AUDIO_API_KEY");
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: "s2.1-pro-free" },
    body: JSON.stringify({ text, format: "mp3", mp3_bitrate: 128, reference_id: fishId }),
  });
  if (!res.ok) throw await providerErrorFrom("fish", res);
  return Buffer.from(await res.arrayBuffer());
}

async function googleTts(text: string, { gender }: ParsedVoice): Promise<Buffer> {
  const key = await getSecret("GOOGLE_TTS_API_KEY");
  if (!key) throw missingKey("google_tts", "GOOGLE_TTS_API_KEY");
  const bytes = Buffer.byteLength(text, "utf8");
  if ((await readGoogleUsage()) + bytes > GOOGLE_MONTHLY_BYTES) throw new TtsError("이번 달 상한에 닿았습니다");
  const lang = speechLangOf(text);
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang, name: googleVoiceName(gender, lang) },
      audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
    }),
  });
  if (!res.ok) throw await providerErrorFrom("google_tts", res);
  const json = await res.json().catch(() => null);
  if (!json?.audioContent) throw new ProviderError("google_tts", "unknown", "빈 응답", res.status);
  return Buffer.from(json.audioContent, "base64");
}

async function edgeTts(text: string, { gender }: ParsedVoice): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(edgeVoiceName(gender, speechLangOf(text)), OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  } finally {
    tts.close();
  }
}

const SYNTH: Record<TtsProvider, (text: string, voice: ParsedVoice) => Promise<Buffer>> = { fish: fishTts, google: googleTts, edge: edgeTts };
const LABEL: Record<TtsProvider, string> = { fish: "Fish Audio", google: "Google", edge: "Edge" };
/** 상태·사용량을 세는 공급자 이름 — Google 은 번역 키와 따로 센다 */
const AI_ID: Record<TtsProvider, AiProvider> = { fish: "fish", google: "google_tts", edge: "edge" };
/** 사용량 단위 — Fish 는 글자, Google 은 바이트(무료 한도 단위), Edge 는 호출 수 */
const unitsOf = (provider: TtsProvider, text: string) =>
  provider === "fish" ? text.length : provider === "google" ? Buffer.byteLength(text, "utf8") : undefined;

/**
 * 고른 목소리의 제공자부터 시도해 처음 성공한 제공자의 MP3 를 돌려준다. 실패하면 남은 제공자를 기본 순서대로,
 * 같은 성별로 시도한다. 앞 제공자를 건너뛰었으면 그 원인을 skipped 로 함께 돌려준다. only 가 있으면 그 제공자만 쓰고(한 장의 뒤 조각), skip 의 제공자는 건너뛴다
 * (뒤 조각이 실패해 한 장을 다른 제공자로 다시 만들 때). 모두 실패하면 제공자마다의 원인을 이은 TtsError 를 던진다.
 */
export async function synthesize(
  text: string,
  voice: TtsVoice,
  { only, skip = [], fallback }: {
    only?: TtsProvider;
    skip?: TtsProvider[];
    /** 고른 제공자 다음에 시도할 순서(설정 › 서비스 › 슬라이드 음성). 없으면 기본 순서의 나머지 전부 */
    fallback?: TtsProvider[];
  } = {},
): Promise<{ audio: Buffer; provider: TtsProvider; voice: TtsVoice; skipped: string }> {
  const parsed = parseVoice(voice);
  const chosen = parsed.provider;
  const reasons: string[] = [];
  const rest = (fallback ?? TTS_PROVIDERS).filter((p) => p !== chosen);
  const order = only ? [only] : [chosen, ...rest].filter((p) => !skip.includes(p));
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) — 설정 › 서비스에서 다시 켠다 */
  const health = await readHealth();
  for (const provider of order) {
    const id = AI_ID[provider];
    if (isDisabled(health[id])) {
      reasons.push(`${LABEL[provider]}: 여러 번 실패해 꺼 두었습니다(설정 › 서비스)`);
      continue;
    }
    try {
      const audio = await SYNTH[provider](text, parsed);
      if (audio.length > 0) {
        await recordOk(id, unitsOf(provider, text));
        return { audio, provider, voice: voiceOf(provider, parsed), skipped: reasons.join(" · ") };
      }
      reasons.push(`${LABEL[provider]}: 빈 음성`);
    } catch (err) {
      /* 앱이 스스로 건 상한(TtsError)과 키 없음은 공급자의 실패가 아니라 기록하지 않는다 */
      if (!(err instanceof TtsError)) {
        const pe = toProviderError(id, err);
        if (pe.kind !== "no_key") await recordFailure(pe);
        reasons.push(`${LABEL[provider]}: ${pe.kind === "no_key" ? "키가 없습니다" : pe.message}`);
      } else {
        reasons.push(`${LABEL[provider]}: ${err.message}`);
      }
    }
  }
  throw new TtsError(reasons.join(" · "));
}
